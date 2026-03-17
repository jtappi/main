import React from 'react';
import './PortalTopBar.css';

/**
 * PortalTopBar — shown inside subprojects when the user has access to
 * more than one project. Provides a "Back to Dashboard" link and sign out.
 *
 * Props:
 *   userName {string}  — display name from session
 */
export default function PortalTopBar({ userName }) {
  async function handleSignOut() {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <header className="portal-top-bar" data-testid="portal-top-bar">
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
