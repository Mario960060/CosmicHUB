/**
 * Scope queries - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 2.1
 * useMyProjectScope: project IDs relevant to the user based on role.
 * Shared by What's New, Red Flags, Attention items.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

const supabase = createClient();

/**
 * Returns project IDs in user's scope.
 * data === null for Admin (sees all, skip project filter).
 */
export function useMyProjectScope(userId: string | undefined, role: UserRole) {
  return useQuery({
    queryKey: ['my-project-scope', userId, role],
    queryFn: async (): Promise<string[] | null> => {
      if (!userId) return null;
      if (role === 'admin') return null;

      if (role === 'worker') {
        const { data, error } = await supabase
          .from('subtasks')
          .select('parent_task:tasks(module:modules(project_id))')
          .eq('assigned_to', userId);

        if (error) throw error;

        const projectIds = new Set<string>();
        for (const row of data ?? []) {
          const pt = (row as { parent_task?: { module?: { project_id?: string } } })
            .parent_task;
          const pid = pt?.module?.project_id;
          if (pid) projectIds.add(pid);
        }
        return Array.from(projectIds);
      }

      if (role === 'project_manager') {
        const { data, error } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)
          .eq('role', 'manager');

        if (error) throw error;
        return (data ?? []).map((r) => r.project_id);
      }

      if (role === 'client') {
        const { data, error } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', userId);

        if (error) throw error;
        return (data ?? []).map((r) => r.id);
      }

      return null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
