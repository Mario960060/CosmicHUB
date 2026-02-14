// CURSOR: PM-specific data fetching hooks
// All queries respect RLS - PMs only see their projects

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Project, Module, Task, User, TaskRequest } from '@/types';

// Extended types with relations
export interface ProjectWithDetails extends Project {
  modules?: Module[];
  members?: User[];
  client?: User;
}

export interface ModuleMemberWithUser {
  module_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: { id: string; full_name: string; email?: string; avatar_url?: string | null; role?: string };
}

export interface ModuleWithTasks extends Module {
  tasks?: Task[];
  project?: Project;
  module_members?: ModuleMemberWithUser[];
}

export interface TaskRequestWithDetails extends TaskRequest {
  module?: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  requester?: User;
  reviewer?: User;
}

// Fetch all projects PM manages
export function useProjects() {
  return useQuery({
    queryKey: ['pm-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:users!projects_client_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectWithDetails[];
    },
  });
}

// Fetch single project with all details
export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['pm-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:users!projects_client_id_fkey(
            id,
            full_name,
            email
          ),
          modules(
            *,
            tasks(*)
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as ProjectWithDetails;
    },
    enabled: !!projectId,
  });
}

/** Fetch users by IDs (for avatars in detail cards) */
export function useAssignedUsers(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  return useQuery({
    queryKey: ['assigned-users', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', uniqueIds);
      if (error) throw error;
      return data as { id: string; full_name: string | null; avatar_url: string | null }[];
    },
    enabled: uniqueIds.length > 0,
  });
}

// Fetch project members
export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:users!user_id(
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// Fetch modules for a project (includes module_members for team/spacecraft)
export function useModules(projectId: string | null) {
  return useQuery({
    queryKey: ['modules', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          tasks(*, subtasks(*)),
          module_members(
            *,
            user:users!user_id(id, full_name, email, avatar_url, role)
          )
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ModuleWithTasks[];
    },
    enabled: !!projectId,
  });
}

// Fetch module members for a single module (for AssignTeamModal)
export function useModuleMembers(moduleId: string | null) {
  return useQuery({
    queryKey: ['module-members', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from('module_members')
        .select(`
          *,
          user:users!user_id(id, full_name, email, avatar_url, role)
        `)
        .eq('module_id', moduleId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch task members for a single task (for MoonDetailCard, AssignTeamModal task mode)
export function useTaskMembers(taskId: string | null) {
  return useQuery({
    queryKey: ['task-members', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_members')
        .select(`
          *,
          user:users!user_id(id, full_name, email, avatar_url, role)
        `)
        .eq('task_id', taskId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

// Fetch tasks for a module
export function useTasks(moduleId: string | null) {
  return useQuery({
    queryKey: ['tasks', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subtasks(*)
        `)
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch pending task requests (PM only)
export function usePendingRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ['pending-requests', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get projects this PM manages
      const { data: managedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .eq('role', 'manager');

      if (!managedProjects || managedProjects.length === 0) return [];

      const projectIds = managedProjects.map((p) => p.project_id);

      // Get module IDs for those projects
      const { data: projectModules } = await supabase
        .from('modules')
        .select('id')
        .in('project_id', projectIds);

      if (!projectModules || projectModules.length === 0) return [];

      const moduleIds = projectModules.map((m) => m.id);

      // Get pending requests for those modules
      const { data, error } = await supabase
        .from('task_requests')
        .select(`
          *,
          module:modules!task_requests_module_id_fkey(
            id,
            name,
            project:projects(
              id,
              name
            )
          ),
          requester:users!task_requests_requested_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .in('module_id', moduleIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskRequestWithDetails[];
    },
    enabled: !!userId,
  });
}

// Fetch all users (for assigning tasks, adding team members)
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, role')
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as User[];
    },
  });
}

// PM dashboard stats
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
          projectCount: 0,
          pendingRequests: 0,
          activeTasksCount: 0,
          teamMembersCount: 0,
        };
      }

      // Count pending requests
      const { data: moduleData } = await supabase
        .from('modules')
        .select('id')
        .in('project_id', projectIds);

      const moduleIds = moduleData?.map((m) => m.id) || [];

      const { count: pendingRequests } = await supabase
        .from('task_requests')
        .select('*', { count: 'exact', head: true })
        .in('module_id', moduleIds)
        .eq('status', 'pending');

      // Count active tasks
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id')
        .in('module_id', moduleIds);

      const taskIds = taskData?.map((t) => t.id) || [];

      const { count: activeTasksCount } = await supabase
        .from('subtasks')
        .select('*', { count: 'exact', head: true })
        .in('parent_id', taskIds)
        .in('status', ['todo', 'in_progress']);

      // Count team members
      const { count: teamMembersCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds);

      return {
        projectCount: projectIds.length,
        pendingRequests: pendingRequests || 0,
        activeTasksCount: activeTasksCount || 0,
        teamMembersCount: teamMembersCount || 0,
      };
    },
    enabled: !!userId,
  });
}

// ============================================
// DEPENDENCIES QUERIES
// ============================================

export type DependencyType = 'blocks' | 'depends_on' | 'related_to';

export interface DependencyWithSubtasks {
  id: string;
  dependent_task_id: string;
  depends_on_task_id: string;
  dependency_type?: DependencyType;
  note?: string | null;
  created_at: string;
  dependent_subtask?: {
    id: string;
    name: string;
    status: string;
  };
  depends_on_subtask?: {
    id: string;
    name: string;
    status: string;
  };
}

// Fetch dependencies for a subtask
export function useDependencies(subtaskId: string | null) {
  return useQuery({
    queryKey: ['dependencies', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return [];

      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          *,
          dependent_subtask:subtasks!dependencies_dependent_task_id_fkey(
            id,
            name,
            status
          ),
          depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(
            id,
            name,
            status
          )
        `)
        .eq('dependent_task_id', subtaskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DependencyWithSubtasks[];
    },
    enabled: !!subtaskId,
  });
}

// Check if subtask is blocked by dependencies (only 'blocks' type blocks)
export function useIsSubtaskBlocked(subtaskId: string | null) {
  return useQuery({
    queryKey: ['subtask-blocked', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return false;

      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          dependency_type,
          depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(
            status
          )
        `)
        .eq('dependent_task_id', subtaskId);

      if (error) throw error;

      // Blocked only by 'blocks' type - depends_on and related_to don't block
      const isBlocked = (data || []).some(
        (dep: any) => dep.dependency_type === 'blocks' && dep.depends_on_subtask?.status !== 'done'
      );

      return isBlocked;
    },
    enabled: !!subtaskId,
  });
}

// Fetch dependencies for multiple subtasks (for cards aggregation)
export function useDependenciesForSubtasks(subtaskIds: string[]) {
  return useQuery({
    queryKey: ['dependencies-for-subtasks', subtaskIds],
    queryFn: async () => {
      if (subtaskIds.length === 0) return [];

      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          id,
          dependent_task_id,
          depends_on_task_id,
          dependency_type,
          note,
          created_at,
          dependent_subtask:subtasks!dependencies_dependent_task_id_fkey(id, name, status),
          depends_on_subtask:subtasks!dependencies_depends_on_task_id_fkey(id, name, status)
        `)
        .or(`dependent_task_id.in.(${subtaskIds.join(',')}),depends_on_task_id.in.(${subtaskIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DependencyWithSubtasks[];
    },
    enabled: subtaskIds.length > 0,
  });
}

// Get all subtasks available for creating dependencies (within same project)
export function useAvailableSubtasksForDependency(currentSubtaskId: string | null) {
  return useQuery({
    queryKey: ['available-subtasks-dependency', currentSubtaskId],
    queryFn: async () => {
      if (!currentSubtaskId) return [];

      // Get current subtask's project (polymorphic parent: parent_id, module_id, project_id)
      const { data: currentSubtask } = await supabase
        .from('subtasks')
        .select('parent_id, module_id, project_id')
        .eq('id', currentSubtaskId)
        .single();

      if (!currentSubtask) return [];

      let projectId: string | null = null;
      const st = currentSubtask as { parent_id?: string; module_id?: string; project_id?: string };

      if (st.project_id) {
        projectId = st.project_id;
      } else if (st.module_id) {
        const { data: mod } = await supabase.from('modules').select('project_id').eq('id', st.module_id).single();
        projectId = mod?.project_id ?? null;
      } else if (st.parent_id) {
        const { data: task } = await supabase.from('tasks').select('module_id').eq('id', st.parent_id).single();
        if (task?.module_id) {
          const { data: mod } = await supabase.from('modules').select('project_id').eq('id', task.module_id).single();
          projectId = mod?.project_id ?? null;
        }
      }

      if (!projectId) return [];

      // Get all subtasks in same project
      const { data: modules } = await supabase.from('modules').select('id, name, color').eq('project_id', projectId);
      const moduleIds = modules?.map((m) => m.id).filter(Boolean) as string[] || [];
      const { data: tasks } = await supabase.from('tasks').select('id, name, module_id').in('module_id', moduleIds);
      const taskIds = tasks?.map((t) => t.id).filter(Boolean) as string[] || [];

      // Fetch subtasks: parent_id in tasks, OR module_id in modules, OR project_id = project
      const results: any[] = [];
      if (taskIds.length > 0) {
        const { data: byParent } = await supabase
          .from('subtasks')
          .select(`
            id, name, status, parent_id, module_id, project_id,
            task:tasks!parent_id(id, name, module:modules!module_id(name, color))
          `)
          .in('parent_id', taskIds)
          .neq('id', currentSubtaskId);
        results.push(...(byParent || []));
      }
      if (moduleIds.length > 0) {
        const { data: byModule } = await supabase
          .from('subtasks')
          .select('id, name, status, parent_id, module_id, project_id')
          .in('module_id', moduleIds)
          .neq('id', currentSubtaskId);
        const modMap = new Map(modules!.map((m) => [m.id, m]));
        for (const s of byModule || []) {
          if (results.some((r) => r.id === s.id)) continue;
          const mod = modMap.get((s as any).module_id);
          results.push({
            ...s,
            task: mod ? { name: '-', module: { name: mod.name } } : null,
            _source: 'module',
          });
        }
      }
      try {
        const { data: byProject } = await supabase
          .from('subtasks')
          .select('id, name, status, parent_id, module_id, project_id')
          .eq('project_id', projectId)
          .neq('id', currentSubtaskId);
        for (const s of byProject || []) {
          if (results.some((r) => r.id === s.id)) continue;
          results.push({
            ...s,
            task: { name: '-', module: { name: 'Project' } },
            _source: 'project',
          });
        }
      } catch {
        /* project_id column may not exist before migration 036 */
      }

      return results;
    },
    enabled: !!currentSubtaskId,
  });
}
