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
          tasks(*, subtasks(*), minitasks(*)),
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
    satellite_type?: string | null;
  };
}

// Fetch dependencies for a subtask (legacy – by dependent_task_id)
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
            status,
            satellite_type
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

export interface DependencyWithTarget {
  id: string;
  dependency_type: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  target_name: string;
  target_status?: string;
  target_satellite_type?: string | null;
  /** 'outgoing' = entity depends on other | 'incoming' = other depends on entity */
  direction?: 'outgoing' | 'incoming';
}

export interface EntityDependenciesResult {
  /** Entity depends on these (source = entity) */
  outgoing: DependencyWithTarget[];
  /** These depend on entity (target = entity) */
  incoming: DependencyWithTarget[];
  /** All unique deps, for count */
  all: DependencyWithTarget[];
}

async function resolveEntityNames(
  items: { type: string; id: string }[]
): Promise<Map<string, { name: string; status?: string; satellite_type?: string | null }>> {
  const result = new Map<string, { name: string; status?: string; satellite_type?: string | null }>();
  const byType = new Map<string, string[]>();
  for (const { type, id } of items) {
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(id);
  }
  for (const [ttype, ids] of byType) {
    const uniq = [...new Set(ids)];
    if (ttype === 'subtask') {
      const { data: st } = await supabase.from('subtasks').select('id, name, status, satellite_type').in('id', uniq);
      (st || []).forEach((s: any) =>
        result.set(`${ttype}:${s.id}`, { name: s.name, status: s.status, satellite_type: s.satellite_type })
      );
    } else if (ttype === 'task') {
      const { data: t } = await supabase.from('tasks').select('id, name').in('id', uniq);
      (t || []).forEach((s: any) => result.set(`${ttype}:${s.id}`, { name: s.name }));
    } else if (ttype === 'module') {
      const { data: m } = await supabase.from('modules').select('id, name').in('id', uniq);
      (m || []).forEach((s: any) => result.set(`${ttype}:${s.id}`, { name: s.name }));
    } else if (ttype === 'minitask') {
      const { data: mt } = await supabase.from('minitasks').select('id, name').in('id', uniq);
      (mt || []).forEach((s: any) => result.set(`${ttype}:${s.id}`, { name: s.name }));
    } else if (ttype === 'project') {
      const { data: p } = await supabase.from('projects').select('id, name').in('id', uniq);
      (p || []).forEach((s: any) => result.set(`${ttype}:${s.id}`, { name: s.name }));
    }
  }
  return result;
}

// Fetch dependencies for any entity – BOTH outgoing (entity depends on X) and incoming (X depends on entity)
export function useDependenciesForEntity(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: ['dependencies-entity', entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) return { outgoing: [], incoming: [], all: [] } as EntityDependenciesResult;

      const [outgoingRes, incomingRes] = await Promise.all([
        supabase
          .from('dependencies')
          .select('id, dependency_type, source_type, source_id, target_type, target_id')
          .eq('source_type', entityType)
          .eq('source_id', entityId)
          .order('created_at', { ascending: false }),
        supabase
          .from('dependencies')
          .select('id, dependency_type, source_type, source_id, target_type, target_id')
          .eq('target_type', entityType)
          .eq('target_id', entityId)
          .order('created_at', { ascending: false }),
      ]);

      const outgoingRows = outgoingRes.data || [];
      const incomingRows = incomingRes.data || [];
      if (outgoingRes.error) throw outgoingRes.error;
      if (incomingRes.error) throw incomingRes.error;

      const toResolve = [
        ...outgoingRows.map((r: any) => ({ type: r.target_type, id: r.target_id })),
        ...incomingRows.map((r: any) => ({ type: r.source_type, id: r.source_id })),
      ];
      const resolved = await resolveEntityNames(toResolve);

      const outgoing: DependencyWithTarget[] = outgoingRows.map((r: any) => {
        const info = resolved.get(`${r.target_type}:${r.target_id}`);
        return {
          id: r.id,
          dependency_type: r.dependency_type,
          source_type: r.source_type,
          source_id: r.source_id,
          target_type: r.target_type,
          target_id: r.target_id,
          target_name: info?.name ?? 'Unknown',
          target_status: info?.status,
          target_satellite_type: info?.satellite_type,
          direction: 'outgoing',
        } as DependencyWithTarget;
      });

      const incoming: DependencyWithTarget[] = incomingRows.map((r: any) => {
        const info = resolved.get(`${r.source_type}:${r.source_id}`);
        return {
          id: r.id,
          dependency_type: r.dependency_type,
          source_type: r.source_type,
          source_id: r.source_id,
          target_type: r.target_type,
          target_id: r.target_id,
          target_name: info?.name ?? 'Unknown',
          target_status: info?.status,
          target_satellite_type: info?.satellite_type,
          direction: 'incoming',
        } as DependencyWithTarget;
      });

      const seen = new Set<string>();
      const all = [...outgoing, ...incoming].filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });

      return { outgoing, incoming, all } as EntityDependenciesResult;
    },
    enabled: !!entityType && !!entityId,
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

// Hierarchy for dependency target picker: Project → Modules → Tasks → Minitasks/Subtasks
export interface DependencyTargetProject {
  id: string;
  name: string;
  type: 'project';
  projectMinitasks: { id: string; name: string; type: 'minitask' }[];
  modules: DependencyTargetModule[];
}

export interface DependencyTargetModule {
  id: string;
  name: string;
  type: 'module';
  moduleMinitasks: { id: string; name: string; type: 'minitask' }[];
  tasks: DependencyTargetTask[];
}

export interface DependencyTargetTask {
  id: string;
  name: string;
  type: 'task';
  minitasks: { id: string; name: string; type: 'minitask'; subtasks: { id: string; name: string; type: 'subtask' }[] }[];
  subtasks: { id: string; name: string; type: 'subtask' }[];
}

export function useProjectHierarchyForDependency(projectId: string | null, excludeEntityId?: string) {
  return useQuery({
    queryKey: ['project-hierarchy-dependency', projectId, excludeEntityId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data: project, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();
      if (projErr || !project) return null;

      const { data: modules } = await supabase
        .from('modules')
        .select('id, name')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      const moduleIds = (modules || []).map((m: any) => m.id);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, name, module_id')
        .in('module_id', moduleIds)
        .order('created_at', { ascending: false });
      const taskIds = (tasks || []).map((t: any) => t.id);

      const { data: taskMinitasks } = await supabase
        .from('minitasks')
        .select('id, name, task_id')
        .in('task_id', taskIds);
      let moduleMinitasks: any[] = [];
      if (moduleIds.length > 0) {
        const { data: modMins } = await supabase
          .from('minitasks')
          .select('id, name, module_id')
          .in('module_id', moduleIds)
          .is('task_id', null);
        moduleMinitasks = modMins || [];
      }
      const { data: projectMinitasks } = await supabase
        .from('minitasks')
        .select('id, name')
        .eq('project_id', projectId)
        .is('module_id', null)
        .is('task_id', null);

      const minitaskIds = [
        ...(taskMinitasks || []).map((m: any) => m.id),
        ...(moduleMinitasks || []).map((m: any) => m.id),
        ...(projectMinitasks || []).map((m: any) => m.id),
      ];
      let subtasksByParent = new Map<string, { id: string; name: string }[]>();
      if (taskIds.length > 0) {
        const { data: stTask } = await supabase
          .from('subtasks')
          .select('id, name, parent_id')
          .in('parent_id', taskIds);
        (stTask || []).forEach((s: any) => {
          const list = subtasksByParent.get(s.parent_id) || [];
          list.push({ id: s.id, name: s.name });
          subtasksByParent.set(s.parent_id, list);
        });
      }
      if (minitaskIds.length > 0) {
        const { data: stMinitask } = await supabase
          .from('subtasks')
          .select('id, name, minitask_id')
          .in('minitask_id', minitaskIds);
        const byMinitask = new Map<string, { id: string; name: string }[]>();
        (stMinitask || []).forEach((s: any) => {
          const list = byMinitask.get(s.minitask_id) || [];
          list.push({ id: s.id, name: s.name });
          byMinitask.set(s.minitask_id, list);
        });
        subtasksByParent = new Map([...subtasksByParent, ...byMinitask]);
      }

      const exclude = excludeEntityId ? new Set([excludeEntityId]) : new Set<string>();

      const modMap = new Map((modules || []).map((m: any) => [m.id, m]));
      const taskMap = new Map((tasks || []).map((t: any) => [t.id, t]));
      const minitasksByTask = new Map<string, any[]>();
      (taskMinitasks || []).forEach((m: any) => {
        const list = minitasksByTask.get(m.task_id) || [];
        list.push(m);
        minitasksByTask.set(m.task_id, list);
      });

      const result: DependencyTargetProject = {
        id: project.id,
        name: project.name,
        type: 'project',
        projectMinitasks: (projectMinitasks || [])
          .filter((m: any) => !exclude.has(m.id))
          .map((m: any) => ({ id: m.id, name: m.name, type: 'minitask' as const })),
        modules: (modules || []).map((mod: any) => {
          const modTasks = (tasks || []).filter((t: any) => t.module_id === mod.id);
          return {
            id: mod.id,
            name: mod.name,
            type: 'module' as const,
            moduleMinitasks: (moduleMinitasks || [])
              .filter((m: any) => m.module_id === mod.id && !exclude.has(m.id))
              .map((m: any) => ({ id: m.id, name: m.name, type: 'minitask' as const })),
            tasks: modTasks.map((t: any) => {
              const tMinitasks = minitasksByTask.get(t.id) || [];
              return {
                id: t.id,
                name: t.name,
                type: 'task' as const,
                minitasks: tMinitasks
                  .filter((m: any) => !exclude.has(m.id))
                  .map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    type: 'minitask' as const,
                    subtasks: (subtasksByParent.get(m.id) || []).filter((s) => !exclude.has(s.id)).map((s) => ({ ...s, type: 'subtask' as const })),
                  })),
                subtasks: (subtasksByParent.get(t.id) || []).filter((s) => !exclude.has(s.id)).map((s) => ({ ...s, type: 'subtask' as const })),
              };
            }),
          };
        }),
      };
      return result;
    },
    enabled: !!projectId,
  });
}
