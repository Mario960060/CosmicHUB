import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Subtask, WorkLog } from '@/types';

// Minitask with subtasks (for task detail)
export interface TaskMinitaskWithSubs {
  id: string;
  name: string;
  due_date: string | null;
  status: string;
  priority_stars: number;
  subtasks?: (Subtask & { work_logs?: { hours_spent: number }[] })[];
}

// Extended task with relations (for Workstation - tasks instead of subtasks)
export interface TaskWithDetails {
  id: string;
  module_id: string;
  name: string;
  description?: string | null;
  estimated_hours: number | null;
  status: string;
  priority_stars: number;
  due_date: string | null;
  progress_percent: number | null;
  created_at: string;
  module?: {
    id: string;
    name: string;
    color: string;
    project?: {
      id: string;
      name: string;
    };
  };
  minitasks?: TaskMinitaskWithSubs[];
  subtasks?: (Subtask & {
    work_logs?: { hours_spent: number }[];
  })[];
  task_members?: {
    task_id: string;
    user_id: string;
    role: string;
    user?: { id: string; full_name: string; avatar_url: string | null };
  }[];
}

// Extended subtask with relations
export interface SubtaskWithDetails extends Subtask {
  parent_task: {
    id: string;
    name: string;
    module: {
      id: string;
      name: string;
      color: string;
      project: {
        id: string;
        name: string;
      };
    };
  };
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  work_logs?: WorkLog[];
}

// Fetch all tasks user has access to (for Workstation - tasks as main view)
export function useWorkstationTasks() {
  return useQuery({
    queryKey: ['workstation-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          module:modules (
            id,
            name,
            color,
            project:projects (
              id,
              name
            )
          ),
          minitasks (
            id,
            name,
            due_date,
            status,
            priority_stars,
            subtasks (
              id,
              name,
              status,
              satellite_type,
              work_logs (hours_spent)
            )
          ),
          subtasks (
            id,
            name,
            status,
            satellite_type,
            priority_stars,
            assigned_to,
            due_date,
            work_logs (hours_spent)
          ),
          task_members (
            task_id,
            user_id,
            role,
            user:users!user_id (id, full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workstation tasks:', error);
        throw error;
      }
      return data as TaskWithDetails[];
    },
    staleTime: 30 * 1000,
  });
}

// Fetch all subtasks user has access to
export function useSubtasks() {
  return useQuery({
    queryKey: ['subtasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          parent_task:tasks (
            id,
            name,
            module:modules (
              id,
              name,
              color,
              project:projects (
                id,
                name
              )
            )
          ),
          assigned_user:users!assigned_to (
            id,
            full_name,
            avatar_url
          ),
          work_logs:work_logs (
            id,
            hours_spent,
            work_date,
            description,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subtasks:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        throw error;
      }
      return data as SubtaskWithDetails[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch single subtask with all details
export function useSubtask(subtaskId: string | null) {
  return useQuery({
    queryKey: ['subtask', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return null;

      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          parent_task:tasks (
            id,
            name,
            module:modules (
              id,
              name,
              color,
              project:projects (
                id,
                name
              )
            )
          ),
          assigned_user:users!assigned_to (
            id,
            full_name,
            avatar_url
          ),
          work_logs:work_logs (
            id,
            hours_spent,
            work_date,
            description,
            created_at
          )
        `)
        .eq('id', subtaskId)
        .maybeSingle();

      if (error) {
        // Supabase error may not serialize well to console - log key fields explicitly
        console.error('Error fetching subtask:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      return data as SubtaskWithDetails | null;
    },
    enabled: !!subtaskId,
  });
}

// Fetch work logs for a subtask
export function useWorkLogs(subtaskId: string | null) {
  return useQuery({
    queryKey: ['work-logs', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return [];

      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          user:users!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('subtask_id', subtaskId)
        .order('work_date', { ascending: false });

      if (error) {
        console.error('Error fetching work logs:', error);
        throw error;
      }
      return data;
    },
    enabled: !!subtaskId,
  });
}

// Fetch user's active subtasks
export function useMyActiveTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-active-tasks', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          parent_task:tasks (
            id,
            name,
            module:modules (
              id,
              name,
              color,
              project:projects (
                id,
                name
              )
            )
          )
        `)
        .eq('assigned_to', userId)
        .in('status', ['todo', 'in_progress'])
        .order('priority_stars', { ascending: false });

      if (error) {
        console.error('Error fetching my active tasks:', error);
        throw error;
      }
      return data as SubtaskWithDetails[];
    },
    enabled: !!userId,
  });
}

// Minitask with relations (for Workstation - Sub-tasks tab)
export interface MinitaskWithDetails {
  id: string;
  task_id: string | null;
  module_id: string | null;
  project_id: string | null;
  name: string;
  description?: string | null;
  status: string;
  priority_stars: number;
  assigned_to: string | null;
  due_date: string | null;
  progress_percent: number | null;
  created_at: string;
  task?: { id: string; name: string; module?: { id: string; name: string; project?: { id: string; name: string } } } | null;
  module?: { id: string; name: string; project?: { id: string; name: string } } | null;
  project?: { id: string; name: string } | null;
  subtasks?: (Subtask & { work_logs?: { hours_spent: number }[] })[];
}

// Fetch all minitasks user has access to (for Workstation - Sub-tasks tab)
export function useWorkstationMinitasks() {
  return useQuery({
    queryKey: ['workstation-minitasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('minitasks')
        .select(`
          *,
          task:tasks (
            id,
            name,
            module:modules (
              id,
              name,
              project:projects (
                id,
                name
              )
            )
          ),
          module:modules (
            id,
            name,
            project:projects (
              id,
              name
            )
          ),
          project:projects (
            id,
            name
          ),
          subtasks (
            id,
            name,
            status,
            satellite_type,
            work_logs (hours_spent)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workstation minitasks:', error);
        throw error;
      }
      return data as MinitaskWithDetails[];
    },
    staleTime: 30 * 1000,
  });
}

// Fetch available tasks (not assigned, not claimed or claim expired)
export function useAvailableTasks() {
  return useQuery({
    queryKey: ['available-tasks'],
    queryFn: async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          parent_task:tasks (
            id,
            name,
            module:modules (
              id,
              name,
              color,
              project:projects (
                id,
                name
              )
            )
          )
        `)
        .is('assigned_to', null)
        .or(`claimed_by.is.null,claimed_at.lt.${thirtyMinutesAgo}`)
        .in('status', ['todo'])
        .order('priority_stars', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching available tasks:', error);
        throw error;
      }
      return data as SubtaskWithDetails[];
    },
    staleTime: 10 * 1000, // 10 seconds (more frequent for availability)
  });
}
