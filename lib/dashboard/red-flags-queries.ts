/**
 * Red Flags queries - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 2.3
 * Admin & PM: aggregated red flags from subtasks, dependencies, task_requests.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  calculateDeadlineRisk,
  getOverrunAnomalySeverity,
  type SubtaskInput,
  type WorkLogInput,
  type SiblingSubtaskInput,
} from './deadline-engine';
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
} from './red-flags-engine';
import type { RedFlag } from '@/types/dashboard';
import type { DashboardDeadline, DashboardDeadlineBucket } from '@/types/dashboard';
import type { RedFlagSeverity } from '@/types/dashboard';

const supabase = createClient();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function fetchPMProjectIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .eq('role', 'manager');
  return (data ?? []).map((r) => r.project_id);
}

function filterByProjectIds<T extends {
  parent_task?: { module?: { project_id?: string; project?: { id?: string } } };
}>(items: T[], projectIds: string[]): T[] {
  if (projectIds.length === 0) return [];
  const set = new Set(projectIds);
  return items.filter((i) => {
    const pid = i.parent_task?.module?.project_id ?? i.parent_task?.module?.project?.id;
    return pid && set.has(pid);
  });
}

export function useRedFlags(
  scope: 'admin' | 'pm',
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['red-flags', scope, userId],
    queryFn: async (): Promise<RedFlag[]> => {
      const [subtasksRes, depsRes, requestsRes] = await Promise.all([
        supabase
          .from('subtasks')
          .select(
            `
            *,
            parent_task:tasks(id, name, module:modules(id, name, project:projects(id, name, end_date))),
            assigned_user:users!assigned_to(id, full_name),
            work_logs:work_logs(hours_spent)
          `
          )
          .neq('status', 'done'),

        supabase
          .from('dependencies')
          .select(
            `
            *,
            dependent_subtask:subtasks!dependencies_dependent_task_id_fkey(id, name, status, assigned_to),
            depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(id, name, status, assigned_to)
          `
          ),

        supabase
          .from('task_requests')
          .select(
            '*, module:modules(name, project:projects(name)), requester:users!requested_by(full_name)'
          )
          .eq('status', 'pending'),
      ]);

      if (subtasksRes.error) throw subtasksRes.error;
      if (depsRes.error) throw depsRes.error;
      if (requestsRes.error) throw requestsRes.error;

      let subtasks = (subtasksRes.data ?? []) as Record<string, unknown>[];

      if (scope === 'pm' && userId) {
        const projectIds = await fetchPMProjectIds(userId);
        subtasks = filterByProjectIds(subtasks, projectIds);
      }

      const byParent = new Map<string, Record<string, unknown>[]>();
      for (const s of subtasks) {
        const pid = s.parent_id as string;
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(s);
      }

      const deadlineItems: { subtask: SubtaskForDeadlineFlag; risk: ReturnType<typeof calculateDeadlineRisk> }[] = [];
      const anomalyItems: { subtask: SubtaskForAnomaly; hoursLogged: number; severity: RedFlagSeverity }[] = [];

      for (const row of subtasks) {
        const workLogs = (row.work_logs as { hours_spent: number }[]) ?? [];
        const hoursLogged = workLogs.reduce((s, l) => s + l.hours_spent, 0);
        const estimated = row.estimated_hours as number | null;
        const status = row.status as string;

        if (row.due_date && status !== 'done') {
          const siblings = byParent.get(row.parent_id as string) ?? [];
          const siblingInput: SiblingSubtaskInput[] = siblings.map((s) => ({
            status: s.status as string,
          }));
          const risk = calculateDeadlineRisk(
            {
              status,
              estimated_hours: estimated,
              due_date: row.due_date as string,
            } as SubtaskInput,
            workLogs as WorkLogInput[],
            siblingInput
          );
          if (risk.level === 'critical' || risk.level === 'high') {
            deadlineItems.push({
              subtask: row as unknown as SubtaskForDeadlineFlag,
              risk,
            });
          }
        }

        if (
          (status === 'in_progress' || status === 'todo') &&
          estimated != null &&
          estimated > 0 &&
          hoursLogged >= estimated
        ) {
          const severity = getOverrunAnomalySeverity(hoursLogged, estimated, status);
          if (severity) {
            anomalyItems.push({
              subtask: row as unknown as SubtaskForAnomaly,
              hoursLogged,
              severity,
            });
          }
        }
      }

      const blockedRows = subtasks.filter((s) => s.status === 'blocked');
      const depsBySubtask = new Map<string, DependencyForBlocker[]>();
      for (const d of depsRes.data ?? []) {
        const dep = d as { dependent_task_id: string; depends_on_subtask?: { id: string; name: string; status: string } };
        const list = depsBySubtask.get(dep.dependent_task_id) ?? [];
        list.push({
          dependent_task_id: dep.dependent_task_id,
          depends_on_subtask: dep.depends_on_subtask,
        });
        depsBySubtask.set(dep.dependent_task_id, list);
      }

      const staleItems: { subtask: SubtaskForStale; daysWithoutActivity: number }[] = [];
      const inProgressRows = subtasks.filter((s) => s.status === 'in_progress');
      const now = Date.now();
      for (const row of inProgressRows) {
        const workLogs = (row.work_logs as { hours_spent: number; work_date?: string }[]) ?? [];
        const lastWorkDate = workLogs.length
          ? Math.max(...workLogs.map((w) => new Date(w.work_date ?? 0).getTime()))
          : 0;
        const updatedAt = new Date(row.updated_at as string).getTime();
        const refDate = Math.max(lastWorkDate, updatedAt);
        const daysWithout = (now - refDate) / MS_PER_DAY;
        if (daysWithout >= 5) {
          staleItems.push({
            subtask: row as unknown as SubtaskForStale,
            daysWithoutActivity: daysWithout,
          });
        }
      }

      const unassignedRows = subtasks.filter(
        (s) =>
          (s.assigned_to == null || s.assigned_to === '') &&
          (s.priority_stars as number) >= 2 &&
          s.status === 'todo'
      );

      const pendingRequests = (requestsRes.data ?? []) as TaskRequestForPending[];
      const oldPending = pendingRequests.filter((r) => {
        const days = (now - new Date(r.created_at).getTime()) / MS_PER_DAY;
        return days > 3;
      });

      const flags = mergeAndSortRedFlags([
        ...processDeadlineFlags(deadlineItems),
        ...processAnomalyFlags(anomalyItems),
        ...processBlockerFlags(
          blockedRows as unknown as SubtaskForBlocker[],
          depsBySubtask
        ),
        ...processStaleFlags(staleItems),
        ...processUnassignedFlags(unassignedRows as unknown as (SubtaskForAnomaly & { priority_stars: number })[]),
        ...processPendingApprovalFlags(oldPending),
      ]);

      return flags;
    },
    enabled: scope === 'admin' || !!userId,
    staleTime: 60_000,
  });
}

export function useDeadlineTimeline(
  scope: 'admin' | 'pm',
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['deadline-timeline', scope, userId],
    queryFn: async (): Promise<DashboardDeadline[]> => {
      let query = supabase
        .from('subtasks')
        .select(
          `
          *,
          parent_task:tasks(id, name, module:modules(id, name, project:projects(id, name, end_date))),
          assigned_user:users!assigned_to(id, full_name),
          work_logs:work_logs(hours_spent)
        `
        )
        .not('due_date', 'is', null)
        .neq('status', 'done');

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as Record<string, unknown>[];

      if (scope === 'pm' && userId) {
        const projectIds = await fetchPMProjectIds(userId);
        rows = filterByProjectIds(rows, projectIds);
      }

      const byParent = new Map<string, Record<string, unknown>[]>();
      for (const s of rows) {
        const pid = s.parent_id as string;
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(s);
      }

      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const weekEnd = new Date(todayStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(todayStart);
      monthEnd.setDate(monthEnd.getDate() + 30);

      const result: DashboardDeadline[] = [];

      for (const row of rows) {
        const workLogs = (row.work_logs as { hours_spent: number }[]) ?? [];
        const hoursLogged = workLogs.reduce((s, l) => s + l.hours_spent, 0);
        const siblings = byParent.get(row.parent_id as string) ?? [];
        const siblingInput: SiblingSubtaskInput[] = siblings.map((s) => ({
          status: s.status as string,
        }));

        const risk = calculateDeadlineRisk(
          {
            status: row.status as string,
            estimated_hours: row.estimated_hours as number | null,
            due_date: row.due_date as string,
          } as SubtaskInput,
          workLogs as WorkLogInput[],
          siblingInput
        );

        const dueTime = new Date(row.due_date as string).getTime();
        let bucket: DashboardDeadlineBucket;
        if (dueTime < todayStart.getTime()) bucket = 'overdue';
        else if (dueTime < todayEnd.getTime()) bucket = 'today';
        else if (dueTime < weekEnd.getTime()) bucket = 'this_week';
        else bucket = 'this_month';

        const project = (row.parent_task as { module?: { project?: { name: string } } })?.module?.project;

        result.push({
          id: row.id as string,
          name: row.name as string,
          entityType: 'subtask',
          dueDate: row.due_date as string,
          risk,
          projectName: project?.name ?? 'Unknown',
          assignedTo: (row.assigned_user as { id: string; full_name: string } | null)
            ? { id: (row.assigned_user as { id: string }).id, name: (row.assigned_user as { full_name: string }).full_name }
            : undefined,
          bucket,
        });
      }

      result.sort((a, b) => {
        const bucketOrder = { overdue: 0, today: 1, this_week: 2, this_month: 3 };
        const bo = bucketOrder[a.bucket] - bucketOrder[b.bucket];
        if (bo !== 0) return bo;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      return result;
    },
    enabled: scope === 'admin' || !!userId,
    staleTime: 60_000,
  });
}
