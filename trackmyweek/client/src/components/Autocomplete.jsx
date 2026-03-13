import React, { useState, useEffect, useRef } from 'react';
import { getAutocomplete } from '../api/client';
import './Autocomplete.css';

/**
 * Autocomplete — text input with a debounced suggestion dropdown.
 *
 * Props:
 *   value       {string}   controlled input value
 *   onChange    {fn}       called with new string value on every keystroke
 *   onSelect    {fn}       called with the chosen suggestion string
 *   placeholder {string}
 *   disabled    {bool}
 */
export default function Autocomplete({ value, onChange, onSelect, placeholder, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Fetch suggestions with 300ms debounce
  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getAutocomplete(value);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function pick(text) {
    onSelect(text);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'What happened?'}
        disabled={disabled}
        autoComplete="off"
        data-testid="entry-text-input"
      />
      {open && (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              className={`autocomplete-item${i === activeIndex ? ' autocomplete-item--active' : ''}`}
              onMouseDown={() => pick(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
