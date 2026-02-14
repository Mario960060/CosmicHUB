// CURSOR: Fetch and save galaxy positions
// Used for custom layout persistence

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface GalaxyPosition {
  id: string;
  project_id: string;
  entity_type: 'project' | 'module' | 'task' | 'subtask' | 'portal';
  entity_id: string;
  x: number;
  y: number;
  view_context: 'solar_system' | 'module';
  module_id: string | null;
}

export type PositionMap = Map<string, { x: number; y: number }>;

function getPositionKey(entityType: string, entityId: string, viewContext: string, moduleId?: string | null): string {
  if (viewContext === 'module' && moduleId) {
    return `${entityType}:${entityId}:${moduleId}`;
  }
  return `${entityType}:${entityId}:solar_system`;
}

export function positionsToMap(positions: GalaxyPosition[]): PositionMap {
  const map = new Map<string, { x: number; y: number }>();
  for (const p of positions) {
    const key = getPositionKey(p.entity_type, p.entity_id, p.view_context, p.module_id);
    map.set(key, { x: p.x, y: p.y });
  }
  return map;
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
  entity_type: 'project' | 'module' | 'task' | 'subtask' | 'portal';
  entity_id: string;
  x: number;
  y: number;
  view_context: 'solar_system' | 'module';
  module_id?: string | null;
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
