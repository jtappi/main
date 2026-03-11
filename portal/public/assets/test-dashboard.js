'use strict';

// ── State ──────────────────────────────────────────────────────
let allRuns = [];
let days = 7;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  await loadRuns();
  document.getElementById('days-select').addEventListener('change', e => {
    days = parseInt(e.target.value, 10);
    render();
  });
  document.getElementById('logout-btn').addEventListener('click', logout);
});

async function checkSession() {
  const res = await fetch('/auth/session');
  const data = await res.json();
  if (!data.authenticated || data.user.role !== 'admin') {
    window.location.href = '/dashboard';
    return;
  }
  document.getElementById('user-name').textContent = data.user.name;
}

async function loadRuns() {
  try {
    const res = await fetch('/api/test-runs');
    if (!res.ok) throw new Error('Failed to fetch');
    allRuns = await res.json();
    render();
  } catch (err) {
    console.error(err);
  }
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

// ── Filter ─────────────────────────────────────────────────────
function filteredRuns() {
  if (!days) return [...allRuns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return allRuns
    .filter(r => new Date(r.timestamp) >= cutoff)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Render orchestrator ─────────────────────────────────────────
function render() {
  const runs = filteredRuns();
  renderHealth(runs);
  renderPassFailChart(runs);
  renderDurationChart('chart-unit-duration', 'chart-unit-duration-empty', runs, 'unit');
  renderDurationChart('chart-int-duration', 'chart-int-duration-empty', runs, 'integration');
  renderSuiteBreakdown(runs);
  renderHistory(runs);
}

// ── Health indicators ───────────────────────────────────────────
function renderHealth(runs) {
  const pctEl  = document.getElementById('health-pct');
  const subEl  = document.getElementById('health-sub');
  const totEl  = document.getElementById('total-runs');
  const runSub = document.getElementById('runs-sub');
  const lastEl = document.getElementById('last-run');
  const lastSub = document.getElementById('last-run-sub');
  const avgEl  = document.getElementById('avg-duration');

  if (!runs.length) {
    pctEl.textContent = '—';
    totEl.textContent = '0';
    lastEl.textContent = '—';
    avgEl.textContent = '—';
    return;
  }

  const passed = runs.filter(r => r.overall === 'pass').length;
  const pct = Math.round((passed / runs.length) * 100);
  pctEl.textContent = pct + '%';
  pctEl.className = 'td-health-value' + (pct === 100 ? ' health-good' : pct >= 80 ? ' health-warn' : ' health-bad');
  subEl.textContent = `${passed} of ${runs.length} passed`;

  totEl.textContent = runs.length;
  const failing = runs.filter(r => r.overall !== 'pass').length;
  runSub.textContent = failing ? `${failing} failing` : 'all passing';

  const latest = runs[0];
  const lastDate = new Date(latest.timestamp);
  lastEl.textContent = lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  lastSub.textContent = lastDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const avgMs = runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / runs.length;
  avgEl.textContent = (avgMs / 1000).toFixed(1) + 's';
}

// ── Pass/Fail bar chart ─────────────────────────────────────────
function renderPassFailChart(runs) {
  const canvas = document.getElementById('chart-passfail');
  const empty  = document.getElementById('chart-passfail-empty');

  if (!runs.length) {
    canvas.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  canvas.classList.remove('hidden');
  empty.classList.add('hidden');

  // Group by date
  const byDate = {};
  for (const r of runs) {
    const d = new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!byDate[d]) byDate[d] = { pass: 0, fail: 0 };
    r.overall === 'pass' ? byDate[d].pass++ : byDate[d].fail++;
  }
  const labels = Object.keys(byDate).reverse();
  const passes = labels.map(d => byDate[d].pass);
  const fails  = labels.map(d => byDate[d].fail);

  drawBarChart(canvas, labels, [
    { values: passes, color: '#6dcfaa' },
    { values: fails,  color: '#e05c6a' }
  ], { stacked: true, yLabel: 'runs' });
}

// ── Duration line chart ─────────────────────────────────────────
function renderDurationChart(canvasId, emptyId, runs, suite) {
  const canvas = document.getElementById(canvasId);
  const empty  = document.getElementById(emptyId);

  const withData = runs
    .filter(r => r.suites && r.suites[suite] && r.suites[suite].duration_ms > 0)
    .slice()
    .reverse();

  if (!withData.length) {
    canvas.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  canvas.classList.remove('hidden');
  empty.classList.add('hidden');

  const labels = withData.map(r =>
    new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  );
  const values = withData.map(r => parseFloat((r.suites[suite].duration_ms / 1000).toFixed(2)));

  drawLineChart(canvas, labels, values, '#4fb8c4');
}

// ── Suite breakdown ─────────────────────────────────────────────
function renderSuiteBreakdown(runs) {
  const last = runs[0];
  const set = (id, val) => { document.getElementById(id).textContent = val; };
  if (!last) {
    set('suite-unit-passed', '—'); set('suite-unit-failed', '—');
    set('suite-int-passed',  '—'); set('suite-int-failed',  '—');
    return;
  }
  const u = last.suites.unit        || {};
  const i = last.suites.integration || {};
  set('suite-unit-passed', u.passed ?? '—');
  set('suite-unit-failed', u.failed ?? '—');
  set('suite-int-passed',  i.passed ?? '—');
  set('suite-int-failed',  i.failed ?? '—');
}

// ── Run history table ───────────────────────────────────────────
function renderHistory(runs) {
  const tbody   = document.getElementById('history-tbody');
  const empty   = document.getElementById('history-empty');
  const countEl = document.getElementById('history-count');

  countEl.textContent = runs.length ? `${runs.length} run${runs.length === 1 ? '' : 's'}` : '';

  if (!runs.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = '';
  runs.forEach((run, idx) => {
    const allErrors = [
      ...(run.suites.unit?.errors || []),
      ...(run.suites.integration?.errors || [])
    ];
    const hasErrors = allErrors.length > 0;
    const statusClass = run.overall === 'pass' ? 'pass' : run.overall === 'error' ? 'error' : 'fail';
    const date = new Date(run.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const durStr  = run.duration_ms ? (run.duration_ms / 1000).toFixed(1) + 's' : '—';

    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td><span class="td-status-badge td-status-badge--${statusClass}">${run.overall}</span></td>
      <td>${dateStr} <span style="color:var(--text-muted);font-size:0.8em">${timeStr}</span></td>
      <td>${run.branch}</td>
      <td><code>${run.commit}</code></td>
      <td>${run.actor}</td>
      <td>${run.totalPassed ?? '—'}</td>
      <td>${run.totalFailed ?? '—'}</td>
      <td>${durStr}</td>
      <td>${hasErrors ? `<button class="td-expand-btn" data-idx="${idx}">&#9660; Errors</button>` : ''}</td>
    `;
    tbody.appendChild(tr);

    if (hasErrors) {
      const errRow = document.createElement('tr');
      errRow.className = 'td-error-row hidden';
      errRow.dataset.errFor = idx;
      const errHtml = allErrors.map(e =>
        `<li class="td-error-item"><strong>${escHtml(e.test)}</strong>${escHtml(e.message)}</li>`
      ).join('');
      errRow.innerHTML = `<td colspan="9"><ul class="td-error-list">${errHtml}</ul></td>`;
      tbody.appendChild(errRow);
    }
  });

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.td-expand-btn');
    if (!btn) return;
    const idx = btn.dataset.idx;
    const errRow = tbody.querySelector(`[data-err-for="${idx}"]`);
    if (!errRow) return;
    errRow.classList.toggle('hidden');
    btn.innerHTML = errRow.classList.contains('hidden') ? '&#9660; Errors' : '&#9650; Errors';
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Canvas chart primitives ─────────────────────────────────────
function drawBarChart(canvas, labels, series, opts = {}) {
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.offsetWidth  || canvas.parentElement.offsetWidth || 600;
  const H      = parseInt(canvas.getAttribute('height')) || 180;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 36, left: 40 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const maxVal = opts.stacked
    ? Math.max(...labels.map((_, i) => series.reduce((s, sr) => s + sr.values[i], 0)))
    : Math.max(...series.flatMap(sr => sr.values));
  const yMax = Math.max(maxVal, 1);

  // Grid lines
  ctx.strokeStyle = '#e2eaf2';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i / 4) * cH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#6b7f96';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 4) * yMax), pad.left - 6, y + 3);
  }

  const barW = Math.max(4, (cW / labels.length) * 0.6);
  const gap  = cW / labels.length;

  labels.forEach((label, i) => {
    const x = pad.left + i * gap + gap / 2;
    let yBase = pad.top + cH;

    series.forEach(sr => {
      const val = sr.values[i] || 0;
      const bH  = (val / yMax) * cH;
      ctx.fillStyle = sr.color;
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, yBase - bH, barW, bH, 2);
      ctx.fill();
      if (opts.stacked) yBase -= bH;
    });

    ctx.fillStyle = '#6b7f96';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, H - 6);
  });
}

function drawLineChart(canvas, labels, values, color) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth || canvas.parentElement.offsetWidth || 400;
  const H   = parseInt(canvas.getAttribute('height')) || 150;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const yMax = Math.max(...values) * 1.15 || 1;

  // Grid lines
  ctx.strokeStyle = '#e2eaf2';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i / 4) * cH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = '#6b7f96';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((((i / 4) * yMax)).toFixed(1), pad.left - 6, y + 3);
  }

  if (values.length < 2) {
    // Single point — just draw a dot
    const x = pad.left + cW / 2;
    const y = pad.top + cH - (values[0] / yMax) * cH;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b7f96';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[0], x, H - 6);
    return;
  }

  const pts = values.map((v, i) => ({
    x: pad.left + (i / (values.length - 1)) * cW,
    y: pad.top  + cH - (v / yMax) * cH
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = color + '22';
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // X labels — show max 8 to avoid crowding
  const step = Math.ceil(labels.length / 8);
  ctx.fillStyle = '#6b7f96';
  ctx.font = '10px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    if (i % step !== 0 && i !== labels.length - 1) return;
    ctx.fillText(l, pts[i].x, H - 6);
  });
}
