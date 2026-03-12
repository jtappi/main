document.addEventListener('DOMContentLoaded', () => {
    const BASE = '/trackmyweek';

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = `${BASE}/index.html`;
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            fetch('/auth/logout', { method: 'POST' })
                .then(() => { window.location.href = '/login'; })
                .catch(() => { window.location.href = '/login'; });
        });
    }

    const analyzeDataBtn = document.getElementById('analyzeDataBtn');
    if (analyzeDataBtn) {
        analyzeDataBtn.addEventListener('click', () => {
            window.location.href = `${BASE}/analyze-data.html`;
        });
    }

    const viewAllDataBtn = document.getElementById('viewAllDataBtn');
    if (viewAllDataBtn) {
        viewAllDataBtn.addEventListener('click', () => {
            window.location.href = `${BASE}/view-data.html`;
        });
    }
});
