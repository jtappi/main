// Load session and projects on page load
(async () => {
    // Check session
    const session = await fetch('/auth/session').then(r => r.json());
    if (!session.authenticated) {
        window.location.href = '/login';
        return;
    }

    // Set user info in header
    document.getElementById('userName').textContent = `Hi, ${session.name}`;
    if (session.role === 'admin') {
        document.getElementById('adminBadge').style.display = 'inline-block';
        document.getElementById('adminBtn').style.display = 'inline-block';
    }

    // Load projects
    const projects = await fetch('/api/projects').then(r => r.json());
    renderProjects(projects);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    });
})();

function renderProjects(projects) {
    const grid = document.getElementById('projectGrid');
    const empty = document.getElementById('emptyState');

    if (!projects || projects.length === 0) {
        empty.style.display = 'block';
        return;
    }

    grid.innerHTML = projects.map(p => `
        <div class="project-card status-${p.status}">
            <div class="project-icon">${p.icon}</div>
            <div class="project-info">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
            </div>
            <div class="project-footer">
                <span class="status-badge ${p.status}">${p.status}</span>
                ${ p.status === 'active'
                    ? `<a href="${p.route}" class="btn-launch">Launch →</a>`
                    : `<span class="btn-disabled">Unavailable</span>`
                }
            </div>
        </div>
    `).join('');
}
