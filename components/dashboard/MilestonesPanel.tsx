'use client';

import { useRouter } from 'next/navigation';
import type { ClientMilestone } from '@/lib/dashboard/attention-queries';

interface MilestonesPanelProps {
  milestones: ClientMilestone[];
}

export function MilestonesPanel({ milestones }: MilestonesPanelProps) {
  const router = useRouter();

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
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 217, 255, 0.15)' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', margin: 0 }}>
          Nadchodzące Milestone'y
        </h2>
      </div>
      <div style={{ padding: '16px' }}>
        {milestones.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            No upcoming milestones.
          </div>
        ) : (
          milestones.map((m) => (
            <div
              key={m.id + m.type}
              onClick={() => router.push(m.type === 'project' ? `/galactic` : `/workstation?task=${m.id}`)}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.2)',
                marginBottom: '8px',
                cursor: 'pointer',
                borderLeft: `4px solid #00d9ff`,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
              }}
            >
              <div style={{ fontWeight: 600, color: '#fff' }}>{m.name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {m.projectName} • {new Date(m.dueDate).toLocaleDateString()} • {m.progressPercent}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
