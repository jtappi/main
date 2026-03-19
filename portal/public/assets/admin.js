'use strict';

// ── SVG icon helpers ─────────────────────────────────────────────────────────
const ICON = {
  edit: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  disable: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  enable:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  delete:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  active:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  disabled:`<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

(async function () {
  // ── Tab switching ─────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  let allProjects = [];
  let allUsers    = [];

  // ── Load Projects ─────────────────────────────────────────
  async function loadProjects() {
    const res = await fetch('/admin/projects');
    allProjects = await res.json();
    const tbody = document.getElementById('projects-tbody');
    tbody.innerHTML = allProjects.map(p => `
      <tr>
        <td>${p.icon}</td>
        <td>${p.name}</td>
        <td>${p.route}</td>
        <td>${p.port}</td>
        <td><span class="status-badge status-${p.status}">${p.status}</span></td>
        <td>${p.description}</td>
      </tr>
    `).join('');
  }

  // ── Load Users ────────────────────────────────────────────
  async function loadUsers() {
    const res = await fetch('/admin/users');
    allUsers = await res.json();
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = allUsers.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>
          <span class="status-badge ${u.active ? 'status-active' : 'status-disabled'}"
            data-testid="admin-status-badge-${u.id}"
            title="${u.active ? 'Active' : 'Disabled'}">
            ${u.active ? ICON.active : ICON.disabled}
          </span>
        </td>
        <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
        <td>
          <div class="access-tags">
            ${(u.projectAccess || []).map(pid =>
              `<span class="access-tag">${pid}</span>`
            ).join('')}
          </div>
        </td>
        <td>
          <div class="action-btns">
            <button class="icon-btn icon-btn-edit"
              data-testid="admin-edit-btn-${u.id}"
              data-action="edit" data-id="${u.id}"
              title="Edit user">${ICON.edit}</button>
            <button class="icon-btn ${u.active ? 'icon-btn-disable' : 'icon-btn-enable'}"
              data-testid="admin-toggle-btn-${u.id}"
              data-action="toggle" data-id="${u.id}" data-active="${u.active}"
              title="${u.active ? 'Disable user' : 'Enable user'}">
              ${u.active ? ICON.disable : ICON.enable}
            </button>
            <button class="icon-btn icon-btn-delete"
              data-testid="admin-delete-btn-${u.id}"
              data-action="delete" data-id="${u.id}" data-name="${u.name}"
              title="Delete user">${ICON.delete}</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ── Event delegation on users tbody ───────────────────────
  document.getElementById('users-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'edit') {
      openEditModal(id);
    }

    if (action === 'toggle') {
      const current = btn.dataset.active === 'true';
      await fetch(`/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !current })
      });
      await loadUsers();
    }

    if (action === 'delete') {
      const name = btn.dataset.name;
      if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
      await fetch(`/admin/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    }
  });

  // ── Edit User Modal ───────────────────────────────────────
  let editingUserId = null;

  function openEditModal(id) {
    editingUserId = id;
    const errEl = document.getElementById('edit-modal-error');
    errEl.classList.add('hidden');
    errEl.textContent = '';

    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('edit-name').value     = user.name     || '';
    document.getElementById('edit-email').value    = user.email    || '';
    document.getElementById('edit-username').value = user.username || '';
    document.getElementById('edit-password').value = '';

    const access = user.projectAccess || [];
    document.getElementById('edit-project-access').innerHTML =
      `<div class="checkbox-group">${allProjects.map(p =>
        `<label><input type="checkbox" value="${p.id}"${access.includes(p.id) ? ' checked' : ''}> ${p.icon} ${p.name}</label>`
      ).join('')}</div>`;

    document.getElementById('edit-user-modal').classList.remove('hidden');
  }

  document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    document.getElementById('edit-user-modal').classList.add('hidden');
    editingUserId = null;
  });

  document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const errEl    = document.getElementById('edit-modal-error');
    const name     = document.getElementById('edit-name').value.trim();
    const email    = document.getElementById('edit-email').value.trim();
    const username = document.getElementById('edit-username').value.trim();
    const password = document.getElementById('edit-password').value;
    const access   = [...document.querySelectorAll('#edit-project-access input:checked')]
      .map(cb => cb.value);

    if (!name || !email || !username) {
      errEl.textContent = 'Name, email, and username are required.';
      errEl.classList.remove('hidden');
      return;
    }

    const payload = { name, email, username, projectAccess: access };
    if (password) payload.password = password;

    const res = await fetch(`/admin/users/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      document.getElementById('edit-user-modal').classList.add('hidden');
      editingUserId = null;
      await loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      errEl.textContent = data.error || 'Failed to save changes.';
      errEl.classList.remove('hidden');
    }
  });

  // ── Create User Modal ─────────────────────────────────────
  document.getElementById('create-user-btn').addEventListener('click', () => {
    document.getElementById('modal-error').classList.add('hidden');
    document.getElementById('new-project-access').innerHTML =
      `<div class="checkbox-group">${allProjects.map(p =>
        `<label><input type="checkbox" value="${p.id}"> ${p.icon} ${p.name}</label>`
      ).join('')}</div>`;
    document.getElementById('create-user-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-user-btn').addEventListener('click', () => {
    document.getElementById('create-user-modal').classList.add('hidden');
  });

  document.getElementById('save-user-btn').addEventListener('click', async () => {
    const name     = document.getElementById('new-name').value.trim();
    const email    = document.getElementById('new-email').value.trim();
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const access   = [...document.querySelectorAll('#new-project-access input:checked')]
      .map(cb => cb.value);

    const errEl = document.getElementById('modal-error');
    if (!name || !email || !username || !password) {
      errEl.textContent = 'All fields are required.';
      errEl.classList.remove('hidden');
      return;
    }

    const res = await fetch('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, password, projectAccess: access })
    });

    if (res.ok) {
      document.getElementById('create-user-modal').classList.add('hidden');
      await loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      errEl.textContent = data.error || 'Failed to create user.';
      errEl.classList.remove('hidden');
    }
  });

  // ── Init ─────────────────────────────────────────────────
  await loadProjects();
  await loadUsers();
})();
