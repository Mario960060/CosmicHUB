/**
 * Red Flags Engine - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 1.3
 * Pure logic: processes fetched data into RedFlag[].
 * No Supabase/DB dependencies. Called by red-flags-queries.
 */

import type { RedFlag, RedFlagSeverity } from '@/types/dashboard';
import type { DeadlineRisk } from '@/types/dashboard';

const SEVERITY_ORDER: Record<RedFlagSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

export interface SubtaskForDeadlineFlag {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  updated_at: string;
  assigned_to?: string | null;
  parent_task?: { id: string; name: string };
  assigned_user?: { id: string; full_name: string } | null;
  module?: { id: string; name: string };
  project?: { id: string; name: string };
}

export interface SubtaskForAnomaly {
  id: string;
  name: string;
  status: string;
  estimated_hours: number | null;
  parent_task?: { id: string; name: string };
  assigned_user?: { id: string; full_name: string } | null;
  module?: { id: string; name: string };
  project?: { id: string; name: string };
}

export interface SubtaskForBlocker {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  assigned_to?: string | null;
  parent_task?: { id: string; name: string };
  assigned_user?: { id: string; full_name: string } | null;
  module?: { id: string; name: string };
  project?: { id: string; name: string };
}

export interface DependencyForBlocker {
  dependent_task_id: string;
  depends_on_subtask?: { id: string; name: string; status: string };
}

export interface SubtaskForStale {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  assigned_to?: string | null;
  parent_task?: { id: string; name: string };
  assigned_user?: { id: string; full_name: string } | null;
  module?: { id: string; name: string };
  project?: { id: string; name: string };
}

export interface TaskRequestForPending {
  id: string;
  task_name: string;
  created_at: string;
  module?: { name: string; project?: { name: string } };
  requester?: { full_name: string };
}

function getProjectName(item: unknown): string {
  const o = item as Record<string, unknown>;
  const project = o?.project as { name?: string } | undefined;
  const module = o?.module as { project?: { name?: string } } | undefined;
  const parentTask = o?.parent_task as { module?: { project?: { name?: string } } } | undefined;
  return project?.name ?? module?.project?.name ?? parentTask?.module?.project?.name ?? 'Unknown project';
}

/**
 * Deadline Flags: subtasks z risk level critical lub high
 */
export function processDeadlineFlags(
  items: { subtask: SubtaskForDeadlineFlag; risk: DeadlineRisk }[]
): RedFlag[] {
  return items
    .filter(({ risk }) => risk.level === 'critical' || risk.level === 'high')
    .map(({ subtask, risk }) => ({
      id: `deadline-${subtask.id}`,
      type: 'deadline' as const,
      severity: risk.level as RedFlagSeverity,
      title: subtask.name,
      description: risk.reason || `Deadline risk: ${risk.level}`,
      relatedEntity: {
        type: 'subtask' as const,
        id: subtask.id,
        name: subtask.name,
      },
      projectName: getProjectName(subtask),
      assignedTo: subtask.assigned_user
        ? { id: subtask.assigned_user.id, name: subtask.assigned_user.full_name }
        : undefined,
      metrics: {
        estimated: risk.estimatedHours ?? 0,
        logged: risk.hoursLogged,
        percent: risk.effortPercent,
        daysLeft: risk.daysLeft ?? 0,
      },
      createdAt: subtask.updated_at,
    }));
}

/**
 * Anomalie czasowe (overrun)
 */
export function processAnomalyFlags(
  items: {
    subtask: SubtaskForAnomaly;
    hoursLogged: number;
    severity: RedFlagSeverity;
  }[]
): RedFlag[] {
  return items.map(({ subtask, hoursLogged, severity }) => {
    const estimated = subtask.estimated_hours ?? 0;
    const percent = estimated > 0 ? Math.round((hoursLogged / estimated) * 100) : 0;
    return {
      id: `anomaly-${subtask.id}`,
      type: 'anomaly' as const,
      severity,
      title: subtask.name,
      description: `Estimated ${estimated}h, logged ${hoursLogged}h (${percent}%)`,
      relatedEntity: {
        type: 'subtask' as const,
        id: subtask.id,
        name: subtask.name,
      },
      projectName: getProjectName(subtask),
      assignedTo: subtask.assigned_user
        ? { id: subtask.assigned_user.id, name: subtask.assigned_user.full_name }
        : undefined,
      metrics: {
        estimated,
        logged: hoursLogged,
        percent,
        daysLeft: 0,
      },
      createdAt: new Date().toISOString(),
    };
  });
}

/**
 * Blokery: blocked > 3 dni = high, > 7 dni = critical
 */
export function processBlockerFlags(
  subtasks: SubtaskForBlocker[],
  dependenciesBySubtask: Map<string, DependencyForBlocker[]>
): RedFlag[] {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  return subtasks.map((subtask) => {
    const blockedAt = new Date(subtask.updated_at).getTime();
    const daysBlocked = (now - blockedAt) / msPerDay;
    // Round to 2 decimals to avoid timing/floating-point edge cases in boundary tests
    const daysRounded = Math.round(daysBlocked * 100) / 100;

    let severity: RedFlagSeverity = 'medium';
    if (daysRounded > 7) severity = 'critical';
    else if (daysRounded > 3) severity = 'high';

    const deps = dependenciesBySubtask.get(subtask.id) ?? [];
    const blockerNames = deps
      .map((d) => d.depends_on_subtask?.name)
      .filter(Boolean)
      .join(', ');

    return {
      id: `blocked-${subtask.id}`,
      type: 'blocked' as const,
      severity,
      title: subtask.name,
      description: blockerNames
        ? `Blocked by: ${blockerNames} (${Math.round(daysBlocked)} days)`
        : `Blocked for ${Math.round(daysBlocked)} days`,
      relatedEntity: {
        type: 'subtask' as const,
        id: subtask.id,
        name: subtask.name,
      },
      projectName: getProjectName(subtask),
      assignedTo: subtask.assigned_user
        ? { id: subtask.assigned_user.id, name: subtask.assigned_user.full_name }
        : undefined,
      metrics: { estimated: 0, logged: 0, percent: 0, daysLeft: -daysRounded },
      createdAt: subtask.updated_at,
    };
  });
}

/**
 * Stale tasks: in_progress bez activity 5+ dni
 * 5-9 dni = medium, 10+ = high
 */
export function processStaleFlags(
  items: {
    subtask: SubtaskForStale;
    daysWithoutActivity: number;
  }[]
): RedFlag[] {
  return items.map(({ subtask, daysWithoutActivity }) => {
    const severity: RedFlagSeverity =
      daysWithoutActivity >= 10 ? 'high' : 'medium';
    return {
      id: `stale-${subtask.id}`,
      type: 'stale' as const,
      severity,
      title: subtask.name,
      description: `No activity for ${Math.round(daysWithoutActivity)} days`,
      relatedEntity: {
        type: 'subtask' as const,
        id: subtask.id,
        name: subtask.name,
      },
      projectName: getProjectName(subtask),
      assignedTo: subtask.assigned_user
        ? { id: subtask.assigned_user.id, name: subtask.assigned_user.full_name }
        : undefined,
      metrics: {
        estimated: 0,
        logged: 0,
        percent: 0,
        daysLeft: -daysWithoutActivity,
      },
      createdAt: subtask.updated_at,
    };
  });
}

/**
 * Unassigned high-priority: priority_stars >= 2, todo
 * stars 2 = medium, stars 3 = high
 */
export function processUnassignedFlags(
  subtasks: (SubtaskForAnomaly & { priority_stars: number })[]
): RedFlag[] {
  return subtasks.map((subtask) => {
    const severity: RedFlagSeverity =
      subtask.priority_stars >= 3 ? 'high' : 'medium';
    return {
      id: `unassigned-${subtask.id}`,
      type: 'unassigned' as const,
      severity,
      title: subtask.name,
      description: `Priority ${subtask.priority_stars} stars, unassigned`,
      relatedEntity: {
        type: 'subtask' as const,
        id: subtask.id,
        name: subtask.name,
      },
      projectName: getProjectName(subtask),
      createdAt: new Date().toISOString(),
    };
  });
}

/**
 * Pending approvals: task_requests pending > 3 dni = medium, > 7 = high
 */
export function processPendingApprovalFlags(
  requests: TaskRequestForPending[]
): RedFlag[] {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  return requests.map((req) => {
    const createdAt = new Date(req.created_at).getTime();
    const daysPending = (now - createdAt) / msPerDay;
    const severity: RedFlagSeverity =
      daysPending > 7 ? 'high' : 'medium';

    return {
      id: `pending-${req.id}`,
      type: 'pending_approval' as const,
      severity,
      title: req.task_name,
      description: `Pending for ${Math.round(daysPending)} days`,
      relatedEntity: {
        type: 'task' as const,
        id: req.id,
        name: req.task_name,
      },
      projectName: req.module?.project?.name ?? 'Unknown project',
      createdAt: req.created_at,
    };
  });
}

/**
 * Merge all flags and sort: severity (critical > high > medium), then by createdAt
 */
export function mergeAndSortRedFlags(flags: RedFlag[]): RedFlag[] {
  return [...flags].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
