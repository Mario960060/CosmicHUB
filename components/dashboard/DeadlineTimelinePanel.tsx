'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardDeadline } from '@/types/dashboard';

const BUCKETS = ['overdue', 'today', 'this_week', 'this_month'] as const;
const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: 'rgba(255,255,255,0.5)',
  none: 'rgba(255,255,255,0.3)',
};

interface DeadlineTimelinePanelProps {
  deadlines: DashboardDeadline[];
}

export function DeadlineTimelinePanel({ deadlines }: DeadlineTimelinePanelProps) {
  const router = useRouter();
  const [activeBucket, setActiveBucket] = useState<string>('overdue');

  const byBucket = deadlines.reduce<Record<string, DashboardDeadline[]>>((acc, d) => {
    if (!acc[d.bucket]) acc[d.bucket] = [];
    acc[d.bucket].push(d);
    return acc;
  }, {});

  const overdueCount = byBucket.overdue?.length ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {BUCKETS.map((b) => {
          const count = byBucket[b]?.length ?? 0;
          return (
            <button
              key={b}
              onClick={() => setActiveBucket(b)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: activeBucket === b ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.2)',
                background: activeBucket === b ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                color: activeBucket === b ? '#00d9ff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {b === 'overdue' && overdueCount > 0 && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
              {BUCKET_LABELS[b]} ({count})
            </button>
          );
        })}
      </div>

      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        {(byBucket[activeBucket] ?? []).map((d) => {
          const riskColor = RISK_COLORS[d.risk.level] ?? RISK_COLORS.none;
          return (
            <div
              key={d.id}
              onClick={() => {
                if (d.entityType === 'subtask') {
                  router.push(`/workstation?task=${d.id}`);
                } else {
                  router.push(`/pm/projects/${d.id}`);
                }
              }}
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{d.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: `${riskColor}30`,
                    color: riskColor,
                  }}
                >
                  {d.risk.level}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {d.projectName}
                {d.assignedTo && ` • ${d.assignedTo.name}`}
              </div>
              {d.risk.effortPercent > 0 && (
                <div
                  style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    marginTop: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, d.risk.effortPercent)}%`,
                      height: '100%',
                      background: riskColor,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
