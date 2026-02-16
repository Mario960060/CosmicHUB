'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  saveSatelliteData,
  saveCanvasInList,
  useInvalidateSatelliteQueries,
} from '@/lib/satellite/save-satellite-data';
import { useAuth } from '@/hooks/use-auth';
import type { CanvasState } from './useCanvasState';

const DEBOUNCE_MS = 2000;

type SaveStatus = 'idle' | 'saving' | 'saved';

/** Metadata that must be preserved when auto-saving (not overwritten). */
export interface CanvasMeta {
  name: string;
  description?: string;
  assigned_to?: string | null;
  created_by?: string | null;
}

/**
 * Saves a single canvas in the canvases array (new multi-canvas schema).
 * Uses a ref for onStatusChange to avoid resetting the debounce timer on every render.
 * Pass getCanvasMeta to preserve name, description, assigned_to, created_by when merging.
 */
export function useCanvasSave(
  subtaskId: string,
  canvasId: string,
  state: CanvasState,
  isDirty: boolean,
  onStatusChange?: (status: SaveStatus) => void,
  getCanvasMeta?: () => CanvasMeta
) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const lastSavedRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;

  const save = useCallback(async () => {
    const payload = JSON.stringify({
      viewport: state.viewport,
      gridEnabled: state.gridEnabled,
      blocks: state.blocks,
      connections: state.connections,
      shapes: state.shapes,
    });
    if (payload === lastSavedRef.current) return;

    statusRef.current?.('saving');
    const meta: Partial<CanvasMeta> = getCanvasMeta?.() ?? {};
    const canvasData = {
      id: canvasId,
      name: meta.name ?? 'Canvas',
      description: meta.description ?? '',
      assigned_to: meta.assigned_to ?? null,
      created_by: meta.created_by ?? null,
      viewport: state.viewport,
      gridEnabled: state.gridEnabled,
      blocks: state.blocks,
      connections: state.connections,
      shapes: state.shapes,
    };
    const { error } = await saveCanvasInList(subtaskId, canvasData, {
      activityEntry: user
        ? { user_id: user.id, action: 'edited_canvas', detail: '', actor_name: user.full_name }
        : undefined,
      onSuccess: () => {
        invalidate(subtaskId);
        lastSavedRef.current = payload;
        statusRef.current?.('saved');
      },
    });
    if (error) {
      console.error('Canvas save failed:', error);
      statusRef.current?.('idle');
    }
  }, [subtaskId, canvasId, state, invalidate, user, getCanvasMeta]);

  useEffect(() => {
    if (!isDirty) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save();
      timeoutRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, isDirty, save]);

  return { save };
}

/**
 * Legacy: saves single canvas (satellite_data.canvas) for backward compatibility.
 */
export function useCanvasSaveLegacy(
  subtaskId: string,
  state: CanvasState,
  isDirty: boolean
) {
  const invalidate = useInvalidateSatelliteQueries();
  const lastSavedRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    const payload = JSON.stringify({
      canvas: {
        viewport: state.viewport,
        gridEnabled: state.gridEnabled,
        blocks: state.blocks,
        connections: state.connections,
        shapes: state.shapes,
      },
    });
    if (payload === lastSavedRef.current) return;

    const { error } = await saveSatelliteData(subtaskId, { canvas: state }, {
      onSuccess: () => {
        invalidate(subtaskId);
        lastSavedRef.current = payload;
      },
    });
    if (error) {
      console.error('Canvas save failed:', error);
    }
  }, [subtaskId, state, invalidate]);

  useEffect(() => {
    if (!isDirty) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save();
      timeoutRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, isDirty, save]);

  return { save };
}
