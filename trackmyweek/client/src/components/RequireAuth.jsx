import React, { useEffect, useState, createContext, useContext } from 'react';

/**
 * SessionContext — provides the full session user object to any descendant.
 * Avoids prop-drilling projectAccess down through App → Navigation etc.
 */
export const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

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
 *
 * The resolved session user is exposed via SessionContext so child components
 * (e.g. PortalTopBar) can read projectAccess without an extra fetch.
 */
export default function RequireAuth({ children }) {
  const [sessionUser, setSessionUser] = useState(null);
  const [checked,     setChecked]     = useState(false);

  useEffect(() => {
    fetch('/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          const returnTo = window.location.pathname + window.location.search;
          window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo);
        } else {
          setSessionUser(data.user);
          setChecked(true);
        }
      })
      .catch(() => {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo);
      });
  }, []);

  if (!checked) return null;

  return (
    <SessionContext.Provider value={sessionUser}>
      {children}
    </SessionContext.Provider>
  );
}
