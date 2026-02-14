/**
 * Deadline Risk Engine - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 1.2
 * Pure logic: calculates real remaining hours, deadline risk, overrun anomaly.
 * No Supabase/DB dependencies.
 */

import type { DeadlineRisk, DeadlineRiskLevel } from '@/types/dashboard';

const WORK_HOURS_PER_DAY = 8;

export interface SubtaskInput {
  status: string;
  estimated_hours: number | null;
  due_date: string | null;
}

export interface WorkLogInput {
  hours_spent: number;
}

export interface SiblingSubtaskInput {
  status: string;
}

/**
 * Krok 1: Oblicz REALNE remaining hours (nie naiwne max(0, ...))
 */
export function calculateRemainingHours(
  subtask: SubtaskInput,
  workLogs: WorkLogInput[],
  siblingSubtasks?: SiblingSubtaskInput[]
): number | null {
  const hoursLogged = workLogs.reduce((sum, log) => sum + log.hours_spent, 0);
  const estimated = subtask.estimated_hours;

  if (subtask.status === 'done') return 0;
  if (estimated == null) return null;

  if (hoursLogged < estimated) {
    return estimated - hoursLogged;
  }

  // ŚCIEŻKA B: overrun - ekstrapolacja
  if (siblingSubtasks && siblingSubtasks.length > 1) {
    const doneCount = siblingSubtasks.filter((s) => s.status === 'done').length;
    const totalCount = siblingSubtasks.length;
    if (doneCount > 0 && doneCount < totalCount) {
      const completion = doneCount / totalCount;
      const projectedTotal = hoursLogged / completion;
      return projectedTotal - hoursLogged;
    }
  }

  return Math.max(estimated * 0.25, hoursLogged * 0.15);
}

/**
 * Krok 2: Task completion percent + effort percent
 */
export function calculateTaskMetrics(
  subtask: SubtaskInput,
  hoursLogged: number,
  siblingSubtasks?: SiblingSubtaskInput[]
): { effortPercent: number; taskCompletionPercent: number } {
  const estimated = subtask.estimated_hours ?? 0;
  const effortPercent = estimated > 0 ? (hoursLogged / estimated) * 100 : 0;

  let taskCompletionPercent: number;
  if (siblingSubtasks && siblingSubtasks.length > 0) {
    const doneCount = siblingSubtasks.filter((s) => s.status === 'done').length;
    taskCompletionPercent = (doneCount / siblingSubtasks.length) * 100;
  } else {
    taskCompletionPercent =
      subtask.status === 'done' ? 100 : subtask.status === 'in_progress' ? 50 : 0;
  }

  return { effortPercent, taskCompletionPercent };
}

/**
 * Krok 3: Deadline risk level
 */
function getDeadlineRiskLevel(
  daysUntilDeadline: number | null,
  remainingHours: number | null,
  status: string,
  effortPercent: number,
  taskCompletionPercent: number,
  isOverrun: boolean,
  dueDate: string | null
): DeadlineRiskLevel {
  if (dueDate == null) return 'none';
  if (status === 'done') return 'none';

  const isDone = status === 'done';
  const now = Date.now();
  const dueTime = new Date(dueDate).getTime();
  const overdue = dueTime < now;

  // CRITICAL
  if (!isDone && overdue) return 'critical';
  if (
    !isDone &&
    daysUntilDeadline != null &&
    daysUntilDeadline <= 1 &&
    remainingHours != null
  ) {
    const availableWorkHours = Math.max(0, daysUntilDeadline) * WORK_HOURS_PER_DAY;
    if (remainingHours > availableWorkHours) return 'critical';
  }
  if (!isDone && isOverrun && daysUntilDeadline != null && daysUntilDeadline <= 3)
    return 'critical';

  // HIGH
  if (
    daysUntilDeadline != null &&
    daysUntilDeadline <= 3 &&
    remainingHours != null
  ) {
    const availableWorkHours = Math.max(0, daysUntilDeadline) * WORK_HOURS_PER_DAY;
    if (remainingHours > availableWorkHours * 0.8) return 'high';
  }
  if (
    daysUntilDeadline != null &&
    daysUntilDeadline <= 7 &&
    taskCompletionPercent < 30
  )
    return 'high';
  if (!isDone && isOverrun && daysUntilDeadline != null && daysUntilDeadline <= 7)
    return 'high';

  // MEDIUM
  if (
    daysUntilDeadline != null &&
    daysUntilDeadline <= 7 &&
    remainingHours != null
  ) {
    const availableWorkHours = Math.max(0, daysUntilDeadline) * WORK_HOURS_PER_DAY;
    if (remainingHours > availableWorkHours * 0.6) return 'medium';
  }
  if (
    daysUntilDeadline != null &&
    daysUntilDeadline <= 14 &&
    taskCompletionPercent < 20
  )
    return 'medium';

  // LOW
  if (daysUntilDeadline != null && daysUntilDeadline <= 14) return 'low';

  return 'none';
}

/**
 * Fallback when no estimated_hours - risk based only on days + status
 */
function getDeadlineRiskLevelNoEstimate(
  daysUntilDeadline: number | null,
  status: string,
  dueDate: string | null
): DeadlineRiskLevel {
  if (dueDate == null) return 'none';
  const overdue = daysUntilDeadline != null && daysUntilDeadline < 0;
  if (!overdue && (status === 'done' || daysUntilDeadline == null))
    return 'none';

  if (!overdue) {
    if (daysUntilDeadline! <= 2) return 'high';
    if (daysUntilDeadline! <= 7) return 'medium';
  } else {
    return 'critical';
  }
  return 'none';
}

function buildReason(
  level: DeadlineRiskLevel,
  daysUntilDeadline: number | null,
  overdue: boolean,
  isOverrun: boolean,
  effortPercent: number
): string {
  if (level === 'none') return '';
  if (overdue)
    return `Overdue by ${daysUntilDeadline != null ? Math.abs(Math.round(daysUntilDeadline)) : '?'} days`;
  if (level === 'critical' || level === 'high') {
    if (isOverrun) return `${Math.round(effortPercent)}% of estimate, still in progress`;
    if (daysUntilDeadline != null && daysUntilDeadline <= 1)
      return 'Due tomorrow or today';
    if (daysUntilDeadline != null && daysUntilDeadline <= 3)
      return `Due in ${Math.round(daysUntilDeadline)} days`;
    if (daysUntilDeadline != null && daysUntilDeadline <= 7)
      return `Due in ${Math.round(daysUntilDeadline)} days, low completion`;
  }
  if (level === 'medium') {
    if (daysUntilDeadline != null) return `Due in ${Math.round(daysUntilDeadline)} days`;
  }
  return 'Approaching deadline';
}

/**
 * Main: Calculate full DeadlineRisk for a subtask
 */
export function calculateDeadlineRisk(
  subtask: SubtaskInput,
  workLogs: WorkLogInput[],
  siblingSubtasks?: SiblingSubtaskInput[]
): DeadlineRisk {
  const hoursLogged = workLogs.reduce((sum, log) => sum + log.hours_spent, 0);
  const estimated = subtask.estimated_hours;
  const isOverrun =
    estimated != null && hoursLogged >= estimated && subtask.status !== 'done';

  const { effortPercent, taskCompletionPercent } = calculateTaskMetrics(
    subtask,
    hoursLogged,
    siblingSubtasks
  );

  const dueDate = subtask.due_date;
  let daysLeft: number | null = null;
  if (dueDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    daysLeft = (new Date(dueDate).getTime() - Date.now()) / msPerDay;
  }

  const remainingHours = calculateRemainingHours(
    subtask,
    workLogs,
    siblingSubtasks
  );

  let level: DeadlineRiskLevel;
  let projectedTotal: number | null = null;

  if (estimated == null) {
    level = getDeadlineRiskLevelNoEstimate(
      daysLeft,
      subtask.status,
      dueDate
    );
  } else {
    level = getDeadlineRiskLevel(
      daysLeft,
      remainingHours,
      subtask.status,
      effortPercent,
      taskCompletionPercent,
      isOverrun,
      dueDate
    );

    if (isOverrun && siblingSubtasks && siblingSubtasks.length > 1) {
      const doneCount = siblingSubtasks.filter((s) => s.status === 'done').length;
      const totalCount = siblingSubtasks.length;
      if (doneCount > 0 && doneCount < totalCount) {
        const completion = doneCount / totalCount;
        projectedTotal = hoursLogged / completion;
      }
    }
  }

  const overdue = daysLeft != null && daysLeft < 0;
  const reason = buildReason(
    level,
    daysLeft,
    overdue,
    isOverrun,
    effortPercent
  );

  return {
    level,
    reason,
    daysLeft: daysLeft != null ? Math.round(daysLeft * 10) / 10 : null,
    hoursRemaining: remainingHours,
    hoursLogged,
    estimatedHours: estimated,
    effortPercent: Math.round(effortPercent * 10) / 10,
    taskCompletionPercent: Math.round(taskCompletionPercent * 10) / 10,
    isOverrun,
    projectedTotal,
  };
}

/**
 * Krok 4: Overrun anomaly severity (for RedFlag type='anomaly')
 */
export function getOverrunAnomalySeverity(
  hoursLogged: number,
  estimatedHours: number,
  status: string
): 'critical' | 'high' | 'medium' | null {
  if (status === 'done') return null;
  if (hoursLogged < estimatedHours) return null;

  const ratio = hoursLogged / estimatedHours;
  if (ratio >= 2.0) return 'critical';
  if (ratio >= 1.5) return 'high';
  if (ratio >= 1.0) return 'medium';
  return null;
}
