// CURSOR: Fetch and save galaxy positions
// Used for custom layout persistence

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface GalaxyPosition {
  id: string;
  project_id: string;
  entity_type: 'project' | 'module' | 'task' | 'subtask' | 'portal' | 'minitask';
  entity_id: string;
  x: number;
  y: number;
  view_context: 'solar_system' | 'module' | 'task' | 'minitask';
  module_id: string | null;
  task_id?: string | null;
  minitask_id?: string | null;
}

export type PositionMap = Map<string, { x: number; y: number }>;

function getPositionKey(entityType: string, entityId: string, viewContext: string, moduleId?: string | null, taskId?: string | null, minitaskId?: string | null): string {
  if (viewContext === 'minitask' && minitaskId) {
    return `${entityType}:${entityId}:${minitaskId}`;
  }
  if (viewContext === 'task' && taskId) {
    return `${entityType}:${entityId}:${taskId}`;
  }
  if (viewContext === 'module' && moduleId) {
    return `${entityType}:${entityId}:${moduleId}`;
  }
  return `${entityType}:${entityId}:solar_system`;
}

const OLD_CANVAS_WIDTH = 1920;
const OLD_CANVAS_HEIGHT = 1080;
const PREV_CANVAS_WIDTH = 9600;
const PREV_CANVAS_HEIGHT = 5400;

export function positionsToMap(positions: GalaxyPosition[]): PositionMap {
  const map = new Map<string, { x: number; y: number }>();
  for (const p of positions) {
    const key = getPositionKey(p.entity_type, p.entity_id, p.view_context, p.module_id, (p as any).task_id, (p as any).minitask_id);
    map.set(key, { x: p.x, y: p.y });
  }
  return map;
}

/** Skaluje pozycje ze starego formatu do aktualnego rozmiaru canvas */
export function scalePositionsToCanvas(
  positionsMap: PositionMap | undefined,
  canvasWidth: number,
  canvasHeight: number
): PositionMap | undefined {
  if (!positionsMap || positionsMap.size === 0) return positionsMap;
  const entries = Array.from(positionsMap.entries());
  const maxX = Math.max(...entries.map(([, v]) => v.x));
  const maxY = Math.max(...entries.map(([, v]) => v.y));
  let scaleX: number;
  let scaleY: number;
  if (maxX > 5000 || maxY > 3000) {
    scaleX = canvasWidth / PREV_CANVAS_WIDTH;
    scaleY = canvasHeight / PREV_CANVAS_HEIGHT;
  } else if (maxX < 2500 && maxY < 1500) {
    scaleX = canvasWidth / OLD_CANVAS_WIDTH;
    scaleY = canvasHeight / OLD_CANVAS_HEIGHT;
  } else {
    return positionsMap;
  }
  const scaled = new Map<string, { x: number; y: number }>();
  for (const [key, { x, y }] of entries) {
    scaled.set(key, { x: x * scaleX, y: y * scaleY });
  }
  return scaled;
}

export function useGalaxyPositions(projectId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['galaxy-positions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('galaxy_positions')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as GalaxyPosition[];
    },
    enabled: !!projectId,
  });
}

export interface SavePositionPayload {
  entity_type: 'project' | 'module' | 'task' | 'subtask' | 'portal' | 'minitask';
  entity_id: string;
  x: number;
  y: number;
  view_context: 'solar_system' | 'module' | 'task' | 'minitask';
  module_id?: string | null;
  task_id?: string | null;
  minitask_id?: string | null;
}

function posKey(p: { view_context: string; module_id?: string | null; task_id?: string | null; minitask_id?: string | null; entity_type: string; entity_id: string }) {
  return `${p.view_context}:${p.module_id ?? 'n'}:${p.task_id ?? 'n'}:${p.minitask_id ?? 'n'}:${p.entity_type}:${p.entity_id}`;
}

/** Copy entity position from old context to new context, return merged positions for save */
export function copyPositionToNewContext(
  existing: GalaxyPosition[] | SavePositionPayload[],
  entityType: 'task' | 'minitask',
  entityId: string,
  oldContext: { view_context: 'solar_system' | 'module' | 'task' | 'minitask'; module_id?: string | null; task_id?: string | null; minitask_id?: string | null },
  newContext: { view_context: 'solar_system' | 'module' | 'task' | 'minitask'; module_id?: string | null; task_id?: string | null; minitask_id?: string | null }
): SavePositionPayload[] {
  const p = (x: GalaxyPosition | SavePositionPayload) => ({ ...x, task_id: (x as any).task_id, minitask_id: (x as any).minitask_id });
  const merged = new Map<string, SavePositionPayload>();
  for (const pos of existing) {
    merged.set(posKey({ ...p(pos), entity_type: pos.entity_type, entity_id: pos.entity_id }), {
      entity_type: pos.entity_type as SavePositionPayload['entity_type'],
      entity_id: pos.entity_id,
      x: pos.x,
      y: pos.y,
      view_context: pos.view_context,
      module_id: pos.module_id,
      task_id: (pos as any).task_id,
      minitask_id: (pos as any).minitask_id,
    });
  }
  const oldKey = posKey({ ...oldContext, entity_type: entityType, entity_id: entityId });
  const oldPos = merged.get(oldKey);
  if (oldPos) {
    merged.delete(oldKey);
    merged.set(posKey({ ...newContext, entity_type: entityType, entity_id: entityId }), {
      ...oldPos,
      view_context: newContext.view_context,
      module_id: newContext.module_id ?? null,
      task_id: newContext.task_id ?? null,
      minitask_id: newContext.minitask_id ?? null,
    });
  }
  return Array.from(merged.values());
}

/** Copy multiple entities' positions to new context */
export function copyPositionsToNewContext(
  existing: GalaxyPosition[] | SavePositionPayload[],
  entityType: 'task' | 'minitask',
  entityIds: string[],
  oldContext: { view_context: 'solar_system' | 'module' | 'task' | 'minitask'; module_id?: string | null; task_id?: string | null; minitask_id?: string | null },
  newContext: { view_context: 'solar_system' | 'module' | 'task' | 'minitask'; module_id?: string | null; task_id?: string | null; minitask_id?: string | null }
): SavePositionPayload[] {
  if (entityIds.length === 0) return copyPositionToNewContext(existing, entityType, '', oldContext, newContext);
  let positions: SavePositionPayload[] = copyPositionToNewContext(existing, entityType, entityIds[0], oldContext, newContext);
  for (let i = 1; i < entityIds.length; i++) {
    positions = copyPositionToNewContext(positions, entityType, entityIds[i], oldContext, newContext);
  }
  return positions;
}

export function useSaveGalaxyPositions(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positions: SavePositionPayload[]) => {
      if (!projectId) throw new Error('Project ID required');
      const supabase = createClient();

      const { error } = await supabase.rpc('save_galaxy_positions', {
        p_project_id: projectId,
        p_positions: positions,
      });

      if (error) throw error;
    },
    onSuccess: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['galaxy-positions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    },
  });
}
