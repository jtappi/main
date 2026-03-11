document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/index.html';
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Delegate logout to portal — clears the shared session
            fetch('/auth/logout', { method: 'POST' })
                .then(() => { window.location.href = '/login'; })
                .catch(() => { window.location.href = '/login'; });
        });
    }

    const analyzeDataBtn = document.getElementById('analyzeDataBtn');
    if (analyzeDataBtn) {
        analyzeDataBtn.addEventListener('click', () => {
            window.location.href = '/analyze-data.html';
        });
    }

    const viewAllDataBtn = document.getElementById('viewAllDataBtn');
    if (viewAllDataBtn) {
        viewAllDataBtn.addEventListener('click', () => {
            window.location.href = '/view-data.html';
        });
    }
});
