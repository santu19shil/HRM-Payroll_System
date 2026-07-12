import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

export default function ActionMenuDebug({ items, label = '⋮', menuWidth = 170 }) {
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
    console.log('ActionMenuDebug toggle click');
    if (!open) place();
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        console.log('ActionMenuDebug outside click');
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
    zIndex: 100000,
    minWidth: menuWidth,
    background: '#fff',
    border: '2px solid #22c55e',
    borderRadius: 8,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
    padding: '6px 0',
    ...(coords.flipUp
      ? { bottom: window.innerHeight - coords.top, left: coords.left }
      : { top: coords.top, left: coords.left })
  };

  return (
    <>
      <button type="button" ref={btnRef} className="btn btn-sm" onClick={toggle} title="Actions" aria-label="Actions">
        {label}
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle}>
          <div style={{ padding: '6px 16px', fontSize: 12, color: '#16a34a', fontWeight: 800 }}>
            DEBUG MENU OPEN
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it.onClick && it.onClick(e);
              }}
              style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 14 }}
            >
              {it.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

