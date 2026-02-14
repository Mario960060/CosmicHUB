'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, AlertTriangle, Ban, Pause, UserX, CheckSquare } from 'lucide-react';
import type { RedFlag } from '@/types/dashboard';
import { DeadlineTimelinePanel } from './DeadlineTimelinePanel';
import type { DashboardDeadline } from '@/types/dashboard';

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  deadline: Clock,
  anomaly: AlertTriangle,
  blocked: Ban,
  stale: Pause,
  unassigned: UserX,
  pending_approval: CheckSquare,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
};

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'deadline', label: 'Deadlines' },
  { value: 'anomaly', label: 'Anomalies' },
  { value: 'blocked', label: 'Blockers' },
  { value: 'stale', label: 'Stale' },
] as const;

function getEntityPath(flag: RedFlag): string {
  const { type, id } = flag.relatedEntity;
  if (type === 'subtask' || type === 'task') return `/workstation?task=${id}`;
  if (type === 'module') return `/pm/projects?module=${id}`;
  if (type === 'project') return `/pm/projects/${id}`;
  return '/dashboard';
}

interface RedFlagsPanelProps {
  flags: RedFlag[];
  timeline?: DashboardDeadline[];
}

export function RedFlagsPanel({ flags, timeline = [] }: RedFlagsPanelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');

  const filtered =
    filter === 'all' ? flags : flags.filter((f) => f.type === filter);

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontFamily: 'Orbitron, sans-serif',
            color: '#00d9ff',
            margin: 0,
            marginBottom: '12px',
          }}
        >
          Red Flags
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: filter === f.value ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.2)',
                background: filter === f.value ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                color: filter === f.value ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {timeline.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <DeadlineTimelinePanel deadlines={timeline} />
        </div>
      )}

      <div style={{ padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            No red flags.
          </div>
        ) : (
          filtered.map((flag) => {
            const Icon = TYPE_ICONS[flag.type] ?? AlertTriangle;
            const color = SEVERITY_COLORS[flag.severity] ?? '#eab308';

            return (
              <div
                key={flag.id}
                onClick={() => router.push(getEntityPath(flag))}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${color}`,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                }}
              >
                <Icon size={20} style={{ color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{flag.title}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    {flag.description}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                    {flag.projectName}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
