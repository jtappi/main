import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getQuickEntry, createEntry } from '../api/client';
import './QuickEntry.css';

/**
 * QuickEntry — top 5 most frequent recent entries as one-click re-log buttons.
 *
 * Props:
 *   onLogged  {fn}   called after a successful quick-log
 *
 * Ref API:
 *   ref.current.reload()  — re-fetches the quick-entry list
 *   (called by LogEntry after a form submission so the list stays fresh)
 */
const QuickEntry = forwardRef(function QuickEntry({ onLogged }, ref) {
  const [items, setItems]       = useState([]);
  const [feedback, setFeedback] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await getQuickEntry();
      setItems(data);
    } catch {
      // Silently ignore — quick entry is a convenience, not critical
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Expose reload() to parent via ref
  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  async function handleClick(item) {
    try {
      await createEntry({ text: item.text, category: item.category });
      setFeedback((f) => ({ ...f, [item.text]: 'success' }));
      setTimeout(() => {
        setFeedback((f) => { const n = { ...f }; delete n[item.text]; return n; });
        load();
      }, 1500);
      onLogged?.();
    } catch {
      setFeedback((f) => ({ ...f, [item.text]: 'error' }));
      setTimeout(() => {
        setFeedback((f) => { const n = { ...f }; delete n[item.text]; return n; });
      }, 1500);
    }
  }

  if (!items.length) return (
    <div className="quick-entry" data-testid="quick-entry">
      <p className="quick-entry-label">Quick log</p>
      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
        Your most frequent entries will appear here after you start logging.
      </p>
    </div>
  );

  return (
    <div className="quick-entry" data-testid="quick-entry">
      <p className="quick-entry-label">Quick log</p>
      <div className="quick-entry-buttons">
        {items.map((item) => {
          const state = feedback[item.text];
          return (
            <button
              key={item.text}
              className={`quick-entry-btn${
                state === 'success' ? ' quick-entry-btn--success' :
                state === 'error'   ? ' quick-entry-btn--error' : ''
              }`}
              onClick={() => handleClick(item)}
              data-testid={`quick-entry-btn`}
            >
              <span className="quick-entry-icon">
                {state === 'success' ? '✅' : state === 'error' ? '❌' : (item.icon || '📝')}
              </span>
              <span className="quick-entry-text">{item.text}</span>
              <span className="quick-entry-count">{item.count}×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default QuickEntry;
