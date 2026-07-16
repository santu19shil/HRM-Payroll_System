import React, { useState, useRef, useEffect } from 'react';

/**
 * 3-dot / action menu rendered as an absolutely-positioned dropdown inside a
 * relative wrapper. Avoids the fixed-positioned, document-level mousedown
 * listener that could close the menu before the user could interact.
 */
export default function ActionMenu({ items, label = '⋮', title = 'Actions', menuWidth = 170 }) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const MENU_HEIGHT_ESTIMATE = items.length * 38 + 16;

  const toggle = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!open) {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        setFlipUp(spaceBelow < MENU_HEIGHT_ESTIMATE + 8);
      }
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const menuStyle = {
    position: 'absolute',
    zIndex: 2000000,
    minWidth: menuWidth,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
    padding: '6px 0',
    ...(flipUp ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }),
    right: 0
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-sm"
        onClick={toggle}
        title={title}
        aria-label={title}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
      </button>

      {open && (
        <div ref={menuRef} style={menuStyle}>
          {items.map((it, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e?.preventDefault?.();
                e?.stopPropagation?.();
                setOpen(false);
                it.onClick && it.onClick(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  it.onClick && it.onClick(e);
                }
              }}
              style={{
                padding: '9px 16px',
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: it.danger ? '#ef4444' : '#1f2937'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
