// CURSOR: Fetch and transform data for galactic view

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  transformProjectsToCanvas,
  transformModulesToCanvas,
  transformTasksToCanvas,
  transformMinitasksToCanvas,
  transformSubtasksToCanvas,
  transformDependencies,
} from '@/lib/galactic/data-transformer';
import { positionsToMap, scalePositionsToCanvas } from '@/app/(protected)/galactic/hooks/use-galaxy-positions';
import type { ZoomLevel, CanvasObject, Dependency } from '@/lib/galactic/types';

export function useGalacticData(
  zoom: ZoomLevel,
  projectId?: string,
  moduleId?: string,
  taskId?: string,
  minitaskId?: string,
  canvasWidth: number = 800,
  canvasHeight: number = 600
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['galactic-data', zoom, projectId, moduleId, taskId, minitaskId, canvasWidth, canvasHeight],
    queryFn: async () => {
      let objects: CanvasObject[] = [];
      let dependencies: Dependency[] = [];

      if (zoom === 'galaxy') {
        // Fetch all projects
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        objects = transformProjectsToCanvas(projects || [], canvasWidth, canvasHeight);
      } else if (zoom === 'project' && projectId) {
        // Fetch project data, modules, project-level subtasks, project-level minitasks, and galaxy positions
        const [projectRes, modulesRes, projectSubtasksRes, projectMinitasksRes, positionsRes] = await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('modules').select('*, tasks(*, subtasks(id, status), minitasks(*, subtasks(*)))').eq('project_id', projectId).order('order_index', { ascending: true }),
          supabase.from('subtasks').select('*').eq('project_id', projectId),
          supabase.from('minitasks').select('*, subtasks(*)').eq('project_id', projectId).order('created_at', { ascending: true }),
          supabase.from('galaxy_positions').select('*').eq('project_id', projectId),
        ]);

        const project = projectRes.data;
        if (projectRes.error) throw projectRes.error;
        if (!project) throw new Error('Project not found');

        const modules = modulesRes.data || [];
        if (modulesRes.error) throw modulesRes.error;

        const projectSubtasks = projectSubtasksRes.data || [];
        if (projectSubtasksRes.error) throw projectSubtasksRes.error;

        const projectMinitasks = (projectMinitasksRes.data || []).filter((m: any) => m.project_id);

        const rawMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;
        const positionsMap = scalePositionsToCanvas(rawMap, canvasWidth, canvasHeight);

        objects = transformModulesToCanvas(
          modules,
          { x: canvasWidth / 2, y: canvasHeight / 2 },
          canvasWidth,
          canvasHeight,
          project,
          positionsMap,
          projectSubtasks,
          projectMinitasks
        );
      } else if (zoom === 'task' && taskId && moduleId && projectId) {
        // Task System view: Moon center + asteroids + satellites + portals to other tasks
        const [taskRes, minitasksRes, allTasksRes, positionsRes] = await Promise.all([
          supabase.from('tasks').select('*, subtasks(*)').eq('id', taskId).single(),
          supabase.from('minitasks').select('*, subtasks(*)').eq('task_id', taskId).order('created_at', { ascending: true }),
          supabase.from('tasks').select('id, name').eq('module_id', moduleId).order('created_at', { ascending: false }),
          supabase.from('galaxy_positions').select('*').eq('project_id', projectId),
        ]);

        const task = taskRes.data;
        if (taskRes.error) throw taskRes.error;
        if (!task) throw new Error('Task not found');

        const minitasks = minitasksRes.data || [];
        if (minitasksRes.error) throw minitasksRes.error;

        const allTasks = allTasksRes.data || [];
        if (allTasksRes.error) throw allTasksRes.error;

        const rawMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;
        const positionsMap = scalePositionsToCanvas(rawMap, canvasWidth, canvasHeight);

        const otherTasks = allTasks.filter((t: any) => t.id !== taskId);

        objects = transformMinitasksToCanvas(
          task,
          minitasks,
          canvasWidth,
          canvasHeight,
          moduleId,
          positionsMap,
          otherTasks
        );

        // Dependencies for task view (include minitasks and subtasks)
        const currentEntityIds = new Set<string>([taskId]);
        minitasks.forEach((m: any) => {
          currentEntityIds.add(m.id);
          (m.subtasks || []).forEach((s: any) => currentEntityIds.add(s.id));
        });
        (task.subtasks || []).forEach((s: any) => currentEntityIds.add(s.id));

        const { data: deps } = await supabase.from('dependencies').select('*');
        const relevantDeps = (deps || []).filter(
          (d: any) => currentEntityIds.has(d.source_id) || currentEntityIds.has(d.target_id)
        );

        const entityToModule = new Map<string, string>();
        const entityToTask = new Map<string, string>();
        entityToModule.set(taskId, moduleId);
        entityToTask.set(taskId, taskId);
        minitasks.forEach((m: any) => {
          entityToModule.set(m.id, moduleId);
          entityToTask.set(m.id, taskId);
        });
        minitasks.forEach((m: any) => (m.subtasks || []).forEach((s: any) => {
          entityToModule.set(s.id, moduleId);
          entityToTask.set(s.id, taskId);
        }));
        (task.subtasks || []).forEach((s: any) => {
          entityToModule.set(s.id, moduleId);
          entityToTask.set(s.id, taskId);
        });

        const { data: allTasksInModule } = await supabase
          .from('tasks')
          .select('id')
          .eq('module_id', moduleId);
        const allTaskIds = (allTasksInModule || []).map((t: any) => t.id);
        if (allTaskIds.length > 0) {
          const { data: allMinitasksInModule } = await supabase
            .from('minitasks')
            .select('id, task_id')
            .in('task_id', allTaskIds);
          const minitaskIds = (allMinitasksInModule || []).map((m: any) => m.id);
          (allMinitasksInModule || []).forEach((m: any) => entityToTask.set(m.id, m.task_id));

          const [stByParent, stByMinitask] = await Promise.all([
            minitaskIds.length > 0
              ? supabase.from('subtasks').select('id, parent_id, minitask_id').in('minitask_id', minitaskIds)
              : Promise.resolve({ data: [] }),
            supabase.from('subtasks').select('id, parent_id, minitask_id').in('parent_id', allTaskIds),
          ]);
          (stByParent.data || []).forEach((s: any) => {
            const mt = (allMinitasksInModule || []).find((m: any) => m.id === s.minitask_id);
            if (mt) entityToTask.set(s.id, mt.task_id);
          });
          (stByMinitask.data || []).forEach((s: any) => {
            if (s.parent_id) entityToTask.set(s.id, s.parent_id);
          });
        }

        const depsWithModules = relevantDeps.map((d: any) => ({
          ...d,
          source_module_id: entityToModule.get(d.source_id) ?? (d.source_type === 'module' ? d.source_id : null),
          target_module_id: entityToModule.get(d.target_id) ?? (d.target_type === 'module' ? d.target_id : null),
          source_task_id: entityToTask.get(d.source_id) ?? (d.source_type === 'task' ? d.source_id : null),
          target_task_id: entityToTask.get(d.target_id) ?? (d.target_type === 'task' ? d.target_id : null),
        }));

        dependencies = transformDependencies(depsWithModules, objects, moduleId, taskId, entityToTask);
      } else if (zoom === 'minitask' && minitaskId && projectId) {
        // Asteroid view: Central asteroid + satellites at saved positions + portals to sibling minitasks (supports project-level minitasks without moduleId)
        const [minitaskRes, positionsRes] = await Promise.all([
          supabase.from('minitasks').select('*, subtasks(*)').eq('id', minitaskId).single(),
          supabase.from('galaxy_positions').select('*').eq('project_id', projectId),
        ]);

        const minitask = minitaskRes.data;
        if (minitaskRes.error) throw minitaskRes.error;
        if (!minitask) throw new Error('Minitask not found');

        const subtasks = minitask.subtasks || [];

        const rawMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;
        const positionsMap = scalePositionsToCanvas(rawMap, canvasWidth, canvasHeight);

        let otherMinitasks: { id: string; name: string }[] = [];
        if (minitask.task_id) {
          const { data: siblings } = await supabase
            .from('minitasks')
            .select('id, name')
            .eq('task_id', minitask.task_id)
            .order('created_at', { ascending: true });
          otherMinitasks = (siblings || []).filter((m: any) => m.id !== minitaskId);
        } else if (minitask.module_id) {
          const { data: siblings } = await supabase
            .from('minitasks')
            .select('id, name')
            .eq('module_id', minitask.module_id)
            .order('created_at', { ascending: true });
          otherMinitasks = (siblings || []).filter((m: any) => m.id !== minitaskId);
        } else if (minitask.project_id) {
          const { data: siblings } = await supabase
            .from('minitasks')
            .select('id, name')
            .eq('project_id', minitask.project_id)
            .order('created_at', { ascending: true });
          otherMinitasks = (siblings || []).filter((m: any) => m.id !== minitaskId);
        }

        objects = transformSubtasksToCanvas(
          minitask,
          subtasks,
          canvasWidth,
          canvasHeight,
          minitaskId,
          positionsMap,
          otherMinitasks
        );

        const currentEntityIds = new Set<string>([minitaskId]);
        subtasks.forEach((s: any) => currentEntityIds.add(s.id));

        const { data: deps } = await supabase.from('dependencies').select('*');
        const relevantDeps = (deps || []).filter(
          (d: any) => currentEntityIds.has(d.source_id) || currentEntityIds.has(d.target_id)
        );

        const entityToModule = new Map<string, string>();
        const entityToTask = new Map<string, string>();
        const entityToMinitask = new Map<string, string>();
        const effectiveModuleId = moduleId ?? minitask.module_id ?? undefined;
        if (effectiveModuleId) entityToModule.set(minitaskId, effectiveModuleId);
        entityToMinitask.set(minitaskId, minitaskId);
        if (minitask.task_id) entityToTask.set(minitaskId, minitask.task_id);
        subtasks.forEach((s: any) => {
          if (effectiveModuleId) entityToModule.set(s.id, effectiveModuleId);
          entityToMinitask.set(s.id, minitaskId);
          if (minitask.task_id) entityToTask.set(s.id, minitask.task_id);
        });

        const depEntityIds = new Set<string>();
        relevantDeps.forEach((d: any) => {
          depEntityIds.add(d.source_id);
          depEntityIds.add(d.target_id);
        });
        if (depEntityIds.size > 0) {
          const { data: remoteSubs } = await supabase
            .from('subtasks')
            .select('id, minitask_id')
            .in('id', Array.from(depEntityIds))
            .not('minitask_id', 'is', null);
          (remoteSubs || []).forEach((s: any) => {
            if (s.minitask_id) entityToMinitask.set(s.id, s.minitask_id);
          });
        }

        const depsWithModules = relevantDeps.map((d: any) => ({
          ...d,
          source_module_id: entityToModule.get(d.source_id) ?? (d.source_type === 'module' ? d.source_id : null),
          target_module_id: entityToModule.get(d.target_id) ?? (d.target_type === 'module' ? d.target_id : null),
          source_task_id: entityToTask.get(d.source_id) ?? (d.source_type === 'task' ? d.source_id : null),
          target_task_id: entityToTask.get(d.target_id) ?? (d.target_type === 'task' ? d.target_id : null),
          source_minitask_id: entityToMinitask.get(d.source_id) ?? (d.source_type === 'minitask' ? d.source_id : null),
          target_minitask_id: entityToMinitask.get(d.target_id) ?? (d.target_type === 'minitask' ? d.target_id : null),
        }));

        dependencies = transformDependencies(depsWithModules, objects, effectiveModuleId, minitask.task_id ?? undefined, entityToTask, minitaskId, entityToMinitask);
      } else if (zoom === 'module' && moduleId && projectId) {
        // Fetch current module, all modules (for portals), tasks with minitasks, positions
        const [moduleRes, allModulesRes, tasksRes, positionsRes] = await Promise.all([
          supabase.from('modules').select('*').eq('id', moduleId).single(),
          supabase.from('modules').select('id, name, color').eq('project_id', projectId).order('order_index', { ascending: true }),
          supabase.from('tasks').select('*, subtasks(*)').eq('module_id', moduleId).order('created_at', { ascending: false }),
          supabase.from('galaxy_positions').select('*').eq('project_id', projectId),
        ]);

        const module = moduleRes.data;
        if (moduleRes.error) throw moduleRes.error;
        if (!module) throw new Error('Module not found');

        const allModules = allModulesRes.data || [];
        if (allModulesRes.error) throw allModulesRes.error;

        let tasks = tasksRes.data || [];
        if (tasksRes.error) throw tasksRes.error;

        // Fetch minitasks for each task + module-level minitasks
        const moduleTaskIds = tasks.map((t: any) => t.id);
        const [taskMinitasksRes, moduleMinitasksRes, moduleSubtasksRes] = await Promise.all([
          moduleTaskIds.length > 0
            ? supabase.from('minitasks').select('*, subtasks(*)').in('task_id', moduleTaskIds)
            : Promise.resolve({ data: [] }),
          supabase.from('minitasks').select('*, subtasks(*)').eq('module_id', moduleId),
          supabase.from('subtasks').select('*').eq('module_id', moduleId),
        ]);
        const minitasks = (taskMinitasksRes.data || []).filter((m: any) => m.task_id);
        const moduleMinitasks = (moduleMinitasksRes.data || []).filter((m: any) => m.module_id);
        const moduleSubtasks = (moduleSubtasksRes.data || []).filter((s: any) => s.module_id && !s.parent_id);
        if (moduleTaskIds.length > 0) {
          const minitasksByTask = new Map<string, any[]>();
          minitasks.forEach((m: any) => {
            const arr = minitasksByTask.get(m.task_id) || [];
            arr.push(m);
            minitasksByTask.set(m.task_id, arr);
          });
          tasks = tasks.map((t: any) => ({
            ...t,
            minitasks: minitasksByTask.get(t.id) || [],
          }));
        }

        const rawMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;
        const positionsMap = scalePositionsToCanvas(rawMap, canvasWidth, canvasHeight);

        const otherModules = allModules.filter((m: any) => m.id !== moduleId);

        objects = transformTasksToCanvas(
          tasks,
          { x: canvasWidth / 2, y: canvasHeight / 2 },
          canvasWidth,
          canvasHeight,
          module,
          positionsMap,
          moduleId,
          otherModules,
          moduleMinitasks,
          moduleSubtasks
        );

        // Build entity -> module_id map for all entities in project
        const moduleIds = allModules.map((m: any) => m.id);
        const entityToModule = new Map<string, string>();
        for (const m of allModules) {
          entityToModule.set(m.id, m.id);
        }
        tasks.forEach((t: any) => {
          (t.minitasks || []).forEach((mt: any) => entityToModule.set(mt.id, t.module_id));
        });
        moduleMinitasks.forEach((mt: any) => entityToModule.set(mt.id, moduleId));
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('id, module_id')
          .in('module_id', moduleIds);
        (allTasks || []).forEach((t: any) => entityToModule.set(t.id, t.module_id));

        const taskIds = (allTasks || []).map((t: any) => t.id);
        const minitaskIds = [
          ...tasks.flatMap((t: any) => (t.minitasks || []).map((m: any) => m.id)),
          ...moduleMinitasks.map((m: any) => m.id),
        ];
        let allSubtasks: any[] = [];
        if (taskIds.length > 0) {
          const { data: st1 } = await supabase.from('subtasks').select('id, parent_id, module_id, minitask_id').in('parent_id', taskIds);
          allSubtasks = st1 || [];
        }
        if (moduleIds.length > 0) {
          const { data: st2 } = await supabase.from('subtasks').select('id, parent_id, module_id, minitask_id').in('module_id', moduleIds);
          allSubtasks = [...allSubtasks, ...(st2 || [])];
        }
        if (minitaskIds.length > 0) {
          const { data: st3 } = await supabase.from('subtasks').select('id, parent_id, module_id, minitask_id').in('minitask_id', minitaskIds);
          allSubtasks = [...allSubtasks, ...(st3 || [])];
        }
        const stMap = new Map(allSubtasks.map((s: any) => [s.id, s]));
        Array.from(stMap.values()).forEach((s: any) => {
          if (s.module_id) entityToModule.set(s.id, s.module_id);
          else if (s.parent_id) {
            const t = (allTasks || []).find((x: any) => x.id === s.parent_id);
            if (t) entityToModule.set(s.id, t.module_id);
          } else if (s.minitask_id) {
            const taskWithMinitask = tasks.find((t: any) =>
              (t.minitasks || []).some((m: any) => m.id === s.minitask_id)
            );
            if (taskWithMinitask) entityToModule.set(s.id, taskWithMinitask.module_id);
            else {
              const modM = moduleMinitasks.find((m: any) => m.id === s.minitask_id);
              if (modM) entityToModule.set(s.id, moduleId);
            }
          }
        });

        const currentEntityIds = new Set<string>();
        currentEntityIds.add(moduleId);
        tasks.forEach((t: any) => {
          currentEntityIds.add(t.id);
          (t.subtasks || []).forEach((s: any) => currentEntityIds.add(s.id));
          (t.minitasks || []).forEach((m: any) => currentEntityIds.add(m.id));
        });
        moduleMinitasks.forEach((m: any) => currentEntityIds.add(m.id));
        moduleSubtasks.forEach((s: any) => currentEntityIds.add(s.id));

        const { data: deps } = await supabase.from('dependencies').select('*');
        const relevantDeps = (deps || []).filter(
          (d: any) =>
            currentEntityIds.has(d.source_id) || currentEntityIds.has(d.target_id)
        );

        const depsWithModules = relevantDeps.map((d: any) => ({
          ...d,
          source_module_id: entityToModule.get(d.source_id) ?? (d.source_type === 'module' ? d.source_id : null),
          target_module_id: entityToModule.get(d.target_id) ?? (d.target_type === 'module' ? d.target_id : null),
        }));

        dependencies = transformDependencies(depsWithModules, objects, moduleId);
      }

      return { objects, dependencies };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
