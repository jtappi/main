import React from 'react';
import './PortalTopBar.css';

/**
 * PortalTopBar — always shown inside subprojects.
 * Provides a "Back to Dashboard" link (when showDashboardLink is true)
 * and always provides the user chip and Sign out button.
 *
 * Props:
 *   userName           {string}  — display name from session
 *   showDashboardLink  {boolean} — show the back link (default true)
 *                                  false for single-project guests who have
 *                                  no dashboard to return to
 */
export default function PortalTopBar({ userName, showDashboardLink = true }) {
  async function handleSignOut() {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
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
  );
}
