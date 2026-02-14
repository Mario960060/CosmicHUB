// CURSOR: Dashboard data queries for all roles

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Worker stats
export function useWorkerStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['worker-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Active tasks (assigned to me)
      const { count: activeTasks } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['todo', 'in_progress']);

      // Done today
      const today = new Date().toISOString().split('T')[0];
      const { count: doneToday } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .gte('updated_at', today);

      // Hours logged this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const { data: workLogs } = await supabase
        .from('work_logs')
        .select('hours_spent')
        .eq('user_id', userId)
        .gte('work_date', weekStart.toISOString().split('T')[0]);

      const hoursThisWeek = workLogs?.reduce((sum, log) => sum + log.hours_spent, 0) || 0;

      return {
        activeTasks: activeTasks || 0,
        doneToday: doneToday || 0,
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      };
    },
    enabled: !!userId,
  });
}

// PM stats (enhanced from Phase 3)
export function usePMStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['pm-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get managed projects
      const { data: projects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .eq('role', 'manager');

      const projectIds = projects?.map((p) => p.project_id) || [];

      if (projectIds.length === 0) {
        return {
          activeProjects: 0,
          pendingRequests: 0,
          blockers: 0,
          teamVelocity: 0,
        };
      }

      // Get module IDs
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .in('project_id', projectIds);

      const moduleIds = modules?.map((m) => m.id) || [];

      // Pending requests
      const { count: pendingRequests } = await supabase
        .from('task_requests')
        .select('*', { count: 'exact', head: true })
        .in('module_id', moduleIds)
        .eq('status', 'pending');

      // Blocked tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('module_id', moduleIds);

      const taskIds = tasks?.map((t) => t.id) || [];

      const { count: blockers } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', taskIds)
        .eq('status', 'blocked');

      // Team velocity (tasks completed this week)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { count: completedThisWeek } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', taskIds)
        .eq('status', 'done')
        .gte('updated_at', weekStart.toISOString());

      return {
        activeProjects: projectIds.length,
        pendingRequests: pendingRequests || 0,
        blockers: blockers || 0,
        teamVelocity: completedThisWeek || 0,
      };
    },
    enabled: !!userId,
  });
}

// Client stats
export function useClientStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['client-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get client's projects
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          modules(
            id,
            name,
            tasks(
              id,
              subtasks(id, status, estimated_hours)
            )
          )
        `)
        .eq('client_id', userId);

      if (!projects || projects.length === 0) {
        return {
          projectCount: 0,
          overallProgress: 0,
          modules: [],
        };
      }

      // Calculate overall progress
      let totalEstimated = 0;
      let totalCompleted = 0;

      const moduleProgress: { name: string; progress: number }[] = [];

      for (const project of projects) {
        for (const module of (project.modules as any[]) || []) {
          const subtasks = (module.tasks as any[])?.flatMap((t: any) => t.subtasks || []) || [];
          const estimated = subtasks.reduce((sum: number, s: any) => sum + (s.estimated_hours || 0), 0);
          const completed = subtasks.filter((s: any) => s.status === 'done').length;
          const total = subtasks.length;

          totalEstimated += estimated;
          totalCompleted += completed;

          moduleProgress.push({
            name: module.name,
            progress: total > 0 ? (completed / total) * 100 : 0,
          });
        }
      }

      return {
        projectCount: projects.length,
        overallProgress: totalCompleted > 0 ? Math.round((totalCompleted / (totalCompleted + (projects.length * 10))) * 100) : 0,
        modules: moduleProgress,
      };
    },
    enabled: !!userId,
  });
}

// Admin stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Total projects
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Active tasks
      const { count: activeTasks } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['todo', 'in_progress']);

      // Online users (active in last 15 minutes)
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: onlineUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fifteenMinAgo);

      return {
        totalUsers: totalUsers || 0,
        totalProjects: totalProjects || 0,
        activeTasks: activeTasks || 0,
        onlineUsers: onlineUsers || 0,
      };
    },
    refetchInterval: 30_000, // Refresh online count every 30s
  });
}
