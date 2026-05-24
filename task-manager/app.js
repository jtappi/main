// State
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
// e.g. http://localhost:3000/task-manager/  -> '/task-manager'
//      http://localhost:3004/               -> ''
const API_BASE = (function () {
  const p = window.location.pathname.replace(/\/$/, '');
  return p.endsWith('/task-manager') ? p : '';
}());

const LABELS = { working: 'Working on', asap: 'Do ASAP', later: 'Do Later' };
const LIST_IDS = { working: 'lw', asap: 'la', later: 'll' };
const COUNT_IDS = { working: 'cw', asap: 'ca', later: 'cl' };
const CATEGORIES = ['working', 'asap', 'later'];

function parseTags(input) {
  if (Array.isArray(input)) return input.map(x => String(x).trim()).filter(Boolean).slice(0, 12);
  if (typeof input === 'string') return input.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
  return [];
}

function normalizeTask(raw, fallbackId) {
  const cat = CATEGORIES.includes(raw?.cat) ? raw.cat : 'working';
  const created = raw?.created || new Date().toISOString();
  return {
    id: Number.isFinite(Number(raw?.id)) ? Number(raw.id) : fallbackId,
    text: String(raw?.text || '').trim(),
    cat,
    done: Boolean(raw?.done),
    created,
    completedAt: raw?.completedAt || null,
    owner: String(raw?.owner || '').trim(),
    dueDate: typeof raw?.dueDate === 'string' ? raw.dueDate : '',
    tags: parseTags(raw?.tags),
    notes: String(raw?.notes || ''),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : null
  };
}

function normalizeAllTasks() {
  tasks = tasks.map((t, i) => normalizeTask(t, Date.now() + i)).filter(t => t.text.length > 0);
  CATEGORIES.forEach(cat => {
    const inCat = tasks.filter(t => t.cat === cat).sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bo = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return new Date(a.created).getTime() - new Date(b.created).getTime();
    });
    inCat.forEach((t, idx) => { t.order = idx + 1; });
  });
}

function nextOrder(cat) {
  const orders = tasks.filter(t => t.cat === cat).map(t => Number(t.order) || 0);
  return (orders.length ? Math.max(...orders) : 0) + 1;
}

async function loadTasks() {
  try {
    const res = await fetch(API_BASE + '/api/tasks');
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload)) { tasks = payload; closedLog = []; }
      else { tasks = Array.isArray(payload.tasks) ? payload.tasks : []; closedLog = Array.isArray(payload.closedLog) ? payload.closedLog : []; }
      normalizeAllTasks();
      showStatus('loaded ' + tasks.length + ' active task' + (tasks.length !== 1 ? 's' : ''));
    }
  } catch (e) { showStatus('could not load tasks - is the server running?'); }
  render();
}

async function saveTasks() {
  try {
    const res = await fetch(API_BASE + '/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks, closedLog }) });
    if (res.ok) { const t = new Date(); showStatus('saved ' + t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); }
    else showStatus('save failed');
  } catch (e) { showStatus('could not save - is the server running?'); }
}

function showStatus(msg) { document.getElementById('sv').textContent = msg; }

function selCat(cat) {
  currentCat = cat;
  ['working', 'asap', 'later'].forEach(k => {
    const el = document.getElementById('p-' + k);
    el.className = 'pill p' + k[0] + (k === cat ? ' active' : '');
  });
}

function addTask() {
  const inp = document.getElementById('ni');
  const text = inp.value.trim();
  if (!text) return;
  createTask(text, currentCat);
  inp.value = ''; inp.focus();
}

function addTaskFromV2() {
  const inp = document.getElementById('ni2');
  const sel = document.getElementById('cat2');
  const dateInput = document.getElementById('date2');
  const text = inp.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, cat: sel.value, done: false, created: new Date().toISOString(), completedAt: null, owner: '', dueDate: dateInput.value || '', tags: [], notes: '', order: nextOrder(sel.value) });
  inp.value = ''; dateInput.value = ''; inp.focus();
  render(); saveTasks();
}

function createTask(text, cat) {
  tasks.push({ id: Date.now(), text, cat, done: false, created: new Date().toISOString(), completedAt: null, owner: '', dueDate: '', tags: [], notes: '', order: nextOrder(cat) });
  render(); saveTasks();
}

function setView(view) { activeView = view === 'v2' ? 'v2' : 'v1'; render(); }
function setTimelineMode(mode) { timelineMode = mode === 'swimlane' ? 'swimlane' : 'list'; render(); }
function shiftSwimlaneWeek(delta) { swimlaneWeekOffset += delta; render(); }
function jumpToCurrentSwimlaneWeek() { swimlaneWeekOffset = 0; render(); }
function toggleV2Board() { showV2Board = !showV2Board; render(); }
function openTimelinePanel(taskId) { timelinePanelTaskId = taskId; render(); }
function closeTimelinePanel() { timelinePanelTaskId = null; render(); }

function saveTimelinePanelDetails() {
  if (!timelinePanelTaskId) return;
  const t = tasks.find(x => x.id === timelinePanelTaskId && !x.done);
  if (!t) return;
  t.owner = (document.getElementById('focus-owner') || {}).value?.trim() || '';
  t.dueDate = (document.getElementById('focus-due') || {}).value || '';
  t.tags = parseTags((document.getElementById('focus-tags') || {}).value || '');
  t.notes = (document.getElementById('focus-notes') || {}).value?.trim() || '';
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
  if (t) { const old = t.cat; t.cat = newCat; t.order = nextOrder(newCat); resequenceCategory(old); resequenceCategory(newCat); render(); saveTasks(); }
}

function reopenTask(id, source) {
  if (source === 'active') {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = false; t.completedAt = null; render(); saveTasks(); return;
  }
  const idx = closedLog.findIndex(x => x.id === id);
  if (idx === -1) return;
  const a = closedLog[idx];
  const cat = CATEGORIES.includes(a.cat) ? a.cat : 'working';
  tasks.push({ id: a.id, text: a.text, cat, done: false, created: a.created || new Date().toISOString(), completedAt: null, owner: String(a.owner || '').trim(), dueDate: typeof a.dueDate === 'string' ? a.dueDate : '', tags: parseTags(a.tags), notes: String(a.notes || ''), order: nextOrder(cat) });
  closedLog.splice(idx, 1); render(); saveTasks();
}

function clearDone() {
  const done = tasks.filter(x => x.done);
  if (!done.length) return;
  if (confirm('Remove ' + done.length + ' completed task' + (done.length !== 1 ? 's' : '') + '?')) {
    const now = new Date().toISOString();
    done.forEach(t => closedLog.push({ id: t.id, text: t.text, cat: t.cat, created: t.created, completedAt: t.completedAt || now, archivedAt: now, owner: t.owner || '', dueDate: t.dueDate || '', tags: parseTags(t.tags), notes: t.notes || '' }));
    tasks = tasks.filter(x => !x.done); render(); saveTasks();
  }
}

function toggleClosed() { showClosed = !showClosed; render(); }

function fmtWhen(iso) {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'n/a' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getClosedItems() {
  const fromActive = tasks.filter(x => x.done).map(x => ({ ...x, archivedAt: null, source: 'active' }));
  const fromAudit = closedLog.map(x => ({ ...x, source: 'audit' }));
  return [...fromActive, ...fromAudit].sort((a, b) => new Date(b.completedAt || b.archivedAt || 0) - new Date(a.completedAt || a.archivedAt || 0));
}

function resequenceCategory(cat) {
  tasks.filter(t => t.cat === cat).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((t, i) => { t.order = i + 1; });
}

function setEditingTask(id) { editingTaskId = id; render(); }
function cancelEditingTask() { editingTaskId = null; render(); }

function saveTaskDetails(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const next = (document.getElementById('edit-text-' + id) || {}).value?.trim();
  if (!next) return;
  t.text = next;
  t.owner = (document.getElementById('edit-owner-' + id) || {}).value?.trim() || '';
  t.dueDate = (document.getElementById('edit-due-' + id) || {}).value || '';
  t.tags = parseTags((document.getElementById('edit-tags-' + id) || {}).value || '');
  t.notes = (document.getElementById('edit-notes-' + id) || {}).value?.trim() || '';
  editingTaskId = null; render(); saveTasks();
}

function onDragStart(ev, id) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(id)); }
function onDragOver(ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; }
function onDropCard(ev, cat, tid) { ev.preventDefault(); const id = Number(ev.dataTransfer.getData('text/plain')); if (Number.isFinite(id)) reorderTask(id, cat, tid); }
function onDropColumn(ev, cat) { ev.preventDefault(); const id = Number(ev.dataTransfer.getData('text/plain')); if (Number.isFinite(id)) reorderTask(id, cat, null); }

function reorderTask(draggedId, targetCat, targetId) {
  const dragged = tasks.find(t => t.id === draggedId && !t.done);
  if (!dragged) return;
  const src = dragged.cat;
  dragged.cat = targetCat;
  const list = tasks.filter(t => !t.done && t.cat === targetCat && t.id !== draggedId).sort((a, b) => (a.order || 0) - (b.order || 0));
  let at = list.length;
  if (targetId !== null) { const i = list.findIndex(t => t.id === targetId); at = i === -1 ? list.length : i; }
  list.splice(at, 0, dragged);
  list.forEach((t, i) => { t.order = i + 1; });
  if (src !== targetCat) resequenceCategory(src);
  render(); saveTasks();
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

function dueDateState(d) {
  if (!d) return { label: 'No due date', cls: 'due-none', rank: 5 };
  const due = new Date(d + 'T00:00:00');
  if (isNaN(due.getTime())) return { label: 'No due date', cls: 'due-none', rank: 5 };
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return { label: Math.abs(diff) + 'd overdue', cls: 'due-overdue', rank: 1 };
  if (diff === 0) return { label: 'Due today', cls: 'due-today', rank: 2 };
  if (diff <= 2) return { label: 'Due in ' + diff + 'd', cls: 'due-soon', rank: 3 };
  return { label: 'Due in ' + diff + 'd', cls: 'due-later', rank: 4 };
}

function isTaskOverdue(t) {
  if (!t?.dueDate) return false;
  const due = new Date(t.dueDate + 'T00:00:00');
  if (isNaN(due.getTime())) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return due < today;
}

function fmtDateOnly(d) {
  if (!d) return 'No date';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? 'No date' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getStartOfWeekMonday(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return dt;
}

function formatWeekRange(mon) {
  const fri = new Date(mon); fri.setDate(fri.getDate() + 4);
  return mon.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' - ' + fri.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function createTimelineItemCard(t, opts = {}) {
  const item = document.createElement('div');
  const due = dueDateState(t.dueDate);
  const dateLabel = opts.dateLabel || (t.dueDate ? fmtDateOnly(t.dueDate) : 'No Date');
  item.className = 'v2-time-item' + (opts.noDate ? ' no-date' : '') + (timelinePanelTaskId === t.id ? ' is-active' : '');
  item.setAttribute('role', 'button'); item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', 'Open details for ' + t.text);
  item.innerHTML = '<div class="v2-time-date">' + esc(dateLabel) + '</div><div class="v2-time-body"><div class="v2-time-title">' + esc(t.text) + '</div><div class="v2-time-meta"><span class="due-pill ' + due.cls + '">' + esc(due.label) + '</span><span>' + LABELS[t.cat] + '</span>' + (t.owner ? '<span>Owner: ' + esc(t.owner) + '</span>' : '') + '</div></div>';
  item.addEventListener('click', () => openTimelinePanel(t.id));
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTimelinePanel(t.id); } });
  return item;
}

function renderTimelineNoDateGroup(host, undated) {
  if (!undated.length) return;
  const hdr = document.createElement('div');
  hdr.className = 'v2-time-group v2-nodate-toggle';
  hdr.style.cssText = 'cursor:pointer;display:flex;justify-content:space-between;align-items:center';
  hdr.innerHTML = 'No Date <span style="font-size:11px;color:#aaa">' + undated.length + '</span>';
  hdr.onclick = () => { noDateCollapsed = !noDateCollapsed; render(); };
  host.appendChild(hdr);
  if (!noDateCollapsed) undated.forEach(t => host.appendChild(createTimelineItemCard(t, { noDate: true, dateLabel: 'No Date' })));
}

function renderV2TimelineList(host, open) {
  const dated = open.filter(t => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const overdue = dated.filter(isTaskOverdue);
  const upcoming = dated.filter(t => !isTaskOverdue(t));
  const undated = open.filter(t => !t.dueDate).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!dated.length && !undated.length) { host.innerHTML = '<div class="empty">no open tasks for timeline</div>'; return; }
  host.innerHTML = '';
  if (overdue.length) { const h = document.createElement('div'); h.className = 'v2-time-group'; h.textContent = 'Overdue'; host.appendChild(h); }
  overdue.forEach(t => host.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
  if (upcoming.length) { const h = document.createElement('div'); h.className = 'v2-time-group'; h.textContent = 'Upcoming'; host.appendChild(h); }
  upcoming.forEach(t => host.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
  renderTimelineNoDateGroup(host, undated);
}

function renderV2TimelineSwimlane(host, open, monday) {
  const days = [{ key:1, label:'Mon' }, { key:2, label:'Tue' }, { key:3, label:'Wed' }, { key:4, label:'Thu' }, { key:5, label:'Fri' }];
  const fri = addDays(monday, 4);
  const monT = monday.getTime(), friT = fri.getTime();
  const lanes = { 1:[], 2:[], 3:[], 4:[], 5:[] };
  const undated = [];
  open.forEach(t => {
    if (!t.dueDate) { undated.push(t); return; }
    const d = new Date(t.dueDate + 'T00:00:00');
    if (isNaN(d.getTime())) { undated.push(t); return; }
    const dt = d.getTime();
    if (dt < monT || dt > friT) return;
    const wk = d.getDay();
    if (wk >= 1 && wk <= 5) lanes[wk].push(t);
  });
  const sortFn = (a, b) => { const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : 1e15; const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : 1e15; return ao !== bo ? ao - bo : new Date(a.created) - new Date(b.created); };
  days.forEach(d => lanes[d.key].sort(sortFn));
  undated.sort(sortFn);
  const swim = document.createElement('div'); swim.className = 'v2-swimlane';
  const overdueAll = open.filter(isTaskOverdue).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  days.forEach((day, idx) => {
    const date = addDays(monday, idx);
    const lane = document.createElement('div'); lane.className = 'v2-lane';
    lane.innerHTML = '<div class="v2-lane-hd"><strong>' + day.label + '</strong><span>' + esc(date.toLocaleDateString([], { month:'short', day:'numeric' })) + '</span></div><div class="v2-lane-list" id="v2-lane-' + day.label.toLowerCase() + '"></div>';
    const lh = lane.querySelector('.v2-lane-list');
    const lt = lanes[day.key];
    if (!lt.length) lh.innerHTML = '<div class="v2-lane-empty">No due tasks</div>';
    else lt.forEach(t => lh.appendChild(createTimelineItemCard(t, { dateLabel: day.label })));
    swim.appendChild(lane);
  });
  host.innerHTML = '';
  if (overdueAll.length) {
    const ow = document.createElement('div'); ow.className = 'v2-overdue-strip';
    ow.innerHTML = '<div class="v2-time-group">Overdue Across All Weeks</div>';
    overdueAll.slice(0, 6).forEach(t => ow.appendChild(createTimelineItemCard(t, { dateLabel: fmtDateOnly(t.dueDate) })));
    host.appendChild(ow);
  }
  host.appendChild(swim);
  if (undated.length) { const w = document.createElement('div'); w.className = 'v2-swimlane-undated'; renderTimelineNoDateGroup(w, undated); host.appendChild(w); }
}

function renderTimelinePanel() {
  const wrap = document.getElementById('v2-focus-wrap');
  const t = tasks.find(x => x.id === timelinePanelTaskId && !x.done);
  if (!t || activeView !== 'v2') { wrap.classList.add('hide'); return; }
  wrap.classList.remove('hide');
  document.getElementById('v2-focus-title').textContent = t.text;
  document.getElementById('v2-focus-meta').textContent = LABELS[t.cat] + ' · ' + dueDateState(t.dueDate).label;
  document.getElementById('focus-owner').value = t.owner || '';
  document.getElementById('focus-due').value = t.dueDate || '';
  document.getElementById('focus-tags').value = (t.tags || []).join(', ');
  document.getElementById('focus-notes').value = t.notes || '';
}

function renderV2Timeline(open) {
  const host = document.getElementById('v2-timeline');
  const weekLabel = document.getElementById('v2-week-label');
  const weekRow = document.getElementById('v2-week-row');
  document.getElementById('timeline-list-btn').classList.toggle('active', timelineMode === 'list');
  document.getElementById('timeline-swimlane-btn').classList.toggle('active', timelineMode === 'swimlane');
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

function render() {
  document.getElementById('view-v1').classList.toggle('hide', activeView !== 'v1');
  document.getElementById('view-v2').classList.toggle('hide', activeView !== 'v2');
  document.getElementById('view-v1-btn').classList.toggle('active', activeView === 'v1');
  document.getElementById('view-v2-btn').classList.toggle('active', activeView === 'v2');

  ['working', 'asap', 'later'].forEach(cat => {
    const items = tasks.filter(x => x.cat === cat && !x.done);
    document.getElementById(COUNT_IDS[cat]).textContent = items.length;
    const el = document.getElementById(LIST_IDS[cat]);
    if (!items.length) { el.innerHTML = '<div class="empty">nothing here yet</div>'; return; }
    const others = CATEGORIES.filter(c => c !== cat);
    el.innerHTML = '';
    items.forEach(t => {
      const d = document.createElement('div'); d.className = 'task';
      d.innerHTML = '<div class="chk" onclick="toggleDone(' + t.id + ')"></div><div class="tbody"><div class="ttxt">' + esc(t.text) + '</div><div class="tmeta"><button class="mvbtn" onclick="moveTo(' + t.id + ',\'' + others[0] + '\')">-&gt; ' + LABELS[others[0]] + '</button><button class="mvbtn" onclick="moveTo(' + t.id + ',\'' + others[1] + '\')">-&gt; ' + LABELS[others[1]] + '</button></div></div><button class="delbtn" title="Delete" onclick="deleteTask(' + t.id + ')">✕</button>';
      el.appendChild(d);
    });
  });

  renderV2(); renderTimelinePanel();

  const closed = getClosedItems();
  const cb1 = document.getElementById('tgl-closed'), cw1 = document.getElementById('closed-wrap'), cl1 = document.getElementById('closed-list');
  const cb2 = document.getElementById('tgl-closed-2'), cw2 = document.getElementById('closed-wrap-2'), cl2 = document.getElementById('closed-list-2');
  const label = (showClosed ? 'Hide' : 'Show') + ' closed tasks (' + closed.length + ')';
  cb1.textContent = cb2.textContent = label;
  cw1.classList.toggle('hide', !showClosed); cw2.classList.toggle('hide', !showClosed);
  if (!showClosed) return;
  if (!closed.length) { cl1.innerHTML = cl2.innerHTML = '<div class="empty">no closed tasks yet</div>'; return; }
  cl1.innerHTML = cl2.innerHTML = '';
  closed.forEach(t => {
    const html = '<div class="chk on"></div><div class="tbody"><div class="ttxt done">' + esc(t.text) + '</div><div class="cmeta">Closed: ' + fmtWhen(t.completedAt) + ' &middot; Category: ' + LABELS[t.cat] + (t.archivedAt ? ' &middot; Archived: ' + fmtWhen(t.archivedAt) : '') + '</div><div class="tmeta"><button class="mvbtn" onclick="reopenTask(' + t.id + ',\'' + t.source + '\')">Mark not done</button></div></div>';
    const d1 = document.createElement('div'); d1.className = 'task closed-task'; d1.innerHTML = html; cl1.appendChild(d1);
    const d2 = document.createElement('div'); d2.className = 'task closed-task'; d2.innerHTML = html; cl2.appendChild(d2);
  });
}

function renderV2() {
  const open = tasks.filter(x => !x.done);
  const overdue = open.filter(isTaskOverdue);
  document.getElementById('v2-total').textContent = tasks.length;
  document.getElementById('v2-open').textContent = open.length;
  document.getElementById('v2-overdue').textContent = overdue.length;
  document.getElementById('v2-done').textContent = getClosedItems().length;
  document.getElementById('v2-board-toggle').textContent = showV2Board ? 'Hide Board' : 'Show Board';
  document.getElementById('v2-overdue-stat').classList.toggle('alert', overdue.length > 0);
  renderV2Timeline(open);
  const host = document.getElementById('v2-list');
  if (!showV2Board) { host.innerHTML = '<div class="empty">board hidden - use Show Board for drag/drop or category management</div>'; return; }
  if (!open.length) { host.innerHTML = '<div class="empty">no open tasks yet</div>'; return; }
  host.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const list = open.filter(t => t.cat === cat).sort((a, b) => (a.order || 0) - (b.order || 0));
    const section = document.createElement('section'); section.className = 'v2-col';
    section.setAttribute('ondragover', 'onDragOver(event)'); section.setAttribute('ondrop', 'onDropColumn(event,\'' + cat + '\')');
    let body = '<div class="v2-col-hd"><h3>' + LABELS[cat] + '</h3><span>' + list.length + '</span></div>';
    if (!list.length) { body += '<div class="empty">nothing here yet</div>'; }
    else {
      list.forEach(t => {
        const others = CATEGORIES.filter(c => c !== cat);
        const editing = editingTaskId === t.id;
        const due = dueDateState(t.dueDate);
        const tagsText = (t.tags || []).join(', ');
        const ownerLabel = t.owner ? esc(t.owner) : 'Unassigned';
        const tagsLabel = t.tags && t.tags.length ? esc(t.tags.join(', ')) : 'None';
        let det = editing
          ? '<details class="v2-details" open><summary>Editing</summary><div class="v2-edit-grid"><label>Task text<input id="edit-text-' + t.id + '" value="' + escAttr(t.text) + '" /></label><label>Owner<input id="edit-owner-' + t.id + '" value="' + escAttr(t.owner || '') + '" placeholder="Name" /></label><label>Due date<input id="edit-due-' + t.id + '" type="date" value="' + escAttr(t.dueDate || '') + '" /></label><label>Tags<input id="edit-tags-' + t.id + '" value="' + escAttr(tagsText) + '" placeholder="risk, rollout" /></label><label class="full">Notes<textarea id="edit-notes-' + t.id + '" rows="3">' + esc(t.notes || '') + '</textarea></label><div class="v2-edit-actions full"><button class="mvbtn" onclick="saveTaskDetails(' + t.id + ')">Save</button><button class="mvbtn" onclick="cancelEditingTask()">Cancel</button></div></div></details>'
          : '<details class="v2-details"><summary>More</summary><div class="v2-detail-grid"><div class="v2-detail-row"><span>Owner</span><strong>' + esc(t.owner || 'Unassigned') + '</strong></div><div class="v2-detail-row"><span>Due</span><strong>' + esc(t.dueDate ? fmtDateOnly(t.dueDate) : 'None') + '</strong></div><div class="v2-detail-row"><span>Tags</span><strong>' + esc(t.tags && t.tags.length ? t.tags.join(', ') : 'None') + '</strong></div><div class="v2-detail-notes">' + esc(t.notes || 'No notes yet') + '</div></div></details>';
        body += '<article class="v2-task' + (isTaskOverdue(t) ? ' overdue' : '') + '" draggable="true" ondragstart="onDragStart(event,' + t.id + ')" ondragover="onDragOver(event)" ondrop="onDropCard(event,\'' + cat + '\',' + t.id + ')"><button class="chk" onclick="toggleDone(' + t.id + ')" aria-label="Mark done"></button><div class="tbody"><div class="v2-task-top"><div class="ttxt">' + esc(t.text) + '</div><span class="due-pill ' + due.cls + '">' + esc(due.label) + '</span></div><div class="v2-line"><span class="mini-chip">Owner: ' + ownerLabel + '</span><span class="mini-chip">Tags: ' + tagsLabel + '</span></div><div class="tmeta"><button class="mvbtn" onclick="moveTo(' + t.id + ',\'' + others[0] + '\')">To ' + LABELS[others[0]] + '</button><button class="mvbtn" onclick="moveTo(' + t.id + ',\'' + others[1] + '\')">To ' + LABELS[others[1]] + '</button><button class="mvbtn" onclick="setEditingTask(' + t.id + ')">Edit</button></div>' + det + '</div><button class="delbtn" title="Delete" onclick="deleteTask(' + t.id + ')">✕</button></article>';
      });
    }
    section.innerHTML = body; host.appendChild(section);
  });
}

document.getElementById('ni').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
document.getElementById('ni2').addEventListener('keydown', e => { if (e.key === 'Enter') addTaskFromV2(); });

loadTasks();
