import React, { useEffect, useRef, useState } from 'react';

/**
 * Professional multi-select dropdown.
 * Props:
 *  - label: string
 *  - options: [{ value, label }]
 *  - selected: array of values
 *  - onChange: (values) => void
 *  - placeholder, allowSelectAll, searchable
 */
export default function MultiSelect({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select...',
  allowSelectAll = true,
  searchable = true
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const allSelected = options.length > 0 && selected.length === options.length;

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const selectAll = () => {
    if (allSelected) onChange([]);
    else onChange(options.map(o => o.value));
  };

  const clear = () => onChange([]);

  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        className="ms-control"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {selected.length === 0 ? (
          <span className="ms-placeholder">{placeholder}</span>
        ) : (
          <span className="ms-chips">
            {selectedLabels.slice(0, 3).map(l => (
              <span key={l} className="ms-chip">{l}</span>
            ))}
            {selected.length > 3 && <span className="ms-chip ms-chip-more">+{selected.length - 3}</span>}
          </span>
        )}
        <span className={`ms-caret ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="ms-panel">
          {searchable && (
            <div className="ms-search">
              <input
                autoFocus
                className="form-input"
                placeholder="Search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          )}
          {allowSelectAll && (
            <div className="ms-actions">
              <button type="button" className="ms-link" onClick={selectAll}>
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
              {selected.length > 0 && (
                <button type="button" className="ms-link" onClick={clear}>Reset</button>
              )}
            </div>
          )}
          <div className="ms-list">
            {filtered.length === 0 && <div className="ms-empty">No options</div>}
            {filtered.map(o => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} className={`ms-option ${checked ? 'selected' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
