/**
 * Progress calculation utilities for Detail Cards
 * - Task (moon): progress = done subtasks / total subtasks
 * - Module (planet): progress = AVERAGE of child task progress % (cascade)
 */

export interface TaskProgress {
  taskId: string;
  totalSubtasks: number;
  doneSubtasks: number;
  progressPercent: number;
}

/**
 * Calculate task progress based on subtask statuses.
 * Uses progress_percent override when set (manual % from Add Progress).
 */
export function calculateTaskProgress(
  subtasks: { status: string }[],
  progressPercentOverride?: number | null
): number {
  if (progressPercentOverride != null && progressPercentOverride >= 0) {
    return Math.min(100, Math.max(0, Math.round(progressPercentOverride)));
  }
  if (subtasks.length === 0) return 0;
  const done = subtasks.filter((s) => s.status === 'done').length;
  return Math.round((done / subtasks.length) * 100);
}

/**
 * Calculate project (sun) progress as AVERAGE of all module (planet) progress %.
 */
export function calculateProjectProgress(
  modules: { tasks?: { subtasks?: { status: string }[]; progress_percent?: number | null }[]; progress_percent?: number | null }[]
): number {
  if (modules.length === 0) return 0;
  const moduleProgresses = modules.map((m) =>
    calculateModuleProgress(m.tasks || [], m.progress_percent)
  );
  const sum = moduleProgresses.reduce((acc, p) => acc + p, 0);
  return Math.round(sum / modules.length);
}

/**
 * Calculate module progress as AVERAGE of child task progress %.
 * Uses progress_percent override when set (manual % from Add Progress).
 */
export function calculateModuleProgress(
  tasks: { subtasks?: { status: string }[]; progress_percent?: number | null }[],
  progressPercentOverride?: number | null
): number {
  if (progressPercentOverride != null && progressPercentOverride >= 0) {
    return Math.min(100, Math.max(0, Math.round(progressPercentOverride)));
  }
  if (tasks.length === 0) return 0;
  const taskProgresses = tasks.map((task) =>
    calculateTaskProgress(task.subtasks || [], task.progress_percent)
  );
  const sum = taskProgresses.reduce((acc, p) => acc + p, 0);
  return Math.round(sum / tasks.length);
}

/**
 * Calculate days remaining until deadline
 * Returns negative number if overdue
 */
export function calculateDaysRemaining(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get due date display style (color + text)
 */
export function getDueDateStyle(daysRemaining: number | null): {
  color: string;
  text: string;
} {
  if (daysRemaining === null)
    return { color: 'rgba(255,255,255,0.5)', text: 'No deadline' };
  if (daysRemaining < 0)
    return { color: '#ef4444', text: `OVERDUE! ${Math.abs(daysRemaining)} days` };
  if (daysRemaining === 0) return { color: '#ef4444', text: 'Due TODAY!' };
  if (daysRemaining <= 3) return { color: '#ef4444', text: `${daysRemaining} days!` };
  if (daysRemaining <= 7) return { color: '#f59e0b', text: `${daysRemaining} days` };
  return { color: '#22c55e', text: `${daysRemaining} days` };
}

/**
 * Get unique user IDs assigned to subtasks
 */
export function getAssignedPeople(
  subtasks: { assigned_to: string | null }[]
): string[] {
  const ids = subtasks
    .map((s) => s.assigned_to)
    .filter((id): id is string => id !== null);
  return [...new Set(ids)];
}

/**
 * Sum estimated hours from child tasks
 */
export function sumEstimatedHours(
  tasks: { estimated_hours: number | null }[]
): number | null {
  const values = tasks
    .map((t) => t.estimated_hours)
    .filter((h): h is number => h !== null && h !== undefined);
  if (values.length === 0) return null;
  return values.reduce((acc, h) => acc + h, 0);
}

/**
 * Sum estimated hours from minitasks (asteroids)
 */
export function sumMinitaskEstimatedHours(
  minitasks: { estimated_hours: number | null }[]
): number | null {
  const values = minitasks
    .map((m) => m.estimated_hours)
    .filter((h): h is number => h !== null && h !== undefined);
  if (values.length === 0) return null;
  return values.reduce((acc, h) => acc + h, 0);
}

/**
 * Sum logged hours from work logs (subtask-level)
 */
export function sumLoggedHours(
  workLogs: { hours_spent: number }[]
): number {
  return workLogs.reduce((acc, wl) => acc + wl.hours_spent, 0);
}

/**
 * Count tasks (moons) by derived status from subtasks
 * - done: all subtasks done
 * - inProgress: some subtasks in progress
 * - todo: no subtasks or all todo/blocked
 */
export function countTasksByStatus(
  tasks: { subtasks?: { status: string }[] }[]
): { total: number; done: number; inProgress: number; todo: number } {
  let done = 0;
  let inProgress = 0;
  let todo = 0;
  for (const task of tasks) {
    const subtasks = task.subtasks || [];
    const doneCount = subtasks.filter((s) => s.status === 'done').length;
    const inProgressCount = subtasks.filter(
      (s) => s.status === 'in_progress'
    ).length;
    if (subtasks.length === 0) {
      todo++;
    } else if (doneCount === subtasks.length) {
      done++;
    } else if (inProgressCount > 0 || doneCount > 0) {
      inProgress++;
    } else {
      todo++;
    }
  }
  return {
    total: tasks.length,
    done,
    inProgress,
    todo,
  };
}

/**
 * Count subtasks by status
 */
export function countSubtasksByStatus(subtasks: { status: string }[]): {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
} {
  const done = subtasks.filter((s) => s.status === 'done').length;
  const inProgress = subtasks.filter((s) => s.status === 'in_progress').length;
  const todo = subtasks.filter(
    (s) => s.status === 'todo' || s.status === 'blocked'
  ).length;
  return {
    total: subtasks.length,
    done,
    inProgress,
    todo,
  };
}
