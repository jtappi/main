'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let tasks = [];
let closedLog = [];
let currentCat = 'working';
let showClosed = false;
let activeView = 'v2';
let editingTaskId = null;
let timelineMode = 'swimlane';
let swimlaneWeekOffset = 0;
let timelinePanelTaskId = null;
let showV2Board = false;
let noDateCollapsed = true;

// Resolve the API base path from the current URL so the app works both
// standalone (dev, port 3004) and mounted in the portal at /task-manager.
const API_BASE = (function () {
  const p = window.location.pathname.replace(/\/$/, '');
  return p.endsWith('/task-manager') ? p : '';
}());

const LABELS     = { working: 'Working on', asap: 'Do ASAP', later: 'Do Later' };
const LIST_IDS   = { working: 'lw', asap: 'la', later: 'll' };
const COUNT_IDS  = { working: 'cw', asap: 'ca', later: 'cl' };
const CATEGORIES = ['working', 'asap', 'later'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function el(id) { return document.getElementById(id); }

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseTags(input) {
  if (Array.isArray(input)) return input.map(x => String(x).trim()).filter(Boolean).slice(0, 12);
  if (typeof input === 'string') return input.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
  return [];
}

function showStatus(msg) { el('sv').textContent = msg; }

function fmtWhen(iso) {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'n/a' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateOnly(d) {
  if (!d) return 'No date';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? 'No date' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dueDateState(d) {
  if (!d) return { label: 'No due date', cls: 'due-none' };
  const due = new Date(d + 'T00:00:00');
  if (isNaN(due.getTime())) return { label: 'No due date', cls: 'due-none' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0)  return { label: Math.abs(diff) + 'd overdue', cls: 'due-overdue' };
  if (diff === 0) return { label: 'Due today',                  cls: 'due-today' };
  if (diff <= 2)  return { label: 'Due in ' + diff + 'd',       cls: 'due-soon' };
  return { label: 'Due in ' + diff + 'd', cls: 'due-later' };
}

function isTaskOverdue(t) {
  if (!t?.dueDate) return false;
  const due = new Date(t.dueDate + 'T00:00:00');
  if (isNaN(due.getTime())) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return due < today;
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function getStartOfWeekMonday(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return dt;
}

function formatWeekRange(mon) {
  const fri = new Date(mon); fri.setDate(fri.getDate() + 4);
  return mon.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
         ' - ' + fri.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Task normalisation
// ---------------------------------------------------------------------------
function normalizeTask(raw, fallbackId) {
  const cat = CATEGORIES.includes(raw?.cat) ? raw.cat : 'working';
  return {
    id:          Number.isFinite(Number(raw?.id)) ? Number(raw.id) : fallbackId,
    text:        String(raw?.text || '').trim(),
    cat,
    done:        Boolean(raw?.done),
    created:     raw?.created || new Date().toISOString(),
    completedAt: raw?.completedAt || null,
    owner:       String(raw?.owner || '').trim(),
    dueDate:     typeof raw?.dueDate === 'string' ? raw.dueDate : '',
    tags:        parseTags(raw?.tags),
    notes:       String(raw?.notes || ''),
    order:       Number.isFinite(Number(raw?.order)) ? Number(raw.order) : null,
  };
}

function normalizeAllTasks() {
  tasks = tasks.map((t, i) => normalizeTask(t, Date.now() + i)).filter(t => t.text.length > 0);
  CATEGORIES.forEach(cat => {
    const inCat = tasks.filter(t => t.cat === cat).sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bo = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
      return ao !== bo ? ao - bo : new Date(a.created).getTime() - new Date(b.created).getTime();
    });
    inCat.forEach((t, idx) => { t.order = idx + 1; });
  });
}

function nextOrder(cat) {
  const orders = tasks.filter(t => t.cat === cat).map(t => Number(t.order) || 0);
  return (orders.length ? Math.max(...orders) : 0) + 1;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
async function loadTasks() {
  try {
    const res = await fetch(API_BASE + '/api/tasks');
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload)) { tasks = payload; closedLog = []; }
      else {
        tasks     = Array.isArray(payload.tasks)     ? payload.tasks     : [];
        closedLog = Array.isArray(payload.closedLog) ? payload.closedLog : [];
      }
      normalizeAllTasks();
      showStatus('loaded ' + tasks.length + ' active task' + (tasks.length !== 1 ? 's' : ''));
    }
  } catch { showStatus('could not load tasks - is the server running?'); }
  render();
}

async function saveTasks() {
  try {
    const res = await fetch(API_BASE + '/api/tasks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tasks, closedLog }),
    });
    if (res.ok) {
      showStatus('saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else { showStatus('save failed'); }
  } catch { showStatus('could not save - is the server running?'); }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
function selCat(cat) {
  currentCat = cat;
  ['working', 'asap', 'later'].forEach(k => {
    const btn = el('p-' + k);
    btn.className = 'pill p' + k[0] + (k === cat ? ' active' : '');
  });
}

function addTask() {
  const inp = el('ni');
  const text = inp.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, cat: currentCat, done: false, created: new Date().toISOString(), completedAt: null, owner: '', dueDate: '', tags: [], notes: '', order: nextOrder(currentCat) });
  inp.value = ''; inp.focus();
  render(); saveTasks();
}

function addTaskFromV2() {
  const inp  = el('ni2');
  const cat  = el('cat2').value;
  const due  = el('date2').value;
  const text = inp.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, cat, done: false, created: new Date().toISOString(), completedAt: null, owner: '', dueDate: due || '', tags: [], notes: '', order: nextOrder(cat) });
  inp.value = ''; el('date2').value = ''; inp.focus();
  render(); saveTasks();
}

function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null; }
  render(); saveTasks();
}

function deleteTask(id) { tasks = tasks.filter(x => x.id !== id); render(); saveTasks(); }

function moveTo(id, newCat) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const old = t.cat;
  t.cat = newCat;
  t.order = nextOrder(newCat);
  resequenceCategory(old);
  resequenceCategory(newCat);
  render(); saveTasks();
}

function resequenceCategory(cat) {
  tasks.filter(t => t.cat === cat)
       .sort((a, b) => (a.order || 0) - (b.order || 0))
       .forEach((t, i) => { t.order = i + 1; });
}

function reopenTask(id, source) {
  if (source === 'active') {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = false; t.completedAt = null;
    render(); saveTasks(); return;
  }
  const idx = closedLog.findIndex(x => x.id === id);
  if (idx === -1) return;
  const a   = closedLog[idx];
  const cat = CATEGORIES.includes(a.cat) ? a.cat : 'working';
  tasks.push({
    id: a.id, text: a.text, cat, done: false,
    created: a.created || new Date().toISOString(), completedAt: null,
    owner: String(a.owner || '').trim(),
    dueDate: typeof a.dueDate === 'string' ? a.dueDate : '',
    tags: parseTags(a.tags), notes: String(a.notes || ''),
    order: nextOrder(cat),
  });
  closedLog.splice(idx, 1);
  render(); saveTasks();
}

function clearDone() {
  const done = tasks.filter(x => x.done);
  if (!done.length) return;
  if (!confirm('Remove ' + done.length + ' completed task' + (done.length !== 1 ? 's' : '') + '?')) return;
  const now = new Date().toISOString();
  done.forEach(t => closedLog.push({
    id: t.id, text: t.text, cat: t.cat, created: t.created,
    completedAt: t.completedAt || now, archivedAt: now,
    owner: t.owner || '', dueDate: t.dueDate || '',
    tags: parseTags(t.tags), notes: t.notes || '',
  }));
  tasks = tasks.filter(x => !x.done);
  render(); saveTasks();
}

function getClosedItems() {
  const fromActive = tasks.filter(x => x.done).map(x => ({ ...x, archivedAt: null, source: 'active' }));
  const fromAudit  = closedLog.map(x => ({ ...x, source: 'audit' }));
  return [...fromActive, ...fromAudit].sort((a, b) =>
    new Date(b.completedAt || b.archivedAt || 0) - new Date(a.completedAt || a.archivedAt || 0));
}

// ---------------------------------------------------------------------------
// View / panel state
// ---------------------------------------------------------------------------
function setView(view)         { activeView = view === 'v2' ? 'v2' : 'v1'; render(); }
function setTimelineMode(mode) { timelineMode = mode === 'swimlane' ? 'swimlane' : 'list'; render(); }
function toggleV2Board()       { showV2Board = !showV2Board; render(); }
function openTimelinePanel(id) { timelinePanelTaskId = id; render(); }
function closeTimelinePanel()  { timelinePanelTaskId = null; render(); }
function toggleClosed()        { showClosed = !showClosed; render(); }

function saveTimelinePanelDetails() {
  if (!timelinePanelTaskId) return;
  const t = tasks.find(x => x.id === timelinePanelTaskId && !x.done);
  if (!t) return;
  t.owner   = el('focus-owner')?.value?.trim() || '';
  t.dueDate = el('focus-due')?.value  || '';
  t.tags    = parseTags(el('focus-tags')?.value  || '');
  t.notes   = el('focus-notes')?.value?.trim() || '';
  render(); saveTasks();
}

function setEditingTask(id)  { editingTaskId = id;   render(); }
function cancelEditingTask() { editingTaskId = null; render(); }

function saveTaskDetails(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const next = el('edit-text-'  + id)?.value?.trim();
  if (!next) return;
  t.text    = next;
  t.owner   = el('edit-owner-' + id)?.value?.trim() || '';
  t.dueDate = el('edit-due-'   + id)?.value || '';
  t.tags    = parseTags(el('edit-tags-' + id)?.value || '');
  t.notes   = el('edit-notes-' + id)?.value?.trim() || '';
  editingTaskId = null;
  render(); saveTasks();
}

// ---------------------------------------------------------------------------
// Drag-and-drop (board only — uses data attributes, not onclick)
// ---------------------------------------------------------------------------
function reorderTask(draggedId, targetCat, targetId) {
  const dragged = tasks.find(t => t.id === draggedId && !t.done);
  if (!dragged) return;
  const src = dragged.cat;
  dragged.cat = targetCat;
  const list = tasks
    .filter(t => !t.done && t.cat === targetCat && t.id !== draggedId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  let at = list.length;
  if (targetId !== null) { const i = list.findIndex(t => t.id === targetId); at = i === -1 ? list.length : i; }
  list.splice(at, 0, dragged);
  list.forEach((t, i) => { t.order = i + 1; });
  if (src !== targetCat) resequenceCategory(src);
  render(); saveTasks();
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function makeBtn(cls, text, handler) {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', handler);
  return b;
}

function makeChk(done, handler) {
  const d = document.createElement('div');
  d.className = 'chk' + (done ? ' on' : '');
  if (done) d.setAttribute('aria-label', 'Completed');
  d.addEventListener('click', handler);
  return d;
}

// ---------------------------------------------------------------------------
// Timeline card (already uses addEventListener — kept as-is)
// ---------------------------------------------------------------------------
function createTimelineItemCard(t, opts = {}) {
  const item = document.createElement('div');
  const due  = dueDateState(t.dueDate);
  const dateLabel = opts.dateLabel || (t.dueDate ? fmtDateOnly(t.dueDate) : 'No Date');
  item.className = 'v2-time-item' + (opts.noDate ? ' no-date' : '') + (timelinePanelTaskId === t.id ? ' is-active' : '');
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', 'Open details for ' + t.text);

  const dateEl = document.createElement('div'); dateEl.className = 'v2-time-date'; dateEl.textContent = dateLabel;
  const bodyEl = document.createElement('div'); bodyEl.className = 'v2-time-body';
  const titleEl = document.createElement('div'); titleEl.className = 'v2-time-title'; titleEl.textContent = t.text;
  const metaEl  = document.createElement('div'); metaEl.className = 'v2-time-meta';
  const duePill = document.createElement('span'); duePill.className = 'due-pill ' + due.cls; duePill.textContent = due.label;
  const catSpan = document.createElement('span'); catSpan.textContent = LABELS[t.cat];
  metaEl.appendChild(duePill);
  metaEl.appendChild(catSpan);
  if (t.owner) { const ow = document.createElement('span'); ow.textContent = 'Owner: ' + t.owner; metaEl.appendChild(ow); }
  bodyEl.appendChild(titleEl);
  bodyEl.appendChild(metaEl);
  item.appendChild(dateEl);
  item.appendChild(bodyEl);

  item.addEventListener('click', () => openTimelinePanel(t.id));
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTimelinePanel(t.id); } });
  return item;
}

function renderTimelineNoDateGroup(host, undated) {
  if (!undated.length) return;
  const hdr = document.createElement('div');
  hdr.className = 'v2-time-group v2-nodate-toggle';
  hdr.style.cssText = 'cursor:pointer;display:flex;justify-content:space-between;align-items:center';
  const countSpan = document.createElement('span');
  countSpan.style.cssText = 'font-size:11px;color:#aaa';
  countSpan.textContent = undated.length;
  hdr.textContent = 'No Date ';
  hdr.appendChild(countSpan);
  hdr.addEventListener('click', () => { noDateCollapsed = !noDateCollapsed; render(); });
  host.appendChild(hdr);
  if (!noDateCollapsed) undated.forEach(t => host.appendChild(createTimelineItemCard(t, { noDate: true, dateLabel: 'No Date' })));
}

// ---------------------------------------------------------------------------
// Render: timeline list / swimlane
// ---------------------------------------------------------------------------
function renderV2TimelineList(host, open) {
  const dated    = open.filter(t => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const overdue  = dated.filter(isTaskOverdue);
  const upcoming = dated.filter(t => !isTaskOverdue(t));
  const undated  = open.filter(t => !t.dueDate).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!dated.length && !undated.length) { host.innerHTML = '<div class="empty">no open tasks for timeline</div>'; return; }
  host.innerHTML = '';
  if (overdue.length)  { const h = document.createElement('div'); h.className = 'v2-time-group'; h.textContent = 'Overdue';  host.appendChild(h); }
  overdue.forEach(t  => host.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
  if (upcoming.length) { const h = document.createElement('div'); h.className = 'v2-time-group'; h.textContent = 'Upcoming'; host.appendChild(h); }
  upcoming.forEach(t => host.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
  renderTimelineNoDateGroup(host, undated);
}

function renderV2TimelineSwimlane(host, open, monday) {
  const days  = [{ key: 1, label: 'Mon' }, { key: 2, label: 'Tue' }, { key: 3, label: 'Wed' }, { key: 4, label: 'Thu' }, { key: 5, label: 'Fri' }];
  const fri   = addDays(monday, 4);
  const monT  = monday.getTime();
  const friT  = fri.getTime();
  const lanes = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const undated = [];
  open.forEach(t => {
    if (!t.dueDate) { undated.push(t); return; }
    const d  = new Date(t.dueDate + 'T00:00:00');
    if (isNaN(d.getTime())) { undated.push(t); return; }
    const dt = d.getTime();
    if (dt < monT || dt > friT) return;
    const wk = d.getDay();
    if (wk >= 1 && wk <= 5) lanes[wk].push(t);
  });
  const sortFn = (a, b) => {
    const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : 1e15;
    const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : 1e15;
    return ao !== bo ? ao - bo : new Date(a.created) - new Date(b.created);
  };
  days.forEach(d => lanes[d.key].sort(sortFn));
  undated.sort(sortFn);

  host.innerHTML = '';
  const overdueAll = open.filter(isTaskOverdue).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (overdueAll.length) {
    const ow = document.createElement('div'); ow.className = 'v2-overdue-strip';
    const oh = document.createElement('div'); oh.className = 'v2-time-group'; oh.textContent = 'Overdue Across All Weeks';
    ow.appendChild(oh);
    overdueAll.slice(0, 6).forEach(t => ow.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
    host.appendChild(ow);
  }

  const swim = document.createElement('div'); swim.className = 'v2-swimlane';
  days.forEach((day, idx) => {
    const date = addDays(monday, idx);
    const lane = document.createElement('div'); lane.className = 'v2-lane';
    const hd   = document.createElement('div'); hd.className = 'v2-lane-hd';
    const strong = document.createElement('strong'); strong.textContent = day.label;
    const span   = document.createElement('span');   span.textContent = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    hd.appendChild(strong); hd.appendChild(span);
    const lh = document.createElement('div'); lh.className = 'v2-lane-list';
    const lt = lanes[day.key];
    if (!lt.length) { const emp = document.createElement('div'); emp.className = 'v2-lane-empty'; emp.textContent = 'No due tasks'; lh.appendChild(emp); }
    else lt.forEach(t => lh.appendChild(createTimelineItemCard(t, { dateLabel: day.label })));
    lane.appendChild(hd); lane.appendChild(lh);
    swim.appendChild(lane);
  });
  host.appendChild(swim);

  if (undated.length) {
    const w = document.createElement('div'); w.className = 'v2-swimlane-undated';
    renderTimelineNoDateGroup(w, undated);
    host.appendChild(w);
  }
}

function renderTimelinePanel() {
  const wrap = el('v2-focus-wrap');
  const t    = tasks.find(x => x.id === timelinePanelTaskId && !x.done);
  if (!t || activeView !== 'v2') { wrap.classList.add('hide'); return; }
  wrap.classList.remove('hide');
  el('v2-focus-title').textContent = t.text;
  el('v2-focus-meta').textContent  = LABELS[t.cat] + ' · ' + dueDateState(t.dueDate).label;
  el('focus-owner').value = t.owner || '';
  el('focus-due').value   = t.dueDate || '';
  el('focus-tags').value  = (t.tags || []).join(', ');
  el('focus-notes').value = t.notes || '';
}

function renderV2Timeline(open) {
  const host     = el('v2-timeline');
  const weekLabel = el('v2-week-label');
  const weekRow  = el('v2-week-row');
  el('timeline-list-btn').classList.toggle('active',     timelineMode === 'list');
  el('timeline-swimlane-btn').classList.toggle('active', timelineMode === 'swimlane');
  if (timelineMode === 'swimlane') {
    const monday = addDays(getStartOfWeekMonday(new Date()), swimlaneWeekOffset * 7);
    weekLabel.textContent = 'Week of ' + formatWeekRange(monday);
    weekRow.classList.remove('hide');
    renderV2TimelineSwimlane(host, open, monday);
    return;
  }
  weekLabel.textContent = ''; weekRow.classList.add('hide');
  renderV2TimelineList(host, open);
}

// ---------------------------------------------------------------------------
// Render: V1 task card
// ---------------------------------------------------------------------------
function makeV1TaskCard(t) {
  const others = CATEGORIES.filter(c => c !== t.cat);
  const wrap   = document.createElement('div'); wrap.className = 'task';

  const chk = makeChk(t.done, () => toggleDone(t.id));

  const tbody  = document.createElement('div'); tbody.className = 'tbody';
  const ttxt   = document.createElement('div'); ttxt.className  = 'ttxt' + (t.done ? ' done' : ''); ttxt.textContent = t.text;
  const tmeta  = document.createElement('div'); tmeta.className = 'tmeta';
  tmeta.appendChild(makeBtn('mvbtn', '→ ' + LABELS[others[0]], () => moveTo(t.id, others[0])));
  tmeta.appendChild(makeBtn('mvbtn', '→ ' + LABELS[others[1]], () => moveTo(t.id, others[1])));
  tbody.appendChild(ttxt);
  tbody.appendChild(tmeta);

  const del = makeBtn('delbtn', '✕', () => deleteTask(t.id));
  del.title = 'Delete';

  wrap.appendChild(chk);
  wrap.appendChild(tbody);
  wrap.appendChild(del);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render: V2 board task card
// ---------------------------------------------------------------------------
function makeV2TaskCard(t, cat) {
  const others  = CATEGORIES.filter(c => c !== cat);
  const editing = editingTaskId === t.id;
  const due     = dueDateState(t.dueDate);

  const article = document.createElement('article');
  article.className = 'v2-task' + (isTaskOverdue(t) ? ' overdue' : '');
  article.setAttribute('draggable', 'true');
  article.addEventListener('dragstart', e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); });
  article.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
  article.addEventListener('drop',      e => { e.preventDefault(); const id = Number(e.dataTransfer.getData('text/plain')); if (Number.isFinite(id)) reorderTask(id, cat, t.id); });

  const chk = makeBtn('chk', '', () => toggleDone(t.id));
  chk.setAttribute('aria-label', 'Mark done');

  const tbody   = document.createElement('div'); tbody.className = 'tbody';
  const taskTop = document.createElement('div'); taskTop.className = 'v2-task-top';
  const ttxt    = document.createElement('div'); ttxt.className = 'ttxt'; ttxt.textContent = t.text;
  const duePill = document.createElement('span'); duePill.className = 'due-pill ' + due.cls; duePill.textContent = due.label;
  taskTop.appendChild(ttxt); taskTop.appendChild(duePill);

  const line = document.createElement('div'); line.className = 'v2-line';
  const ownerChip = document.createElement('span'); ownerChip.className = 'mini-chip'; ownerChip.textContent = 'Owner: ' + (t.owner || 'Unassigned');
  const tagsChip  = document.createElement('span'); tagsChip.className  = 'mini-chip'; tagsChip.textContent  = 'Tags: '  + (t.tags?.length ? t.tags.join(', ') : 'None');
  line.appendChild(ownerChip); line.appendChild(tagsChip);

  const tmeta = document.createElement('div'); tmeta.className = 'tmeta';
  tmeta.appendChild(makeBtn('mvbtn', 'To ' + LABELS[others[0]], () => moveTo(t.id, others[0])));
  tmeta.appendChild(makeBtn('mvbtn', 'To ' + LABELS[others[1]], () => moveTo(t.id, others[1])));
  tmeta.appendChild(makeBtn('mvbtn', 'Edit', () => setEditingTask(t.id)));

  tbody.appendChild(taskTop);
  tbody.appendChild(line);
  tbody.appendChild(tmeta);

  if (editing) {
    const det  = document.createElement('details'); det.className = 'v2-details'; det.open = true;
    const sum  = document.createElement('summary'); sum.textContent = 'Editing';
    const grid = document.createElement('div');    grid.className  = 'v2-edit-grid';

    const mkField = (labelText, inputId, type, val, placeholder) => {
      const lbl = document.createElement('label'); lbl.textContent = labelText;
      const inp = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
      inp.id = inputId;
      if (type !== 'textarea') inp.type = type || 'text';
      if (type === 'textarea') { inp.rows = 3; inp.value = val; } else { inp.value = val; }
      if (placeholder) inp.placeholder = placeholder;
      lbl.appendChild(inp);
      return lbl;
    };
    grid.appendChild(mkField('Task text', 'edit-text-'  + t.id, 'text',     t.text,                     ''));
    grid.appendChild(mkField('Owner',     'edit-owner-' + t.id, 'text',     t.owner || '',              'Name'));
    grid.appendChild(mkField('Due date',  'edit-due-'   + t.id, 'date',     t.dueDate || '',            ''));
    grid.appendChild(mkField('Tags',      'edit-tags-'  + t.id, 'text',     (t.tags || []).join(', '),  'risk, rollout'));
    const notesLbl = mkField('Notes', 'edit-notes-' + t.id, 'textarea', t.notes || '', 'context, blockers...');
    notesLbl.className = 'full';
    grid.appendChild(notesLbl);

    const actions = document.createElement('div'); actions.className = 'v2-edit-actions full';
    actions.appendChild(makeBtn('mvbtn', 'Save',   () => saveTaskDetails(t.id)));
    actions.appendChild(makeBtn('mvbtn', 'Cancel', () => cancelEditingTask()));
    grid.appendChild(actions);
    det.appendChild(sum); det.appendChild(grid);
    tbody.appendChild(det);
  } else {
    const det  = document.createElement('details'); det.className = 'v2-details';
    const sum  = document.createElement('summary'); sum.textContent = 'More';
    const grid = document.createElement('div');    grid.className  = 'v2-detail-grid';
    const mkRow = (label, value) => {
      const row = document.createElement('div'); row.className = 'v2-detail-row';
      const sp  = document.createElement('span'); sp.textContent  = label;
      const st  = document.createElement('strong'); st.textContent = value;
      row.appendChild(sp); row.appendChild(st);
      return row;
    };
    grid.appendChild(mkRow('Owner', t.owner || 'Unassigned'));
    grid.appendChild(mkRow('Due',   t.dueDate ? fmtDateOnly(t.dueDate) : 'None'));
    grid.appendChild(mkRow('Tags',  t.tags?.length ? t.tags.join(', ') : 'None'));
    const notes = document.createElement('div'); notes.className = 'v2-detail-notes'; notes.textContent = t.notes || 'No notes yet';
    notes.className += ' full';
    grid.appendChild(notes);
    det.appendChild(sum); det.appendChild(grid);
    tbody.appendChild(det);
  }

  const del = makeBtn('delbtn', '✕', () => deleteTask(t.id));
  del.title = 'Delete';

  article.appendChild(chk);
  article.appendChild(tbody);
  article.appendChild(del);
  return article;
}

// ---------------------------------------------------------------------------
// Render: closed task row
// ---------------------------------------------------------------------------
function makeClosedRow(t) {
  const wrap  = document.createElement('div'); wrap.className = 'task closed-task';
  const chk   = document.createElement('div'); chk.className  = 'chk on';
  const tbody = document.createElement('div'); tbody.className = 'tbody';
  const ttxt  = document.createElement('div'); ttxt.className  = 'ttxt done'; ttxt.textContent = t.text;
  const cmeta = document.createElement('div'); cmeta.className = 'cmeta';
  cmeta.textContent = 'Closed: ' + fmtWhen(t.completedAt) + ' · Category: ' + LABELS[t.cat] +
    (t.archivedAt ? ' · Archived: ' + fmtWhen(t.archivedAt) : '');
  const tmeta = document.createElement('div'); tmeta.className = 'tmeta';
  tmeta.appendChild(makeBtn('mvbtn', 'Mark not done', () => reopenTask(t.id, t.source)));
  tbody.appendChild(ttxt); tbody.appendChild(cmeta); tbody.appendChild(tmeta);
  wrap.appendChild(chk); wrap.appendChild(tbody);
  return wrap;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function render() {
  // View toggle
  el('view-v1').classList.toggle('hide', activeView !== 'v1');
  el('view-v2').classList.toggle('hide', activeView !== 'v2');
  el('view-v1-btn').classList.toggle('active', activeView === 'v1');
  el('view-v2-btn').classList.toggle('active', activeView === 'v2');

  // V1 columns
  CATEGORIES.forEach(cat => {
    const items = tasks.filter(x => x.cat === cat && !x.done);
    el(COUNT_IDS[cat]).textContent = items.length;
    const host = el(LIST_IDS[cat]);
    host.innerHTML = '';
    if (!items.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'nothing here yet'; host.appendChild(e); return; }
    items.forEach(t => host.appendChild(makeV1TaskCard(t)));
  });

  // V2
  renderV2();
  renderTimelinePanel();

  // Closed tasks (shared between V1 + V2)
  const closed = getClosedItems();
  const label  = (showClosed ? 'Hide' : 'Show') + ' closed tasks (' + closed.length + ')';
  el('tgl-closed').textContent   = label;
  el('tgl-closed-2').textContent = label;
  el('closed-wrap').classList.toggle('hide',   !showClosed);
  el('closed-wrap-2').classList.toggle('hide', !showClosed);
  if (!showClosed) return;
  el('closed-list').innerHTML   = '';
  el('closed-list-2').innerHTML = '';
  if (!closed.length) {
    ['closed-list', 'closed-list-2'].forEach(id => { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'no closed tasks yet'; el(id).appendChild(e); });
    return;
  }
  closed.forEach(t => {
    el('closed-list').appendChild(makeClosedRow(t));
    el('closed-list-2').appendChild(makeClosedRow(t));
  });
}

function renderV2() {
  const open    = tasks.filter(x => !x.done);
  const overdue = open.filter(isTaskOverdue);
  el('v2-total').textContent   = tasks.length;
  el('v2-open').textContent    = open.length;
  el('v2-overdue').textContent = overdue.length;
  el('v2-done').textContent    = getClosedItems().length;
  el('v2-board-toggle').textContent = showV2Board ? 'Hide Board' : 'Show Board';
  el('v2-overdue-stat').classList.toggle('alert', overdue.length > 0);

  renderV2Timeline(open);

  const host = el('v2-list');
  host.innerHTML = '';
  if (!showV2Board) {
    const e = document.createElement('div'); e.className = 'empty';
    e.textContent = 'board hidden — use Show Board for drag/drop or category management';
    host.appendChild(e);
    return;
  }
  if (!open.length) {
    const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'no open tasks yet';
    host.appendChild(e);
    return;
  }
  CATEGORIES.forEach(cat => {
    const list    = open.filter(t => t.cat === cat).sort((a, b) => (a.order || 0) - (b.order || 0));
    const section = document.createElement('section'); section.className = 'v2-col';
    section.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    section.addEventListener('drop',     e => { e.preventDefault(); const id = Number(e.dataTransfer.getData('text/plain')); if (Number.isFinite(id)) reorderTask(id, cat, null); });
    const hd    = document.createElement('div'); hd.className = 'v2-col-hd';
    const h3    = document.createElement('h3');  h3.textContent = LABELS[cat];
    const count = document.createElement('span'); count.textContent = list.length;
    hd.appendChild(h3); hd.appendChild(count);
    section.appendChild(hd);
    if (!list.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'nothing here yet'; section.appendChild(e); }
    else list.forEach(t => section.appendChild(makeV2TaskCard(t, cat)));
    host.appendChild(section);
  });
}

// ---------------------------------------------------------------------------
// Bootstrap: wire static buttons via addEventListener
// ---------------------------------------------------------------------------
function wireStaticEvents() {
  // View switch
  el('view-v1-btn').addEventListener('click', () => setView('v1'));
  el('view-v2-btn').addEventListener('click', () => setView('v2'));

  // V1 add + category pills
  el('add-btn-v1').addEventListener('click', addTask);
  el('ni').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  el('p-working').addEventListener('click', () => selCat('working'));
  el('p-asap').addEventListener('click',    () => selCat('asap'));
  el('p-later').addEventListener('click',   () => selCat('later'));

  // V1 footer
  el('tgl-closed').addEventListener('click',  toggleClosed);
  el('clear-done-v1').addEventListener('click', clearDone);

  // V2 add
  el('add-btn-v2').addEventListener('click', addTaskFromV2);
  el('ni2').addEventListener('keydown', e => { if (e.key === 'Enter') addTaskFromV2(); });

  // V2 timeline mode
  el('timeline-list-btn').addEventListener('click',     () => setTimelineMode('list'));
  el('timeline-swimlane-btn').addEventListener('click', () => setTimelineMode('swimlane'));

  // V2 week nav
  el('week-prev').addEventListener('click',  () => { swimlaneWeekOffset -= 1; render(); });
  el('week-today').addEventListener('click', () => { swimlaneWeekOffset  = 0; render(); });
  el('week-next').addEventListener('click',  () => { swimlaneWeekOffset += 1; render(); });

  // V2 focus panel
  el('focus-close').addEventListener('click', closeTimelinePanel);
  el('focus-save').addEventListener('click',  saveTimelinePanelDetails);

  // V2 board toggle
  el('v2-board-toggle').addEventListener('click', toggleV2Board);

  // V2 footer
  el('tgl-closed-2').addEventListener('click',  toggleClosed);
  el('clear-done-v2').addEventListener('click', clearDone);
}

wireStaticEvents();
loadTasks();
