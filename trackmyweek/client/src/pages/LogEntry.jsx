import React, { useCallback, useRef } from 'react';
import EntryForm from '../components/EntryForm';
import QuickEntry from '../components/QuickEntry';
import './LogEntry.css';

/**
 * LogEntry — the main screen.
 *
 * Desktop: two-column layout — quick-entry sidebar on the left, form on the right.
 * Mobile:  single column — quick-entry buttons at top (primary action), form below.
 */
export default function LogEntry() {
  // Ref to trigger QuickEntry reload after a form submission
  const quickEntryRef = useRef(null);

  const handleLogged = useCallback(() => {
    quickEntryRef.current?.reload();
  }, []);

  return (
    <div className="log-entry-page">
      <h1 className="page-title">Log Entry</h1>

      <div className="log-entry-layout">
        {/* Sidebar / mobile-primary: quick-entry buttons */}
        <aside className="log-entry-sidebar">
          <QuickEntry ref={quickEntryRef} onLogged={handleLogged} />
        </aside>

        {/* Main: full entry form */}
        <section className="log-entry-main">
          <EntryForm onSuccess={handleLogged} />
        </section>
      </div>
    </div>
  );
}
