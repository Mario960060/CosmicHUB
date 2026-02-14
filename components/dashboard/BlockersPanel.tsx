'use client';

import { useRouter } from 'next/navigation';
import { Ban, Link2 } from 'lucide-react';
import type { BlockerWithDependency, DependencyWait } from '@/lib/dashboard/attention-queries';

interface BlockersPanelProps {
  myBlockers: BlockerWithDependency[];
  dependencyWaits: DependencyWait[];
}

export function BlockersPanel({ myBlockers, dependencyWaits }: BlockersPanelProps) {
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
          }}
        >
          Blockers & Dependencies
        </h2>
      </div>

      <div style={{ padding: '16px' }}>
        {myBlockers.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px', fontWeight: 600 }}>
              YOUR BLOCKED TASKS ({myBlockers.length})
            </div>
            {myBlockers.map((b) => (
              <div
                key={b.id}
                onClick={() => router.push(`/workstation?task=${(b as { parent_id?: string }).parent_id ?? b.id}`)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  borderLeft: '4px solid #ef4444',
                  background: 'rgba(0,0,0,0.2)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, color: '#fff' }}>{b.name}</div>
                {b.depends_on && (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                    <Ban size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Waiting on: {b.depends_on.name} ({(b.depends_on as { status?: string }).status ?? '?'})
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {dependencyWaits.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: '#f97316', marginBottom: '8px', fontWeight: 600 }}>
              WAITING ON ({dependencyWaits.length})
            </div>
            {dependencyWaits.map((d, i) => (
              <div
                key={d.dependent_task_id + String(i)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Link2 size={16} style={{ color: '#f97316', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                    {d.dependent_subtask?.name ?? 'Task'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    → {d.depends_on_subtask?.name} ({(d.depends_on_subtask as { status?: string })?.status ?? 'pending'})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {myBlockers.length === 0 && dependencyWaits.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            No blockers or dependency waits.
          </div>
        )}
      </div>
    </div>
  );
}
