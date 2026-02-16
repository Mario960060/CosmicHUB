// CURSOR: PM mutations for creating/updating data
// All mutations check PM role via RLS

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ProjectStatus, TaskStatus } from '@/types';

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      clientId,
      startDate,
      endDate,
      createdBy,
      sunType,
    }: {
      name: string;
      description?: string;
      clientId?: string;
      startDate?: string;
      endDate?: string;
      createdBy: string;
      sunType?: string;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || null,
          client_id: clientId || null,
          start_date: startDate || null,
          end_date: endDate || null,
          created_by: createdBy,
          sun_type: sunType || 'yellow-star',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [ERROR] Project insert failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      // Add creator as project manager
      const { error: memberError } = await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: createdBy,
        role: 'manager',
      });

      if (memberError) {
        console.error('⚠️ [WARNING] Failed to add project member:', memberError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
    },
  });
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string;
      updates: {
        name?: string;
        description?: string;
        client_id?: string;
        status?: ProjectStatus;
        start_date?: string;
        end_date?: string;
        sun_type?: string;
        due_date?: string | null;
        priority_stars?: number | null;
        estimated_hours?: number | null;
      };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
      queryClient.invalidateQueries({ queryKey: ['pm-project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['sun-details', variables.projectId] });
    },
  });
}

// Create module
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      description,
      color,
      planetType,
      dueDate,
      priorityStars,
      estimatedHours,
      status,
    }: {
      projectId: string;
      name: string;
      description?: string;
      color?: string;
      planetType?: string;
      dueDate?: string;
      priorityStars?: number;
      estimatedHours?: number;
      status?: 'todo' | 'in_progress' | 'done';
    }) => {
      const supabase = createClient();
      
      // Get next order_index
      const { count } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const { data, error } = await supabase
        .from('modules')
        .insert({
          project_id: projectId,
          name,
          description,
          color: color || '#a855f7',
          planet_type: planetType || 'ocean',
          due_date: dueDate || null,
          priority_stars: priorityStars ?? 1.0,
          estimated_hours: estimatedHours ?? null,
          status: status || 'todo',
          order_index: (count || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['pm-project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Create task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      name,
      description,
      estimatedHours,
      priorityStars,
      createdBy,
      spacecraftType,
      dueDate,
    }: {
      moduleId: string;
      name: string;
      description?: string;
      estimatedHours?: number | null;
      priorityStars?: number;
      createdBy: string;
      spacecraftType?: string;
      dueDate?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          module_id: moduleId,
          name,
          description,
          estimated_hours: estimatedHours ?? null,
          priority_stars: priorityStars || 1.0,
          created_by: createdBy,
          spacecraft_type: spacecraftType || 'sphere-drone',
          due_date: dueDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Update module
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      updates,
    }: {
      moduleId: string;
      updates: {
        name?: string;
        description?: string;
        color?: string;
        planet_type?: string;
        due_date?: string | null;
        priority_stars?: number;
        estimated_hours?: number | null;
        status?: 'todo' | 'in_progress' | 'done';
      };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', moduleId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['planet-details'] });
      queryClient.refetchQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Delete module
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId }: { moduleId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('modules').delete().eq('id', moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: {
        name?: string;
        description?: string;
        estimated_hours?: number | null;
        priority_stars?: number;
        spacecraft_type?: string;
        due_date?: string | null;
        status?: TaskStatus;
        module_id?: string;
      };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['moon-details'] });
      queryClient.refetchQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Create minitask (asteroid)
export function useCreateMinitask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      moduleId,
      projectId,
      name,
      description,
      estimatedHours,
      priorityStars,
      asteroidType,
      assignedTo,
      dueDate,
      createdBy,
    }: {
      taskId?: string;
      moduleId?: string;
      projectId?: string;
      name: string;
      description?: string;
      estimatedHours?: number;
      priorityStars?: number;
      asteroidType?: string;
      assignedTo?: string;
      dueDate?: string;
      createdBy?: string;
    }) => {
      const count = [taskId, moduleId, projectId].filter(Boolean).length;
      if (count !== 1) throw new Error('Provide exactly one of taskId, moduleId, or projectId');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('minitasks')
        .insert({
          ...(taskId ? { task_id: taskId } : moduleId ? { module_id: moduleId } : { project_id: projectId }),
          name,
          description: description || null,
          estimated_hours: estimatedHours,
          priority_stars: priorityStars ?? 1.0,
          asteroid_type: asteroidType || 'rocky',
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
          created_by: createdBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Update minitask
export function useUpdateMinitask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      minitaskId,
      updates,
    }: {
      minitaskId: string;
      updates: {
        name?: string;
        description?: string;
        estimated_hours?: number | null;
        priority_stars?: number;
        asteroid_type?: string;
        assigned_to?: string | null;
        due_date?: string | null;
        status?: TaskStatus;
        task_id?: string | null;
        module_id?: string | null;
        project_id?: string | null;
      };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('minitasks')
        .update(updates)
        .eq('id', minitaskId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['asteroid-details', variables.minitaskId] });
    },
  });
}

// Delete minitask
export function useDeleteMinitask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ minitaskId }: { minitaskId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('minitasks').delete().eq('id', minitaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Satellite types matching SATELLITE_SYSTEM_SPEC
export type SatelliteType =
  | 'notes'
  | 'questions'
  | 'checklist'
  | 'issues'
  | 'metrics'
  | 'documents'
  | 'ideas'
  | 'repo'
  | 'canvas';

// Create subtask (polymorphic parent: exactly one of parentId, moduleId, projectId, minitaskId)
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentId,
      moduleId,
      projectId,
      minitaskId,
      name,
      description,
      estimatedHours,
      priorityStars,
      assignedTo,
      dueDate,
      createdBy,
      satelliteType,
      satelliteData,
    }: {
      parentId?: string;
      moduleId?: string;
      projectId?: string;
      minitaskId?: string;
      name: string;
      description?: string;
      estimatedHours?: number;
      priorityStars?: number;
      assignedTo?: string;
      dueDate?: string;
      createdBy: string;
      satelliteType?: SatelliteType;
      satelliteData?: Record<string, unknown>;
    }) => {
      const supabase = createClient();
      const insertRow: Record<string, unknown> = {
        name,
        description: description || null,
        estimated_hours: estimatedHours,
        priority_stars: priorityStars || 1.0,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        created_by: createdBy,
        satellite_type: satelliteType || 'notes',
        satellite_data: satelliteData ?? {},
      };
      if (parentId) insertRow.parent_id = parentId;
      else if (moduleId) insertRow.module_id = moduleId;
      else if (projectId) insertRow.project_id = projectId;
      else if (minitaskId) insertRow.minitask_id = minitaskId;
      else throw new Error('Subtask requires exactly one parent: parentId, moduleId, projectId, or minitaskId');

      const { data, error } = await supabase
        .from('subtasks')
        .insert(insertRow)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Update subtask
export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      updates,
    }: {
      subtaskId: string;
      updates: {
        name?: string;
        description?: string;
        estimated_hours?: number;
        priority_stars?: number;
        assigned_to?: string | null;
        satellite_type?: SatelliteType;
      };
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: (_, { subtaskId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtask', subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Delete subtask
export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Add project member
export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: 'manager' | 'member';
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: userId,
        role,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
    },
  });
}

// Remove project member
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
    },
  });
}

// Add module member
export function useAddModuleMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      userId,
      role,
    }: {
      moduleId: string;
      userId: string;
      role: 'lead' | 'member';
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('module_members').insert({
        module_id: moduleId,
        user_id: userId,
        role,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-members', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

// Remove module member
export function useRemoveModuleMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      userId,
    }: {
      moduleId: string;
      userId: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('module_members')
        .delete()
        .eq('module_id', moduleId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-members', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

// Add task member
export function useAddTaskMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
      role,
    }: {
      taskId: string;
      userId: string;
      role: 'responsible' | 'member';
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('task_members').insert({
        task_id: taskId,
        user_id: userId,
        role,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-members', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['moon-details'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Remove task member
export function useRemoveTaskMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('task_members')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-members', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['moon-details'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Approve task request
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reviewedBy,
      createTask,
    }: {
      requestId: string;
      reviewedBy: string;
      createTask: boolean;
    }) => {
      const supabase = createClient();
      
      // Get request details
      const { data: request } = await supabase
        .from('task_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Update request status
      await supabase
        .from('task_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Create task if requested
      if (createTask) {
        const { data: task } = await supabase
          .from('tasks')
          .insert({
            module_id: request.module_id,
            name: request.task_name,
            description: request.description,
            estimated_hours: request.estimated_hours,
            priority_stars: request.priority === 'urgent' ? 3.0 : request.priority === 'high' ? 2.5 : request.priority === 'medium' ? 1.5 : 1.0,
            created_by: reviewedBy,
          })
          .select()
          .single();

        if (!task) throw new Error('Failed to create task');

        // Create subtask and assign to requester
        await supabase.from('subtasks').insert({
          parent_id: task.id,
          name: request.task_name,
          description: request.description,
          estimated_hours: request.estimated_hours,
          priority_stars: task.priority_stars,
          assigned_to: request.requested_by,
          created_by: reviewedBy,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

// Reject task request
export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reviewedBy,
      reason,
    }: {
      requestId: string;
      reviewedBy: string;
      reason: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('task_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pm-stats'] });
    },
  });
}

// ============================================
// DEPENDENCIES MUTATIONS
// ============================================

// Create dependency (polymorphic: source -> target)
export function useCreateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceType,
      sourceId,
      targetType,
      targetId,
      dependencyType = 'depends_on',
      note,
    }: {
      sourceType: 'module' | 'task' | 'subtask' | 'minitask';
      sourceId: string;
      targetType: 'module' | 'task' | 'subtask' | 'minitask';
      targetId: string;
      dependencyType?: 'blocks' | 'depends_on' | 'related_to';
      note?: string | null;
    }) => {
      const supabase = createClient();

      if (sourceType === targetType && sourceId === targetId) {
        throw new Error('An entity cannot depend on itself');
      }

      const { data: existingDeps } = await supabase.from('dependencies').select('source_type, source_id, target_type, target_id');
      const nodeKey = (t: string, id: string) => `${t}:${id}`;
      const graph = new Map<string, Set<string>>();
      (existingDeps || []).forEach((dep: any) => {
        const src = nodeKey(dep.source_type, dep.source_id);
        const tgt = nodeKey(dep.target_type, dep.target_id);
        if (!graph.has(src)) graph.set(src, new Set());
        graph.get(src)!.add(tgt);
      });
      const srcKey = nodeKey(sourceType, sourceId);
      const tgtKey = nodeKey(targetType, targetId);
      if (!graph.has(srcKey)) graph.set(srcKey, new Set());
      graph.get(srcKey)!.add(tgtKey);

      const hasCycle = (node: string, visited: Set<string>, recStack: Set<string>): boolean => {
        if (recStack.has(node)) return true;
        if (visited.has(node)) return false;
        visited.add(node);
        recStack.add(node);
        const neighbors = graph.get(node) || new Set();
        for (const n of neighbors) {
          if (hasCycle(n, visited, recStack)) return true;
        }
        recStack.delete(node);
        return false;
      };
      const visited = new Set<string>();
      const recStack = new Set<string>();
      for (const node of graph.keys()) {
        if (hasCycle(node, visited, recStack)) {
          throw new Error('This would create a circular dependency');
        }
      }

      const insertRow: Record<string, unknown> = {
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        dependency_type: dependencyType,
        note: note || null,
      };
      if (sourceType === 'subtask' && targetType === 'subtask') {
        insertRow.dependent_task_id = sourceId;
        insertRow.depends_on_task_id = targetId;
      }

      const { data, error } = await supabase
        .from('dependencies')
        .insert(insertRow)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('This dependency already exists');
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}

// Delete dependency
export function useDeleteDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dependencyId }: { dependencyId: string }) => {
      const supabase = createClient();

      // Get dependency info before deleting (for cache invalidation)
      const { data: dependency } = await supabase
        .from('dependencies')
        .select('dependent_task_id')
        .eq('id', dependencyId)
        .single();

      const { error } = await supabase
        .from('dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;

      return dependency;
    },
    onSuccess: (dependency) => {
      if (dependency) {
        queryClient.invalidateQueries({ queryKey: ['dependencies', dependency.dependent_task_id] });
        queryClient.invalidateQueries({ queryKey: ['subtask', dependency.dependent_task_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}
