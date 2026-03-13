import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../api/client';
import './Questions.css';

/**
 * Questions page — a private journal / reflection tool.
 *
 * Layout:
 *   Top: "Ask yourself a question" form
 *   Below: Two columns (or stacked on mobile)
 *     Left:  Unanswered questions  (sorted oldest-first)
 *     Right: Answered questions    (sorted newest-first)
 */
export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // New question form
  const [newQ, setNewQ]       = useState('');
  const [adding, setAdding]   = useState(false);

  // Answering: { id, answer } | null
  const [answering, setAnswering] = useState(null);
  const answerRef = useRef(null);

  // Editing question text: id | null
  const [editingQ, setEditingQ] = useState(null);
  const [editQText, setEditQText] = useState('');

  // Delete confirm: id | null
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Tab on mobile: 'unanswered' | 'answered'
  const [tab, setTab] = useState('unanswered');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuestions(await getQuestions());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Focus answer textarea when answering panel opens
  useEffect(() => {
    if (answering && answerRef.current) answerRef.current.focus();
  }, [answering]);

  // ---------------------------------------------------------------------------
  // Derived lists
  // ---------------------------------------------------------------------------
  const unanswered = questions
    .filter((q) => !q.answer)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const answered = questions
    .filter((q) => q.answer)
    .sort((a, b) => new Date(b.answeredAt) - new Date(a.answeredAt));

  // ---------------------------------------------------------------------------
  // Add question
  // ---------------------------------------------------------------------------
  async function handleAdd(e) {
    e.preventDefault();
    if (!newQ.trim()) return;
    setAdding(true);
    setError('');
    try {
      const created = await createQuestion({ question: newQ.trim() });
      setQuestions((prev) => [created, ...prev]);
      setNewQ('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Answer
  // ---------------------------------------------------------------------------
  function startAnswer(q) {
    setAnswering({ id: q.id, answer: q.answer || '' });
    setConfirmDelete(null);
    setEditingQ(null);
  }

  async function commitAnswer() {
    if (!answering) return;
    const { id, answer } = answering;
    if (!answer.trim()) { setAnswering(null); return; }
    setError('');
    try {
      const updated = await updateQuestion(id, { answer: answer.trim() });
      setQuestions((prev) => prev.map((q) => q.id === id ? updated : q));
    } catch (err) {
      setError(err.message);
    } finally {
      setAnswering(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit question text
  // ---------------------------------------------------------------------------
  function startEditQ(q) {
    setEditingQ(q.id);
    setEditQText(q.question);
    setAnswering(null);
    setConfirmDelete(null);
  }

  async function commitEditQ(id) {
    if (!editQText.trim()) { setEditingQ(null); return; }
    setError('');
    try {
      const updated = await updateQuestion(id, { question: editQText.trim() });
      setQuestions((prev) => prev.map((q) => q.id === id ? updated : q));
    } catch (err) {
      setError(err.message);
    } finally {
      setEditingQ(null);
    }
  }

  function handleEditQKey(e, id) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEditQ(id); }
    if (e.key === 'Escape') setEditingQ(null);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete(id) {
    setError('');
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDelete(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render a single question card
  // ---------------------------------------------------------------------------
  function QuestionCard({ q }) {
    const isAnswering  = answering?.id === q.id;
    const isEditingQ   = editingQ === q.id;
    const isDeleting   = confirmDelete === q.id;
    const hasAnswer    = !!q.answer;

    return (
      <div
        className={`q-card card${
          isDeleting  ? ' q-card--deleting'  : ''
        }${
          isAnswering ? ' q-card--answering' : ''
        }`}
        data-testid={`q-card-${q.id}`}
      >
        {/* Question text */}
        {isEditingQ ? (
          <textarea
            autoFocus
            value={editQText}
            onChange={(e) => setEditQText(e.target.value)}
            onKeyDown={(e) => handleEditQKey(e, q.id)}
            className="q-edit-textarea"
            rows={2}
          />
        ) : (
          <p className="q-text">{q.question}</p>
        )}

        {/* Answer (if exists and not currently answering) */}
        {hasAnswer && !isAnswering && (
          <blockquote className="q-answer">{q.answer}</blockquote>
        )}

        {/* Answer input panel */}
        {isAnswering && (
          <div className="q-answer-form">
            <textarea
              ref={answerRef}
              value={answering.answer}
              onChange={(e) =>
                setAnswering((a) => ({ ...a, answer: e.target.value }))
              }
              placeholder="Write your answer…"
              className="q-answer-textarea"
              rows={4}
            />
            <div className="q-answer-actions">
              <button className="btn btn-primary" onClick={commitAnswer}>Save</button>
              <button className="btn btn-ghost" onClick={() => setAnswering(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Edit question text actions */}
        {isEditingQ && (
          <div className="q-edit-actions">
            <button className="btn btn-primary" onClick={() => commitEditQ(q.id)}>Save</button>
            <button className="btn btn-ghost" onClick={() => setEditingQ(null)}>Cancel</button>
          </div>
        )}

        {/* Delete confirm */}
        {isDeleting && (
          <div className="q-delete-confirm">
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Delete this question?</span>
            <button
              className="btn btn-danger"
              style={{ padding: '3px 10px', fontSize: '0.8rem' }}
              onClick={() => handleDelete(q.id)}
              data-testid={`confirm-delete-${q.id}`}
            >
              Yes
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: '3px 10px', fontSize: '0.8rem' }}
              onClick={() => setConfirmDelete(null)}
            >
              No
            </button>
          </div>
        )}

        {/* Card footer — meta + action buttons */}
        {!isEditingQ && !isAnswering && !isDeleting && (
          <div className="q-footer">
            <span className="q-meta text-muted">
              {hasAnswer
                ? `Answered ${fmtDate(q.answeredAt)}`
                : `Asked ${fmtDate(q.createdAt)}`}
            </span>
            <div className="q-actions">
              {!isEditingQ && (
                <button
                  className="btn btn-ghost q-action-btn"
                  onClick={() => startAnswer(q)}
                  title={hasAnswer ? 'Edit answer' : 'Answer'}
                  data-testid={`answer-btn-${q.id}`}
                >
                  {hasAnswer ? '✏️ Edit answer' : '💬 Answer'}
                </button>
              )}
              <button
                className="btn btn-ghost q-action-btn"
                onClick={() => startEditQ(q)}
                title="Edit question"
                data-testid={`edit-q-btn-${q.id}`}
              >
                ✏️
              </button>
              <button
                className="btn btn-ghost q-action-btn"
                onClick={() => setConfirmDelete(q.id)}
                title="Delete"
                data-testid={`delete-btn-${q.id}`}
              >
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Page
  // ---------------------------------------------------------------------------
  return (
    <div className="questions-page">
      <h1 className="page-title">Questions</h1>
      <p className="text-muted questions-subtitle">
        Ask yourself questions and come back to answer them when you're ready.
      </p>

      {error && <p className="error-msg">{error}</p>}

      {/* Add question */}
      <form className="q-add-card card" onSubmit={handleAdd}>
        <textarea
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="What do you want to reflect on?"
          className="q-add-textarea"
          rows={2}
          data-testid="new-question-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) handleAdd(e);
          }}
        />
        <div className="q-add-footer">
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            {unanswered.length} unanswered · {answered.length} answered
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding || !newQ.trim()}
            data-testid="add-question-btn"
          >
            {adding ? 'Adding…' : 'Ask'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <>
          {/* Mobile tab switcher */}
          <div className="q-tabs">
            <button
              className={`q-tab${tab === 'unanswered' ? ' q-tab--active' : ''}`}
              onClick={() => setTab('unanswered')}
            >
              Unanswered ({unanswered.length})
            </button>
            <button
              className={`q-tab${tab === 'answered' ? ' q-tab--active' : ''}`}
              onClick={() => setTab('answered')}
            >
              Answered ({answered.length})
            </button>
          </div>

          <div className="q-columns">
            {/* Unanswered */}
            <section
              className={`q-column${
                tab === 'answered' ? ' q-column--hidden-mobile' : ''
              }`}
            >
              <h2 className="q-column-title">Unanswered</h2>
              {unanswered.length === 0 ? (
                <div className="q-empty card">
                  <p className="text-muted">All caught up! No open questions.</p>
                </div>
              ) : (
                unanswered.map((q) => <QuestionCard key={q.id} q={q} />)
              )}
            </section>

            {/* Answered */}
            <section
              className={`q-column${
                tab === 'unanswered' ? ' q-column--hidden-mobile' : ''
              }`}
            >
              <h2 className="q-column-title">Answered</h2>
              {answered.length === 0 ? (
                <div className="q-empty card">
                  <p className="text-muted">No answered questions yet.</p>
                </div>
              ) : (
                answered.map((q) => <QuestionCard key={q.id} q={q} />)
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
