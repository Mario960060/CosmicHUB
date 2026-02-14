'use client';

import { useRouter } from 'next/navigation';
import type { FocusTask } from '@/types/dashboard';

const CATEGORY_COLORS: Record<string, string> = {
  overdue: '#ef4444',
  due_today: '#f97316',
  due_this_week: '#eab308',
  in_progress: '#00d9ff',
  high_priority: '#a855f7',
  normal: 'rgba(255,255,255,0.4)',
};

const CATEGORY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due_today: 'Due Today',
  due_this_week: 'Due This Week',
  in_progress: 'In Progress',
  high_priority: 'High Priority',
  normal: 'Normal',
};

interface FocusQueuePanelProps {
  tasks: FocusTask[];
}

export function FocusQueuePanel({ tasks }: FocusQueuePanelProps) {
  const router = useRouter();

  const byCategory = tasks.reduce<Record<string, FocusTask[]>>((acc, t) => {
    const c = t.category;
    if (!acc[c]) acc[c] = [];
    acc[c].push(t);
    return acc;
  }, {});

  const order = ['overdue', 'due_today', 'due_this_week', 'in_progress', 'high_priority', 'normal'];

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
          Focus Queue
        </h2>
      </div>

      <div style={{ padding: '16px' }}>
        {tasks.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            No active tasks. Browse available tasks to get started.
          </div>
        ) : (
          order
            .filter((c) => byCategory[c]?.length)
            .map((cat) => (
              <div key={cat} style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: CATEGORY_COLORS[cat],
                    marginBottom: '8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {CATEGORY_LABELS[cat]} ({byCategory[cat].length})
                </div>
                {byCategory[cat].map((task) => {
                  const color = CATEGORY_COLORS[task.category];
                  const parentId = task.parent_task?.id ?? task.parent_id;
                  const progress =
                    task.estimated_hours && task.estimated_hours > 0
                      ? Math.min(100, (task.hoursLogged / task.estimated_hours) * 100)
                      : 0;

                  return (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/workstation?task=${parentId}`)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        borderLeft: `4px solid ${color}`,
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{task.name}</span>
                        {task.due_date && (
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                            {task.deadlineRisk.daysLeft != null
                              ? task.deadlineRisk.daysLeft < 0
                                ? `${Math.abs(Math.round(task.deadlineRisk.daysLeft))}d overdue`
                                : `${Math.round(task.deadlineRisk.daysLeft)}d left`
                              : ''}
                          </span>
                        )}
                      </div>
                      {task.estimated_hours != null && (
                        <div
                          style={{
                            height: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              background: color,
                              transition: 'width 0.2s',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
