'use client';

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CanvasListContent } from './canvas/CanvasListContent';
import { CanvasEditorPopup } from './canvas/CanvasEditorPopup';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { saveCanvases, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { CanvasItem } from './canvas/canvas-types';
import { createEmptyCanvas, normalizeLegacyCanvas } from './canvas/canvas-types';

interface AssignablePerson {
  user_id: string;
  user?: { id: string; full_name: string; avatar_url?: string | null };
}

interface CanvasContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  assignablePeople?: AssignablePerson[];
  canDeleteContent?: boolean;
}

/**
 * Parse canvases from satellite_data with backward compatibility.
 * Uses a STABLE id for legacy single-canvas data (not random UUID).
 */
function parseCanvases(satelliteData: Record<string, unknown>): CanvasItem[] {
  const rawCanvases = satelliteData?.canvases;
  const rawLegacy = satelliteData?.canvas;

  if (Array.isArray(rawCanvases)) {
    return (rawCanvases as Record<string, unknown>[]).map((c) => {
      const normalized = normalizeLegacyCanvas(c);
      return {
        id: (c.id as string) || 'legacy-canvas',
        name: (c.name as string) ?? 'Canvas',
        description: (c.description as string) ?? '',
        assigned_to: (c.assigned_to as string | null) ?? null,
        created_by: (c.created_by as string | null) ?? null,
        ...normalized,
      } as CanvasItem;
    });
  }

  if (rawLegacy && typeof rawLegacy === 'object') {
    const base = normalizeLegacyCanvas(rawLegacy as Record<string, unknown>);
    return [{
      id: ((rawLegacy as Record<string, unknown>).id as string) || 'legacy-canvas',
      name: 'Canvas',
      description: '',
      assigned_to: null,
      created_by: null,
      ...base,
    }];
  }

  return [];
}

export function CanvasContent({
  subtaskId,
  satelliteData,
  assignablePeople = [],
  canDeleteContent = false,
}: CanvasContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const [canvases, setCanvases] = useState<CanvasItem[]>(() => parseCanvases(satelliteData));
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [pendingDeleteCanvas, setPendingDeleteCanvas] = useState<CanvasItem | null>(null);

  const editingCanvas = useMemo(
    () => canvases.find((c) => c.id === editingCanvasId) ?? null,
    [canvases, editingCanvasId]
  );

  const persistCanvases = useCallback(
    async (next: CanvasItem[]) => {
      const { error } = await saveCanvases(
        subtaskId,
        next as unknown as Array<Record<string, unknown>>,
        {
          activityEntry: user
            ? { user_id: user.id, action: 'edited_canvas', detail: '', actor_name: user.full_name }
            : undefined,
          onSuccess: () => invalidate(subtaskId),
        }
      );
      if (error) {
        console.error('Failed to save canvases:', error);
      }
    },
    [subtaskId, invalidate, user]
  );

  const handleCanvasesChange = useCallback(
    (next: CanvasItem[]) => {
      if (user) {
        const supabase = createClient();
        for (const canvas of next) {
          const prev = canvases.find((c) => c.id === canvas.id);
          const shouldNotify =
            canvas.assigned_to &&
            (prev?.assigned_to !== canvas.assigned_to);
          if (shouldNotify) {
            void supabase.rpc('create_notification', {
              p_user_id: canvas.assigned_to,
              p_type: 'assignment',
              p_title: 'Assigned to canvas',
              p_message: `You were assigned to a canvas: ${(canvas.name || 'Untitled').trim() || 'Untitled'}`,
              p_related_id: subtaskId,
              p_related_type: 'subtask',
              p_actor_id: user.id,
            });
          }
        }
      }
      setCanvases(next);
      void persistCanvases(next);
    },
    [persistCanvases]
  );

  const handleOpenCanvas = useCallback((canvas: CanvasItem) => {
    setEditingCanvasId(canvas.id);
  }, []);

  const handleSaveCanvas = useCallback(
    (updated: CanvasItem) => {
      const next = canvases.map((c) => (c.id === updated.id ? updated : c));
      setCanvases(next);
      void persistCanvases(next);
    },
    [canvases, persistCanvases, subtaskId, user]
  );

  const handleCloseEditor = useCallback(() => {
    setEditingCanvasId(null);
  }, []);

  const canDeleteCanvas = useCallback(
    (canvas: CanvasItem) =>
      !!user &&
      (canDeleteContent || canvas.created_by === user.id),
    [user, canDeleteContent]
  );

  const handleRequestDeleteCanvas = useCallback(
    (canvas: CanvasItem) => {
      if (!canDeleteCanvas(canvas)) return;
      setPendingDeleteCanvas(canvas);
    },
    [canDeleteCanvas]
  );

  const handleConfirmDeleteCanvas = useCallback(() => {
    if (!pendingDeleteCanvas) return;
    const canvas = pendingDeleteCanvas;
    setPendingDeleteCanvas(null);
    if (editingCanvasId === canvas.id) setEditingCanvasId(null);
    const next = canvases.filter((c) => c.id !== canvas.id);
    handleCanvasesChange(next);
  }, [pendingDeleteCanvas, canvases, editingCanvasId, handleCanvasesChange]);

  const createCanvas = useCallback(
    (name: string, description?: string, assigned_to?: string | null) =>
      createEmptyCanvas(name, description, assigned_to, user?.id ?? null),
    [user?.id]
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CanvasListContent
        canvases={canvases}
        assignablePeople={assignablePeople}
        onCanvasesChange={handleCanvasesChange}
        onOpenCanvas={handleOpenCanvas}
        onDeleteCanvas={handleRequestDeleteCanvas}
        canDeleteCanvas={canDeleteCanvas}
        createCanvas={createCanvas}
      />

      {pendingDeleteCanvas && (
        <ConfirmDialog
          open={!!pendingDeleteCanvas}
          onConfirm={handleConfirmDeleteCanvas}
          onCancel={() => setPendingDeleteCanvas(null)}
          title={`Usunąć ${pendingDeleteCanvas.name || 'Canvas'}?`}
          message="Ta operacja jest nieodwracalna. Wszystkie bloki i dane zostaną trwale usunięte."
          confirmLabel="Usuń"
          cancelLabel="Anuluj"
          variant="danger"
        />
      )}

      {editingCanvas && createPortal(
        <CanvasEditorPopup
          key={editingCanvas.id}
          canvas={editingCanvas}
          subtaskId={subtaskId}
          assignablePeople={assignablePeople}
          onSave={handleSaveCanvas}
          onClose={handleCloseEditor}
        />,
        document.body
      )}
    </div>
  );
}
