// CURSOR: Fetch and transform data for galactic view

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  transformProjectsToCanvas,
  transformModulesToCanvas,
  transformTasksToCanvas,
  transformDependencies,
} from '@/lib/galactic/data-transformer';
import { positionsToMap } from '@/app/(protected)/galactic/hooks/use-galaxy-positions';
import type { ZoomLevel, CanvasObject, Dependency } from '@/lib/galactic/types';

export function useGalacticData(
  zoom: ZoomLevel,
  projectId?: string,
  moduleId?: string,
  canvasWidth: number = 800,
  canvasHeight: number = 600
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['galactic-data', zoom, projectId, moduleId, canvasWidth, canvasHeight],
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
        // Fetch project data and galaxy positions
        const [projectRes, modulesRes, positionsRes] = await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('modules').select('*, tasks(*, subtasks(id, status))').eq('project_id', projectId).order('order_index', { ascending: true }),
          supabase.from('galaxy_positions').select('*').eq('project_id', projectId),
        ]);

        const project = projectRes.data;
        if (projectRes.error) throw projectRes.error;
        if (!project) throw new Error('Project not found');

        const modules = modulesRes.data || [];
        if (modulesRes.error) throw modulesRes.error;

        const positionsMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;

        objects = transformModulesToCanvas(
          modules,
          { x: canvasWidth / 2, y: canvasHeight / 2 },
          canvasWidth,
          canvasHeight,
          project,
          positionsMap
        );
      } else if (zoom === 'module' && moduleId && projectId) {
        // Fetch current module, all modules (for portals), tasks, positions
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

        const tasks = tasksRes.data || [];
        if (tasksRes.error) throw tasksRes.error;

        const positionsMap = positionsRes.data ? positionsToMap(positionsRes.data as any) : undefined;

        const otherModules = allModules.filter((m: any) => m.id !== moduleId);

        objects = transformTasksToCanvas(
          tasks,
          { x: canvasWidth / 2, y: canvasHeight / 2 },
          canvasWidth,
          canvasHeight,
          module,
          positionsMap,
          moduleId,
          otherModules
        );

        // Build entity -> module_id map for all entities in project
        const moduleIds = allModules.map((m: any) => m.id);
        const entityToModule = new Map<string, string>();
        for (const m of allModules) {
          entityToModule.set(m.id, m.id);
        }
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('id, module_id')
          .in('module_id', moduleIds);
        (allTasks || []).forEach((t: any) => entityToModule.set(t.id, t.module_id));

        const taskIds = (allTasks || []).map((t: any) => t.id);
        let allSubtasks: any[] = [];
        if (taskIds.length > 0) {
          const { data: st1 } = await supabase.from('subtasks').select('id, parent_id, module_id').in('parent_id', taskIds);
          allSubtasks = st1 || [];
        }
        if (moduleIds.length > 0) {
          const { data: st2 } = await supabase.from('subtasks').select('id, parent_id, module_id').in('module_id', moduleIds);
          allSubtasks = [...allSubtasks, ...(st2 || [])];
        }
        const stMap = new Map(allSubtasks.map((s: any) => [s.id, s]));
        Array.from(stMap.values()).forEach((s: any) => {
          if (s.module_id) entityToModule.set(s.id, s.module_id);
          else if (s.parent_id) {
            const t = (allTasks || []).find((x: any) => x.id === s.parent_id);
            if (t) entityToModule.set(s.id, t.module_id);
          }
        });

        const currentEntityIds = new Set<string>();
        currentEntityIds.add(moduleId);
        tasks.forEach((t: any) => {
          currentEntityIds.add(t.id);
          (t.subtasks || []).forEach((s: any) => currentEntityIds.add(s.id));
        });

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
