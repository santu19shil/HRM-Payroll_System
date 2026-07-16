import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

/**
 * 3-dot/Action menu floating above the whole UI (position: fixed).
 * This avoids table overflow clipping and lets it render even when
 * the user must scroll.
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
    e?.preventDefault?.();
    e?.stopPropagation?.();

    // Compute position first so menu has correct coordinates before render.
    place();

    // Toggle open/close.
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      const target = e.target;

      // If click happens inside the menu or on the menu button, keep open.
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (btnRef.current && btnRef.current.contains(target)) return;

      // If click is on overlay or inside modal, don't immediately close.
      // (Consumers use overlay click handlers to dismiss modals.)
      const modalOverlay = target?.closest?.('.modal-overlay');
      const modal = target?.closest?.('.modal');
      if (modalOverlay || modal) return;

      setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onScroll = () => place();

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
    position: 'fixed',
    // Higher than modal-overlay (z-index: 1000) and sidebar/topbar.
    zIndex: 2000000,
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
      <button
        type="button"
        ref={btnRef}
        className="btn btn-sm"
        onClick={toggle}
        title={title}
        aria-label={title}
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
    </>
  );
}

