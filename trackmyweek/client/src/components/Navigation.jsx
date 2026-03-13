import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const NAV_ITEMS = [
  { to: '/log',        icon: '✏️',  label: 'Log Entry' },
  { to: '/view',       icon: '📋',  label: 'View Data' },
  { to: '/reports',    icon: '📊',  label: 'Reports' },
  { to: '/categories', icon: '🏷️',  label: 'Categories' },
  { to: '/questions',  icon: '❓',  label: 'Questions' },
];

/**
 * Navigation — sidebar on desktop, bottom tab bar on mobile.
 *
 * Uses NavLink so the active route gets the `active` class automatically.
 */
export default function Navigation() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-logo">
        <span className="nav-logo-icon">📅</span>
        <span className="nav-logo-text">TrackMyWeek</span>
      </div>

      <ul className="nav-list">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link--active' : ''}`
              }
            >
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
