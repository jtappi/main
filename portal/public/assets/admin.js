let allProjects = [];

(async () => {
    // Verify admin session
    const session = await fetch('/auth/session').then(r => r.json());
    if (!session.authenticated || session.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
    }

    // Load data
    allProjects = await fetch('/admin/projects').then(r => r.json());
    const users = await fetch('/admin/users').then(r => r.json());

    renderUsers(users);
    renderProjects(allProjects);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    });

    // Create user modal
    document.getElementById('createUserBtn').addEventListener('click', () => {
        document.getElementById('createUserModal').style.display = 'flex';
    });
    document.getElementById('cancelUserBtn').addEventListener('click', () => {
        document.getElementById('createUserModal').style.display = 'none';
    });
    document.getElementById('saveUserBtn').addEventListener('click', createUser);
})();

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.username}</td>
            <td><span class="status-badge ${u.active ? 'active' : 'disabled'}">
                ${u.active ? 'Active' : 'Disabled'}
            </span></td>
            <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
            <td>
                ${allProjects.map(p => `
                    <label class="access-toggle">
                        <input type="checkbox"
                            data-user="${u.id}"
                            data-project="${p.id}"
                            ${u.projectAccess && u.projectAccess.includes(p.id) ? 'checked' : ''}
                            ${u.role === 'admin' ? 'disabled checked' : ''}
                            onchange="toggleAccess('${u.id}', this)">
                        ${p.name}
                    </label>
                `).join('')}
            </td>
            <td>
                ${u.role !== 'admin' ? `
                    <button class="btn-small btn-secondary"
                        onclick="toggleActive('${u.id}', ${u.active})">
                        ${u.active ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn-small btn-danger"
                        onclick="deleteUser('${u.id}', '${u.name}')">
                        Delete
                    </button>
                ` : '<span class="muted">Admin</span>'}
            </td>
        </tr>
    `).join('');
}

function renderProjects(projects) {
    const tbody = document.getElementById('projectsTableBody');
    tbody.innerHTML = projects.map(p => `
        <tr>
            <td>${p.icon}</td>
            <td>${p.name}</td>
            <td><code>${p.route}</code></td>
            <td><code>${p.port}</code></td>
            <td><span class="status-badge ${p.status}">${p.status}</span></td>
        </tr>
    `).join('');
}

async function toggleAccess(userId, checkbox) {
    const projectId = checkbox.dataset.project;
    const row = document.querySelector(`tr td [data-user="${userId}"]`)?.closest('tr');
    const checkboxes = row?.querySelectorAll('input[type=checkbox][data-user]');
    const projectAccess = checkboxes
        ? Array.from(checkboxes).filter(c => c.checked).map(c => c.dataset.project)
        : [];

    await fetch(`/admin/users/${userId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectAccess })
    });
}

async function toggleActive(userId, currentlyActive) {
    await fetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentlyActive })
    });
    location.reload();
}

async function deleteUser(userId, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`/admin/users/${userId}`, { method: 'DELETE' });
    location.reload();
}

async function createUser() {
    const name = document.getElementById('newName').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const errorEl = document.getElementById('createUserError');

    if (!name || !email || !username || !password) {
        errorEl.textContent = 'All fields are required';
        errorEl.style.display = 'block';
        return;
    }

    const passwordHash = await sha256(password);

    const res = await fetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, passwordHash })
    });

    const data = await res.json();
    if (res.ok) {
        document.getElementById('createUserModal').style.display = 'none';
        location.reload();
    } else {
        errorEl.textContent = data.error || 'Failed to create user';
        errorEl.style.display = 'block';
    }
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
