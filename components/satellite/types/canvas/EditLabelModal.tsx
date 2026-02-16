'use client';

import { useState, useEffect, useRef } from 'react';
import type { LabelFontSize } from './useCanvasState';

const LABEL_FONT_SIZES: Record<LabelFontSize, number> = { sm: 10, md: 16, lg: 20 };

const LABEL_COLORS = [
  { id: 'cyan', name: 'Cyan', value: '#67e8f9' },
  { id: 'rose', name: 'Rose', value: '#fb7185' },
  { id: 'indigo', name: 'Indigo', value: '#a5b4fc' },
  { id: 'teal', name: 'Teal', value: '#5eead4' },
  { id: 'green', name: 'Green', value: '#4ade80' },
  { id: 'amber', name: 'Amber', value: '#fbbf24' },
  { id: 'purple', name: 'Purple', value: '#c084fc' },
  { id: 'orange', name: 'Orange', value: '#fb923c' },
] as const;

interface EditLabelModalProps {
  initialLabel: string;
  initialFontSize: LabelFontSize;
  initialFontColor: string | null;
  onSave: (label: string, fontSize: LabelFontSize, fontColor: string | null) => void;
  onClose: () => void;
}

export function EditLabelModal({
  initialLabel,
  initialFontSize,
  initialFontColor,
  onSave,
  onClose,
}: EditLabelModalProps) {
  const [label, setLabel] = useState(initialLabel);
  const [fontSize, setFontSize] = useState<LabelFontSize>(initialFontSize);
  const [fontColor, setFontColor] = useState<string | null>(initialFontColor);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(label, fontSize, fontColor);
    onClose();
  };

  return (
    <div
      role="presentation"
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
        style={{
          minWidth: 320,
          maxWidth: 'min(420px, calc(100vw - 40px))',
          width: '100%',
          background: '#0c1829',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(249,115,22,0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 16,
            letterSpacing: 0.5,
          }}
        >
          Edit connection label
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="edit-label-input"
              style={{
                display: 'block',
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 6,
                fontFamily: 'Rajdhani, sans-serif',
              }}
            >
              Label text
            </label>
            <input
              id="edit-label-input"
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'Exo 2, sans-serif',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontFamily: 'Rajdhani, sans-serif' }}>
              Font size
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  style={{
                    padding: '8px 14px',
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: fontSize === size ? 'rgba(249,115,22,0.6)' : 'rgba(249,115,22,0.25)',
                    background: fontSize === size ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,0.2)',
                    color: fontSize === size ? '#f97316' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'} ({LABEL_FONT_SIZES[size]}px)
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontFamily: 'Rajdhani, sans-serif' }}>
              Font color
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFontColor(null)}
                onKeyDown={(e) => e.key === 'Enter' && setFontColor(null)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  border: !fontColor ? '2px solid #fff' : '1.5px solid transparent',
                  boxSizing: 'border-box',
                }}
                title="Default"
              />
              {LABEL_COLORS.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFontColor(c.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setFontColor(c.value)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: c.value,
                    cursor: 'pointer',
                    border: fontColor === c.value ? '2px solid #fff' : '1.5px solid transparent',
                    boxSizing: 'border-box',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid rgba(249,115,22,0.5)',
                background: 'rgba(249,115,22,0.2)',
                color: '#f97316',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
