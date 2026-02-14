/**
 * Unit tests for deadline-engine - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 1.2
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRemainingHours,
  calculateTaskMetrics,
  calculateDeadlineRisk,
  getOverrunAnomalySeverity,
} from '@/lib/dashboard/deadline-engine';

describe('calculateRemainingHours', () => {
  it('returns 0 when status is done', () => {
    const result = calculateRemainingHours(
      { status: 'done', estimated_hours: 10, due_date: null },
      [{ hours_spent: 5 }]
    );
    expect(result).toBe(0);
  });

  it('returns null when estimated_hours is null', () => {
    const result = calculateRemainingHours(
      { status: 'in_progress', estimated_hours: null, due_date: null },
      [{ hours_spent: 5 }]
    );
    expect(result).toBeNull();
  });

  it('returns estimated - logged when under estimate (path A)', () => {
    const result = calculateRemainingHours(
      { status: 'in_progress', estimated_hours: 20, due_date: null },
      [{ hours_spent: 8 }, { hours_spent: 4 }]
    );
    expect(result).toBe(8);
  });

  it('uses sibling velocity when overrun and siblings exist', () => {
    const subtask = { status: 'in_progress', estimated_hours: 10, due_date: null };
    const workLogs = [{ hours_spent: 12 }]; // overrun
    const siblings = [
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' }, // our subtask
      { status: 'in_progress' },
      { status: 'todo' },
    ]; // 5/8 done, 3 in progress
    // completion = 5/8 = 0.625, projectedTotal = 12/0.625 = 19.2, remaining = 19.2 - 12 = 7.2
    const result = calculateRemainingHours(subtask, workLogs, siblings);
    expect(result).toBeCloseTo(7.2, 2);
  });

  it('uses conservative extrapolation when overrun without siblings', () => {
    const subtask = { status: 'in_progress', estimated_hours: 100, due_date: null };
    const workLogs = [{ hours_spent: 120 }];
    // max(100*0.25, 120*0.15) = max(25, 18) = 25
    const result = calculateRemainingHours(subtask, workLogs);
    expect(result).toBe(25);
  });

  it('returns estimated when no work logs', () => {
    const result = calculateRemainingHours(
      { status: 'todo', estimated_hours: 15, due_date: null },
      []
    );
    expect(result).toBe(15);
  });
});

describe('calculateTaskMetrics', () => {
  it('computes effort percent and task completion from siblings', () => {
    const subtask = { status: 'in_progress', estimated_hours: 20, due_date: null };
    const siblings = [
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' },
      { status: 'todo' },
    ];
    const { effortPercent, taskCompletionPercent } = calculateTaskMetrics(
      subtask,
      10,
      siblings
    );
    expect(effortPercent).toBe(50); // 10/20
    expect(taskCompletionPercent).toBe(60); // 3/5 done
  });

  it('fallback when no siblings: done=100, in_progress=50, todo=0', () => {
    expect(
      calculateTaskMetrics(
        { status: 'done', estimated_hours: 10, due_date: null },
        10,
        []
      ).taskCompletionPercent
    ).toBe(100);
    expect(
      calculateTaskMetrics(
        { status: 'in_progress', estimated_hours: 10, due_date: null },
        5,
        []
      ).taskCompletionPercent
    ).toBe(50);
    expect(
      calculateTaskMetrics(
        { status: 'todo', estimated_hours: 10, due_date: null },
        0,
        []
      ).taskCompletionPercent
    ).toBe(0);
  });
});

describe('calculateDeadlineRisk', () => {
  const futureDate = () =>
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = () =>
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const today = () => new Date().toISOString();

  it('returns critical when overdue', () => {
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: pastDate() },
      [{ hours_spent: 2 }]
    );
    expect(risk.level).toBe('critical');
    expect(risk.isOverrun).toBe(false);
  });

  it('returns none when done', () => {
    const risk = calculateDeadlineRisk(
      { status: 'done', estimated_hours: 10, due_date: pastDate() },
      [{ hours_spent: 15 }]
    );
    expect(risk.level).toBe('none');
  });

  it('returns none when no due_date', () => {
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: null },
      []
    );
    expect(risk.level).toBe('none');
  });

  it('no estimated_hours: critical when overdue', () => {
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: null, due_date: pastDate() },
      []
    );
    expect(risk.level).toBe('critical');
  });

  it('no estimated_hours: high when <= 2 days', () => {
    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: null, due_date: in2Days },
      []
    );
    expect(risk.level).toBe('high');
  });

  it('no work logs: hoursLogged=0, remaining=estimated', () => {
    const risk = calculateDeadlineRisk(
      { status: 'todo', estimated_hours: 20, due_date: futureDate() },
      []
    );
    expect(risk.hoursLogged).toBe(0);
    expect(risk.hoursRemaining).toBe(20);
  });

  it('isOverrun when logged >= estimated and not done', () => {
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: futureDate() },
      [{ hours_spent: 12 }]
    );
    expect(risk.isOverrun).toBe(true);
  });

  it('returns HIGH when days <= 3 and remaining > available * 0.8', () => {
    // 2 days left = 16h available, 0.8 * 16 = 12.8h. Need remaining > 12.8
    // estimated=20, logged=2 → remaining=18. Siblings: 2/10 done = 20% completion (avoids other HIGH path)
    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const siblings = [
      ...Array(2).fill({ status: 'done' }),
      ...Array(8).fill({ status: 'todo' }),
    ];
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 20, due_date: in2Days },
      [{ hours_spent: 2 }],
      siblings
    );
    expect(risk.level).toBe('high');
  });

  it('returns HIGH when days <= 7 and task_completion < 30%', () => {
    // 5 days left, 2/10 done = 20% < 30%. Need remaining to NOT trigger HIGH from hours.
    // Low remaining e.g. 5h so we don't hit "remaining > available*0.8" (40*0.8=32)
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const siblings = [
      ...Array(2).fill({ status: 'done' }),
      ...Array(8).fill({ status: 'todo' }),
    ];
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: in5Days },
      [{ hours_spent: 1 }], // 9h remaining, well under 40*0.8
      siblings
    );
    expect(risk.level).toBe('high');
  });

  it('returns MEDIUM when days <= 7 and remaining > available * 0.6', () => {
    // 5 days = 40h. 0.6*40=24h. Need remaining > 24 but < 32 (to avoid HIGH)
    // remaining=28h: estimated=30, logged=2. Completion high (70%) to avoid HIGH from completion rule
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const siblings = [
      ...Array(7).fill({ status: 'done' }),
      ...Array(3).fill({ status: 'todo' }),
    ]; // 70% completion
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 30, due_date: in5Days },
      [{ hours_spent: 2 }],
      siblings
    );
    expect(risk.level).toBe('medium');
  });

  it('returns MEDIUM when days <= 14 and task_completion < 20%', () => {
    // 10 days left, 1/10 done = 10%. Low remaining to avoid HIGH
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const siblings = [
      ...Array(1).fill({ status: 'done' }),
      ...Array(9).fill({ status: 'todo' }),
    ];
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: in10Days },
      [{ hours_spent: 1 }],
      siblings
    );
    expect(risk.level).toBe('medium');
  });

  it('overrun + close deadline (days <= 3) = CRITICAL', () => {
    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const risk = calculateDeadlineRisk(
      { status: 'in_progress', estimated_hours: 10, due_date: in2Days },
      [{ hours_spent: 12 }] // overrun
    );
    expect(risk.level).toBe('critical');
    expect(risk.isOverrun).toBe(true);
  });
});

describe('getOverrunAnomalySeverity', () => {
  it('returns null when done', () => {
    expect(getOverrunAnomalySeverity(15, 10, 'done')).toBeNull();
  });

  it('returns null when under estimate', () => {
    expect(getOverrunAnomalySeverity(8, 10, 'in_progress')).toBeNull();
  });

  it('returns medium when ratio 1.0-1.5', () => {
    expect(getOverrunAnomalySeverity(11, 10, 'in_progress')).toBe('medium');
    expect(getOverrunAnomalySeverity(14, 10, 'in_progress')).toBe('medium');
  });

  it('returns high when ratio 1.5-2.0', () => {
    expect(getOverrunAnomalySeverity(15, 10, 'in_progress')).toBe('high');
    expect(getOverrunAnomalySeverity(19, 10, 'in_progress')).toBe('high');
  });

  it('returns critical when ratio >= 2.0', () => {
    expect(getOverrunAnomalySeverity(20, 10, 'in_progress')).toBe('critical');
  });

  it('boundary: exactly 1.5 ratio returns high', () => {
    expect(getOverrunAnomalySeverity(15, 10, 'in_progress')).toBe('high');
  });

  it('boundary: exactly 2.0 ratio returns critical', () => {
    expect(getOverrunAnomalySeverity(20, 10, 'in_progress')).toBe('critical');
  });
});
