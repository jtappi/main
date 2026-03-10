'use strict';

(async function () {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  let allProjects = [];

  // ── Load Projects ────────────────────────────────────────
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

  // ── Load Users ───────────────────────────────────────────
  async function loadUsers() {
    const res = await fetch('/admin/users');
    const users = await res.json();
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>
          <button class="btn btn-sm ${u.active ? 'btn-outline' : 'btn-primary'}"
            onclick="toggleActive('${u.id}', ${u.active})">
            ${u.active ? 'Disable' : 'Enable'}
          </button>
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
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}', '${u.name}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // ── Toggle Active ─────────────────────────────────────────
  window.toggleActive = async (id, current) => {
    await fetch(`/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current })
    });
    loadUsers();
  };

  // ── Delete User ───────────────────────────────────────────
  window.deleteUser = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`/admin/users/${id}`, { method: 'DELETE' });
    loadUsers();
  };

  // ── Create User Modal ─────────────────────────────────────
  document.getElementById('create-user-btn').addEventListener('click', () => {
    document.getElementById('modal-error').classList.add('hidden');
    // Render project checkboxes
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
      loadUsers();
    } else {
      const data = await res.json();
      errEl.textContent = data.error || 'Failed to create user.';
      errEl.classList.remove('hidden');
    }
  });

  // ── Init ─────────────────────────────────────────────────
  await loadProjects();
  await loadUsers();
})();
