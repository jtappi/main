'use strict';

// Per-project icon SVGs keyed by project id.
// Add a new entry here when a new project is added to projects.json.
const PROJECT_ICONS = {
  trackmyweek: `
    <svg class="project-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="18" width="90" height="77" rx="10" fill="#6b7f96"/>
      <rect x="5" y="28" width="90" height="67" rx="8" fill="#fff"/>
      <rect x="5" y="28" width="90" height="18" fill="#6b7f96"/>
      <rect x="25" y="10" width="10" height="20" rx="5" fill="#4fb8c4"/>
      <rect x="65" y="10" width="10" height="20" rx="5" fill="#4fb8c4"/>
      <line x1="5" y1="60" x2="95" y2="60" stroke="#d0dce8" stroke-width="2"/>
      <line x1="5" y1="76" x2="95" y2="76" stroke="#d0dce8" stroke-width="2"/>
      <line x1="32" y1="46" x2="32" y2="92" stroke="#d0dce8" stroke-width="2"/>
      <line x1="52" y1="46" x2="52" y2="92" stroke="#d0dce8" stroke-width="2"/>
      <line x1="72" y1="46" x2="72" y2="92" stroke="#d0dce8" stroke-width="2"/>
      <polyline points="22,68 34,80 58,52" stroke="#4fb8c4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `,
  bptracker: `
    <svg class="project-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 85 C50 85 15 62 15 38 C15 26 24 18 35 18 C42 18 48 22 50 27 C52 22 58 18 65 18 C76 18 85 26 85 38 C85 62 50 85 50 85 Z"
            fill="#ef4444"/>
    </svg>
  `,
};

// Fallback icon for any project id not listed above
const DEFAULT_ICON = `
  <svg class="project-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="18" width="90" height="77" rx="10" fill="#6b7f96"/>
    <rect x="5" y="28" width="90" height="67" rx="8" fill="#fff"/>
    <rect x="5" y="28" width="90" height="18" fill="#6b7f96"/>
  </svg>
`;

function getProjectIcon(id) {
  return PROJECT_ICONS[id] || DEFAULT_ICON;
}

(async function () {
  // Load session
  const sessionRes = await fetch('/auth/session');
  const session = await sessionRes.json();
  if (!session.authenticated) {
    window.location.href = '/login';
    return;
  }

  document.getElementById('user-name').textContent = session.user.name;

  if (session.user.role === 'admin') {
    document.getElementById('admin-link').classList.remove('hidden');
  }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  // Load projects
  const res = await fetch('/api/projects');
  const projects = await res.json();
  const grid = document.getElementById('project-grid');

  if (!projects.length) {
    grid.innerHTML = '<p class="loading">No projects available.</p>';
    return;
  }

  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-card-header">
        ${getProjectIcon(p.id)}
        <span class="project-name">${p.name}</span>
      </div>
      <p class="project-desc">${p.description}</p>
      <span class="status-badge status-${p.status}">${p.status}</span>
      ${p.status === 'active'
        ? `<a href="${p.route}" class="btn btn-primary btn-sm">Launch</a>`
        : `<button class="btn btn-secondary btn-sm" disabled>Unavailable</button>`
      }
    </div>
  `).join('');
})();
