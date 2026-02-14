'use client';

import { useRouter } from 'next/navigation';
import { CheckSquare, Clock, Ban, UserX, AlertTriangle } from 'lucide-react';
import type { PMAttentionItems } from '@/lib/dashboard/attention-queries';

interface AttentionPanelProps {
  items: PMAttentionItems;
}

export function AttentionPanel({ items }: AttentionPanelProps) {
  const router = useRouter();

  const sections = [
    {
      key: 'pendingApprovals',
      label: 'Pending Approvals',
      Icon: CheckSquare,
      color: '#00d9ff',
      data: items.pendingApprovals as { id: string; task_name: string; module?: { project?: { name: string } } }[],
    },
    {
      key: 'overdueTasks',
      label: 'Overdue Tasks',
      Icon: Clock,
      color: '#ef4444',
      data: items.overdueTasks as { id: string; name: string }[],
    },
    {
      key: 'blockedTasks',
      label: 'Blocked Tasks',
      Icon: Ban,
      color: '#f97316',
      data: items.blockedTasks as { id: string; name: string }[],
    },
    {
      key: 'unassignedHighPriority',
      label: 'Unassigned High Priority',
      Icon: UserX,
      color: '#eab308',
      data: items.unassignedHighPriority as { id: string; name: string }[],
    },
  ];

  const total = sections.reduce((s, sec) => s + sec.data.length, 0) + items.workloadAlerts.length;

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: '18px', fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', margin: 0 }}>
          Wymagające Uwagi
        </h2>
        {total > 0 && (
          <span
            style={{
              background: 'rgba(239, 68, 68, 0.3)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#ef4444',
            }}
          >
            {total}
          </span>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {sections.map(({ key, label, Icon, color, data }) =>
          data.length > 0 ? (
            <div key={key} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color, marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={14} />
                {label} ({data.length})
              </div>
              {data.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(key === 'pendingApprovals' ? '/pm/requests' : `/workstation?task=${item.id}`)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.2)',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#fff',
                  }}
                >
                  {'task_name' in item ? item.task_name : item.name}
                </div>
              ))}
              {data.length > 5 && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  +{data.length - 5} more
                </div>
              )}
            </div>
          ) : null
        )}

        {items.workloadAlerts.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a855f7', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              Workload Alerts ({items.workloadAlerts.length})
            </div>
            {items.workloadAlerts.map((a) => (
              <div
                key={a.userId}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  marginBottom: '6px',
                  fontSize: '13px',
                  color: '#fff',
                }}
              >
                {a.userName}: {a.type === 'overloaded' ? `${a.count} tasks` : 'idle'}
              </div>
            ))}
          </div>
        )}

        {total === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            Nothing requiring attention.
          </div>
        )}
      </div>
    </div>
  );
}
