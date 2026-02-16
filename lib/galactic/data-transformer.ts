// CURSOR: Transform database data to canvas objects
// Calculates positions, sizes, colors
// If positionsMap provided, uses saved positions instead of auto-layout

import type { CanvasObject, Dependency, Point } from './types';
import { calculateTaskProgress, calculateModuleProgress } from './progress';

function daysRemaining(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const SATELLITE_TYPE_TO_CSS: Record<string, string> = {
  questions: 'sphere-drone',
  issues: 'hex-drone',
  notes: 'voyager-probe',
  documents: 'space-station',
  checklist: 'pulse-beacon',
  metrics: 'astro-gauge',
  ideas: 'nebula-spark',
  repo: 'core-module',
  canvas: 'nexus-drone',
};

export type PositionsMap = Map<string, { x: number; y: number }>;

function getPos(map: PositionsMap | undefined, entityType: string, entityId: string, viewContext: string, moduleId?: string | null, taskId?: string | null, minitaskId?: string | null): { x: number; y: number } | undefined {
  if (!map) return undefined;
  let key: string;
  if (viewContext === 'minitask' && minitaskId) {
    key = `${entityType}:${entityId}:${minitaskId}`;
  } else if (viewContext === 'task' && taskId) {
    key = `${entityType}:${entityId}:${taskId}`;
  } else if (viewContext === 'module' && moduleId) {
    key = `${entityType}:${entityId}:${moduleId}`;
  } else {
    key = `${entityType}:${entityId}:solar_system`;
  }
  return map.get(key);
}

// Calculate progress from work logs
function calculateProgress(
  estimatedHours: number | null,
  workLogs?: { hours_spent: number }[]
): number {
  if (!estimatedHours || estimatedHours === 0) return 0;
  
  const totalSpent = workLogs?.reduce((sum, log) => sum + log.hours_spent, 0) || 0;
  return Math.min(100, (totalSpent / estimatedHours) * 100);
}

// Get color based on status
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#10b981',    // Green
    in_progress: '#f59e0b', // Yellow
    done: '#00d9ff',      // Cyan
    blocked: '#ef4444',   // Red
    on_hold: '#8b5cf6',   // Purple
    todo: '#6b7280',      // Gray
    completed: '#00d9ff', // Cyan
    cancelled: '#6b7280', // Gray
  };
  return colors[status] || '#a855f7';
}

// Galaxy view: Projects as planets
export function transformProjectsToCanvas(
  projects: any[],
  canvasWidth: number,
  canvasHeight: number
): CanvasObject[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.3;

  return projects.map((project, index) => {
    const angle = (index / projects.length) * Math.PI * 2;
    const distance = baseRadius + Math.random() * 100;
    
    return {
      id: project.id,
      type: 'project' as const,
      name: project.name,
      position: {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
      },
      radius: 40 + Math.random() * 20, // 40-60px
      color: getStatusColor(project.status),
      status: project.status,
      metadata: {
        projectId: project.id,
        sunType: project.sun_type || 'yellow-star', // Pass sun type
        status: project.status,
      },
    };
  });
}

// Project view: Modules as satellites + free-floating project-level subtasks + project-level minitasks
export function transformModulesToCanvas(
  modules: any[],
  projectPosition: Point,
  canvasWidth: number,
  canvasHeight: number,
  projectData?: any,
  positionsMap?: PositionsMap,
  projectSubtasks?: any[],
  projectMinitasks?: any[]
): CanvasObject[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const orbitRadius = 320; /* planety lekko oddalone od słońca */

  const projectPos = { x: centerX, y: centerY }; // Slonce ZAWSZE na srodku

  const objects: CanvasObject[] = [
    // Central project
    {
      id: projectData?.id || 'project-center',
      type: 'project' as const,
      name: projectData?.name || 'Project',
      position: projectPos,
      radius: 60,
      color: getStatusColor(projectData?.status || 'active'),
      status: projectData?.status || 'active',
      metadata: {
        projectId: projectData?.id,
        sunType: projectData?.sun_type || 'yellow-star',
        status: projectData?.status,
        due_date: projectData?.due_date,
        dueDateDays: projectData?.due_date ? daysRemaining(projectData.due_date) : null,
        pinned: true,
      },
    },
  ];

  /* Równy kątowy odstęp: każda planeta w tej samej odległości od słońca */
  const taskOrbitRadius = 80; /* miniatury tasków dookoła planet (oddalone od planety) */
  modules.forEach((module, index) => {
    const angle =
      modules.length <= 1 ? -Math.PI / 2 : (index / modules.length) * Math.PI * 2 - Math.PI / 2;
    
    const defaultX = centerX + Math.cos(angle) * orbitRadius;
    const defaultY = centerY + Math.sin(angle) * orbitRadius;
    const modPos = getPos(positionsMap, 'module', module.id, 'solar_system') ?? { x: defaultX, y: defaultY };
    
    const moduleTasks = module.tasks || [];
    const avgPriority =
      module.priority_stars != null
        ? (module.priority_stars as number)
        : moduleTasks.length > 0
          ? moduleTasks.reduce((s: number, t: any) => s + (t.priority_stars ?? 1), 0) / moduleTasks.length
          : 1;
    const moduleProgress = calculateModuleProgress(moduleTasks, (module as any).progress_percent);
    objects.push({
      id: module.id,
      type: 'module' as const,
      name: module.name,
      position: modPos,
      radius: 30,
      color: module.color || '#a855f7',
      progress: moduleProgress,
      metadata: {
        projectId: module.project_id,
        moduleId: module.id,
        taskCount: moduleTasks.length,
        planetType: module.planet_type || 'ocean',
        due_date: module.due_date,
        dueDateDays: daysRemaining(module.due_date),
        priorityStars: avgPriority,
      },
    });

    /* Miniatury tasków dookoła modułu (planety) */
    const tasks = module.tasks || [];
    tasks.forEach((task: any, taskIndex: number) => {
      const taskAngle =
        tasks.length <= 1 ? -Math.PI / 2 : (taskIndex / tasks.length) * Math.PI * 2 - Math.PI / 2;
      const defaultTaskX = modPos.x + Math.cos(taskAngle) * taskOrbitRadius;
      const defaultTaskY = modPos.y + Math.sin(taskAngle) * taskOrbitRadius;
      const taskPos = getPos(positionsMap, 'task', task.id, 'solar_system') ?? { x: defaultTaskX, y: defaultTaskY };
      const taskProgress = calculateTaskProgress(task.subtasks || [], task.progress_percent);
      objects.push({
        id: task.id,
        type: 'task' as const,
        name: task.name,
        position: taskPos,
        radius: 12,
        color: getStatusColor(task.status),
        status: task.status,
        progress: taskProgress,
        metadata: {
          moduleId: task.module_id,
          taskId: task.id,
          spacecraftType: task.spacecraft_type || 'rocky-moon',
          priorityStars: task.priority_stars,
          status: task.status,
          due_date: task.due_date,
          dueDateDays: daysRemaining(task.due_date),
          isBlocked: task.status === 'blocked',
          isComplete: task.status === 'done' || task.status === 'completed',
          isMiniature: true,
        },
      });

      /* W Solar System nie pokazujemy subtasków z minitasków tasków – tylko minitaski przypisane do słońca (project-level) */
    });
  });

  // Free-floating project-level subtasks (subtasks with project_id)
  const projectSubs = projectSubtasks || [];
  projectSubs.forEach((subtask: any, idx: number) => {
    const spreadRadius = 400;
    const angle = (idx / Math.max(1, projectSubs.length)) * Math.PI * 2 - Math.PI / 2;
    const jitter = 80 * Math.cos(idx * 1.7) + 60 * Math.sin(idx * 2.1);
    const defaultX = centerX + Math.cos(angle) * (spreadRadius + jitter);
    const defaultY = centerY + Math.sin(angle) * (spreadRadius + jitter);
    const subPos = getPos(positionsMap, 'subtask', subtask.id, 'solar_system') ?? { x: defaultX, y: defaultY };
    const satelliteType = subtask.satellite_type || 'notes';
    const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
    objects.push({
      id: subtask.id,
      type: 'subtask' as const,
      name: subtask.name,
      position: subPos,
      radius: 12,
      color: getStatusColor(subtask.status),
      status: subtask.status,
      metadata: {
        projectId: projectData?.id,
        subtaskId: subtask.id,
        priorityStars: subtask.priority_stars,
        spacecraftType,
        satelliteType,
        isMiniature: true,
      },
    });
  });

  // Project-level minitasks (asteroids around the sun) – bez subtasków w Solar System
  const projectMins = projectMinitasks || [];
  projectMins.forEach((minitask: any, idx: number) => {
    const spreadRadius = 280;
    const angle = (idx / Math.max(1, projectMins.length)) * Math.PI * 2 - Math.PI / 2;
    const jitter = 50 * Math.cos(idx * 2.3) + 40 * Math.sin(idx * 1.9);
    const defaultX = centerX + Math.cos(angle) * (spreadRadius + jitter);
    const defaultY = centerY + Math.sin(angle) * (spreadRadius + jitter);
    const mtPos = getPos(positionsMap, 'minitask', minitask.id, 'solar_system') ?? { x: defaultX, y: defaultY };
    objects.push({
      id: minitask.id,
      type: 'minitask' as const,
      name: minitask.name,
      position: mtPos,
      radius: 14,
      color: getStatusColor(minitask.status),
      status: minitask.status,
      progress: calculateTaskProgress(minitask.subtasks || [], minitask.progress_percent),
      metadata: {
        projectId: projectData?.id,
        minitaskId: minitask.id,
        asteroidType: minitask.asteroid_type || 'rocky',
        priorityStars: minitask.priority_stars,
        due_date: minitask.due_date,
        dueDateDays: daysRemaining(minitask.due_date),
        isBlocked: minitask.status === 'blocked',
        isComplete: minitask.status === 'done' || minitask.status === 'completed',
        isMiniature: true,
      },
    });
  });

  return objects;
}

const CANVAS_WIDTH = 4800;
const CANVAS_HEIGHT = 2700;
// Portale domyślnie w połowie odległości od modułu (środek) do krawędzi – użytkownik może przesunąć
const PORTAL_OFFSET_FROM_CENTER = (CANVAS_WIDTH / 2) / 2; // połowa odległości od centrum do krawędzi
const PORTAL_LEFT_X = CANVAS_WIDTH / 2 - PORTAL_OFFSET_FROM_CENTER;  // 480
const PORTAL_RIGHT_X = CANVAS_WIDTH / 2 + PORTAL_OFFSET_FROM_CENTER; // 1440
const PORTAL_BASE_Y = 300;
const PORTAL_STEP_Y = 150;

// Module view: Tasks as satellites around planet - simple circular layout
// otherModules: other modules in the same project (for portal generation). Portals only if len > 0
export function transformTasksToCanvas(
  tasks: any[],
  modulePosition: Point,
  canvasWidth: number,
  canvasHeight: number,
  moduleData?: any,
  positionsMap?: PositionsMap,
  moduleId?: string,
  otherModules?: { id: string; name: string; color?: string }[],
  moduleMinitasks: any[] = [],
  moduleSubtasks: any[] = []
): CanvasObject[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const orbitRadius = 350; // Jedna orbita dla wszystkich zadań

  const modPos = { x: centerX, y: centerY }; // Centralna planeta ZAWSZE na srodku

  const moduleTasks = tasks || [];
  const avgPriority =
    moduleTasks.length > 0
      ? moduleTasks.reduce((s: number, t: any) => s + (t.priority_stars ?? 1), 0) / moduleTasks.length
      : 1;
  const moduleProgress = calculateModuleProgress(moduleTasks, moduleData?.progress_percent);

  const objects: CanvasObject[] = [
    // Central module
    {
      id: moduleData?.id || 'module-center',
      type: 'module' as const,
      name: moduleData?.name || 'Module',
      position: modPos,
      radius: 50,
      color: moduleData?.color || '#a855f7',
      progress: moduleProgress,
      metadata: {
        moduleId: moduleData?.id,
        projectId: moduleData?.project_id,
        planetType: moduleData?.planet_type || 'ocean',
        due_date: moduleData?.due_date,
        dueDateDays: daysRemaining(moduleData?.due_date ?? null),
        priorityStars: avgPriority,
        pinned: true,
      },
    },
  ];

  // Równomierne rozmieszczenie zadań dookoła
  tasks.forEach((task, taskIndex) => {
    const angle =
      tasks.length <= 1 ? -Math.PI / 2 : (taskIndex / tasks.length) * Math.PI * 2 - Math.PI / 2;
    const defaultTaskX = centerX + Math.cos(angle) * orbitRadius;
    const defaultTaskY = centerY + Math.sin(angle) * orbitRadius;
    const taskPos = getPos(positionsMap, 'task', task.id, 'module', moduleId) ?? { x: defaultTaskX, y: defaultTaskY };
    const taskProgress = calculateTaskProgress(task.subtasks || [], task.progress_percent);

    objects.push({
      id: task.id,
      type: 'task' as const,
      name: task.name,
      position: taskPos,
      radius: 25,
      color: getStatusColor(task.status),
      status: task.status,
      progress: taskProgress,
      metadata: {
        moduleId: task.module_id,
        taskId: task.id,
        spacecraftType: task.spacecraft_type || 'rocky-moon',
        priorityStars: task.priority_stars,
        status: task.status,
        due_date: task.due_date,
        dueDateDays: daysRemaining(task.due_date),
        isBlocked: task.status === 'blocked',
        isComplete: task.status === 'done' || task.status === 'completed',
      },
    });

    // Miniature asteroids (minitasks) around each moon + their subtasks (tylko ikona, bez nazwy)
    const minitasks = task.minitasks || [];
    const asteroidOrbitRadius = 70;
    minitasks.forEach((minitask: any, mtIndex: number) => {
      const mtAngle = angle + (mtIndex / Math.max(1, minitasks.length)) * Math.PI * 0.5;
      const defaultMtX = taskPos.x + Math.cos(mtAngle) * asteroidOrbitRadius;
      const defaultMtY = taskPos.y + Math.sin(mtAngle) * asteroidOrbitRadius;
      const mtPos = getPos(positionsMap, 'minitask', minitask.id, 'module', moduleId) ?? { x: defaultMtX, y: defaultMtY };
      objects.push({
        id: minitask.id,
        type: 'minitask' as const,
        name: minitask.name,
        position: mtPos,
        radius: 14,
        color: getStatusColor(minitask.status),
        status: minitask.status,
        progress: calculateTaskProgress(minitask.subtasks || [], minitask.progress_percent),
        metadata: {
          taskId: task.id,
          minitaskId: minitask.id,
          asteroidType: minitask.asteroid_type || 'rocky',
          priorityStars: minitask.priority_stars,
          due_date: minitask.due_date,
          dueDateDays: daysRemaining(minitask.due_date),
          isBlocked: minitask.status === 'blocked',
          isComplete: minitask.status === 'done' || minitask.status === 'completed',
          isMiniature: true,
        },
      });

      /* Subtaski z minitaska dookoła asteroidy (tylko ikona, bez nazwy) */
      const subtasks = minitask.subtasks || [];
      const subRadius = 45;
      subtasks.forEach((subtask: any, subIdx: number) => {
        const subAngle = mtAngle + (subIdx / Math.max(1, subtasks.length)) * Math.PI * 0.5;
        const defaultSubX = mtPos.x + Math.cos(subAngle) * subRadius;
        const defaultSubY = mtPos.y + Math.sin(subAngle) * subRadius;
        const subPos = getPos(positionsMap, 'subtask', subtask.id, 'module', moduleId) ?? { x: defaultSubX, y: defaultSubY };
        const satelliteType = subtask.satellite_type || 'notes';
        const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
        objects.push({
          id: subtask.id,
          type: 'subtask' as const,
          name: subtask.name,
          position: subPos,
          radius: 14,
          color: getStatusColor(subtask.status),
          status: subtask.status,
          metadata: {
            taskId: task.id,
            minitaskId: minitask.id,
            subtaskId: subtask.id,
            priorityStars: subtask.priority_stars,
            spacecraftType,
            satelliteType,
            hideName: true,
          },
        });
      });
    });

    // Subtasks dookoła zadania (miniature satellites)
    if (task.subtasks && task.subtasks.length > 0) {
      const subRadius = 70;
      task.subtasks.forEach((subtask: any, subIndex: number) => {
        const subAngle = angle + (subIndex / task.subtasks.length) * Math.PI * 0.5;
        const defaultSubX = taskPos.x + Math.cos(subAngle) * subRadius;
        const defaultSubY = taskPos.y + Math.sin(subAngle) * subRadius;
        const subPos = getPos(positionsMap, 'subtask', subtask.id, 'module', moduleId) ?? { x: defaultSubX, y: defaultSubY };
        const satelliteType = subtask.satellite_type || 'notes';
        const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
        objects.push({
          id: subtask.id,
          type: 'subtask' as const,
          name: subtask.name,
          position: subPos,
          radius: 20,
          color: getStatusColor(subtask.status),
          status: subtask.status,
          metadata: {
            taskId: task.id,
            subtaskId: subtask.id,
            priorityStars: subtask.priority_stars,
            spacecraftType,
            satelliteType,
            isMiniature: true,
          },
        });
      });
    }
  });

  // Module-level subtasks (satellites) around the planet - use saved positions
  const moduleSubSpreadRadius = 280;
  (moduleSubtasks || []).forEach((subtask: any, idx: number) => {
    const angle = moduleSubtasks.length <= 1 ? -Math.PI / 2 : (idx / Math.max(1, moduleSubtasks.length)) * Math.PI * 2 - Math.PI / 2;
    const jitter = 60 * Math.cos(idx * 1.7) + 40 * Math.sin(idx * 2.1);
    const defaultX = centerX + Math.cos(angle) * (moduleSubSpreadRadius + jitter);
    const defaultY = centerY + Math.sin(angle) * (moduleSubSpreadRadius + jitter);
    const subPos = getPos(positionsMap, 'subtask', subtask.id, 'module', moduleId) ?? { x: defaultX, y: defaultY };
    const satelliteType = subtask.satellite_type || 'notes';
    const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
    objects.push({
      id: subtask.id,
      type: 'subtask' as const,
      name: subtask.name,
      position: subPos,
      radius: 20,
      color: getStatusColor(subtask.status),
      status: subtask.status,
      metadata: {
        moduleId: moduleId,
        subtaskId: subtask.id,
        priorityStars: subtask.priority_stars,
        spacecraftType,
        satelliteType,
      },
    });
  });

  // Module-level asteroids (minitasks) orbiting the planet + their subtasks (tylko ikona, bez nazwy)
  const moduleAsteroidOrbitRadius = 220;
  moduleMinitasks.forEach((minitask: any, idx: number) => {
    const angle = moduleMinitasks.length <= 1 ? -Math.PI / 2 : (idx / moduleMinitasks.length) * Math.PI * 2 - Math.PI / 2;
    const defaultX = centerX + Math.cos(angle) * moduleAsteroidOrbitRadius;
    const defaultY = centerY + Math.sin(angle) * moduleAsteroidOrbitRadius;
    const mtPos = getPos(positionsMap, 'minitask', minitask.id, 'module', moduleId) ?? { x: defaultX, y: defaultY };
    objects.push({
      id: minitask.id,
      type: 'minitask' as const,
      name: minitask.name,
      position: mtPos,
      radius: 25,
      color: getStatusColor(minitask.status),
      status: minitask.status,
      progress: calculateTaskProgress(minitask.subtasks || [], minitask.progress_percent),
      metadata: {
        moduleId: moduleId,
        minitaskId: minitask.id,
        asteroidType: minitask.asteroid_type || 'rocky',
        priorityStars: minitask.priority_stars,
        due_date: minitask.due_date,
        dueDateDays: daysRemaining(minitask.due_date),
        isBlocked: minitask.status === 'blocked',
        isComplete: minitask.status === 'done' || minitask.status === 'completed',
        isMiniature: false,
      },
    });

    /* Subtaski z module-level minitaska (tylko ikona, bez nazwy) */
    const subtasks = minitask.subtasks || [];
    const subRadius = 50;
    subtasks.forEach((subtask: any, subIdx: number) => {
      const subAngle = angle + (subIdx / Math.max(1, subtasks.length)) * Math.PI * 0.5;
      const defaultSubX = mtPos.x + Math.cos(subAngle) * subRadius;
      const defaultSubY = mtPos.y + Math.sin(subAngle) * subRadius;
      const subPos = getPos(positionsMap, 'subtask', subtask.id, 'module', moduleId) ?? { x: defaultSubX, y: defaultSubY };
      const satelliteType = subtask.satellite_type || 'notes';
      const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
      objects.push({
        id: subtask.id,
        type: 'subtask' as const,
        name: subtask.name,
        position: subPos,
        radius: 14,
        color: getStatusColor(subtask.status),
        status: subtask.status,
        metadata: {
          moduleId: moduleId,
          minitaskId: minitask.id,
          subtaskId: subtask.id,
          priorityStars: subtask.priority_stars,
          spacecraftType,
          satelliteType,
          hideName: true,
        },
      });
    });
  });

  // Portals to other modules (only when viewing a module and there are 2+ modules total)
  if (moduleId && otherModules && otherModules.length > 0) {
    otherModules.forEach((mod, idx) => {
      if (mod.id === moduleId) return; // skip current module
      const portalId = `portal-${mod.id}`;
      const side = idx % 2 === 0 ? 'left' : 'right';
      const baseX = side === 'left' ? PORTAL_LEFT_X : PORTAL_RIGHT_X;
      const defaultY = PORTAL_BASE_Y + Math.floor(idx / 2) * PORTAL_STEP_Y;
      const defaultPos = { x: baseX, y: defaultY };
      const portalPos = getPos(positionsMap, 'portal', mod.id, 'module', moduleId) ?? defaultPos;
      objects.push({
        id: portalId,
        type: 'portal' as const,
        name: `Portal → ${mod.name}`,
        position: portalPos,
        radius: 35,
        color: mod.color || '#a855f7',
        metadata: {
          portalTargetModuleId: mod.id,
          portalTargetModuleName: mod.name,
          portalTargetModuleColor: mod.color || '#a855f7',
        },
      });
    });
  }

  return objects;
}

// Task view: Moon (task) center + Asteroids (minitasks) + Satellites (subtasks) + Portals to other tasks
export function transformMinitasksToCanvas(
  taskData: any,
  minitasks: any[],
  canvasWidth: number,
  canvasHeight: number,
  moduleId?: string,
  positionsMap?: PositionsMap,
  otherTasks?: { id: string; name: string }[]
): CanvasObject[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const orbitRadius = 350;

  const taskPos = { x: centerX, y: centerY };
  const taskProgress = calculateTaskProgress(
    minitasks.flatMap((m: any) => m.subtasks || []).concat(taskData?.subtasks || []),
    taskData?.progress_percent
  );

  const objects: CanvasObject[] = [
    // Central task (moon)
    {
      id: taskData?.id || 'task-center',
      type: 'task' as const,
      name: taskData?.name || 'Task',
      position: taskPos,
      radius: 50,
      color: getStatusColor(taskData?.status || 'todo'),
      status: taskData?.status || 'todo',
      progress: taskProgress,
      metadata: {
        moduleId: taskData?.module_id,
        taskId: taskData?.id,
        spacecraftType: taskData?.spacecraft_type || 'rocky-moon',
        priorityStars: taskData?.priority_stars,
        due_date: taskData?.due_date,
        dueDateDays: daysRemaining(taskData?.due_date ?? null),
        pinned: true,
      },
    },
  ];

  // Asteroids (minitasks) in orbit
  minitasks.forEach((minitask: any, idx: number) => {
    const angle = minitasks.length <= 1 ? -Math.PI / 2 : (idx / minitasks.length) * Math.PI * 2 - Math.PI / 2;
    const defaultX = centerX + Math.cos(angle) * orbitRadius;
    const defaultY = centerY + Math.sin(angle) * orbitRadius;
    const mtPos = getPos(positionsMap, 'minitask', minitask.id, 'task', undefined, taskData?.id) ?? { x: defaultX, y: defaultY };

    objects.push({
      id: minitask.id,
      type: 'minitask' as const,
      name: minitask.name,
      position: mtPos,
      radius: 25,
      color: getStatusColor(minitask.status),
      status: minitask.status,
      progress: calculateTaskProgress(minitask.subtasks || [], minitask.progress_percent),
      metadata: {
        taskId: taskData?.id,
        minitaskId: minitask.id,
        asteroidType: minitask.asteroid_type || 'rocky',
        priorityStars: minitask.priority_stars,
        due_date: minitask.due_date,
        dueDateDays: daysRemaining(minitask.due_date),
        isBlocked: minitask.status === 'blocked',
        isComplete: minitask.status === 'done' || minitask.status === 'completed',
      },
    });

    // Subtasks (satellites) around each asteroid - only icon, no name
    const subtasks = minitask.subtasks || [];
    const subRadius = 70;
    subtasks.forEach((subtask: any, subIdx: number) => {
      const subAngle = angle + (subIdx / Math.max(1, subtasks.length)) * Math.PI * 0.5;
      const defaultSubX = mtPos.x + Math.cos(subAngle) * subRadius;
      const defaultSubY = mtPos.y + Math.sin(subAngle) * subRadius;
      const subPos = getPos(positionsMap, 'subtask', subtask.id, 'task', undefined, taskData?.id) ?? { x: defaultSubX, y: defaultSubY };
      const satelliteType = subtask.satellite_type || 'notes';
      const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
      objects.push({
        id: subtask.id,
        type: 'subtask' as const,
        name: subtask.name,
        position: subPos,
        radius: 20,
        color: getStatusColor(subtask.status),
        status: subtask.status,
        metadata: {
          taskId: taskData?.id,
          minitaskId: minitask.id,
          subtaskId: subtask.id,
          priorityStars: subtask.priority_stars,
          spacecraftType,
          satelliteType,
          hideName: true,
        },
      });
    });
  });

  // Subtasks belonging directly to task (parent_id) - around center, not under minitasks
  const taskSubtasks = (taskData?.subtasks || []).filter((s: any) => s.parent_id === taskData?.id);
  const directSubRadius = 120;
  taskSubtasks.forEach((subtask: any, subIdx: number) => {
    const angle = (subIdx / Math.max(1, taskSubtasks.length)) * Math.PI * 2 - Math.PI / 2;
    const defaultSubX = centerX + Math.cos(angle) * directSubRadius;
    const defaultSubY = centerY + Math.sin(angle) * directSubRadius;
    const subPos = getPos(positionsMap, 'subtask', subtask.id, 'task', undefined, taskData?.id) ?? { x: defaultSubX, y: defaultSubY };
    const satelliteType = subtask.satellite_type || 'notes';
    const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
    objects.push({
      id: subtask.id,
      type: 'subtask' as const,
      name: subtask.name,
      position: subPos,
      radius: 20,
      color: getStatusColor(subtask.status),
      status: subtask.status,
      metadata: {
        taskId: taskData?.id,
        subtaskId: subtask.id,
        priorityStars: subtask.priority_stars,
        spacecraftType,
        satelliteType,
      },
    });
  });

  // Portals to other tasks in the same module
  if (taskData?.id && otherTasks && otherTasks.length > 0) {
    otherTasks.forEach((t, idx) => {
      if (t.id === taskData.id) return;
      const portalId = `portal-task-${t.id}`;
      const side = idx % 2 === 0 ? 'left' : 'right';
      const baseX = side === 'left' ? PORTAL_LEFT_X : PORTAL_RIGHT_X;
      const defaultY = PORTAL_BASE_Y + Math.floor(idx / 2) * PORTAL_STEP_Y;
      const defaultPos = { x: baseX, y: defaultY };
      const portalPos = getPos(positionsMap, 'portal', t.id, 'task', undefined, taskData.id) ?? defaultPos;
      objects.push({
        id: portalId,
        type: 'portal' as const,
        name: `Portal → ${t.name}`,
        position: portalPos,
        radius: 35,
        color: '#00d9ff',
        metadata: {
          portalTargetTaskId: t.id,
          portalTargetTaskName: t.name,
          portalTargetModuleId: moduleId,
        },
      });
    });
  }

  return objects;
}

// Asteroid view: Central asteroid (minitask) + Satellites (subtasks) at saved positions + Portals to sibling minitasks
export function transformSubtasksToCanvas(
  minitaskData: any,
  subtasks: any[],
  canvasWidth: number,
  canvasHeight: number,
  minitaskId: string,
  positionsMap?: PositionsMap,
  otherMinitasks?: { id: string; name: string }[]
): CanvasObject[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const defaultOrbitRadius = 350;

  const asteroidPos = { x: centerX, y: centerY };

  const objects: CanvasObject[] = [
    // Central asteroid (minitask)
    {
      id: minitaskData?.id || 'minitask-center',
      type: 'minitask' as const,
      name: minitaskData?.name || 'Asteroid',
      position: asteroidPos,
      radius: 50,
      color: getStatusColor(minitaskData?.status || 'todo'),
      status: minitaskData?.status || 'todo',
      progress: calculateTaskProgress(subtasks, minitaskData?.progress_percent),
      metadata: {
        taskId: minitaskData?.task_id,
        moduleId: minitaskData?.module_id,
        projectId: minitaskData?.project_id,
        minitaskId: minitaskData?.id,
        asteroidType: minitaskData?.asteroid_type || 'rocky',
        priorityStars: minitaskData?.priority_stars,
        due_date: minitaskData?.due_date,
        dueDateDays: daysRemaining(minitaskData?.due_date ?? null),
        pinned: true,
      },
    },
  ];

  // Subtasks (satellites) at saved positions - default fallback: spread in circle
  subtasks.forEach((subtask: any, idx: number) => {
    const angle = subtasks.length <= 1 ? -Math.PI / 2 : (idx / subtasks.length) * Math.PI * 2 - Math.PI / 2;
    const defaultX = centerX + Math.cos(angle) * defaultOrbitRadius;
    const defaultY = centerY + Math.sin(angle) * defaultOrbitRadius;
    const subPos = getPos(positionsMap, 'subtask', subtask.id, 'minitask', undefined, undefined, minitaskId) ?? { x: defaultX, y: defaultY };
    const satelliteType = subtask.satellite_type || 'notes';
    const spacecraftType = SATELLITE_TYPE_TO_CSS[satelliteType] || 'voyager-probe';
    objects.push({
      id: subtask.id,
      type: 'subtask' as const,
      name: subtask.name,
      position: subPos,
      radius: 25,
      color: getStatusColor(subtask.status),
      status: subtask.status,
      metadata: {
        taskId: minitaskData?.task_id,
        minitaskId: minitaskData?.id,
        subtaskId: subtask.id,
        priorityStars: subtask.priority_stars,
        spacecraftType,
        satelliteType,
      },
    });
  });

  // Portals to sibling minitasks (same task or same module)
  if (minitaskData?.id && otherMinitasks && otherMinitasks.length > 0) {
    otherMinitasks.forEach((m, idx) => {
      if (m.id === minitaskData.id) return;
      const portalId = `portal-minitask-${m.id}`;
      const side = idx % 2 === 0 ? 'left' : 'right';
      const baseX = side === 'left' ? PORTAL_LEFT_X : PORTAL_RIGHT_X;
      const defaultY = PORTAL_BASE_Y + Math.floor(idx / 2) * PORTAL_STEP_Y;
      const defaultPos = { x: baseX, y: defaultY };
      const portalPos = getPos(positionsMap, 'portal', m.id, 'minitask', undefined, undefined, minitaskId) ?? defaultPos;
      objects.push({
        id: portalId,
        type: 'portal' as const,
        name: `Portal → ${m.name}`,
        position: portalPos,
        radius: 35,
        color: '#a78b5a',
        metadata: {
          portalTargetMinitaskId: m.id,
          portalTargetMinitaskName: m.name,
        },
      });
    });
  }

  return objects;
}

// Transform dependencies - supports polymorphic (source_type/id, target_type/id)
// For cross-module deps: maps remote endpoint to portal. dep should have source_module_id, target_module_id (from query)
// For cross-task deps (task view): maps to portal-task-{taskId} when target/source is in another task
// For cross-minitask deps (minitask view): maps to portal-minitask-{minitaskId} when target/source is in another minitask
export function transformDependencies(
  dependencies: any[],
  objects: CanvasObject[],
  currentModuleId?: string,
  currentTaskId?: string,
  entityToTask?: Map<string, string>,
  currentMinitaskId?: string,
  entityToMinitask?: Map<string, string>
): Dependency[] {
  return dependencies.map((dep) => {
    const srcType = dep.source_type || 'subtask';
    const tgtType = dep.target_type || 'subtask';
    const srcId = dep.source_id ?? dep.dependent_task_id;
    const tgtId = dep.target_id ?? dep.depends_on_task_id;

    let fromId = srcId;
    let toId = tgtId;
    const srcModuleId = dep.source_module_id ?? (srcType === 'module' ? srcId : null);
    const tgtModuleId = dep.target_module_id ?? (tgtType === 'module' ? tgtId : null);
    const srcTaskId = dep.source_task_id ?? entityToTask?.get(srcId);
    const tgtTaskId = dep.target_task_id ?? entityToTask?.get(tgtId);
    const srcMinitaskId = dep.source_minitask_id ?? entityToMinitask?.get(srcId) ?? (srcType === 'minitask' ? srcId : null);
    const tgtMinitaskId = dep.target_minitask_id ?? entityToMinitask?.get(tgtId) ?? (tgtType === 'minitask' ? tgtId : null);

    if (currentMinitaskId && entityToMinitask) {
      if (tgtMinitaskId && tgtMinitaskId !== currentMinitaskId) {
        toId = `portal-minitask-${tgtMinitaskId}`;
      }
      if (srcMinitaskId && srcMinitaskId !== currentMinitaskId) {
        fromId = `portal-minitask-${srcMinitaskId}`;
      }
    } else if (currentTaskId && entityToTask) {
      if (tgtTaskId && tgtTaskId !== currentTaskId) {
        toId = `portal-task-${tgtTaskId}`;
      }
      if (srcTaskId && srcTaskId !== currentTaskId) {
        fromId = `portal-task-${srcTaskId}`;
      }
    } else if (currentModuleId && (srcModuleId || tgtModuleId)) {
      if (tgtModuleId && tgtModuleId !== currentModuleId) {
        toId = `portal-${tgtModuleId}`;
      }
      if (srcModuleId && srcModuleId !== currentModuleId) {
        fromId = `portal-${srcModuleId}`;
      }
    }

    const fromObj = objects.find((o) => o.id === fromId);
    const toObj = objects.find((o) => o.id === toId);

    return {
      id: dep.id,
      from: fromId,
      to: toId,
      fromPos: fromObj?.position,
      toPos: toObj?.position,
      dependencyType: dep.dependency_type || 'depends_on',
      sourceType: srcType,
      targetType: tgtType,
      isResolved: dep.target_status === 'done' || dep.target_status === 'completed',
    };
  });
}
