/**
 * Attention queries - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 2.4
 * useMyBlockers, useMyDependencyWaits (Worker)
 * usePMAttentionItems (PM)
 * useClientMilestones (Client)
 * useSystemHealth (Admin - extend useAdminStats)
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface BlockerWithDependency {
  id: string;
  name: string;
  status: string;
  parent_task?: { name: string };
  assigned_user?: { id: string; full_name: string } | null;
  module?: { name: string };
  project?: { name: string };
  depends_on?: { id: string; name: string; status: string; assigned_user?: { full_name: string } } | null;
}

export function useMyBlockers(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-blockers', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: subtasks, error: subErr } = await supabase
        .from('subtasks')
        .select(
          `
          *,
          parent_task:tasks(name, module:modules(name, project:projects(name))),
          assigned_user:users!assigned_to(id, full_name)
        `
        )
        .eq('assigned_to', userId)
        .eq('status', 'blocked');

      if (subErr) throw subErr;
      if (!subtasks?.length) return [];

      const ids = subtasks.map((s) => s.id);
      const { data: deps } = await supabase
        .from('dependencies')
        .select(
          `
          dependent_task_id,
          depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(id, name, status, assigned_user:users!assigned_to(full_name))
        `
        )
        .in('dependent_task_id', ids);

      const depsByDep = new Map<string, { dependent_task_id: string; depends_on_subtask?: unknown }>();
      for (const d of deps ?? []) {
        const dep = d as { dependent_task_id: string; depends_on_subtask?: unknown };
        depsByDep.set(dep.dependent_task_id, dep);
      }

      return subtasks.map((s) => ({
        ...s,
        depends_on: depsByDep.get(s.id)?.depends_on_subtask ?? null,
      })) as BlockerWithDependency[];
    },
    enabled: !!userId,
  });
}

export interface DependencyWait {
  dependent_task_id: string;
  dependent_subtask?: { id: string; name: string };
  depends_on_subtask?: { id: string; name: string; status: string };
}

export function useMyDependencyWaits(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-dependency-waits', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: mySubtasks } = await supabase
        .from('subtasks')
        .select('id')
        .eq('assigned_to', userId)
        .in('status', ['todo', 'in_progress']);

      const myIds = (mySubtasks ?? []).map((s) => s.id);
      if (myIds.length === 0) return [];

      const { data, error } = await supabase
        .from('dependencies')
        .select(
          `
          dependent_task_id,
          dependent_subtask:subtasks!dependencies_dependent_task_id_fkey(id, name),
          depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(id, name, status)
        `
        )
        .in('dependent_task_id', myIds);

      if (error) throw error;

      const rows = (data ?? []) as { depends_on_subtask?: { status?: string } | { status?: string }[] }[];
      return (rows.filter((d) => {
        const sub = d.depends_on_subtask;
        const status = Array.isArray(sub) ? sub[0]?.status : sub?.status;
        return status !== 'done';
      }) as unknown) as DependencyWait[];
    },
    enabled: !!userId,
  });
}

export interface PMAttentionItems {
  pendingApprovals: unknown[];
  overdueTasks: unknown[];
  blockedTasks: unknown[];
  unassignedHighPriority: unknown[];
  workloadAlerts: { userId: string; userName: string; type: 'overloaded' | 'idle'; count: number }[];
}

async function fetchPMProjectIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .eq('role', 'manager');
  return (data ?? []).map((r) => r.project_id);
}

export function usePMAttentionItems(userId: string | undefined) {
  return useQuery({
    queryKey: ['pm-attention-items', userId],
    queryFn: async (): Promise<PMAttentionItems> => {
      if (!userId)
        return {
          pendingApprovals: [],
          overdueTasks: [],
          blockedTasks: [],
          unassignedHighPriority: [],
          workloadAlerts: [],
        };

      const projectIds = await fetchPMProjectIds(userId);
      if (projectIds.length === 0)
        return {
          pendingApprovals: [],
          overdueTasks: [],
          blockedTasks: [],
          unassignedHighPriority: [],
          workloadAlerts: [],
        };

      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .in('project_id', projectIds);
      const moduleIds = (modules ?? []).map((m) => m.id);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('module_id', moduleIds);
      const taskIds = (tasks ?? []).map((t) => t.id);

      const [pendingRes, subtasksRes, workloadRes] = await Promise.all([
        supabase
          .from('task_requests')
          .select('*, module:modules(name, project:projects(name)), requester:users!requested_by(full_name)')
          .in('module_id', moduleIds)
          .eq('status', 'pending'),

        taskIds.length > 0
          ? supabase
              .from('subtasks')
              .select(
                `
                *,
                parent_task:tasks(id, module:modules(project_id)),
                assigned_user:users!assigned_to(id, full_name)
              `
              )
              .in('parent_id', taskIds)
          : { data: [] },

        taskIds.length > 0
          ? supabase.from('subtasks').select('assigned_to, status').in('parent_id', taskIds)
          : { data: [] },
      ]);

      const subtasks = (subtasksRes.data ?? []) as Record<string, unknown>[];
      const now = Date.now();

      const overdueTasks = subtasks.filter((s) => {
        const due = s.due_date as string | null;
        return due && new Date(due).getTime() < now && s.status !== 'done';
      });

      const blockedTasks = subtasks.filter((s) => s.status === 'blocked');

      const unassignedHighPriority = subtasks.filter(
        (s) =>
          (s.assigned_to == null || s.assigned_to === '') &&
          (s.priority_stars as number) >= 2 &&
          s.status === 'todo'
      );

      const workloadCount = new Map<string, number>();
      for (const s of workloadRes.data ?? []) {
        const uid = (s as { assigned_to: string | null }).assigned_to;
        const status = (s as { status: string }).status;
        if (!uid) continue;
        if (status === 'todo' || status === 'in_progress') {
          workloadCount.set(uid, (workloadCount.get(uid) ?? 0) + 1);
        }
      }

      // Workers in PM's modules (via module_members)
      const { data: members } =
        moduleIds.length > 0
          ? await supabase.from('module_members').select('user_id').in('module_id', moduleIds)
          : { data: [] };
      const memberUserIds = [...new Set((members ?? []).map((m) => (m as { user_id: string }).user_id))];

      const allUserIds = new Set([
        ...Array.from(workloadCount.keys()),
        ...memberUserIds,
      ]);
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', Array.from(allUserIds));

      const workloadAlerts: PMAttentionItems['workloadAlerts'] = [];
      for (const u of users ?? []) {
        const count = workloadCount.get(u.id) ?? 0;
        if (count > 10)
          workloadAlerts.push({
            userId: u.id,
            userName: u.full_name,
            type: 'overloaded',
            count,
          });
        // Idle: in module_members but 0 active subtasks (todo/in_progress)
        else if (memberUserIds.includes(u.id) && count === 0)
          workloadAlerts.push({
            userId: u.id,
            userName: u.full_name,
            type: 'idle',
            count: 0,
          });
      }

      return {
        pendingApprovals: pendingRes.data ?? [],
        overdueTasks,
        blockedTasks,
        unassignedHighPriority,
        workloadAlerts,
      };
    },
    enabled: !!userId,
  });
}

export interface ClientMilestone {
  id: string;
  name: string;
  type: 'subtask' | 'project';
  dueDate: string;
  progressPercent: number;
  projectName: string;
}

export interface ClientProjectProgress {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  progressPercent: number;
  modules: { name: string; progress: number }[];
}

export function useClientProjectProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['client-project-progress', userId],
    queryFn: async (): Promise<ClientProjectProgress[]> => {
      if (!userId) return [];

      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          start_date,
          end_date,
          modules(id, name, tasks(id, subtasks(status)))
        `)
        .eq('client_id', userId);

      if (!projects?.length) return [];

      return (projects as Record<string, unknown>[]).map((p) => {
        const modules = (p.modules as Record<string, unknown>[]) ?? [];
        const moduleProgress: { name: string; progress: number }[] = [];

        for (const m of modules) {
          const tasks = (m.tasks as Record<string, unknown>[]) ?? [];
          const subtasks = tasks.flatMap((t) => (t.subtasks as Record<string, unknown>[]) ?? []);
          const total = subtasks.length;
          const done = subtasks.filter((s) => s.status === 'done').length;
          moduleProgress.push({
            name: m.name as string,
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
          });
        }

        const allSubtasks = modules.flatMap((m) =>
          ((m.tasks as Record<string, unknown>[]) ?? []).flatMap(
            (t) => (t.subtasks as Record<string, unknown>[]) ?? []
          )
        );
        const totalAll = allSubtasks.length;
        const doneAll = allSubtasks.filter((s) => s.status === 'done').length;

        return {
          id: p.id as string,
          name: p.name as string,
          status: p.status as string,
          start_date: p.start_date as string | null,
          end_date: p.end_date as string | null,
          progressPercent: totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0,
          modules: moduleProgress,
        };
      });
    },
    enabled: !!userId,
  });
}

export function useClientMilestones(userId: string | undefined) {
  return useQuery({
    queryKey: ['client-milestones', userId],
    queryFn: async (): Promise<ClientMilestone[]> => {
      if (!userId) return [];

      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          end_date,
          modules(id, tasks(id, subtasks(id, name, status, estimated_hours, due_date)))
        `)
        .eq('client_id', userId);

      if (!projects?.length) return [];

      const result: ClientMilestone[] = [];
      const now = Date.now();

      for (const p of projects as Record<string, unknown>[]) {
        if (p.end_date) {
          const modules = (p.modules as Record<string, unknown>[]) ?? [];
          let total = 0;
          let done = 0;
          for (const m of modules) {
            const tasks = (m.tasks as Record<string, unknown>[]) ?? [];
            for (const t of tasks) {
              const st = (t.subtasks as Record<string, unknown>[]) ?? [];
              total += st.length;
              done += st.filter((s) => s.status === 'done').length;
            }
          }
          result.push({
            id: p.id as string,
            name: p.name as string,
            type: 'project',
            dueDate: p.end_date as string,
            progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
            projectName: p.name as string,
          });
        }

        const modules = (p.modules as Record<string, unknown>[]) ?? [];
        for (const m of modules) {
          const tasks = (m.tasks as Record<string, unknown>[]) ?? [];
          for (const t of tasks) {
            const st = (t.subtasks as Record<string, unknown>[]) ?? [];
            const withDue = st.filter((s) => s.due_date && s.status !== 'done');
            for (const s of withDue) {
              if (new Date(s.due_date as string).getTime() >= now - 30 * 24 * 60 * 60 * 1000) {
                const total = st.length;
                const doneCount = st.filter((x) => x.status === 'done').length;
                result.push({
                  id: s.id as string,
                  name: s.name as string,
                  type: 'subtask',
                  dueDate: s.due_date as string,
                  progressPercent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
                  projectName: p.name as string,
                });
              }
            }
          }
        }
      }

      result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      return result.slice(0, 10);
    },
    enabled: !!userId,
  });
}

export interface SystemHealthStats {
  totalUsers: number;
  totalProjects: number;
  activeTasks: number;
  onlineUsers: number;
  blockedCount: number;
  blockedRatio: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  end_date?: string | null;
  progressPercent: number;
  doneCount: number;
  totalCount: number;
}

export function usePMProjectOverviews(userId: string | undefined) {
  return useQuery({
    queryKey: ['pm-project-overviews', userId],
    queryFn: async (): Promise<ProjectSummary[]> => {
      if (!userId) return [];
      const projectIds = await fetchPMProjectIds(userId);
      if (projectIds.length === 0) return [];

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, end_date')
        .in('id', projectIds);

      const result: ProjectSummary[] = [];

      for (const p of projects ?? []) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('project_id', p.id);
        const moduleIds = (modules ?? []).map((m) => m.id);

        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .in('module_id', moduleIds);
        const taskIds = (tasks ?? []).map((t) => t.id);

        if (taskIds.length === 0) {
          result.push({
            id: p.id,
            name: p.name,
            status: p.status,
            end_date: p.end_date,
            progressPercent: 0,
            doneCount: 0,
            totalCount: 0,
          });
          continue;
        }

        const { data: subtasks } = await supabase
          .from('subtasks')
          .select('status')
          .in('parent_id', taskIds);

        const total = subtasks?.length ?? 0;
        const done = (subtasks ?? []).filter((s) => s.status === 'done').length;

        result.push({
          id: p.id,
          name: p.name,
          status: p.status,
          end_date: p.end_date,
          progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
          doneCount: done,
          totalCount: total,
        });
      }

      return result;
    },
    enabled: !!userId,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemHealthStats> => {
      const [
        { count: totalUsers },
        { count: totalProjects },
        { count: activeTasks },
        { count: blockedCount },
        { count: totalNotDone },
        { count: onlineUsers },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('subtasks').select('*', { count: 'exact', head: true }).in('status', ['todo', 'in_progress']),
        supabase.from('subtasks').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
        supabase.from('subtasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString()),
      ]);

      const total = totalNotDone ?? 0;
      const blocked = blockedCount ?? 0;

      return {
        totalUsers: totalUsers ?? 0,
        totalProjects: totalProjects ?? 0,
        activeTasks: activeTasks ?? 0,
        onlineUsers: onlineUsers ?? 0,
        blockedCount: blocked,
        blockedRatio: total > 0 ? Math.round((blocked / total) * 100) : 0,
      };
    },
    refetchInterval: 30_000,
  });
}
