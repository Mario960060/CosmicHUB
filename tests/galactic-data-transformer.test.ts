/**
 * Testy dla lib/galactic/data-transformer.ts
 * Progress calculation, status colors, dependencies transform
 * NIE testujemy transformProjectsToCanvas (Math.random = niedeterministyczne)
 */
import { describe, it, expect } from 'vitest';
import {
  transformModulesToCanvas,
  transformTasksToCanvas,
  transformDependencies,
} from '@/lib/galactic/data-transformer';

describe('transformModulesToCanvas', () => {
  it('returns project center as first object', () => {
    const result = transformModulesToCanvas(
      [],
      { x: 400, y: 300 },
      800, 600,
      { id: 'p1', name: 'My Project', status: 'active' }
    );
    expect(result[0].type).toBe('project');
    expect(result[0].name).toBe('My Project');
  });

  it('creates module objects for each module', () => {
    const modules = [
      { id: 'm1', name: 'Module A', color: '#ff0000', project_id: 'p1', tasks: [] },
      { id: 'm2', name: 'Module B', color: '#00ff00', project_id: 'p1', tasks: [] },
    ];
    const result = transformModulesToCanvas(
      modules, { x: 400, y: 300 }, 800, 600,
      { id: 'p1', name: 'Project', status: 'active' }
    );
    const moduleObjects = result.filter(o => o.type === 'module');
    expect(moduleObjects).toHaveLength(2);
    expect(moduleObjects[0].name).toBe('Module A');
    expect(moduleObjects[1].name).toBe('Module B');
  });

  it('creates miniature task objects around modules', () => {
    const modules = [
      {
        id: 'm1', name: 'Module A', color: '#ff0000', project_id: 'p1',
        tasks: [
          { id: 't1', name: 'Task 1', status: 'todo', module_id: 'm1' },
          { id: 't2', name: 'Task 2', status: 'done', module_id: 'm1' },
        ],
      },
    ];
    const result = transformModulesToCanvas(
      modules, { x: 400, y: 300 }, 800, 600,
      { id: 'p1', name: 'Project', status: 'active' }
    );
    const taskObjects = result.filter(o => o.type === 'task');
    expect(taskObjects).toHaveLength(2);
    expect(taskObjects[0].metadata?.isMiniature).toBe(true);
  });

  it('uses saved positions from positionsMap when available', () => {
    const modules = [
      { id: 'm1', name: 'Module A', color: '#ff0000', project_id: 'p1', tasks: [] },
    ];
    const positionsMap = new Map([
      ['module:m1:solar_system', { x: 123, y: 456 }],
    ]);
    const result = transformModulesToCanvas(
      modules, { x: 400, y: 300 }, 800, 600,
      { id: 'p1', name: 'Project', status: 'active' },
      positionsMap
    );
    const moduleObj = result.find(o => o.id === 'm1');
    expect(moduleObj?.position).toEqual({ x: 123, y: 456 });
  });
});

describe('transformTasksToCanvas', () => {
  it('returns module center as first object', () => {
    const result = transformTasksToCanvas(
      [], { x: 400, y: 300 }, 800, 600,
      { id: 'm1', name: 'My Module', color: '#ff0000' }
    );
    expect(result[0].type).toBe('module');
    expect(result[0].name).toBe('My Module');
  });

  it('creates task objects around module', () => {
    const tasks = [
      { id: 't1', name: 'Task 1', status: 'todo', module_id: 'm1', subtasks: [] },
      { id: 't2', name: 'Task 2', status: 'in_progress', module_id: 'm1', subtasks: [] },
    ];
    const result = transformTasksToCanvas(
      tasks, { x: 400, y: 300 }, 800, 600,
      { id: 'm1', name: 'Module', color: '#fff' }
    );
    const taskObjects = result.filter(o => o.type === 'task');
    expect(taskObjects).toHaveLength(2);
  });

  it('creates subtask objects around their parent task', () => {
    const tasks = [
      {
        id: 't1', name: 'Task 1', status: 'todo', module_id: 'm1',
        subtasks: [
          { id: 'st1', name: 'Sub 1', status: 'todo', satellite_type: 'notes' },
          { id: 'st2', name: 'Sub 2', status: 'done', satellite_type: 'checklist' },
        ],
      },
    ];
    const result = transformTasksToCanvas(
      tasks, { x: 400, y: 300 }, 800, 600,
      { id: 'm1', name: 'Module', color: '#fff' }
    );
    const subtaskObjects = result.filter(o => o.type === 'subtask');
    expect(subtaskObjects).toHaveLength(2);
    expect(subtaskObjects[0].metadata?.satelliteType).toBe('notes');
    expect(subtaskObjects[1].metadata?.satelliteType).toBe('checklist');
  });

  it('maps satellite_type to correct spacecraftType CSS class', () => {
    const tasks = [
      {
        id: 't1', name: 'Task', status: 'todo', module_id: 'm1',
        subtasks: [
          { id: 'st1', name: 'Issues Sub', status: 'todo', satellite_type: 'issues' },
        ],
      },
    ];
    const result = transformTasksToCanvas(
      tasks, { x: 400, y: 300 }, 800, 600,
      { id: 'm1', name: 'Module', color: '#fff' }
    );
    const subtask = result.find(o => o.id === 'st1');
    expect(subtask?.metadata?.spacecraftType).toBe('hex-drone');
  });
});

describe('transformDependencies', () => {
  it('maps dependency to from/to positions', () => {
    const objects = [
      { id: 'st1', type: 'subtask' as const, name: 'A', position: { x: 100, y: 100 }, radius: 10, color: '#fff' },
      { id: 'st2', type: 'subtask' as const, name: 'B', position: { x: 200, y: 200 }, radius: 10, color: '#fff' },
    ];
    const deps = [
      { id: 'd1', dependent_task_id: 'st1', depends_on_task_id: 'st2' },
    ];
    const result = transformDependencies(deps, objects);
    expect(result).toHaveLength(1);
    expect(result[0].fromPos).toEqual({ x: 100, y: 100 });
    expect(result[0].toPos).toEqual({ x: 200, y: 200 });
  });

  it('handles missing object gracefully (undefined position)', () => {
    const objects = [
      { id: 'st1', type: 'subtask' as const, name: 'A', position: { x: 100, y: 100 }, radius: 10, color: '#fff' },
    ];
    const deps = [
      { id: 'd1', dependent_task_id: 'st1', depends_on_task_id: 'st-missing' },
    ];
    const result = transformDependencies(deps, objects);
    expect(result[0].fromPos).toEqual({ x: 100, y: 100 });
    expect(result[0].toPos).toBeUndefined();
  });

  it('returns empty array for no dependencies', () => {
    expect(transformDependencies([], [])).toEqual([]);
  });
});
