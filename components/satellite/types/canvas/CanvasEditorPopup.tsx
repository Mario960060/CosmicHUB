'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { CanvasRenderer } from './CanvasRenderer';
import { CanvasToolbar } from './CanvasToolbar';
import {
  BlockContextMenu,
  LineContextMenu,
  CanvasContextMenu,
} from './CanvasContextMenu';
import { EditLabelModal } from './EditLabelModal';
import { useCanvasState } from './useCanvasState';
import { useCanvasSave } from './useCanvasSave';
import { useCanvasZoom } from './useCanvasZoom';
import { useCanvasKeyboard } from './useCanvasKeyboard';
import { screenToCanvas, getBlockAtPoint, getClosestPort, getClosestPortAmongBlocks } from './canvas-utils';
import type { PortSide } from './canvas-utils';

/** Radius (canvas px) within which drop snaps to nearest port even if cursor is not on block */
const DROP_MAGNET_DIST = 70;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [addBlockMode, setAddBlockMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<
    | { type: 'block'; blockId: string; x: number; y: number }
    | { type: 'line'; connId: string; x: number; y: number }
    | { type: 'canvas'; x: number; y: number }
    | null
  >(null);
  const [editLabelConnId, setEditLabelConnId] = useState<string | null>(null);

  // Connection drag: creating a NEW connection from a port
  const [connectionDrag, setConnectionDrag] = useState<{
    fromBlockId: string;
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

  // Refs for drag state
  const panRef = useRef<{ startX: number; startY: number; startVx: number; startVy: number } | null>(null);
  const moveRef = useRef<{ blockIds: Set<string>; startPositions: Map<string, { x: number; y: number }>; lastClientX: number; lastClientY: number } | null>(null);
  const boxRef = useRef<{ startX: number; startY: number } | null>(null);
  const pannedThisSessionRef = useRef(false);
  const lastPointerRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

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

  useCanvasKeyboard({
    onAddBlock: () => setAddBlockMode(true),
    onDelete: canvasState.deleteSelected,
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
    hasSelection: canvasState.selectedBlockIds.size > 0 || canvasState.selectedConnectionIds.size > 0,
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
        setAddBlockMode(false);
        return;
      }

      // Right-click: do nothing (context menu handled separately)
      if (e.button === 2) return;

      // Left-click on background: Ctrl = box selection, else = pan (like Galaktyka)
      if (e.button === 0) {
        e.preventDefault();
        const modKey = e.ctrlKey || e.metaKey;
        if (modKey) {
          canvasState.deselectAll();
          boxRef.current = { startX: canvasCoords.x, startY: canvasCoords.y };
          setBoxSelection({ x1: canvasCoords.x, y1: canvasCoords.y, x2: canvasCoords.x, y2: canvasCoords.y });
        } else {
          pannedThisSessionRef.current = false;
          panRef.current = { startX: e.clientX, startY: e.clientY, startVx: state.viewport.x, startVy: state.viewport.y };
          setIsPanning(true);
        }
        return;
      }
    },
    [addBlockMode, state.viewport, canvasState]
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
        setConnectionDrag({ fromBlockId: blockId, fromSide: target, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
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

      // Move blocks
      if (moveRef.current) {
        const dx = (e.clientX - moveRef.current.lastClientX) / state.viewport.zoom;
        const dy = (e.clientY - moveRef.current.lastClientY) / state.viewport.zoom;
        canvasState.moveBlocks(moveRef.current.blockIds, dx, dy);
        moveRef.current = { ...moveRef.current, lastClientX: e.clientX, lastClientY: e.clientY };
      }
    },
    [connectionDrag, connectionEndDrag, state.viewport, canvasState]
  );

  // === POINTER UP on the transform div ===
  // This handles box selection and block movement.
  // Connection creation/repositioning is handled by the window listener below.
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [connectionDrag, connectionEndDrag, state.viewport, state.blocks, canvasState]
  );

  // === WINDOW POINTER MOVE for connection drags ===
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
      boxRef.current = null;
      setBoxSelection(null);
    };

    const onWindowPointerEnd = (e: PointerEvent) => {
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
          let targetBlock = getBlockAtPoint(s.blocks, canvasCoords.x, canvasCoords.y);
          let toSide: PortSide | null = targetBlock ? getClosestPort(targetBlock, canvasCoords) : null;
          if (!targetBlock) {
            const closest = getClosestPortAmongBlocks(s.blocks, canvasCoords, drag.fromBlockId);
            if (closest && closest.dist < DROP_MAGNET_DIST) {
              targetBlock = closest.block;
              toSide = closest.side;
            }
          }
          if (targetBlock && targetBlock.id !== drag.fromBlockId && toSide) {
            canvasStateRef.current.addConnection(drag.fromBlockId, targetBlock.id, drag.fromSide, toSide);
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
            const excludeBlockId = endDrag.whichEnd === 'from' ? conn.to : conn.from;
            let targetBlock = getBlockAtPoint(s.blocks, canvasCoords.x, canvasCoords.y);
            let port: PortSide | null = targetBlock ? getClosestPort(targetBlock, canvasCoords) : null;
            if (!targetBlock) {
              const closest = getClosestPortAmongBlocks(s.blocks, canvasCoords, excludeBlockId);
              if (closest && closest.dist < DROP_MAGNET_DIST) {
                targetBlock = closest.block;
                port = closest.side;
              }
            }
            if (targetBlock && port) {
              if (endDrag.whichEnd === 'from' && targetBlock.id !== conn.to) {
                if (targetBlock.id === conn.from) {
                  canvasStateRef.current.updateConnection(endDrag.connId, { fromSide: port });
                } else {
                  canvasStateRef.current.updateConnection(endDrag.connId, { from: targetBlock.id, fromSide: port });
                }
              } else if (endDrag.whichEnd === 'to' && targetBlock.id !== conn.from) {
                if (targetBlock.id === conn.to) {
                  canvasStateRef.current.updateConnection(endDrag.connId, { toSide: port });
                } else {
                  canvasStateRef.current.updateConnection(endDrag.connId, { to: targetBlock.id, toSide: port });
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
      };
      onSave(updated);
    },
    [canvas, state, onSave]
  );

  const handleClose = () => {
    const updated: CanvasItem = {
      ...canvas,
      assigned_to: assignedTo,
      viewport: state.viewport,
      gridEnabled: state.gridEnabled,
      blocks: state.blocks,
      connections: state.connections,
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
      onClick={(e) => e.target === e.currentTarget && handleClose()}
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
            onAddBlock={() => setAddBlockMode(true)}
            onUndo={canvasState.undo}
            onRedo={canvasState.redo}
            onZoomChange={setZoom}
            onZoomFit={zoomToFit}
            onGridToggle={() => canvasState.setGridEnabled(!state.gridEnabled)}
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
              viewport={state.viewport}
              gridEnabled={state.gridEnabled}
              selectedBlockIds={canvasState.selectedBlockIds}
              selectedConnectionIds={canvasState.selectedConnectionIds}
              editingBlockId={canvasState.editingBlockId}
              addBlockMode={addBlockMode}
              isPanning={isPanning}
              connectionDrag={connectionDrag}
              connectionEndDrag={connectionEndDrag}
              boxSelection={boxSelection}
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
              onWheel={handleWheel}
            />
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
            onDelete={() => { canvasState.deleteBlock(contextMenu.blockId); setContextMenu(null); }}
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
          onDelete={() => { canvasState.deleteConnection(contextMenu.connId); setContextMenu(null); }}
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
    </div>
  );
}
