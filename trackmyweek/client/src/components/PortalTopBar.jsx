import React, { useEffect, useState } from 'react';
import './PortalTopBar.css';

/**
 * PortalTopBar — always shown inside subprojects.
 * Provides a "Back to Dashboard" link (when showDashboardLink is true)
 * and always provides the user chip and Sign out button.
 *
 * Also handles the ?denied=<projectId> query param forwarded by the portal
 * when a single-project guest is redirected here after being denied access
 * to another project. Resolves the project name from /api/projects, shows
 * an amber banner below the top bar, and cleans the URL immediately.
 *
 * Props:
 *   userName           {string}  — display name from session
 *   showDashboardLink  {boolean} — show the back link (default true)
 *                                  false for single-project guests who have
 *                                  no dashboard to return to
 */
export default function PortalTopBar({ userName, showDashboardLink = true }) {
  const [bannerName, setBannerName] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deniedId = params.get('denied');
    if (!deniedId) return;

    // Clean the ?denied param from the URL immediately so a refresh is clean
    const cleanUrl = window.location.pathname +
      window.location.search.replace(/[?&]denied=[^&]*/g, '').replace(/^&/, '?') +
      window.location.hash;
    history.replaceState(null, '', cleanUrl || window.location.pathname);

    // Resolve the project display name from the API.
    // Falls back to capitalised ID if the denied project isn't in the
    // user's accessible set (expected — they were denied access to it).
    fetch('/api/projects')
      .then(r => r.json())
      .then(projects => {
        const match = projects.find(p => p.id === deniedId);
        const name = match
          ? match.name
          : deniedId.charAt(0).toUpperCase() + deniedId.slice(1);
        setBannerName(name);
        setBannerVisible(true);
      })
      .catch(() => {
        // API unavailable — fall back to capitalised ID
        setBannerName(deniedId.charAt(0).toUpperCase() + deniedId.slice(1));
        setBannerVisible(true);
      });
  }, []);

  useEffect(() => {
    if (!bannerVisible) return;
    const timer = setTimeout(() => setBannerVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [bannerVisible]);

  async function handleSignOut() {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <>
      <header
        className={`portal-top-bar${showDashboardLink ? '' : ' portal-top-bar--no-back'}`}
        data-testid="portal-top-bar"
      >
        {showDashboardLink && (
          <a href="/dashboard" className="portal-top-bar__back" data-testid="portal-back-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </a>
        )}

        <div className="portal-top-bar__right">
          {userName && (
            <span className="portal-top-bar__user" data-testid="portal-top-bar-user">
              {userName}
            </span>
          )}
          <button
            className="portal-top-bar__signout"
            onClick={handleSignOut}
            data-testid="portal-top-bar-signout"
          >
            Sign out
          </button>
        </div>
      </header>

      {bannerVisible && bannerName && (
        <div className="access-banner" data-testid="access-banner">
          <div className="access-banner-body">
            <svg className="access-banner-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span data-testid="access-banner-msg">
              Access to {bannerName} is not available for your account.
            </span>
          </div>
          <button
            className="access-banner-close"
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss"
            data-testid="access-banner-close"
          >
            &times;
          </button>
          <div className="access-banner-progress" data-testid="access-banner-progress" />
        </div>
      )}
    </>
  );
}
