import React, { useEffect, useState } from 'react';

/**
 * RequireAuth — wraps any route that requires an authenticated session.
 *
 * On mount, calls GET /auth/session. If unauthenticated, redirects the browser
 * to /login?returnTo=<current full path> so the user lands back here after login.
 *
 * Renders null while the session check is in flight to avoid a flash of
 * protected content before the redirect fires.
 *
 * The returnTo value includes the full pathname + search so deep links are
 * preserved exactly (e.g. /trackmyweek/view?filter=today).
 */
export default function RequireAuth({ children }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          const returnTo = window.location.pathname + window.location.search;
          window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo);
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        // Network failure — redirect to login as a safe fallback
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo);
      });
  }, []);

  if (!checked) return null;
  return children;
}
