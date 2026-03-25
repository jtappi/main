'use strict';

// Fallback icon rendered when a project has no icon field in projects.json
const DEFAULT_ICON = `
  <svg class="project-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="18" width="90" height="77" rx="10" fill="#6b7f96"/>
    <rect x="5" y="28" width="90" height="67" rx="8" fill="#fff"/>
    <rect x="5" y="28" width="90" height="18" fill="#6b7f96"/>
  </svg>
`;

/**
 * showAccessBanner — displays the access-denied banner for the given project name.
 * Auto-dismisses after 5 seconds. The × button dismisses early.
 * Cleans ?denied from the URL immediately via history.replaceState so a
 * page refresh does not re-trigger the banner.
 */
function showAccessBanner(projectName) {
  const banner   = document.getElementById('access-banner');
  const msgEl    = document.getElementById('access-banner-msg');
  const closeBtn = document.getElementById('access-banner-close');
  const progress = document.getElementById('access-banner-progress');

  if (!banner || !msgEl) return;

  msgEl.textContent = 'Access to ' + projectName + ' is not available for your account.';
  banner.classList.remove('hidden');

  // Clean the ?denied param from the URL so a refresh is clean
  const cleanUrl = window.location.pathname +
    window.location.search.replace(/[?&]denied=[^&]*/g, '').replace(/^&/, '?') +
    window.location.hash;
  history.replaceState(null, '', cleanUrl || window.location.pathname);

  // Auto-dismiss after 5 seconds (matches the CSS animation duration)
  const timer = setTimeout(() => dismiss(), 5000);

  function dismiss() {
    clearTimeout(timer);
    banner.classList.add('hidden');
    if (progress) {
      progress.style.animation = 'none';
    }
  }

  closeBtn.addEventListener('click', dismiss);
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
  } else {
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
  }

  // Check for ?denied param and show banner if present.
  // Project name is resolved from the loaded projects list; falls back to the
  // capitalised ID if the denied project isn't in the user's accessible set.
  const params = new URLSearchParams(window.location.search);
  const deniedId = params.get('denied');
  if (deniedId) {
    const match = projects.find(p => p.id === deniedId);
    const projectName = match
      ? match.name
      : deniedId.charAt(0).toUpperCase() + deniedId.slice(1);
    showAccessBanner(projectName);
  }
})();
