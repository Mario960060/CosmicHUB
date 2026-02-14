// REDESIGN: Cosmic Project Hub - Galactic View
// Space-themed project management visualization

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GalacticScene } from './components/GalacticScene';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { GalaxyPalette, type PaletteItem } from './components/GalaxyPalette';
import { GalaxyContextMenu, type ContextMenuAction } from './components/GalaxyContextMenu';
import { useGalacticData } from '@/hooks/use-galactic-data';
import { useProjects, useProjectMembers } from '@/lib/pm/queries';
import { useSaveGalaxyPositions, useGalaxyPositions, type SavePositionPayload } from './hooks/use-galaxy-positions';
import { useGalaxyEditor } from './hooks/use-galaxy-editor';
import { useDeleteModule, useDeleteTask, useDeleteSubtask, useCreateDependency } from '@/lib/pm/mutations';
import { useAuth } from '@/hooks/use-auth';
import { CreateModuleDialog } from '@/app/(protected)/pm/projects/[id]/components/CreateModuleDialog';
import { CreateTaskDialog } from '@/app/(protected)/pm/projects/[id]/components/CreateTaskDialog';
import { CreateSubtaskDialog } from '@/app/(protected)/pm/projects/[id]/components/CreateSubtaskDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { EditModuleDialog } from './components/EditModuleDialog';
import { EditTaskDialog } from './components/EditTaskDialog';
import { EditSubtaskDialog } from './components/EditSubtaskDialog';
import { PlanetDetailCard } from './components/PlanetDetailCard';
import { MoonDetailCard } from './components/MoonDetailCard';
import { SunDetailCard } from './components/SunDetailCard';
import { AddDependencyPopup } from './components/AddDependencyPopup';
import { PortalTargetPicker } from './components/PortalTargetPicker';
import { SatelliteDetailPanel } from '@/components/satellite/SatelliteDetailPanel';
import { ChevronDown, Zap, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { CanvasObject } from '@/lib/galactic/types';

export default function GalacticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const { data: projects, isLoading: loadingProjects } = useProjects();
  const initialProjectId = searchParams.get('project') || undefined;
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>(undefined);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [contextMenu, setContextMenu] = useState<{
    object: CanvasObject;
    x: number;
    y: number;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    object: CanvasObject;
    action: 'delete-module' | 'delete-task' | 'delete-subtask';
  } | null>(null);
  const [subtaskModalId, setSubtaskModalId] = useState<string | null>(null);
  const [planetDetailId, setPlanetDetailId] = useState<string | null>(null);
  const [moonDetailId, setMoonDetailId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [editingObject, setEditingObject] = useState<CanvasObject | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    item: PaletteItem;
    x: number;
    y: number;
    parentTaskId?: string;
    parentTaskName?: string;
  } | null>(null);
  const [pendingDependency, setPendingDependency] = useState<{
    sourceEntityId: string;
    sourceEntityType: 'module' | 'task' | 'subtask';
    targetEntityId: string;
    targetEntityType: 'module' | 'task' | 'subtask';
    targetEntityName: string;
  } | null>(null);
  const [pendingPortalDependency, setPendingPortalDependency] = useState<{
    sourceEntityId: string;
    sourceEntityType: 'module' | 'task' | 'subtask';
    targetModuleId: string;
    targetModuleName: string;
  } | null>(null);
  const [newEntityMeta, setNewEntityMeta] = useState<
    Map<
      string,
      { type: 'module' | 'task' | 'subtask'; planetType?: string; spacecraftType?: string; taskId?: string }
    >
  >(new Map());

  const { data: projectMembers } = useProjectMembers(selectedProjectId ?? null);

  const canEditGalaxy =
    user &&
    (user.role === 'admin' ||
      (user.role === 'project_manager' &&
        projectMembers?.some((m: any) => m.user_id === user.id && m.role === 'manager')));

  const {
    isEditMode,
    enterEditMode,
    exitEditMode,
    entitiesCreatedThisSession,
    clearCreatedEntities,
    trackEntityCreated,
    connectionModeForSubtaskId,
    connectionModeSource,
    startConnectionMode,
    cancelConnectionMode,
  } = useGalaxyEditor();

  const savePositions = useSaveGalaxyPositions(selectedProjectId ?? null);
  const deleteModule = useDeleteModule();
  const deleteTask = useDeleteTask();
  const deleteSubtask = useDeleteSubtask();
  const createDependency = useCreateDependency();
  const { data: existingPositions } = useGalaxyPositions(selectedProjectId ?? null);

  // Auto-select project if only one available
  useEffect(() => {
    if (projects && projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Clear multi-selection when switching project or zoom level
  useEffect(() => {
    setSelectedObjectIds(new Set());
  }, [selectedProjectId, selectedModuleId]);

  // Determine zoom level based on what's selected
  const zoomLevel = selectedModuleId ? 'module' : 'project';

  const { data, isLoading, isError, error } = useGalacticData(
    zoomLevel as any,
    selectedProjectId,
    selectedModuleId,
    1920,
    1080
  );

  const objectsToRender = useMemo(() => {
    const base = data?.objects ?? [];
    const knownIds = new Set(base.map((o) => o.id));
    const extras: typeof base = [];
    for (const [id, pos] of positionOverrides) {
      if (!knownIds.has(id)) {
        const meta = newEntityMeta.get(id);
        if (meta) {
          extras.push({
            id,
            type: meta.type,
            name: '...',
            position: pos,
            radius: meta.type === 'module' ? 30 : meta.type === 'subtask' ? 20 : 25,
            color: '#a855f7',
            metadata: {
              planetType: meta.planetType,
              spacecraftType: meta.spacecraftType,
              taskId: meta.taskId,
            },
          });
        }
      }
    }
    return [...base, ...extras];
  }, [data?.objects, positionOverrides, newEntityMeta]);

  const handlePositionChange = useCallback((objectId: string, x: number, y: number) => {
    setPositionOverrides((prev) => {
      const next = new Map(prev);
      next.set(objectId, { x, y });
      return next;
    });
  }, []);

  const performSave = useCallback(async () => {
    if (!selectedProjectId || !data?.objects) return;
    const viewContext = selectedModuleId ? 'module' : 'solar_system';
    const moduleId = selectedModuleId ?? null;

    const objectIds = new Set(data.objects.map((o) => o.id));
    const currentViewPositions = data.objects
      .filter((obj) => obj.id && !['project-center', 'module-center'].includes(obj.id))
      .map((obj) => {
        const pos = positionOverrides.get(obj.id) ?? obj.position;
        const entityType: 'project' | 'module' | 'task' | 'subtask' | 'portal' = obj.type === 'portal' ? 'portal' : (obj.type as 'project' | 'module' | 'task' | 'subtask');
        const entityId = obj.type === 'portal' && obj.metadata?.portalTargetModuleId
          ? obj.metadata.portalTargetModuleId
          : obj.id;
        return {
          entity_type: entityType,
          entity_id: entityId,
          x: pos.x,
          y: pos.y,
          view_context: viewContext as 'solar_system' | 'module',
          module_id: moduleId,
        };
      });

    // Include positions for newly created entities not yet in data.objects
    for (const [id, pos] of positionOverrides) {
      if (!objectIds.has(id)) {
        const meta = newEntityMeta.get(id);
        if (meta) {
          currentViewPositions.push({
            entity_type: meta.type,
            entity_id: id,
            x: pos.x,
            y: pos.y,
            view_context: viewContext as 'solar_system' | 'module',
            module_id: moduleId,
          });
        }
      }
    }

    const key = (p: { entity_type: string; entity_id: string; view_context: string; module_id?: string | null }) =>
      `${p.view_context}:${p.module_id ?? 'null'}:${p.entity_type}:${p.entity_id}`;
    const merged = new Map<string, typeof currentViewPositions[0]>();
    for (const p of existingPositions ?? []) {
      merged.set(key(p), {
        entity_type: p.entity_type,
        entity_id: p.entity_id,
        x: p.x,
        y: p.y,
        view_context: p.view_context,
        module_id: p.module_id,
      });
    }
    for (const p of currentViewPositions) {
      merged.set(key(p), p);
    }

    try {
      await savePositions.mutateAsync(Array.from(merged.values()) as SavePositionPayload[]);
      setPositionOverrides(new Map());
      setNewEntityMeta(new Map());
    } catch (err) {
      toast.error('Failed to save positions', { description: (err as Error).message });
      throw err;
    }
  }, [selectedProjectId, selectedModuleId, data?.objects, positionOverrides, existingPositions, newEntityMeta, savePositions]);

  const handleDoneEdit = useCallback(async () => {
    try {
      await performSave();
      clearCreatedEntities();
      exitEditMode();
    } catch {
      // Stay in edit mode; toast already shown
    }
  }, [performSave, clearCreatedEntities, exitEditMode]);

  const handleObjectClick = useCallback(
    async (object: CanvasObject) => {
      setSelectedObjectIds(new Set());
      const src = connectionModeSource ?? (connectionModeForSubtaskId ? { entityId: connectionModeForSubtaskId, entityType: 'subtask' as const } : null);
      if (src) {
        if (object.type === 'portal' && object.metadata?.portalTargetModuleId) {
          setPendingPortalDependency({
            sourceEntityId: src.entityId,
            sourceEntityType: src.entityType,
            targetModuleId: object.metadata.portalTargetModuleId,
            targetModuleName: object.metadata.portalTargetModuleName || object.name,
          });
        } else if ((object.type === 'module' || object.type === 'task' || object.type === 'subtask') && object.id !== src.entityId) {
          setPendingDependency({
            sourceEntityId: src.entityId,
            sourceEntityType: src.entityType,
            targetEntityId: object.id,
            targetEntityType: object.type,
            targetEntityName: object.name,
          });
        }
        cancelConnectionMode();
        return;
      }

      if (object.type === 'project') {
        setProjectDetailId(object.id);
      } else if (object.type === 'module') {
        if (isEditMode) {
          try {
            await performSave();
          } catch {
            return;
          }
        }
        setPlanetDetailId(object.id);
      } else if (object.type === 'task') {
        setMoonDetailId(object.id);
      } else if (object.type === 'subtask') {
        setSubtaskModalId(object.id);
      }
    },
    [isEditMode, performSave, connectionModeForSubtaskId, connectionModeSource, cancelConnectionMode]
  );

  const handleBackToSolar = useCallback(async () => {
    if (isEditMode) {
      try {
        await performSave();
      } catch {
        return;
      }
    }
    setSelectedModuleId(undefined);
  }, [isEditMode, performSave]);

  const handleProjectChange = useCallback(async (projectId: string) => {
    if (isEditMode) {
      try {
        await performSave();
      } catch {
        return;
      }
    }
    setSelectedProjectId(projectId);
    setShowProjectDropdown(false);
  }, [isEditMode, performSave]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const item = JSON.parse(raw) as PaletteItem;
        const canvasEl = document.getElementById('galaxy-canvas');
        if (!canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;
        const canvasX = relX * 1920;
        const canvasY = relY * 1080;

        if (item.entityType === 'subtask') {
          const tasks = objectsToRender.filter((o) => o.type === 'task');
          if (tasks.length === 0) {
            toast.error('Add a moon (task) first, then add satellites (subtasks) to it.');
            return;
          }
          const nearest = tasks.reduce((a, b) => {
            const distA = Math.hypot(a.position.x - canvasX, a.position.y - canvasY);
            const distB = Math.hypot(b.position.x - canvasX, b.position.y - canvasY);
            return distA < distB ? a : b;
          });
          setPendingDrop({ item, x: canvasX, y: canvasY, parentTaskId: nearest.id, parentTaskName: nearest.name });
        } else {
          setPendingDrop({ item, x: canvasX, y: canvasY });
        }
      } catch (_) {}
    },
    [objectsToRender]
  );

  const handleCreateModuleSuccess = useCallback(
    (module: { id: string }) => {
      if (pendingDrop && pendingDrop.item.entityType === 'module') {
        handlePositionChange(module.id, pendingDrop.x, pendingDrop.y);
        setNewEntityMeta((prev) =>
          new Map(prev).set(module.id, {
            type: 'module',
            planetType:
              pendingDrop.item.entityType === 'module' ? pendingDrop.item.planetType : undefined,
          })
        );
        trackEntityCreated({ type: 'module', id: module.id });
      }
      setPendingDrop(null);
    },
    [pendingDrop, handlePositionChange, trackEntityCreated]
  );

  const handleCreateTaskSuccess = useCallback(
    (task: { id: string }) => {
      if (pendingDrop && pendingDrop.item.entityType === 'task') {
        handlePositionChange(task.id, pendingDrop.x, pendingDrop.y);
        setNewEntityMeta((prev) =>
          new Map(prev).set(task.id, {
            type: 'task',
            spacecraftType:
              pendingDrop.item.entityType === 'task' ? pendingDrop.item.spacecraftType : undefined,
          })
        );
        trackEntityCreated({ type: 'task', id: task.id });
      }
      setPendingDrop(null);
    },
    [pendingDrop, handlePositionChange, trackEntityCreated]
  );

  const handleCreateSubtaskSuccess = useCallback(
    (subtask: { id: string }) => {
      if (pendingDrop && pendingDrop.item.entityType === 'subtask' && pendingDrop.parentTaskId) {
        handlePositionChange(subtask.id, pendingDrop.x, pendingDrop.y);
        setNewEntityMeta((prev) =>
          new Map(prev).set(subtask.id, {
            type: 'subtask',
            spacecraftType:
              pendingDrop.item.entityType === 'subtask' ? pendingDrop.item.spacecraftType : undefined,
            taskId: pendingDrop.parentTaskId,
          })
        );
        trackEntityCreated({ type: 'subtask', id: subtask.id });
      }
      setPendingDrop(null);
    },
    [pendingDrop, handlePositionChange, trackEntityCreated]
  );

  const handleCreateModalClose = useCallback(() => {
    setPendingDrop(null);
  }, []);

  const handleCanvasBackgroundClick = useCallback(() => {
    setSelectedObjectIds(new Set());
    if (connectionModeForSubtaskId || connectionModeSource) cancelConnectionMode();
  }, [connectionModeForSubtaskId, connectionModeSource, cancelConnectionMode]);

  const handleBoxSelect = useCallback(
    (screenStart: { x: number; y: number }, screenEnd: { x: number; y: number }) => {
      // Find all [data-galactic-object] elements inside the selection rectangle
      // and match them to our objects. This approach is DOM-based and immune to
      // coordinate transform chain issues.
      const allEls = document.querySelectorAll<HTMLElement>('[data-galactic-object]');
      const sMinX = Math.min(screenStart.x, screenEnd.x);
      const sMaxX = Math.max(screenStart.x, screenEnd.x);
      const sMinY = Math.min(screenStart.y, screenEnd.y);
      const sMaxY = Math.max(screenStart.y, screenEnd.y);

      const excludeIds = new Set(['project-center', 'module-center']);
      const ids: string[] = [];

      allEls.forEach((el) => {
        const id = el.getAttribute('data-object-id');
        if (!id || excludeIds.has(id)) return;
        const rect = el.getBoundingClientRect();
        const elCx = rect.left + rect.width / 2;
        const elCy = rect.top + rect.height / 2;
        // Object is selected if its center falls within the selection box
        // OR if the selection box overlaps with the object's bounding rect
        const overlaps =
          rect.left < sMaxX && rect.right > sMinX &&
          rect.top < sMaxY && rect.bottom > sMinY;
        if (overlaps) {
          ids.push(id);
        }
      });

      setSelectedObjectIds(new Set(ids));
    },
    [] // DOM-based, no deps needed
  );


  const handleObjectContextMenu = useCallback((object: CanvasObject, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ object, x: e.clientX, y: e.clientY });
  }, []);

  const handleContextMenuAction = useCallback(
    async (action: ContextMenuAction, object: CanvasObject) => {
      setContextMenu(null);

      switch (action) {
        case 'edit-project':
          setEditingObject(object);
          break;
        case 'edit-module':
        case 'edit-task':
        case 'edit-subtask':
          setEditingObject(object);
          break;
        case 'manage-dependencies':
          if (object.type === 'module' || object.type === 'task' || object.type === 'subtask') {
            startConnectionMode(object.id, object.type);
            toast.info('Click another entity or portal to add dependency, or click background to cancel.');
          }
          break;
      }
    },
    [startConnectionMode]
  );

  // Group delete via Delete key
  const selectedObjectIdsRef = useRef(selectedObjectIds);
  selectedObjectIdsRef.current = selectedObjectIds;

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const ids = selectedObjectIdsRef.current;
      if (!ids || ids.size === 0) return;
      // Don't delete if user is typing in an input
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;

      e.preventDefault();
      const toDelete = objectsToRender.filter((o) => ids.has(o.id));
      if (toDelete.length === 0) return;

      const confirmed = window.confirm(
        `Delete ${toDelete.length} selected object${toDelete.length > 1 ? 's' : ''}?\n${toDelete.map((o) => `• ${o.name} (${o.type})`).join('\n')}`
      );
      if (!confirmed) return;

      try {
        for (const obj of toDelete) {
          if (obj.type === 'module') {
            await deleteModule.mutateAsync({ moduleId: obj.id });
          } else if (obj.type === 'task') {
            await deleteTask.mutateAsync({ taskId: obj.id });
          } else if (obj.type === 'subtask') {
            await deleteSubtask.mutateAsync({ subtaskId: obj.id });
          }
        }
        setSelectedObjectIds(new Set());
        await performSave();
        toast.success(`Deleted ${toDelete.length} object${toDelete.length > 1 ? 's' : ''}`);
      } catch (err) {
        toast.error('Failed to delete some objects');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [objectsToRender, deleteModule, deleteTask, deleteSubtask, performSave]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;
    const { object, action } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (action === 'delete-module') {
        await deleteModule.mutateAsync({ moduleId: object.id });
      } else if (action === 'delete-task') {
        await deleteTask.mutateAsync({ taskId: object.id });
      } else if (action === 'delete-subtask') {
        await deleteSubtask.mutateAsync({ subtaskId: object.id });
      }
      await performSave();
    } catch (_) {}
  }, [deleteConfirm, deleteModule, deleteTask, deleteSubtask, performSave]);

  if (loadingProjects) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050510',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid rgba(0, 240, 255, 0.2)',
              borderTop: '4px solid #00f0ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p
            style={{
              fontFamily: 'Exo 2, sans-serif',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
            }}
          >
            Initializing galaxy...
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050510',
          padding: '20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(21, 27, 46, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '20px',
            padding: '48px',
            maxWidth: '500px',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
          }}
        >
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🌌</div>
          <h2
            className="cosmic-title"
            style={{
              fontSize: '28px',
              marginBottom: '16px',
            }}
          >
            No Solar Systems Found
          </h2>
          <p
            className="cosmic-subtitle"
            style={{
              fontSize: '14px',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            You need access to at least one project to explore the galactic map. Create or join a
            project to begin your cosmic journey.
          </p>
          <button
            onClick={() => router.push('/pm/projects')}
            onMouseEnter={() => setHoveredButton('create')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(0, 240, 255, 0.2))',
              border: '1px solid #00f0ff',
              borderRadius: '12px',
              color: '#00f0ff',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: hoveredButton === 'create' ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow:
                hoveredButton === 'create' ? '0 8px 30px rgba(0, 240, 255, 0.5)' : 'none',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            Launch Projects
          </button>
        </div>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050510',
          padding: '20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(21, 27, 46, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '20px',
            padding: '48px',
            maxWidth: '600px',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
          }}
        >
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🌟</div>
          <h2
            className="cosmic-title"
            style={{
              fontSize: '28px',
              marginBottom: '16px',
            }}
          >
            Select a Solar System
          </h2>
          <p
            className="cosmic-subtitle"
            style={{
              fontSize: '14px',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            Choose a project to explore its modules and tasks as celestial objects
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectChange(project.id)}
                onMouseEnter={() => setHoveredButton(project.id)}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '16px 24px',
                  background:
                    hoveredButton === project.id
                      ? 'rgba(0, 240, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.3)',
                  border:
                    hoveredButton === project.id
                      ? '1px solid rgba(0, 240, 255, 0.5)'
                      : '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '12px',
                  color: '#00f0ff',
                  fontFamily: 'Exo 2, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: hoveredButton === project.id ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow:
                    hoveredButton === project.id
                      ? '0 0 25px rgba(0, 240, 255, 0.3)'
                      : 'none',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{project.name}</span>
                  <span style={{ fontSize: '20px' }}>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const BAR_HEIGHT = 56;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#050510',
        paddingTop: BAR_HEIGHT,
      }}
    >
      {/* Header Controls – fixed pod app header, zawsze widoczne przy scrolu */}
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          gap: '16px',
          minHeight: BAR_HEIGHT,
          background: 'rgba(5, 5, 16, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Back Button (if in module zoom) */}
        {selectedModuleId && (
          <button
            onClick={() => handleBackToSolar()}
            onMouseEnter={() => setHoveredButton('back')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '8px 16px',
              background: hoveredButton === 'back'
                ? 'rgba(0, 240, 255, 0.15)'
                : 'rgba(21, 27, 46, 0.8)',
              backdropFilter: 'blur(20px)',
              border: hoveredButton === 'back'
                ? '1px solid rgba(0, 240, 255, 0.5)'
                : '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              color: '#00f0ff',
              fontFamily: 'Exo 2, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredButton === 'back'
                ? '0 0 20px rgba(0, 240, 255, 0.3)'
                : 'none',
            }}
          >
            ← Back to Solar System
          </button>
        )}

          {projects.length > 1 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              onMouseEnter={() => setHoveredButton('dropdown')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                padding: '8px 16px',
                background:
                  hoveredButton === 'dropdown' || showProjectDropdown
                    ? 'rgba(0, 240, 255, 0.15)'
                    : 'rgba(21, 27, 46, 0.8)',
                backdropFilter: 'blur(20px)',
                border:
                  hoveredButton === 'dropdown' || showProjectDropdown
                    ? '1px solid rgba(0, 240, 255, 0.5)'
                    : '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                color: '#00f0ff',
                fontFamily: 'Exo 2, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow:
                  hoveredButton === 'dropdown' || showProjectDropdown
                    ? '0 0 25px rgba(0, 240, 255, 0.3)'
                    : 'none',
              }}
            >
              <Zap size={16} />
              <span>Change System</span>
              <ChevronDown
                size={16}
                style={{
                  transform: showProjectDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>

            {showProjectDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  minWidth: '200px',
                  maxWidth: '280px',
                  background: 'rgba(21, 27, 46, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(0, 240, 255, 0.2)',
                }}
              >
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectChange(project.id)}
                    onMouseEnter={() => setHoveredButton(`proj-${project.id}`)}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background:
                        hoveredButton === `proj-${project.id}`
                          ? 'rgba(0, 240, 255, 0.1)'
                          : 'transparent',
                      border: 'none',
                      borderBottom:
                        projects.indexOf(project) < projects.length - 1
                          ? '1px solid rgba(0, 240, 255, 0.1)'
                          : 'none',
                      color: selectedProjectId === project.id ? '#00f0ff' : 'rgba(255, 255, 255, 0.7)',
                      fontFamily: 'Exo 2, sans-serif',
                      fontSize: '14px',
                      fontWeight: selectedProjectId === project.id ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '220px',
                    }}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Title – wyśrodkowany absolutnie w środku paska */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            maxWidth: 'min(400px, 50vw)',
          }}
        >
          <h1
            className="cosmic-title"
            style={{
              fontSize: '24px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '28px', flexShrink: 0 }}>
              {selectedModuleId ? '🪐' : '☀️'}
            </span>
            <span style={{ minWidth: 0 }}>
              {selectedModuleId 
                ? data?.objects.find(o => o.id === selectedModuleId)?.name || 'Module View'
                : selectedProject?.name || 'Solar System'
              }
            </span>
          </h1>
        </div>

        {/* Right side: Edit / Save / Cancel / Workstation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {canEditGalaxy && !isEditMode && (
            <button
              onClick={enterEditMode}
              onMouseEnter={() => setHoveredButton('edit')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                padding: '8px 16px',
                background: hoveredButton === 'edit' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(21, 27, 46, 0.8)',
                backdropFilter: 'blur(20px)',
                border: hoveredButton === 'edit' ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                color: '#00f0ff',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: hoveredButton === 'edit' ? '0 0 25px rgba(0, 240, 255, 0.4)' : 'none',
              }}
            >
              <Pencil size={14} />
              Edit Galaxy
            </button>
          )}
          {canEditGalaxy && isEditMode && (
            <button
              onClick={() => handleDoneEdit()}
              disabled={savePositions.isPending}
              onMouseEnter={() => setHoveredButton('done')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                padding: '8px 16px',
                background: hoveredButton === 'done' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                borderRadius: '12px',
                color: '#10b981',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '13px',
                fontWeight: '700',
                cursor: savePositions.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: savePositions.isPending ? 0.7 : 1,
              }}
            >
              <Save size={14} />
              Done
            </button>
          )}
          <button
            onClick={async () => {
              if (isEditMode) await handleDoneEdit();
              router.push('/workstation');
            }}
            onMouseEnter={() => setHoveredButton('workstation')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '8px 16px',
              background: hoveredButton === 'workstation' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(21, 27, 46, 0.8)',
              backdropFilter: 'blur(20px)',
              border: hoveredButton === 'workstation' ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              color: '#00f0ff',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredButton === 'workstation' ? '0 0 25px rgba(0, 240, 255, 0.4)' : 'none',
            }}
          >
            Go to Workstation →
          </button>
        </div>
      </div>

      {/* Galactic Scene – pod fixed barem */}
      <div style={{ height: 'calc(100vh - 64px - 56px)', minHeight: 400, overflow: 'hidden' }}>
      {isError ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              background: 'rgba(21, 27, 46, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '20px',
              padding: '48px',
              maxWidth: '500px',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
            <h2
              className="cosmic-title"
              style={{
                fontSize: '24px',
                marginBottom: '16px',
                color: '#f87171',
              }}
            >
              Failed to load
            </h2>
            <p
              className="cosmic-subtitle"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {(error as Error)?.message || 'Could not load galaxy data. Please try again.'}
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                border: '4px solid rgba(0, 240, 255, 0.2)',
                borderTop: '4px solid #00f0ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p
              style={{
                fontFamily: 'Exo 2, sans-serif',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
              }}
            >
              Loading solar system...
            </p>
          </div>
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      ) : data && data.objects ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {isEditMode && (
            <GalaxyPalette
              viewType={selectedModuleId ? 'module-zoom' : 'solar-system'}
              onDragStart={() => {}}
            />
          )}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              position: 'relative',
              border: isEditMode ? '2px solid rgba(0, 240, 255, 0.4)' : 'none',
              borderRadius: isEditMode ? '8px' : 0,
              transition: 'border 0.2s ease',
            }}
            {...(isEditMode
              ? { onDragOver: handleCanvasDragOver, onDrop: handleCanvasDrop }
              : {})}
          >
            {isEditMode && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  zIndex: 20,
                  padding: '6px 12px',
                  background: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid rgba(0, 240, 255, 0.5)',
                  borderRadius: '8px',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#00f0ff',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                }}
              >
                Edit Mode
              </div>
            )}
            <GalaxyCanvas onBoxSelect={handleBoxSelect}>
            <GalacticScene
              objects={objectsToRender}
              dependencies={data.dependencies || []}
              viewType={selectedModuleId ? 'module-zoom' : 'solar-system'}
              onObjectClick={handleObjectClick}
              onObjectContextMenu={handleObjectContextMenu}
              onPortalClick={(moduleId) => setSelectedModuleId(moduleId)}
              onCanvasBackgroundClick={handleCanvasBackgroundClick}
              isEditMode={isEditMode}
              selectedObjectId={selectedModuleId}
              selectedObjectIds={selectedObjectIds}
              connectionModeForSubtaskId={connectionModeForSubtaskId}
              connectionModeSource={connectionModeSource}
              positionOverrides={positionOverrides}
              onPositionChange={isEditMode ? handlePositionChange : undefined}
            />
            </GalaxyCanvas>
          </div>
        </div>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              background: 'rgba(21, 27, 46, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '20px',
              padding: '48px',
              maxWidth: '500px',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🪐</div>
            <h2
              className="cosmic-title"
              style={{
                fontSize: '24px',
                marginBottom: '16px',
              }}
            >
              Empty Solar System
            </h2>
            <p
              className="cosmic-subtitle"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              This project has no modules yet. Create modules to populate your solar system.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Context menu (Edit always, Delete only in edit mode) */}
      {contextMenu && (
        <GalaxyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          object={contextMenu.object}
          viewType={selectedModuleId ? 'module-zoom' : 'solar-system'}
          objects={objectsToRender}
          isEditMode={isEditMode}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
          onRequestDeleteConfirm={(obj, action) => setDeleteConfirm({ object: obj, action })}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: 'rgba(21, 27, 46, 0.95)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>
              Delete {deleteConfirm.object.name}?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', fontSize: '14px' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modals from palette drop */}
      {pendingDrop?.item.entityType === 'module' && selectedProjectId && (
        <CreateModuleDialog
          open={true}
          onClose={handleCreateModalClose}
          projectId={selectedProjectId}
          initialPlanetType={pendingDrop.item.planetType}
          onSuccess={handleCreateModuleSuccess}
        />
      )}
      {pendingDrop?.item.entityType === 'task' && selectedModuleId && (
        <CreateTaskDialog
          open={true}
          onClose={handleCreateModalClose}
          moduleId={selectedModuleId}
          initialSpacecraftType={pendingDrop.item.spacecraftType}
          onSuccess={handleCreateTaskSuccess}
        />
      )}
      {pendingDrop?.item.entityType === 'subtask' && pendingDrop?.parentTaskId && (
        <CreateSubtaskDialog
          open={true}
          onClose={handleCreateModalClose}
          parentTaskId={pendingDrop.parentTaskId}
          parentTaskName={pendingDrop.parentTaskName ?? 'Task'}
          initialSatelliteType={pendingDrop.item.spacecraftType}
          onSuccess={handleCreateSubtaskSuccess}
        />
      )}

      {/* Sun Detail Card (LPM on sun) */}
      {projectDetailId && (
        <SunDetailCard
          projectId={projectDetailId}
          onClose={() => setProjectDetailId(null)}
        />
      )}

      {/* Planet Detail Card (LPM on planet) */}
      {planetDetailId && (
        <PlanetDetailCard
          moduleId={planetDetailId}
          onClose={() => setPlanetDetailId(null)}
          onZoomIn={() => {
            setPlanetDetailId(null);
            setSelectedModuleId(planetDetailId);
          }}
        />
      )}

      {/* Moon Detail Card (LPM on moon) */}
      {moonDetailId && (
        <MoonDetailCard taskId={moonDetailId} onClose={() => setMoonDetailId(null)} />
      )}

      {/* Add Dependency Popup (after click on target subtask in connection mode) */}
      {pendingPortalDependency && (
        <PortalTargetPicker
          sourceEntityId={pendingPortalDependency.sourceEntityId}
          sourceEntityType={pendingPortalDependency.sourceEntityType}
          targetModuleId={pendingPortalDependency.targetModuleId}
          targetModuleName={pendingPortalDependency.targetModuleName}
          onClose={() => setPendingPortalDependency(null)}
          onSuccess={() => {
            setPendingPortalDependency(null);
            toast.success('Cross-module dependency added');
          }}
        />
      )}

      {pendingDependency && (
        <AddDependencyPopup
          sourceEntityId={pendingDependency.sourceEntityId}
          sourceEntityType={pendingDependency.sourceEntityType}
          targetEntityId={pendingDependency.targetEntityId}
          targetEntityType={pendingDependency.targetEntityType}
          targetEntityName={pendingDependency.targetEntityName}
          onClose={() => setPendingDependency(null)}
          onSuccess={() => {
            setPendingDependency(null);
            toast.success('Dependency added');
          }}
        />
      )}

      {subtaskModalId && (
        <div
          onClick={() => setSubtaskModalId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              background: 'rgba(21, 27, 46, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SatelliteDetailPanel
              subtaskId={subtaskModalId}
              onClose={() => setSubtaskModalId(null)}
              isModal
            />
          </div>
        </div>
      )}

      {/* Edit dialogs - in-place editing without redirect */}
      {editingObject?.type === 'project' && (
        <EditProjectDialog
          open={true}
          projectId={editingObject.id}
          initialData={{
            name: editingObject.name,
            sunType: editingObject.metadata?.sunType,
          }}
          onClose={() => setEditingObject(null)}
          onSuccess={() => {
            setEditingObject(null);
            toast.success('Project updated');
          }}
        />
      )}
      {editingObject?.type === 'module' && (
        <EditModuleDialog
          open={true}
          moduleId={editingObject.id}
          initialData={{
            name: editingObject.name,
            planetType: editingObject.metadata?.planetType,
          }}
          onClose={() => setEditingObject(null)}
          onSuccess={() => {
            setEditingObject(null);
            toast.success('Module updated');
          }}
        />
      )}
      {editingObject?.type === 'task' && (
        <EditTaskDialog
          open={true}
          taskId={editingObject.id}
          initialData={{
            name: editingObject.name,
            estimatedHours: editingObject.metadata?.estimatedHours,
            priorityStars: editingObject.metadata?.priorityStars,
            spacecraftType: editingObject.metadata?.spacecraftType,
          }}
          onClose={() => setEditingObject(null)}
          onSuccess={() => {
            setEditingObject(null);
            toast.success('Task updated');
          }}
        />
      )}
      {editingObject?.type === 'subtask' && (
        <EditSubtaskDialog
          open={true}
          subtaskId={editingObject.id}
          initialData={{
            name: editingObject.name,
            estimatedHours: editingObject.metadata?.estimatedHours,
            priorityStars: editingObject.metadata?.priorityStars,
            satelliteType: editingObject.metadata?.satelliteType,
          }}
          onClose={() => setEditingObject(null)}
          onSuccess={() => {
            setEditingObject(null);
            toast.success('Subtask updated');
          }}
        />
      )}
    </div>
  );
}
