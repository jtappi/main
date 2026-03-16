'use strict';

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
            data-testid="admin-status-badge-${u.id}">
            ${u.active ? '\u2713 Active' : '\u2717 Disabled'}
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
            <button class="btn btn-sm btn-primary"
              data-testid="admin-edit-btn-${u.id}"
              data-action="edit" data-id="${u.id}">Edit</button>
            <button class="btn btn-sm ${u.active ? 'btn-outline' : 'btn-warning'}"
              data-testid="admin-toggle-btn-${u.id}"
              data-action="toggle" data-id="${u.id}" data-active="${u.active}">
              ${u.active ? 'Disable' : 'Enable'}
            </button>
            <button class="btn btn-sm btn-danger"
              data-testid="admin-delete-btn-${u.id}"
              data-action="delete" data-id="${u.id}" data-name="${u.name}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ── Event delegation on users tbody ───────────────────────
  // Handles all row-level button actions without relying on window globals.
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
      const res = await fetch(`/admin/users/${id}`, {
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
