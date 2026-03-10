document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('errorMessage');

    // Hash password with SHA256 before sending
    const passwordHash = await sha256(password);

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, passwordHash })
        });

        const data = await res.json();

        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            showError(data.message || 'Invalid credentials');
        }
    } catch (err) {
        showError('An error occurred. Please try again.');
    }
});

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError(message) {
    const el = document.getElementById('errorMessage');
    el.textContent = message;
    el.style.display = 'block';
}
