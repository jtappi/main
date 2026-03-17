'use strict';

// Fallback icon rendered when a project has no icon field in projects.json
const DEFAULT_ICON = `
  <svg class="project-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="18" width="90" height="77" rx="10" fill="#6b7f96"/>
    <rect x="5" y="28" width="90" height="67" rx="8" fill="#fff"/>
    <rect x="5" y="28" width="90" height="18" fill="#6b7f96"/>
  </svg>
`;

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
        ${p.icon || DEFAULT_ICON}
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
