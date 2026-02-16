/**
 * Shared save helper for satellite_data.
 * Merges partial data into existing satellite_data, appends activity, handles errors.
 */

import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const MAX_ACTIVITY_ENTRIES = 50;

export interface ActivityEntry {
  user_id: string;
  action: string;
  detail: string;
  at: string;
  actor_name?: string;
}

export function appendActivity(
  current: ActivityEntry[] | unknown,
  entry: Omit<ActivityEntry, 'at'> & { at?: string }
): ActivityEntry[] {
  const list = Array.isArray(current) ? current : [];
  const newEntry: ActivityEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  };
  const next = [newEntry, ...list].slice(0, MAX_ACTIVITY_ENTRIES);
  return next;
}

const ACTION_LABELS: Record<string, string> = {
  added_question: 'added question',
  deleted_question: 'deleted question',
  answered_question: 'answered question',
  reopened_question: 'reopened question',
  dismissed_question: 'dismissed question',
  assigned_question: 'assigned question',
  added_issue: 'added issue',
  assigned_issue: 'assigned issue',
  status_change_issue: 'changed issue status',
  deleted_issue: 'deleted issue',
  removed_idea: 'removed idea',
  updated_note: 'updated note',
  added_note: 'added note',
  deleted_note: 'deleted note',
  added_link: 'added link',
  removed_link: 'removed link',
  added_item: 'added item',
  toggled_item: 'toggled item',
  reordered_items: 'reordered items',
  deleted_item: 'deleted item',
  added_metric: 'added metric',
  added_data_point: 'added data point',
  edited_metric: 'edited metric',
  deleted_metric: 'deleted metric',
  set_primary: 'set primary metric',
  added_idea: 'added idea',
  assigned_idea: 'assigned idea',
  status_change_idea: 'changed idea status',
  promoted_idea: 'promoted idea',
  discarded_idea: 'discarded idea',
  edited_canvas: 'edited canvas',
  added_canvas: 'added canvas',
  deleted_canvas: 'deleted canvas',
};

export function formatActivityEntry(
  entry: ActivityEntry,
  options?: { userName?: string }
): string {
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  const name = options?.userName ?? entry.actor_name ?? 'Someone';
  const time = formatRelativeTime(entry.at);
  const detail = entry.detail ? ` "${entry.detail}"` : '';
  return `${name} ${label}${detail} · ${time}`;
}

export interface SaveSatelliteDataOptions {
  activityEntry?: Omit<ActivityEntry, 'at'> & { at?: string };
  onSuccess?: () => void;
}

/**
 * Saves satellite_data by merging partialData into existing data.
 * Reads current satellite_data, merges, optionally appends activity, writes.
 * Returns { error } - callers should check error and show toast, not update local state on error.
 */
export async function saveSatelliteData(
  subtaskId: string,
  partialData: Record<string, unknown>,
  options?: SaveSatelliteDataOptions
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  // Read current satellite_data
  const { data: row, error: fetchError } = await supabase
    .from('subtasks')
    .select('satellite_data')
    .eq('id', subtaskId)
    .single();

  if (fetchError) {
    return { error: fetchError as Error };
  }

  const current = (row?.satellite_data as Record<string, unknown>) ?? {};
  let merged: Record<string, unknown> = { ...current, ...partialData };

  if (options?.activityEntry) {
    merged = {
      ...merged,
      activity: appendActivity(current.activity, options.activityEntry),
    };
  }

  const { error: updateError } = await supabase
    .from('subtasks')
    .update({
      satellite_data: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subtaskId);

  if (updateError) {
    return { error: updateError as Error };
  }

  options?.onSuccess?.();
  return { error: null };
}

/**
 * Parses canvases from satellite_data with backward compatibility.
 * If canvases exists, returns it. If canvas (legacy) exists, returns single-item array.
 */
export function parseCanvasesFromSatelliteData(
  satelliteData: Record<string, unknown> | null | undefined
): Array<Record<string, unknown>> {
  const raw = satelliteData?.canvases ?? satelliteData?.canvas;
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === 'object') {
    const id = (raw as Record<string, unknown>).id as string | undefined;
    return [{
      id: id ?? crypto.randomUUID?.(),
      name: 'Canvas',
      description: '',
      assigned_to: null,
      viewport: (raw as Record<string, unknown>).viewport ?? { x: 0, y: 0, zoom: 1 },
      gridEnabled: (raw as Record<string, unknown>).gridEnabled ?? false,
      blocks: (raw as Record<string, unknown>).blocks ?? [],
      connections: (raw as Record<string, unknown>).connections ?? [],
      shapes: (raw as Record<string, unknown>).shapes ?? [],
      ...(raw as Record<string, unknown>),
    }];
  }
  return [];
}

/**
 * Saves a single canvas into the canvases array.
 * Reads current satellite_data, updates/replaces the canvas with matching id, saves.
 */
export async function saveCanvasInList(
  subtaskId: string,
  canvas: { id: string; [k: string]: unknown },
  options?: SaveSatelliteDataOptions
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  const { data: row, error: fetchError } = await supabase
    .from('subtasks')
    .select('satellite_data')
    .eq('id', subtaskId)
    .single();

  if (fetchError) {
    return { error: fetchError as Error };
  }

  const current = (row?.satellite_data as Record<string, unknown>) ?? {};
  const canvases = parseCanvasesFromSatelliteData(current);
  const idx = canvases.findIndex((c) => (c.id as string) === canvas.id);
  const updated = [...canvases];
  if (idx >= 0) {
    updated[idx] = { ...updated[idx], ...canvas };
  } else {
    updated.push(canvas);
  }

  const merged: Record<string, unknown> = { ...current, canvases: updated };
  if (options?.activityEntry) {
    merged.activity = appendActivity(current.activity, options.activityEntry);
  }

  const { error: updateError } = await supabase
    .from('subtasks')
    .update({
      satellite_data: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subtaskId);

  if (updateError) {
    return { error: updateError as Error };
  }

  options?.onSuccess?.();
  return { error: null };
}

/**
 * Saves the full canvases array.
 */
export async function saveCanvases(
  subtaskId: string,
  canvases: Array<Record<string, unknown>>,
  options?: SaveSatelliteDataOptions
): Promise<{ error: Error | null }> {
  return saveSatelliteData(subtaskId, { canvases }, options);
}

/**
 * Hook-friendly: invalidate subtask and subtasks queries after save.
 */
export function useInvalidateSatelliteQueries() {
  const queryClient = useQueryClient();
  return (subtaskId: string) => {
    queryClient.invalidateQueries({ queryKey: ['subtask', subtaskId] });
    queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
  };
}
