'use client';

import { useEffect } from 'react';

interface ShortcutRow {
  action: string;
  shortcut: string;
}

const SHORTCUTS: { section: string; items: ShortcutRow[] }[] = [
  {
    section: 'Tools',
    items: [
      { action: 'Select', shortcut: 'V' },
      { action: 'Add block', shortcut: 'B' },
      { action: 'Line', shortcut: 'L' },
      { action: 'Arrow', shortcut: 'A' },
      { action: 'Rectangle', shortcut: 'R' },
      { action: 'Ellipse', shortcut: 'O' },
      { action: 'Triangle', shortcut: 'T' },
      { action: 'Diamond', shortcut: 'D' },
      { action: 'Freehand', shortcut: 'P' },
      { action: 'Eraser', shortcut: 'E' },
    ],
  },
  {
    section: 'Edit',
    items: [
      { action: 'Undo', shortcut: 'Ctrl+Z' },
      { action: 'Redo', shortcut: 'Ctrl+Shift+Z / Ctrl+Y' },
      { action: 'Duplicate', shortcut: 'Ctrl+D' },
      { action: 'Copy', shortcut: 'Ctrl+C' },
      { action: 'Paste', shortcut: 'Ctrl+V' },
      { action: 'Select all', shortcut: 'Ctrl+A' },
      { action: 'Delete', shortcut: 'Del / Backspace' },
    ],
  },
  {
    section: 'View',
    items: [
      { action: 'Zoom to fit', shortcut: 'Ctrl+1' },
      { action: 'Reset view', shortcut: 'Ctrl+0' },
      { action: 'Toggle grid', shortcut: 'G' },
    ],
  },
  {
    section: 'Other',
    items: [
      { action: 'Exit tool / Unlock / Deselect', shortcut: 'Escape' },
      { action: 'Lock tool (double-click tool)', shortcut: 'Double-click' },
    ],
  },
];

interface CanvasShortcutsPopupProps {
  onClose: () => void;
}

export function CanvasShortcutsPopup({ onClose }: CanvasShortcutsPopupProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="scrollbar-cosmic scrollbar-cosmic-orange"
        style={{
          minWidth: 360,
          maxWidth: 'min(440px, calc(100vw - 40px))',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          background: '#0c1829',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(249,115,22,0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(249,115,22,0.15)',
          }}
        >
          <h2
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#f97316',
              letterSpacing: 0.5,
              margin: 0,
            }}
          >
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              borderRadius: 6,
              fontSize: 18,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249,115,22,0.15)';
              e.currentTarget.style.color = '#f97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <div
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(249,115,22,0.8)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(({ action, shortcut }) => (
                  <div
                    key={`${section}-${action}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      fontFamily: 'Rajdhani, sans-serif',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                      {action}
                    </span>
                    <kbd
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(249,115,22,0.12)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        color: '#f97316',
                        fontFamily: 'inherit',
                      }}
                    >
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
