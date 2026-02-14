/**
 * Unit tests for red-flags-engine - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 1.3
 */
import { describe, it, expect } from 'vitest';
import {
  processDeadlineFlags,
  processAnomalyFlags,
  processBlockerFlags,
  processStaleFlags,
  processUnassignedFlags,
  processPendingApprovalFlags,
  mergeAndSortRedFlags,
  type SubtaskForDeadlineFlag,
  type SubtaskForAnomaly,
  type SubtaskForBlocker,
  type SubtaskForStale,
  type DependencyForBlocker,
  type TaskRequestForPending,
} from '@/lib/dashboard/red-flags-engine';
import type { DeadlineRisk } from '@/types/dashboard';

const baseSubtask = {
  id: 'st-1',
  name: 'Task Alpha',
  status: 'in_progress',
  updated_at: new Date().toISOString(),
  parent_task: { id: 't1', name: 'Parent' },
  module: { id: 'm1', name: 'Module' },
  project: { id: 'p1', name: 'Project X' },
};

describe('processDeadlineFlags', () => {
  it('filters only critical and high risk', () => {
    const items = [
      {
        subtask: { ...baseSubtask } as SubtaskForDeadlineFlag,
        risk: { level: 'critical', reason: 'Overdue' } as DeadlineRisk,
      },
      {
        subtask: { ...baseSubtask, id: 'st-2' } as SubtaskForDeadlineFlag,
        risk: { level: 'medium', reason: 'Due soon' } as DeadlineRisk,
      },
      {
        subtask: { ...baseSubtask, id: 'st-3' } as SubtaskForDeadlineFlag,
        risk: { level: 'high', reason: 'Tight' } as DeadlineRisk,
      },
    ];
    const flags = processDeadlineFlags(items);
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.severity)).toContain('critical');
    expect(flags.map((f) => f.severity)).toContain('high');
    expect(flags.every((f) => f.type === 'deadline')).toBe(true);
  });
});

describe('processAnomalyFlags', () => {
  it('produces anomaly flag with correct description', () => {
    const items = [
      {
        subtask: { ...baseSubtask, estimated_hours: 20 } as SubtaskForAnomaly,
        hoursLogged: 35,
        severity: 'high' as const,
      },
    ];
    const flags = processAnomalyFlags(items);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe('anomaly');
    expect(flags[0].severity).toBe('high');
    expect(flags[0].description).toContain('35');
    expect(flags[0].description).toContain('175');
  });
});

describe('processBlockerFlags', () => {
  it('boundary: exactly 3 days blocked = medium (not yet high)', () => {
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const subtasks: SubtaskForBlocker[] = [
      { ...baseSubtask, updated_at: threeDaysAgo } as SubtaskForBlocker,
    ];
    const flags = processBlockerFlags(subtasks, new Map());
    expect(flags[0].severity).toBe('medium');
  });

  it('boundary: just over 3 days blocked = high', () => {
    const now = Date.now();
    const threeDaysOneHourAgo = new Date(
      now - (3 * 24 + 1) * 60 * 60 * 1000
    ).toISOString();
    const subtasks: SubtaskForBlocker[] = [
      { ...baseSubtask, updated_at: threeDaysOneHourAgo } as SubtaskForBlocker,
    ];
    const flags = processBlockerFlags(subtasks, new Map());
    expect(flags[0].severity).toBe('high');
  });

  it('assigns high when blocked 3-7 days, critical when > 7 days', () => {
    const now = Date.now();
    const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

    const subtasks: SubtaskForBlocker[] = [
      { ...baseSubtask, updated_at: fourDaysAgo } as SubtaskForBlocker,
      {
        ...baseSubtask,
        id: 'st-2',
        updated_at: tenDaysAgo,
      } as SubtaskForBlocker,
    ];
    const deps = new Map<string, DependencyForBlocker[]>();

    const flags = processBlockerFlags(subtasks, deps);
    expect(flags).toHaveLength(2);
    const highFlag = flags.find((f) => f.description.includes('4'));
    const criticalFlag = flags.find((f) => f.description.includes('10'));
    expect(highFlag?.severity).toBe('high');
    expect(criticalFlag?.severity).toBe('critical');
  });

  it('includes blocker names from dependencies', () => {
    const subtasks: SubtaskForBlocker[] = [
      { ...baseSubtask } as SubtaskForBlocker,
    ];
    const deps = new Map<string, DependencyForBlocker[]>([
      [
        'st-1',
        [
          {
            dependent_task_id: 'st-1',
            depends_on_subtask: { id: 'd1', name: 'Blocking Task', status: 'todo' },
          },
        ],
      ],
    ]);

    const flags = processBlockerFlags(subtasks, deps);
    expect(flags[0].description).toContain('Blocking Task');
  });
});

describe('processStaleFlags', () => {
  it('boundary: exactly 5 days = medium', () => {
    const items = [
      {
        subtask: { ...baseSubtask } as SubtaskForStale,
        daysWithoutActivity: 5,
      },
    ];
    const flags = processStaleFlags(items);
    expect(flags[0].severity).toBe('medium');
  });

  it('boundary: exactly 10 days = high', () => {
    const items = [
      {
        subtask: { ...baseSubtask } as SubtaskForStale,
        daysWithoutActivity: 10,
      },
    ];
    const flags = processStaleFlags(items);
    expect(flags[0].severity).toBe('high');
  });

  it('medium for 5-9 days, high for 10+', () => {
    const items = [
      {
        subtask: { ...baseSubtask } as SubtaskForStale,
        daysWithoutActivity: 6,
      },
      {
        subtask: { ...baseSubtask, id: 'st-2' } as SubtaskForStale,
        daysWithoutActivity: 12,
      },
    ];

    const flags = processStaleFlags(items);
    expect(flags).toHaveLength(2);
    expect(flags[0].severity).toBe('medium');
    expect(flags[1].severity).toBe('high');
  });
});

describe('processUnassignedFlags', () => {
  it('medium for priority 2, high for priority 3', () => {
    const subtasks = [
      { ...baseSubtask, assigned_to: null, priority_stars: 2 },
      { ...baseSubtask, id: 'st-2', assigned_to: null, priority_stars: 3 },
    ];

    const flags = processUnassignedFlags(subtasks);
    expect(flags).toHaveLength(2);
    expect(flags[0].severity).toBe('medium');
    expect(flags[1].severity).toBe('high');
  });
});

describe('processPendingApprovalFlags', () => {
  it('high when > 7 days, medium when 3-7 days', () => {
    const now = Date.now();
    const requests: TaskRequestForPending[] = [
      {
        id: 'r1',
        task_name: 'Task A',
        created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        module: { name: 'M1', project: { name: 'P1' } },
      },
      {
        id: 'r2',
        task_name: 'Task B',
        created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        module: { name: 'M2', project: { name: 'P2' } },
      },
    ];

    const flags = processPendingApprovalFlags(requests);
    expect(flags).toHaveLength(2);
    expect(flags[0].severity).toBe('medium');
    expect(flags[1].severity).toBe('high');
  });
});

describe('mergeAndSortRedFlags', () => {
  it('sorts by severity: critical > high > medium, then by createdAt', () => {
    const flags = [
      {
        id: '1',
        type: 'blocked' as const,
        severity: 'high' as const,
        title: 'B',
        description: '',
        relatedEntity: { type: 'subtask' as const, id: 'a', name: 'A' },
        projectName: 'P',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '2',
        type: 'deadline' as const,
        severity: 'critical' as const,
        title: 'A',
        description: '',
        relatedEntity: { type: 'subtask' as const, id: 'b', name: 'B' },
        projectName: 'P',
        createdAt: '2024-01-03T00:00:00Z',
      },
      {
        id: '3',
        type: 'stale' as const,
        severity: 'medium' as const,
        title: 'C',
        description: '',
        relatedEntity: { type: 'subtask' as const, id: 'c', name: 'C' },
        projectName: 'P',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const sorted = mergeAndSortRedFlags(flags);
    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('high');
    expect(sorted[2].severity).toBe('medium');
  });
});
