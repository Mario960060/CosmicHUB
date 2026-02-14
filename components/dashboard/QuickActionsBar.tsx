'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  label: string;
  path: string;
  icon: LucideIcon;
  color?: string;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          fontFamily: 'Orbitron, sans-serif',
          color: '#00d9ff',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        ⚡ Quick Actions
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const color = action.color ?? '#00d9ff';
          return (
            <button
              key={action.path}
              onClick={() => router.push(action.path)}
              style={{
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '12px',
                color: color,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.borderColor = `${color}80`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.2)';
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
