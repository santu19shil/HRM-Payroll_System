import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

/**
 * Reusable 3-dot action menu that renders as a fixed overlay positioned next
 * to the trigger button. It automatically flips above the button when there is
 * not enough room below, so the menu never forces the page to scroll.
 */
export default function ActionMenu({ items, label = '⋮', title = 'Actions', menuWidth = 170 }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, flipUp: false });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const MENU_HEIGHT_ESTIMATE = items.length * 38 + 16;

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < MENU_HEIGHT_ESTIMATE + 8;
    setCoords({
      top: flipUp ? rect.top : rect.bottom,
      left: Math.min(rect.right, window.innerWidth - menuWidth - 8),
      flipUp
    });
  };

  const toggle = (e) => {
    // Prevent clicks inside the table row from swallowing this toggle
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!open) place();
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => place();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const menuStyle = {
    position: 'fixed',
    zIndex: 1000,
    minWidth: menuWidth,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
    padding: '6px 0',
    ...(coords.flipUp
      ? { bottom: window.innerHeight - coords.top, left: coords.left }
      : { top: coords.top, left: coords.left })
  };

  return (
    <>
      <button type="button" ref={btnRef} className="btn btn-sm" onClick={toggle} title={title} aria-label={title}>
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
                e.preventDefault();
                e.stopPropagation();
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
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {it.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
