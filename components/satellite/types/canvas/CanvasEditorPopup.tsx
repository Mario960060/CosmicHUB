'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/use-auth';
import { CanvasRenderer } from './CanvasRenderer';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasShortcutsPopup } from './CanvasShortcutsPopup';
import {
  BlockContextMenu,
  LineContextMenu,
  CanvasContextMenu,
  ShapeContextMenu,
} from './CanvasContextMenu';
import { EditLabelModal } from './EditLabelModal';
import { useCanvasState } from './useCanvasState';
import { useCanvasSave } from './useCanvasSave';
import { useCanvasZoom } from './useCanvasZoom';
import { useCanvasKeyboard, type CanvasTool } from './useCanvasKeyboard';
import { screenToCanvas, getBlockAtPoint, getClosestPort } from './canvas-utils';
import { getEntityAtPoint, getClosestPortAmongEntities } from './entity-utils';
import { getShapeBoundingBox, getShapeCenter, getShapeNearPoint, getShapePortPosition, getLineSegmentAngleTowardPort, snapAngleTo15 } from './shape-utils';
import { useDrawingTools } from './tools/useDrawingTools';
import type { PortSide } from './canvas-utils';

/** Radius (canvas px) within which drop snaps to nearest port even if cursor is not on block */
const DROP_MAGNET_DIST = 70;

/** Distance within which block edges snap to align with other blocks (Obsidian-style) */
const SNAP_THRESHOLD = 8;
import type { CanvasItem } from './canvas-types';
import type { CanvasState } from './useCanvasState';

interface AssignablePerson {
  user_id: string;
  user?: { id: string; full_name: string; avatar_url?: string | null };
}

interface CanvasEditorPopupProps {
  canvas: CanvasItem;
  subtaskId: string;
  assignablePeople?: AssignablePerson[];
  onSave: (updated: CanvasItem) => void;
  onClose: () => void;
}

export function CanvasEditorPopup({
  canvas,
  subtaskId,
  assignablePeople = [],
  onSave,
  onClose,
}: CanvasEditorPopupProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [toolLocked, setToolLocked] = useState(false);
  const addBlockMode = activeTool === 'block';
  const [contextMenu, setContextMenu] = useState<
    | { type: 'block'; blockId: string; x: number; y: number }
    | { type: 'line'; connId: string; x: number; y: number }
    | { type: 'shape'; shapeId: string; x: number; y: number }
    | { type: 'canvas'; x: number; y: number }
    | null
  >(null);
  const [editLabelConnId, setEditLabelConnId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'block'; blockId: string }
    | { type: 'shape'; shapeId: string }
    | { type: 'line'; connId: string }
    | { type: 'selection' }
    | null
  >(null);

  // Connection drag: creating a NEW connection from a port (block or shape)
  const [connectionDrag, setConnectionDrag] = useState<{
    fromEntityId: string;
    fromSide: PortSide;
    clientX: number;
    clientY: number;
    pointerId: number;
  } | null>(null);

  // Connection end drag: repositioning an EXISTING connection endpoint
  const [connectionEndDrag, setConnectionEndDrag] = useState<{
    connId: string;
    whichEnd: 'from' | 'to';
    clientX: number;
    clientY: number;
    pointerId: number;
  } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [assignedTo, setAssignedTo] = useState<string | null>(canvas.assigned_to ?? null);
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  const initial: Partial<CanvasState> = {
    viewport: canvas.viewport,
    gridEnabled: canvas.gridEnabled,
    blocks: canvas.blocks as CanvasState['blocks'],
    connections: canvas.connections as CanvasState['connections'],
    shapes: (canvas.shapes ?? []) as CanvasState['shapes'],
  };

  const canvasState = useCanvasState(initial);
  const { state } = canvasState;

  useCanvasSave(
    subtaskId,
    canvas.id,
    state,
    true,
    (status) => setSaveStatus(status),
    () => ({
      name: canvas.name,
      description: canvas.description,
      assigned_to: assignedTo,
      created_by: canvas.created_by ?? null,
    })
  );

  const { handleWheel, zoomToFit, resetView, setZoom } = useCanvasZoom(
    state.viewport,
    canvasState.setViewport,
    containerRef,
    state.blocks
  );

  const [boxSelection, setBoxSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [snapGuides, setSnapGuides] = useState<{ horizontal?: number; vertical?: number } | null>(null);

  // Refs for drag state
  const panRef = useRef<{ startX: number; startY: number; startVx: number; startVy: number } | null>(null);
  const moveRef = useRef<{ blockIds: Set<string>; startPositions: Map<string, { x: number; y: number }>; lastClientX: number; lastClientY: number } | null>(null);
  const shapeMoveRef = useRef<{ shapeIds: Set<string>; startPositions: Map<string, { x: number; y: number }>; lastClientX: number; lastClientY: number } | null>(null);
  const rotationRef = useRef<{ shapeId: string; pointerId: number; startAngle: number; startRotation: number } | null>(null);
  const resizeRef = useRef<{
    shapeId: string;
    handle: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startBounds: { x: number; y: number; width: number; height: number } | { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);
  const boxRef = useRef<{ startX: number; startY: number } | null>(null);
  const pannedThisSessionRef = useRef(false);
  const lastPointerRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  const screenToCanvasFn = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return screenToCanvas(clientX, clientY, rect, state.viewport);
    },
    [state.viewport]
  );

  const drawingTools = useDrawingTools({
    addShape: canvasState.addShape,
    activeTool,
    toolLocked,
    gridEnabled: state.gridEnabled,
    onToolChange: setActiveTool,
    containerRef,
    viewport: state.viewport,
    screenToCanvas: screenToCanvasFn,
  });

  // Refs that track latest state for the window pointerup handler
  const canvasStateRef = useRef(canvasState);
  canvasStateRef.current = canvasState;
  const connectionDragRef = useRef(connectionDrag);
  connectionDragRef.current = connectionDrag;
  const connectionEndDragRef = useRef(connectionEndDrag);
  connectionEndDragRef.current = connectionEndDrag;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Close assign dropdown on outside click
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignOpen(false);
    };
    if (assignOpen) document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [assignOpen]);

  // Close context menu on left-click outside (canvas, blocks, toolbar, etc.)
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as Element)?.closest?.('[data-context-menu]')) return;
      close();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('click', close);
    };
  }, [contextMenu]);

  const handleRequestDeleteSelection = useCallback(() => {
    const hasSelection =
      canvasState.selectedBlockIds.size > 0 ||
      canvasState.selectedConnectionIds.size > 0 ||
      canvasState.selectedShapeIds.size > 0;
    if (hasSelection) setPendingDelete({ type: 'selection' });
  }, [canvasState.selectedBlockIds.size, canvasState.selectedConnectionIds.size, canvasState.selectedShapeIds.size]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'block') {
      canvasState.deleteBlock(pendingDelete.blockId);
    } else if (pendingDelete.type === 'shape') {
      canvasState.deleteShape(pendingDelete.shapeId);
    } else if (pendingDelete.type === 'line') {
      canvasState.deleteConnection(pendingDelete.connId);
    } else {
      canvasState.deleteSelected();
    }
    setPendingDelete(null);
    setContextMenu(null);
  }, [pendingDelete, canvasState]);

  useCanvasKeyboard({
    onAddBlock: () => setActiveTool('block'),
    onToolChange: (t) => setActiveTool(t),
    onToolLockToggle: () => setToolLocked((v) => !v),
    activeTool,
    toolLocked,
    onDelete: handleRequestDeleteSelection,
    onDuplicate: canvasState.duplicate,
    onSelectAll: canvasState.selectAll,
    onUndo: canvasState.undo,
    onRedo: canvasState.redo,
    onCopy: canvasState.copy,
    onPaste: (x, y) => canvasState.paste(x, y),
    onZoomFit: zoomToFit,
    onResetView: resetView,
    onGridToggle: () => canvasState.setGridEnabled(!state.gridEnabled),
    onDeselect: canvasState.deselectAll,
    hasSelection:
      canvasState.selectedBlockIds.size > 0 ||
      canvasState.selectedConnectionIds.size > 0 ||
      canvasState.selectedShapeIds.size > 0,
    hasCopiedBlocks: canvasState.copiedBlocksCount > 0,
    containerRef,
  });

  // === BACKGROUND POINTER DOWN ===
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('.canvas-block') || (e.target as HTMLElement).closest('svg g')) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, state.viewport);

      if (addBlockMode) {
        canvasState.addBlock(canvasCoords.x, canvasCoords.y);
        if (!toolLocked) setActiveTool('select');
        return;
      }

      // Right-click: do nothing (context menu handled separately)
      if (e.button === 2) return;

      // Left-click on background
      if (e.button === 0) {
        e.preventDefault();
        const isDrawingTool =
          activeTool === 'line' ||
          activeTool === 'arrow' ||
          activeTool === 'rect' ||
          activeTool === 'ellipse' ||
          activeTool === 'triangle' ||
          activeTool === 'diamond' ||
          activeTool === 'freehand';

        if (isDrawingTool) {
          drawingTools.handlePointerDown(e);
          return;
        }

        const modKey = e.ctrlKey || e.metaKey;
        if (modKey) {
          canvasState.deselectAll();
          boxRef.current = { startX: canvasCoords.x, startY: canvasCoords.y };
          setBoxSelection({ x1: canvasCoords.x, y1: canvasCoords.y, x2: canvasCoords.x, y2: canvasCoords.y });
        } else {
          const near = getShapeNearPoint(state.shapes, canvasCoords.x, canvasCoords.y, 20);
          if (near) {
            canvasState.selectShape(near.shape.id, e.shiftKey);
            const ids = canvasState.selectedShapeIds.has(near.shape.id) ? canvasState.selectedShapeIds : new Set([near.shape.id]);
            shapeMoveRef.current = {
              shapeIds: ids,
              startPositions: new Map(),
              lastClientX: e.clientX,
              lastClientY: e.clientY,
            };
          } else {
            pannedThisSessionRef.current = false;
            panRef.current = { startX: e.clientX, startY: e.clientY, startVx: state.viewport.x, startVy: state.viewport.y };
            setIsPanning(true);
          }
        }
        return;
      }
    },
    [addBlockMode, toolLocked, activeTool, state.viewport, state.shapes, canvasState, drawingTools]
  );

  // === BLOCK POINTER DOWN ===
  const handleBlockPointerDown = useCallback(
    (e: React.PointerEvent, target: 'body' | PortSide, blockId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (target === 'body') {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block) return;
        if (!canvasState.selectedBlockIds.has(blockId)) {
          canvasState.selectBlock(blockId, e.shiftKey);
        }
        const ids = canvasState.selectedBlockIds.has(blockId) ? canvasState.selectedBlockIds : new Set([blockId]);
        moveRef.current = { blockIds: ids, startPositions: new Map(), lastClientX: e.clientX, lastClientY: e.clientY };
      } else {
        // Port drag - start new connection
        setConnectionDrag({ fromEntityId: blockId, fromSide: target, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
      }
    },
    [state.blocks, canvasState]
  );

  // === BLOCK RESIZE ===
  const handleBlockResizeStart = useCallback(
    (blockId: string, e: React.PointerEvent) => {
      e.stopPropagation();
      const block = state.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = block.width;
      const startH = block.height;
      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) / state.viewport.zoom;
        const dy = (ev.clientY - startY) / state.viewport.zoom;
        canvasState.resizeBlock(blockId, startW + dx, startH + dy);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [state.blocks, state.viewport.zoom, canvasState]
  );

  // === CONNECTION POINTER DOWN (repositioning existing connection) ===
  const handleConnectionPointerDown = useCallback(
    (connId: string, whichEnd: 'from' | 'to', e: React.PointerEvent) => {
      e.stopPropagation();
      canvasState.selectConnection(connId);
      setConnectionEndDrag({ connId, whichEnd, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
    },
    [canvasState]
  );

  // === POINTER MOVE (on the canvas container) ===
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };

      if (drawingTools.isDrawing) {
        drawingTools.handlePointerMove(e);
        return;
      }

      // Update connection end drag position
      if (connectionEndDrag) {
        setConnectionEndDrag((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null));
        return;
      }

      // Update connection drag position
      if (connectionDrag) {
        setConnectionDrag((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null));
        return;
      }

      // Resize shape
      if (resizeRef.current && resizeRef.current.pointerId === e.pointerId) {
        const res = resizeRef.current;
        const shape = state.shapes.find((s) => s.id === res.shapeId);
        if (!shape) return;
        const dx = (e.clientX - res.startClientX) / state.viewport.zoom;
        const dy = (e.clientY - res.startClientY) / state.viewport.zoom;
        const grid = state.gridEnabled ? 24 : 1;
        const snap = (v: number) => (grid > 1 ? Math.round(v / grid) * grid : v);

        if (shape.type === 'line' || shape.type === 'arrow') {
          const sb = res.startBounds as { x1: number; y1: number; x2: number; y2: number };
          let newBounds = res.startBounds;
          if (res.handle === 'start') {
            const x1 = snap(sb.x1 + dx), y1 = snap(sb.y1 + dy);
            canvasState.resizeShape(res.shapeId, { x1, y1, x2: sb.x2, y2: sb.y2 });
            newBounds = { x1, y1, x2: sb.x2, y2: sb.y2 };
          } else {
            const x2 = snap(sb.x2 + dx), y2 = snap(sb.y2 + dy);
            canvasState.resizeShape(res.shapeId, { x1: sb.x1, y1: sb.y1, x2, y2 });
            newBounds = { x1: sb.x1, y1: sb.y1, x2, y2 };
          }
          resizeRef.current = { ...res, startClientX: e.clientX, startClientY: e.clientY, startBounds: newBounds };
        } else {
          const sb = res.startBounds as { x: number; y: number; width: number; height: number };
          const MIN = 10;
          let x = sb.x, y = sb.y, w = sb.width, h = sb.height;
          switch (res.handle) {
            case 'nw':
              x = sb.x + dx; y = sb.y + dy; w = Math.max(MIN, sb.width - dx); h = Math.max(MIN, sb.height - dy);
              break;
            case 'n':
              y = sb.y + dy; h = Math.max(MIN, sb.height - dy);
              break;
            case 'ne':
              y = sb.y + dy; w = Math.max(MIN, sb.width + dx); h = Math.max(MIN, sb.height - dy);
              break;
            case 'e':
              w = Math.max(MIN, sb.width + dx);
              break;
            case 'se':
              w = Math.max(MIN, sb.width + dx); h = Math.max(MIN, sb.height + dy);
              break;
            case 's':
              h = Math.max(MIN, sb.height + dy);
              break;
            case 'sw':
              x = sb.x + dx; w = Math.max(MIN, sb.width - dx); h = Math.max(MIN, sb.height + dy);
              break;
            case 'w':
              x = sb.x + dx; w = Math.max(MIN, sb.width - dx);
              break;
            case 'top':
              y = sb.y + dy; h = Math.max(MIN, sb.height - dy);
              break;
            case 'left':
              x = sb.x + dx; w = Math.max(MIN, sb.width - dx); h = Math.max(MIN, sb.height + dy);
              break;
            case 'right':
              w = Math.max(MIN, sb.width + dx); h = Math.max(MIN, sb.height + dy);
              break;
            case 'bottom':
              h = Math.max(MIN, sb.height + dy);
              break;
            default:
              return;
          }
          const newBounds = { x: snap(x), y: snap(y), width: snap(w), height: snap(h) };
          canvasState.resizeShape(res.shapeId, newBounds);
          resizeRef.current = { ...res, startClientX: e.clientX, startClientY: e.clientY, startBounds: newBounds };
        }
        return;
      }

      // Rotation
      if (rotationRef.current && rotationRef.current.pointerId === e.pointerId) {
        const rot = rotationRef.current;
        const shape = state.shapes.find((s) => s.id === rot.shapeId);
        if (!shape || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const center = getShapeCenter(shape);
        const centerScreen = {
          x: rect.left + state.viewport.x + center.x * state.viewport.zoom,
          y: rect.top + state.viewport.y + center.y * state.viewport.zoom,
        };
        const currentAngle = (Math.atan2(e.clientY - centerScreen.y, e.clientX - centerScreen.x) * 180) / Math.PI;
        let deltaAngle = currentAngle - rot.startAngle;
        let newRotation = rot.startRotation + deltaAngle;
        if (e.shiftKey) newRotation = snapAngleTo15(newRotation);
        newRotation = ((newRotation % 360) + 360) % 360;
        canvasState.rotateShape(rot.shapeId, newRotation);
        return;
      }

      // Pan with left-click drag
      if (panRef.current) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pannedThisSessionRef.current = true;
        canvasState.setViewport({ x: panRef.current.startVx + dx, y: panRef.current.startVy + dy });
        return;
      }

      // Box selection
      if (boxRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, state.viewport);
        setBoxSelection((prev) =>
          prev
            ? { ...prev, x2: canvasCoords.x, y2: canvasCoords.y }
            : { x1: boxRef.current!.startX, y1: boxRef.current!.startY, x2: canvasCoords.x, y2: canvasCoords.y }
        );
        return;
      }

      // Move shapes with snap-to-edge alignment guides
      if (shapeMoveRef.current) {
        let dx = (e.clientX - shapeMoveRef.current.lastClientX) / state.viewport.zoom;
        let dy = (e.clientY - shapeMoveRef.current.lastClientY) / state.viewport.zoom;
        const grid = state.gridEnabled ? 24 : 1;
        const snapDelta = (v: number) => (grid > 1 ? Math.round(v / grid) * grid : v);
        dx = snapDelta(dx);
        dy = snapDelta(dy);
        const shapeIds = shapeMoveRef.current.shapeIds;
        const primaryId = shapeIds.values().next().value;
        const primaryShape = primaryId ? state.shapes.find((s) => s.id === primaryId) : null;
        const othersBlocks = state.blocks;
        const othersShapes = state.shapes.filter((s) => !shapeIds.has(s.id));
        let guideVertical: number | undefined;
        let guideHorizontal: number | undefined;

        if (primaryShape) {
          const bbox = getShapeBoundingBox(primaryShape);
          const newX = bbox.x + dx;
          const newY = bbox.y + dy;
          const newRight = newX + bbox.width;
          const newBottom = newY + bbox.height;

          for (const b of othersBlocks) {
            const bRight = b.x + b.width;
            const bBottom = b.y + b.height;
            if (Math.abs(newX - b.x) < SNAP_THRESHOLD) { dx = b.x - bbox.x; guideVertical = b.x; break; }
            if (Math.abs(newX - bRight) < SNAP_THRESHOLD) { dx = bRight - bbox.x; guideVertical = bRight; break; }
            if (Math.abs(newRight - b.x) < SNAP_THRESHOLD) { dx = b.x - bbox.x - bbox.width; guideVertical = b.x; break; }
            if (Math.abs(newRight - bRight) < SNAP_THRESHOLD) { dx = bRight - bbox.x - bbox.width; guideVertical = bRight; break; }
          }
          if (guideVertical == null) {
            for (const s of othersShapes) {
              const sb = getShapeBoundingBox(s);
              const sRight = sb.x + sb.width;
              const sBottom = sb.y + sb.height;
              if (Math.abs(newX - sb.x) < SNAP_THRESHOLD) { dx = sb.x - bbox.x; guideVertical = sb.x; break; }
              if (Math.abs(newX - sRight) < SNAP_THRESHOLD) { dx = sRight - bbox.x; guideVertical = sRight; break; }
              if (Math.abs(newRight - sb.x) < SNAP_THRESHOLD) { dx = sb.x - bbox.x - bbox.width; guideVertical = sb.x; break; }
              if (Math.abs(newRight - sRight) < SNAP_THRESHOLD) { dx = sRight - bbox.x - bbox.width; guideVertical = sRight; break; }
            }
          }
          for (const b of othersBlocks) {
            const bBottom = b.y + b.height;
            if (Math.abs(newY - b.y) < SNAP_THRESHOLD) { dy = b.y - bbox.y; guideHorizontal = b.y; break; }
            if (Math.abs(newY - bBottom) < SNAP_THRESHOLD) { dy = bBottom - bbox.y; guideHorizontal = bBottom; break; }
            if (Math.abs(newBottom - b.y) < SNAP_THRESHOLD) { dy = b.y - bbox.y - bbox.height; guideHorizontal = b.y; break; }
            if (Math.abs(newBottom - bBottom) < SNAP_THRESHOLD) { dy = bBottom - bbox.y - bbox.height; guideHorizontal = bBottom; break; }
          }
          if (guideHorizontal == null) {
            for (const s of othersShapes) {
              const sb = getShapeBoundingBox(s);
              const sBottom = sb.y + sb.height;
              if (Math.abs(newY - sb.y) < SNAP_THRESHOLD) { dy = sb.y - bbox.y; guideHorizontal = sb.y; break; }
              if (Math.abs(newY - sBottom) < SNAP_THRESHOLD) { dy = sBottom - bbox.y; guideHorizontal = sBottom; break; }
              if (Math.abs(newBottom - sb.y) < SNAP_THRESHOLD) { dy = sb.y - bbox.y - bbox.height; guideHorizontal = sb.y; break; }
              if (Math.abs(newBottom - sBottom) < SNAP_THRESHOLD) { dy = sBottom - bbox.y - bbox.height; guideHorizontal = sBottom; break; }
            }
          }
          setSnapGuides(guideVertical != null || guideHorizontal != null ? { horizontal: guideHorizontal, vertical: guideVertical } : null);
        } else {
          setSnapGuides(null);
        }

        canvasState.moveShapes(shapeIds, dx, dy);
        shapeMoveRef.current = { ...shapeMoveRef.current, lastClientX: e.clientX, lastClientY: e.clientY };
        return;
      }

      // Move blocks with snap-to-edge alignment guides
      if (moveRef.current) {
        let dx = (e.clientX - moveRef.current.lastClientX) / state.viewport.zoom;
        let dy = (e.clientY - moveRef.current.lastClientY) / state.viewport.zoom;
        const grid = state.gridEnabled ? 24 : 1;
        const snapDelta = (v: number) => (grid > 1 ? Math.round(v / grid) * grid : v);
        dx = snapDelta(dx);
        dy = snapDelta(dy);
        const ids = moveRef.current.blockIds;
        const blocks = state.blocks;
        const primaryId = ids.values().next().value;
        const primary = primaryId ? blocks.find((b) => b.id === primaryId) : null;
        const others = blocks.filter((b) => !ids.has(b.id));
        let guideVertical: number | undefined;
        let guideHorizontal: number | undefined;

        if (primary && others.length > 0) {
          const newX = primary.x + dx;
          const newY = primary.y + dy;
          const newRight = newX + primary.width;
          const newBottom = newY + primary.height;

          for (const b of others) {
            const bRight = b.x + b.width;
            const bBottom = b.y + b.height;
            if (Math.abs(newX - b.x) < SNAP_THRESHOLD) { dx = b.x - primary.x; guideVertical = b.x; break; }
            if (Math.abs(newX - bRight) < SNAP_THRESHOLD) { dx = bRight - primary.x; guideVertical = bRight; break; }
            if (Math.abs(newRight - b.x) < SNAP_THRESHOLD) { dx = b.x - primary.x - primary.width; guideVertical = b.x; break; }
            if (Math.abs(newRight - bRight) < SNAP_THRESHOLD) { dx = bRight - primary.x - primary.width; guideVertical = bRight; break; }
          }
          for (const b of others) {
            const bBottom = b.y + b.height;
            if (Math.abs(newY - b.y) < SNAP_THRESHOLD) { dy = b.y - primary.y; guideHorizontal = b.y; break; }
            if (Math.abs(newY - bBottom) < SNAP_THRESHOLD) { dy = bBottom - primary.y; guideHorizontal = bBottom; break; }
            if (Math.abs(newBottom - b.y) < SNAP_THRESHOLD) { dy = b.y - primary.y - primary.height; guideHorizontal = b.y; break; }
            if (Math.abs(newBottom - bBottom) < SNAP_THRESHOLD) { dy = bBottom - primary.y - primary.height; guideHorizontal = bBottom; break; }
          }
          setSnapGuides(guideVertical != null || guideHorizontal != null ? { horizontal: guideHorizontal, vertical: guideVertical } : null);
        } else {
          setSnapGuides(null);
        }

        canvasState.moveBlocks(ids, dx, dy);
        moveRef.current = { ...moveRef.current, lastClientX: e.clientX, lastClientY: e.clientY };
      }
    },
    [connectionDrag, connectionEndDrag, state.viewport, state.blocks, state.shapes, canvasState, drawingTools]
  );

  // === POINTER UP on the transform div ===
  // This handles box selection and block movement.
  // Connection creation/repositioning is handled by the window listener below.
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (drawingTools.isDrawing) {
        drawingTools.handlePointerUp(e);
        return;
      }

      // Connection drags are handled by the window listener - just release capture
      if (connectionEndDrag || connectionDrag) {
        return;
      }

      // Box selection complete
      if (boxRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, state.viewport);
        const minX = Math.min(boxRef.current.startX, canvasCoords.x);
        const minY = Math.min(boxRef.current.startY, canvasCoords.y);
        const maxX = Math.max(boxRef.current.startX, canvasCoords.x);
        const maxY = Math.max(boxRef.current.startY, canvasCoords.y);
        const ids = new Set(
          state.blocks.filter((b) => {
            const blockRight = b.x + b.width;
            const blockBottom = b.y + b.height;
            return b.x < maxX && blockRight > minX && b.y < maxY && blockBottom > minY;
          }).map((b) => b.id)
        );
        if (ids.size > 0) canvasState.selectBlocks(ids);
        boxRef.current = null;
        setBoxSelection(null);
      }
      if (panRef.current && !pannedThisSessionRef.current) {
        canvasState.deselectAll();
      }
      panRef.current = null;
      setIsPanning(false);
      moveRef.current = null;
      shapeMoveRef.current = null;
      rotationRef.current = null;
      resizeRef.current = null;
      setSnapGuides(null);
    },
    [connectionDrag, connectionEndDrag, state.viewport, state.blocks, canvasState, drawingTools]
  );

  // === WINDOW POINTER MOVE for connection drags, rotation, resize ===
  // Ensures we always receive pointermove even when cursor is over connection <g> elements.
  useEffect(() => {
    const active = connectionDrag || connectionEndDrag;
    if (!active) return;

    const onWindowPointerMove = (e: PointerEvent) => {
      const drag = connectionDragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        setConnectionDrag((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null));
      }
      const endDrag = connectionEndDragRef.current;
      if (endDrag && endDrag.pointerId === e.pointerId) {
        setConnectionEndDrag((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null));
      }
    };
    window.addEventListener('pointermove', onWindowPointerMove);
    return () => window.removeEventListener('pointermove', onWindowPointerMove);
  }, [connectionDrag, connectionEndDrag]);

  // === WINDOW POINTER UP / POINTER CANCEL ===
  // Catches ALL pointer releases and cancellations. Clears drag state and releases capture.
  useEffect(() => {
    const clearDragState = () => {
      setConnectionDrag(null);
      setConnectionEndDrag(null);
      panRef.current = null;
      setIsPanning(false);
      moveRef.current = null;
      shapeMoveRef.current = null;
      rotationRef.current = null;
      resizeRef.current = null;
      boxRef.current = null;
      setBoxSelection(null);
      setSnapGuides(null);
    };

    const onWindowPointerEnd = (e: PointerEvent) => {
      // Handle rotation end
      if (rotationRef.current && rotationRef.current.pointerId === e.pointerId) {
        try {
          (e.target as Element)?.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        rotationRef.current = null;
        return;
      }

      // Handle resize end
      if (resizeRef.current && resizeRef.current.pointerId === e.pointerId) {
        try {
          (e.target as Element)?.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        resizeRef.current = null;
        return;
      }

      // Handle new connection creation
      const drag = connectionDragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        e.preventDefault();
        e.stopPropagation();
        try {
          (e.target as Element)?.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        if (containerRef.current) {
          const s = stateRef.current;
          const rect = containerRef.current.getBoundingClientRect();
          const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, s.viewport);
          const closest = getClosestPortAmongEntities(s.blocks, s.shapes, canvasCoords, drag.fromEntityId);
          if (closest && closest.dist < DROP_MAGNET_DIST && closest.entity.id !== drag.fromEntityId) {
            canvasStateRef.current.addConnection(drag.fromEntityId, closest.entity.id, drag.fromSide, closest.side);
          }
        }
        clearDragState();
        return;
      }

      // Handle existing connection repositioning
      const endDrag = connectionEndDragRef.current;
      if (endDrag && endDrag.pointerId === e.pointerId) {
        e.preventDefault();
        e.stopPropagation();
        try {
          (e.target as Element)?.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        if (containerRef.current) {
          const s = stateRef.current;
          const conn = s.connections.find((c) => c.id === endDrag.connId);
          if (conn) {
            const rect = containerRef.current.getBoundingClientRect();
            const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, s.viewport);
            const excludeId = endDrag.whichEnd === 'from' ? conn.to.entityId : conn.from.entityId;
            let targetEntity = getEntityAtPoint(s.blocks, s.shapes, canvasCoords.x, canvasCoords.y);
            let port: PortSide | null = targetEntity ? getClosestPortAmongEntities(s.blocks, s.shapes, canvasCoords, excludeId)?.side ?? null : null;
            if (!targetEntity) {
              const closest = getClosestPortAmongEntities(s.blocks, s.shapes, canvasCoords, excludeId);
              if (closest && closest.dist < DROP_MAGNET_DIST) {
                targetEntity = closest.entity;
                port = closest.side;
              }
            }
            if (targetEntity && port) {
              if (endDrag.whichEnd === 'from' && targetEntity.id !== conn.to.entityId) {
                if (targetEntity.id === conn.from.entityId) {
                  canvasStateRef.current.updateConnection(endDrag.connId, { from: { ...conn.from, side: port } });
                } else {
                  canvasStateRef.current.updateConnection(endDrag.connId, { from: { entityId: targetEntity.id, side: port } });
                }
              } else if (endDrag.whichEnd === 'to' && targetEntity.id !== conn.from.entityId) {
                if (targetEntity.id === conn.to.entityId) {
                  canvasStateRef.current.updateConnection(endDrag.connId, { to: { ...conn.to, side: port } });
                } else {
                  canvasStateRef.current.updateConnection(endDrag.connId, { to: { entityId: targetEntity.id, side: port } });
                }
              }
            }
          }
        }
        clearDragState();
        return;
      }

      // pointercancel without matching drag - still clear if we had stale state (e.g. pointer left window)
      if (e.type === 'pointercancel' && (connectionDragRef.current || connectionEndDragRef.current)) {
        clearDragState();
        return;
      }

      // Handle box selection via window (fallback)
      if (boxRef.current && containerRef.current) {
        const s = stateRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        const coords = screenToCanvas(e.clientX, e.clientY, rect, s.viewport);
        const minX = Math.min(boxRef.current.startX, coords.x);
        const minY = Math.min(boxRef.current.startY, coords.y);
        const maxX = Math.max(boxRef.current.startX, coords.x);
        const maxY = Math.max(boxRef.current.startY, coords.y);
        const ids = new Set(
          s.blocks.filter((b) => {
            const blockRight = b.x + b.width;
            const blockBottom = b.y + b.height;
            return b.x < maxX && blockRight > minX && b.y < maxY && blockBottom > minY;
          }).map((b) => b.id)
        );
        if (ids.size > 0) canvasStateRef.current.selectBlocks(ids);
        boxRef.current = null;
        setBoxSelection(null);
      }
      if (panRef.current && !pannedThisSessionRef.current) {
        canvasStateRef.current.deselectAll();
      }
      panRef.current = null;
      moveRef.current = null;
    };

    window.addEventListener('pointerup', onWindowPointerEnd);
    window.addEventListener('pointercancel', onWindowPointerEnd);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerEnd);
      window.removeEventListener('pointercancel', onWindowPointerEnd);
    };
  }, []);

  const getAssignedName = (uid: string | null) => {
    if (!uid) return null;
    const m = assignablePeople.find((p) => p.user_id === uid || p.user?.id === uid);
    return m?.user?.full_name ?? null;
  };

  const handleAssignedChange = useCallback(
    (uid: string | null) => {
      setAssignedTo(uid);
      setAssignOpen(false);
      const updated: CanvasItem = {
        ...canvas,
        assigned_to: uid,
        viewport: state.viewport,
        gridEnabled: state.gridEnabled,
        blocks: state.blocks,
        connections: state.connections,
        shapes: state.shapes,
      };
      onSave(updated);
      if (uid && canvas.assigned_to !== uid && user) {
        const supabase = createClient();
        void supabase.rpc('create_notification', {
          p_user_id: uid,
          p_type: 'assignment',
          p_title: 'Assigned to canvas',
          p_message: `You were assigned to a canvas: ${(canvas.name || 'Untitled').trim() || 'Untitled'}`,
          p_related_id: subtaskId,
          p_related_type: 'subtask',
          p_actor_id: user.id,
        });
      }
    },
    [canvas, state, onSave, subtaskId, user]
  );

  const handleClose = () => {
    const updated: CanvasItem = {
      ...canvas,
      assigned_to: assignedTo,
      viewport: state.viewport,
      gridEnabled: state.gridEnabled,
      blocks: state.blocks,
      connections: state.connections,
      shapes: state.shapes,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: '95vw',
          width: '100%',
          height: '90vh',
          borderRadius: 14,
          overflow: 'hidden',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'rgba(249,115,22,0.2)',
          boxShadow: '0 0 80px rgba(0,0,0,0.5), 0 0 30px rgba(249,115,22,0.03)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a1628',
        }}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('.canvas-block') || (e.target as HTMLElement).closest('svg g')) return;
          e.preventDefault();
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect, state.viewport);
            setContextMenu({ type: 'canvas', x: e.clientX, y: e.clientY });
          }
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            background: 'rgba(8,14,28,0.95)',
            borderBottom: '1px solid rgba(249,115,22,0.12)',
            flexShrink: 0,
            zIndex: 100,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.88)',
              }}
            >
              {canvas.name}
            </div>
            <div
              style={{
                padding: '3px 8px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase' as const,
                borderRadius: 5,
                background: 'rgba(249,115,22,0.08)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(249,115,22,0.2)',
                color: '#f97316',
              }}
            >
              CANVAS
            </div>
            {/* Assign dropdown */}
            <div ref={assignRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAssignOpen(!assignOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: 'rgba(0,0,0,0.3)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'rgba(249,115,22,0.3)',
                  borderRadius: 6,
                  color: assignedTo ? '#f97316' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'Exo 2, sans-serif',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <User size={11} />
                {assignedTo ? (getAssignedName(assignedTo) ?? 'Assigned') : 'Unassigned'}
                <ChevronDown size={11} style={{ opacity: 0.7 }} />
              </button>
              {assignOpen && (
                <div
                  className="scrollbar-cosmic"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    minWidth: 160,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: '#0d1117',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'rgba(249,115,22,0.3)',
                    borderRadius: 8,
                    zIndex: 9999,
                    padding: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleAssignedChange(null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left' as const,
                      background: !assignedTo ? 'rgba(249,115,22,0.25)' : '#161b22',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Unassigned
                  </button>
                  {assignablePeople.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => handleAssignedChange(m.user_id)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left' as const,
                        background: assignedTo === m.user_id ? 'rgba(249,115,22,0.25)' : '#161b22',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {m.user?.full_name ?? m.user_id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Auto-saved ✓' : ''}
            </span>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '5px 14px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <CanvasToolbar
            zoom={state.viewport.zoom}
            gridEnabled={state.gridEnabled}
            canUndo={canvasState.canUndo}
            canRedo={canvasState.canRedo}
            activeTool={activeTool}
            toolLocked={toolLocked}
            onToolChange={(t) => setActiveTool(t)}
            onToolLockToggle={() => setToolLocked((v) => !v)}
            onAddBlock={() => setActiveTool('block')}
            onUndo={canvasState.undo}
            onRedo={canvasState.redo}
            onZoomChange={setZoom}
            onZoomFit={zoomToFit}
            onGridToggle={() => canvasState.setGridEnabled(!state.gridEnabled)}
            onShortcutsClick={() => setShortcutsOpen(true)}
          />

          <div
            style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
            onContextMenu={(e) => {
              if ((e.target as HTMLElement).closest('.canvas-block') || (e.target as HTMLElement).closest('svg g')) return;
              e.preventDefault();
              setContextMenu({ type: 'canvas', x: e.clientX, y: e.clientY });
            }}
          >
            <CanvasRenderer
              blocks={state.blocks}
              connections={state.connections}
              shapes={state.shapes}
              viewport={state.viewport}
              gridEnabled={state.gridEnabled}
              selectedBlockIds={canvasState.selectedBlockIds}
              selectedConnectionIds={canvasState.selectedConnectionIds}
              selectedShapeIds={canvasState.selectedShapeIds}
              editingBlockId={canvasState.editingBlockId}
              addBlockMode={addBlockMode}
              isPanning={isPanning}
              connectionDrag={connectionDrag}
              connectionEndDrag={connectionEndDrag}
              boxSelection={boxSelection}
              snapGuides={snapGuides}
              containerRef={containerRef}
              onBlockPointerDown={handleBlockPointerDown}
              onBlockDoubleClick={(id) => canvasState.setEditingBlockId(id)}
              onBlockTextChange={(id, text) => canvasState.updateBlockText(id, text)}
              onBlockResizeStart={handleBlockResizeStart}
              onConnectionClick={(id) => canvasState.selectConnection(id)}
              onConnectionContextMenu={(id, e) => {
                e.preventDefault();
                canvasState.selectConnection(id);
                setContextMenu({ type: 'line', connId: id, x: e.clientX, y: e.clientY });
              }}
              onBackgroundPointerDown={handleBackgroundPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onConnectionPointerDown={handleConnectionPointerDown}
              onBlockContextMenu={(blockId, e) => {
                e.preventDefault();
                canvasState.selectBlock(blockId);
                setContextMenu({ type: 'block', blockId, x: e.clientX, y: e.clientY });
              }}
              onShapePointerDown={(shapeId, e) => {
                e.stopPropagation();
                canvasState.selectShape(shapeId, e.shiftKey);
                shapeMoveRef.current = {
                  shapeIds: canvasState.selectedShapeIds.has(shapeId) ? canvasState.selectedShapeIds : new Set([shapeId]),
                  startPositions: new Map(),
                  lastClientX: e.clientX,
                  lastClientY: e.clientY,
                };
              }}
              onShapeContextMenu={(shapeId, e) => {
                e.preventDefault();
                canvasState.selectShape(shapeId);
                setContextMenu({ type: 'shape', shapeId, x: e.clientX, y: e.clientY });
              }}
              onShapeResizeStart={(shapeId, handle, e) => {
                e.stopPropagation();
                e.preventDefault();
                canvasState.pushUndo();
                const shape = state.shapes.find((s) => s.id === shapeId);
                if (!shape || !containerRef.current) return;
                const bbox = getShapeBoundingBox(shape);
                const bounds = shape.type === 'line' || shape.type === 'arrow'
                  ? { x1: shape.x1 ?? 0, y1: shape.y1 ?? 0, x2: shape.x2 ?? 0, y2: shape.y2 ?? 0 }
                  : { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
                resizeRef.current = {
                  shapeId,
                  handle,
                  pointerId: e.pointerId,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startBounds: bounds,
                };
                try {
                  (e.target as Element)?.setPointerCapture?.(e.pointerId);
                } catch {
                  /* ignore */
                }
              }}
              onShapeRotateStart={(shapeId, e) => {
                e.stopPropagation();
                e.preventDefault();
                canvasState.pushUndo();
                const shape = state.shapes.find((s) => s.id === shapeId);
                if (!shape || !containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const center = getShapeCenter(shape);
                const centerScreen = {
                  x: rect.left + state.viewport.x + center.x * state.viewport.zoom,
                  y: rect.top + state.viewport.y + center.y * state.viewport.zoom,
                };
                const startAngle = (Math.atan2(e.clientY - centerScreen.y, e.clientX - centerScreen.x) * 180) / Math.PI;
                rotationRef.current = {
                  shapeId,
                  pointerId: e.pointerId,
                  startAngle,
                  startRotation: shape.rotation ?? 0,
                };
                try {
                  (e.target as Element)?.setPointerCapture?.(e.pointerId);
                } catch {
                  /* ignore */
                }
              }}
              onShapePortPointerDown={(shapeId, side, e) => {
                e.stopPropagation();
                const shape = state.shapes.find((s) => s.id === shapeId);
                if (shape && (shape.type === 'line' || shape.type === 'arrow')) {
                  const pos = getShapePortPosition(shape, side);
                  const angleRad = getLineSegmentAngleTowardPort(shape, side);
                  const angleDeg = angleRad * (180 / Math.PI);
                  drawingTools.startFromPoint(pos.x, pos.y, angleDeg, shape.type);
                  try {
                    (e.target as Element)?.setPointerCapture?.(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                } else {
                  setConnectionDrag({ fromEntityId: shapeId, fromSide: side, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
                }
              }}
              drawPreview={drawingTools.preview}
              angleIndicator={drawingTools.angleIndicator}
              onWheel={handleWheel}
            />
            {drawingTools.angleIndicator && (
              <div
                style={{
                  position: 'absolute',
                  left: lastPointerRef.current.clientX + 12,
                  top: lastPointerRef.current.clientY + 12,
                  padding: '4px 10px',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#f97316',
                  background: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(249,115,22,0.4)',
                  borderRadius: 8,
                  pointerEvents: 'none',
                  zIndex: 2000,
                }}
              >
                {drawingTools.angleIndicator.angle}° · {drawingTools.angleIndicator.length}px
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context menus - close on window click (like Galaktyka, no overlay so first click reaches canvas) */}
      {contextMenu?.type === 'block' && (() => {
        const block = state.blocks.find((b) => b.id === contextMenu.blockId);
        if (!block) return null;
        return (
          <BlockContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            blockColor={block.color}
            blockFontColor={block.fontColor}
            onEditText={() => { canvasState.setEditingBlockId(contextMenu.blockId); setContextMenu(null); }}
            onColorChange={(c) => { canvasState.updateBlockColor(contextMenu.blockId, c); setContextMenu(null); }}
            onFontColorChange={(c) => { canvasState.updateBlockFontColor(contextMenu.blockId, c); setContextMenu(null); }}
            onFontSize={(s) => { canvasState.updateBlockFontSize(contextMenu.blockId, s); setContextMenu(null); }}
            onDuplicate={() => { canvasState.duplicate(); setContextMenu(null); }}
            onDelete={() => { setPendingDelete({ type: 'block', blockId: contextMenu.blockId }); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}
      {contextMenu?.type === 'shape' && (() => {
        const shape = state.shapes.find((s) => s.id === contextMenu.shapeId);
        if (!shape) return null;
        return (
          <ShapeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            shape={shape}
            onStrokeColor={(c) => { canvasState.updateShape(contextMenu.shapeId, { stroke: { ...shape.stroke, color: c } }); setContextMenu(null); }}
            onStrokeWidth={(w) => { canvasState.updateShape(contextMenu.shapeId, { stroke: { ...shape.stroke, width: w } }); setContextMenu(null); }}
            onStrokeStyle={(style) => { canvasState.updateShape(contextMenu.shapeId, { stroke: { ...shape.stroke, style } }); setContextMenu(null); }}
            onFill={(fill) => { canvasState.updateShape(contextMenu.shapeId, { fill: fill ?? undefined }); setContextMenu(null); }}
            onCornerRadius={shape.type === 'rectangle' ? (r) => { canvasState.updateShape(contextMenu.shapeId, { cornerRadius: r }); setContextMenu(null); } : undefined}
            onArrowStart={(shape.type === 'line' || shape.type === 'arrow') ? (v) => { canvasState.updateShape(contextMenu.shapeId, { arrowStart: v }); setContextMenu(null); } : undefined}
            onArrowEnd={(shape.type === 'line' || shape.type === 'arrow') ? (v) => { canvasState.updateShape(contextMenu.shapeId, { arrowEnd: v }); setContextMenu(null); } : undefined}
            onDuplicate={() => { canvasState.selectShape(contextMenu.shapeId); canvasState.duplicate(); setContextMenu(null); }}
            onBringToFront={() => { canvasState.bringShapeToFront(contextMenu.shapeId); setContextMenu(null); }}
            onSendToBack={() => { canvasState.sendShapeToBack(contextMenu.shapeId); setContextMenu(null); }}
            onDelete={() => { setPendingDelete({ type: 'shape', shapeId: contextMenu.shapeId }); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}
      {contextMenu?.type === 'line' && (
        <LineContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEditLabel={() => {
            setEditLabelConnId(contextMenu.connId);
            setContextMenu(null);
          }}
          onDelete={() => { setPendingDelete({ type: 'line', connId: contextMenu.connId }); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}
      {editLabelConnId && (() => {
        const conn = state.connections.find((c) => c.id === editLabelConnId);
        if (!conn) return null;
        return (
          <EditLabelModal
            initialLabel={conn.label}
            initialFontSize={conn.labelFontSize ?? 'md'}
            initialFontColor={conn.labelColor ?? null}
            onSave={(label, fontSize, fontColor) => {
              canvasState.updateConnection(editLabelConnId, { label, labelFontSize: fontSize, labelColor: fontColor });
              setEditLabelConnId(null);
            }}
            onClose={() => setEditLabelConnId(null)}
          />
        );
      })()}
      {contextMenu?.type === 'canvas' && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddBlock={() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const canvasCoords = screenToCanvas(contextMenu.x, contextMenu.y, rect, state.viewport);
              canvasState.addBlock(canvasCoords.x, canvasCoords.y);
            }
            setContextMenu(null);
          }}
          onPaste={() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const canvasCoords = screenToCanvas(contextMenu.x, contextMenu.y, rect, state.viewport);
              canvasState.paste(canvasCoords.x, canvasCoords.y);
            }
            setContextMenu(null);
          }}
          onZoomFit={() => { zoomToFit(); setContextMenu(null); }}
          onResetView={() => { resetView(); setContextMenu(null); }}
          onGridToggle={() => { canvasState.setGridEnabled(!state.gridEnabled); setContextMenu(null); }}
          canPaste={canvasState.copiedBlocksCount > 0}
          onClose={() => setContextMenu(null)}
        />
      )}
      {shortcutsOpen && (
        <CanvasShortcutsPopup onClose={() => setShortcutsOpen(false)} />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setPendingDelete(null); setContextMenu(null); }}
          title={
            pendingDelete.type === 'block'
              ? `Usunąć blok?`
              : pendingDelete.type === 'shape'
                ? 'Usunąć kształt?'
                : pendingDelete.type === 'line'
                  ? 'Usunąć połączenie?'
                  : 'Usunąć zaznaczone elementy?'
          }
          message="Ta operacja jest nieodwracalna. Wszystkie dane zostaną trwale usunięte."
          confirmLabel="Usuń"
          cancelLabel="Anuluj"
          variant="danger"
        />
      )}
    </div>
  );
}
