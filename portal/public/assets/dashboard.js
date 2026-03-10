'use strict';

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
        <span class="project-icon">${p.icon}</span>
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
