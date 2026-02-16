'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CosmicDropdownProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function CosmicDropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  style = {},
}: CosmicDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const label = options.find((o) => o.value === value)?.label ?? placeholder ?? value;

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 10px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 100,
        }}
      >
        {label}
        <ChevronDown size={12} style={{ opacity: 0.7, marginLeft: 'auto' }} />
      </button>
      {open && (
        <div
          className="scrollbar-cosmic"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '100%',
            maxHeight: 200,
            overflowY: 'auto',
            background: '#0d1117',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            zIndex: 9999,
            padding: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                background: value === opt.value ? 'rgba(0, 217, 255, 0.25)' : '#161b22',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
