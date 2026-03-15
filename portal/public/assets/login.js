'use strict';

(function () {
  const btn      = document.getElementById('login-btn');
  const errorMsg = document.getElementById('error-msg');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  }

  function hideError() {
    errorMsg.classList.add('hidden');
  }

  /**
   * Returns a safe returnTo URL from the query string, or null if absent/unsafe.
   * Only allows relative paths starting with '/' to prevent open redirect attacks.
   * Rejects protocol-relative URLs (starting with '//') and anything containing '://'.
   */
  function getSafeReturnTo() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('returnTo');
    if (!raw) return null;
    const decoded = decodeURIComponent(raw);
    // Must be a relative path: starts with '/', not '//', no protocol
    if (!decoded.startsWith('/')) return null;
    if (decoded.startsWith('//')) return null;
    if (decoded.includes('://')) return null;
    return decoded;
  }

  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function handleLogin() {
    hideError();
    const identifier = document.getElementById('identifier').value.trim();
    const password   = document.getElementById('password').value;

    if (!identifier || !password) {
      return showError('Please enter your email/username and password.');
    }

    btn.disabled    = true;
    btn.textContent = 'Logging in...';

    try {
      const passwordHash = await sha256(password);
      const res = await fetch('/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, passwordHash })
      });
      const data = await res.json();
      if (data.success) {
        const returnTo = getSafeReturnTo();
        window.location.href = returnTo || '/dashboard';
      } else {
        showError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Login';
    }
  }

  btn.addEventListener('click', handleLogin);
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
})();
