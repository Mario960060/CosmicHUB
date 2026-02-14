/**
 * Focus Queue - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 2.2
 * Worker dashboard: prioritized list of assigned tasks.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  calculateDeadlineRisk,
  type SubtaskInput,
  type WorkLogInput,
} from './deadline-engine';
import type { FocusTask, FocusTaskCategory } from '@/types/dashboard';

const supabase = createClient();

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isDueThisWeek(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
  return d.getTime() >= now && d.getTime() <= weekFromNow;
}

function getUrgencyScore(
  subtask: {
    due_date: string | null;
    status: string;
    priority_stars: number;
  },
  riskLevel: string
): number {
  if (isOverdue(subtask.due_date)) return 100;
  if (isDueToday(subtask.due_date)) return 90;
  if (isDueThisWeek(subtask.due_date) && (riskLevel === 'high' || riskLevel === 'critical'))
    return 80;
  if (subtask.status === 'in_progress') return 60;
  if (subtask.priority_stars >= 2.5) return 50;
  if (isDueThisWeek(subtask.due_date)) return 40;
  return 10;
}

function getCategory(score: number): FocusTaskCategory {
  if (score >= 100) return 'overdue';
  if (score >= 90) return 'due_today';
  if (score >= 80) return 'due_this_week';
  if (score >= 60) return 'in_progress';
  if (score >= 50) return 'high_priority';
  return 'normal';
}

function getUrgencyReason(
  subtask: { due_date: string | null; status: string; priority_stars: number },
  category: FocusTaskCategory
): string {
  if (category === 'overdue') {
    if (!subtask.due_date) return 'Overdue';
    const days = Math.ceil(
      (Date.now() - new Date(subtask.due_date).getTime()) / (24 * 60 * 60 * 1000)
    );
    return `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
  }
  if (category === 'due_today') return 'Due today';
  if (category === 'due_this_week') return 'Due this week';
  if (category === 'in_progress') return 'In progress';
  if (category === 'high_priority') return 'High priority';
  return 'Normal';
}

export function useFocusQueue(userId: string | undefined) {
  return useQuery({
    queryKey: ['focus-queue', userId],
    queryFn: async (): Promise<FocusTask[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('subtasks')
        .select(
          `
          *,
          parent_task:tasks(id, name, module:modules(id, name, color, project:projects(id, name))),
          assigned_user:users!assigned_to(id, full_name, avatar_url),
          work_logs:work_logs(hours_spent)
        `
        )
        .eq('assigned_to', userId)
        .in('status', ['todo', 'in_progress', 'blocked'])
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      const rows = data ?? [];

      const tasks: FocusTask[] = rows.map((row: Record<string, unknown>) => {
        const workLogs = (row.work_logs as { hours_spent: number }[]) ?? [];
        const hoursLogged = workLogs.reduce((s, l) => s + l.hours_spent, 0);

        const subtaskInput: SubtaskInput = {
          status: row.status as string,
          estimated_hours: row.estimated_hours as number | null,
          due_date: row.due_date as string | null,
        };
        const workLogInput: WorkLogInput[] = workLogs;
        const risk = calculateDeadlineRisk(subtaskInput, workLogInput);

        const subtaskMeta = {
          due_date: row.due_date as string | null,
          status: row.status as string,
          priority_stars: (row.priority_stars as number) ?? 1,
        };
        const urgencyScore = getUrgencyScore(subtaskMeta, risk.level);
        const category = getCategory(urgencyScore);
        const urgencyReason = getUrgencyReason(subtaskMeta, category);

        return {
          ...row,
          id: row.id as string,
          parent_id: row.parent_id as string,
          name: row.name as string,
          description: row.description as string | null,
          estimated_hours: row.estimated_hours as number | null,
          status: row.status as FocusTask['status'],
          priority_stars: (row.priority_stars as number) ?? 1,
          assigned_to: row.assigned_to as string | null,
          due_date: row.due_date as string | null,
          claimed_by: row.claimed_by as string | null,
          claimed_at: row.claimed_at as string | null,
          created_by: row.created_by as string | null,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          satellite_type: (row.satellite_type as string) ?? '',
          satellite_data: row.satellite_data ?? {},
          parent_task: row.parent_task as FocusTask['parent_task'],
          assigned_user: row.assigned_user as FocusTask['assigned_user'],
          work_logs: row.work_logs as FocusTask['work_logs'],
          urgencyScore,
          urgencyReason,
          deadlineRisk: risk,
          hoursLogged,
          category,
        };
      });

      tasks.sort((a, b) => b.urgencyScore - a.urgencyScore);
      return tasks;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
