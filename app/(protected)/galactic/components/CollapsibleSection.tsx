'use client';

import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  summary: string;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  summary,
  icon,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '14px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {icon && <span style={{ flexShrink: 0, opacity: 0.8 }}>{icon}</span>}
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginLeft: '4px' }}>
            {summary}
          </span>
        </div>
        <ChevronDown
          size={18}
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.7,
          }}
        />
      </button>
      {expanded && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
