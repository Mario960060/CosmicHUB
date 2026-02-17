'use client';

import { useState, useCallback } from 'react';
import type { PortSide } from './canvas-utils';
import type {
  CanvasShapeData,
  ShapeStroke,
  ShapeFill,
  CanvasShapeType,
  ConnectionEndpoint,
} from './canvas-types';

export type BlockColor =
  | 'neutral'
  | 'cyan'
  | 'rose'
  | 'indigo'
  | 'teal'
  | 'green'
  | 'amber'
  | 'purple'
  | 'orange';

export type BlockFontSize = 'sm' | 'md' | 'lg';

export type BlockTextAlign = 'left' | 'center' | 'right';

export interface CanvasBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: BlockColor;
  fontColor: BlockColor | null;
  fontSize: BlockFontSize;
  textAlign: BlockTextAlign;
  zIndex: number;
}

export type ConnectionStyle = 'solid' | 'dashed' | 'dotted';
export type ConnectionArrow = 'none' | 'forward' | 'both';

export type LabelFontSize = 'sm' | 'md' | 'lg';

export interface CanvasConnection {
  id: string;
  from: ConnectionEndpoint;
  to: ConnectionEndpoint;
  label: string;
  labelFontSize: LabelFontSize;
  labelColor?: string | null;
  style: ConnectionStyle;
  arrow: ConnectionArrow;
  color: string;
}

export type CanvasShape = CanvasShapeData;

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasState {
  viewport: CanvasViewport;
  gridEnabled: boolean;
  blocks: CanvasBlock[];
  connections: CanvasConnection[];
  shapes: CanvasShape[];
}

const MAX_UNDO = 50;

function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createStateSnapshot(state: CanvasState): CanvasState {
  return {
    viewport: { ...state.viewport },
    gridEnabled: state.gridEnabled,
    blocks: state.blocks.map((b) => ({ ...b })),
    connections: state.connections.map((c) => ({ ...c })),
    shapes: state.shapes.map((s) => ({ ...s, stroke: { ...s.stroke }, fill: s.fill ? { ...s.fill } : undefined })),
  };
}

function normalizeBlock(b: CanvasBlock | Record<string, unknown>): CanvasBlock {
  const block = b as CanvasBlock & { fontColor?: BlockColor | null; textAlign?: BlockTextAlign };
  return {
    ...block,
    fontColor: block.fontColor ?? null,
    textAlign: block.textAlign ?? 'left',
  };
}

function normalizeConnection(c: CanvasConnection | Record<string, unknown>): CanvasConnection {
  const conn = c as CanvasConnection & {
    labelFontSize?: LabelFontSize;
    labelColor?: string | null;
    from?: string | ConnectionEndpoint;
    to?: string | ConnectionEndpoint;
    fromSide?: PortSide;
    toSide?: PortSide;
  };
  const from: ConnectionEndpoint =
    typeof conn.from === 'string'
      ? { entityId: conn.from, side: (conn.fromSide ?? 'right') as PortSide }
      : conn.from ?? { entityId: '', side: 'right' };
  const to: ConnectionEndpoint =
    typeof conn.to === 'string'
      ? { entityId: conn.to, side: (conn.toSide ?? 'left') as PortSide }
      : conn.to ?? { entityId: '', side: 'left' };
  return {
    ...conn,
    from,
    to,
    labelFontSize: conn.labelFontSize ?? 'md',
    labelColor: conn.labelColor ?? null,
  };
}

const DEFAULT_STROKE: ShapeStroke = {
  color: 'white',
  width: 2,
  style: 'solid',
};

function normalizeShape(s: CanvasShape | Record<string, unknown>): CanvasShape {
  const shape = s as CanvasShape & { stroke?: Partial<ShapeStroke>; fill?: Partial<ShapeFill> };
  return {
    ...shape,
    stroke: { ...DEFAULT_STROKE, ...shape.stroke },
    fill: shape.fill ? { color: shape.fill.color ?? 'none', opacity: shape.fill.opacity ?? 0.25 } : undefined,
    rotation: shape.rotation ?? 0,
    cornerRadius: shape.cornerRadius ?? 0,
    arrowStart: shape.arrowStart ?? false,
    arrowEnd: shape.arrowEnd ?? (shape.type === 'arrow'),
  };
}

function connectionReferencesEntity(conn: CanvasConnection, entityId: string): boolean {
  return conn.from.entityId === entityId || conn.to.entityId === entityId;
}

export function useCanvasState(initial: Partial<CanvasState>) {
  const [state, setState] = useState<CanvasState>(() => ({
    viewport: initial.viewport ?? { x: 0, y: 0, zoom: 1 },
    gridEnabled: initial.gridEnabled ?? false,
    blocks: (initial.blocks ?? []).map(normalizeBlock),
    connections: (initial.connections ?? []).map(normalizeConnection),
    shapes: (initial.shapes ?? []).map(normalizeShape),
  }));

  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [copiedBlocks, setCopiedBlocks] = useState<CanvasBlock[]>([]);

function normalizeShape(s: CanvasShape | Record<string, unknown>): CanvasShape {
  const shape = s as CanvasShape & { stroke?: Partial<ShapeStroke>; fill?: Partial<ShapeFill> };
  return {
    ...shape,
    stroke: { ...DEFAULT_STROKE, ...shape.stroke },
    fill: shape.fill ? { color: shape.fill.color ?? 'none', opacity: shape.fill.opacity ?? 0.25 } : undefined,
    rotation: shape.rotation ?? 0,
    cornerRadius: shape.cornerRadius ?? 0,
    arrowStart: shape.arrowStart ?? false,
    arrowEnd: shape.arrowEnd ?? (shape.type === 'arrow'),
  };
}

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-MAX_UNDO + 1), createStateSnapshot(state)]);
    setRedoStack([]);
  }, [state]);

  const addBlock = useCallback(
    (x: number, y: number) => {
      pushUndo();
      const block: CanvasBlock = {
        id: generateId(),
        x,
        y,
        width: 200,
        height: 120,
        text: '',
        color: 'neutral',
        fontColor: null,
        fontSize: 'md',
        textAlign: 'left',
        zIndex: state.blocks.length + 1,
      };
      setState((s) => ({ ...s, blocks: [...s.blocks, block] }));
      setSelectedBlockIds(new Set([block.id]));
      setSelectedConnectionIds(new Set());
      setEditingBlockId(block.id);
      return block.id;
    },
    [state.blocks.length, pushUndo]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.filter((b) => b.id !== id),
        connections: s.connections.filter((c) => !connectionReferencesEntity(c, id)),
      }));
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedConnectionIds((prev) => {
        const next = new Set(prev);
        state.connections.forEach((c) => {
          if (connectionReferencesEntity(c, id)) next.delete(c.id);
        });
        return next;
      });
      if (editingBlockId === id) setEditingBlockId(null);
    },
    [editingBlockId, pushUndo, state.connections]
  );

  const moveBlock = useCallback(
    (id: string, dx: number, dy: number) => {
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.id === id ? { ...b, x: b.x + dx, y: b.y + dy } : b
        ),
      }));
    },
    []
  );

  const moveBlocks = useCallback(
    (ids: Set<string>, dx: number, dy: number) => {
      const idSet = ids;
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          idSet.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b
        ),
      }));
    },
    []
  );

  const resizeBlock = useCallback(
    (id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => {
          if (b.id !== id) return b;
          const next = { ...b, ...updates };
          return {
            ...next,
            width: Math.max(1, next.width ?? b.width),
            height: Math.max(1, next.height ?? b.height),
          };
        }),
      }));
    },
    [pushUndo]
  );

  const updateBlockText = useCallback(
    (id: string, text: string) => {
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, text } : b)),
      }));
    },
    []
  );

  const updateBlockColor = useCallback(
    (id: string, color: BlockColor) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, color, fontColor: null } : b)),
      }));
    },
    [pushUndo]
  );

  const updateBlockFontColor = useCallback(
    (id: string, fontColor: BlockColor | null) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, fontColor } : b)),
      }));
    },
    [pushUndo]
  );

  const updateBlockFontSize = useCallback(
    (id: string, fontSize: BlockFontSize) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, fontSize } : b)),
      }));
    },
    [pushUndo]
  );

  const updateBlockTextAlign = useCallback(
    (id: string, textAlign: BlockTextAlign) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, textAlign } : b)),
      }));
    },
    [pushUndo]
  );

  const addConnection = useCallback(
    (from: string, to: string, fromSide: PortSide, toSide: PortSide) => {
      if (from === to) return;
      pushUndo();
      const conn: CanvasConnection = {
        id: generateId(),
        from: { entityId: from, side: fromSide },
        to: { entityId: to, side: toSide },
        label: '',
        labelFontSize: 'md',
        style: 'solid',
        arrow: 'forward',
        color: 'slate',
      };
      setState((s) => ({ ...s, connections: [...s.connections, conn] }));
      setSelectedConnectionIds(new Set([conn.id]));
      setSelectedBlockIds(new Set());
      setSelectedShapeIds(new Set());
    },
    [pushUndo]
  );

  const deleteConnection = useCallback(
    (id: string) => {
      pushUndo();
      setState((s) => ({
        ...s,
        connections: s.connections.filter((c) => c.id !== id),
      }));
      setSelectedConnectionIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [pushUndo]
  );

  const updateConnection = useCallback(
    (id: string, updates: Partial<CanvasConnection>) => {
      pushUndo();
      setState((s) => ({
        ...s,
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },
    [pushUndo]
  );

  const setViewport = useCallback((viewport: Partial<CanvasViewport>) => {
    setState((s) => ({ ...s, viewport: { ...s.viewport, ...viewport } }));
  }, []);

  const setGridEnabled = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, gridEnabled: enabled }));
  }, []);

  const selectBlock = useCallback((id: string | null, addToSelection?: boolean) => {
    setSelectedBlockIds((prev) => {
      if (!id) return new Set();
      if (addToSelection) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      return new Set([id]);
    });
    setSelectedConnectionIds(new Set());
    setSelectedShapeIds(new Set());
  }, []);

  const selectBlocks = useCallback((ids: Set<string>) => {
    setSelectedBlockIds(ids);
    setSelectedConnectionIds(new Set());
    setSelectedShapeIds(new Set());
  }, []);

  const selectShape = useCallback((id: string | null, addToSelection?: boolean) => {
    setSelectedShapeIds((prev) => {
      if (!id) return new Set();
      if (addToSelection) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      return new Set([id]);
    });
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
  }, []);

  const selectShapes = useCallback((ids: Set<string>) => {
    setSelectedShapeIds(ids);
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
  }, []);

  const selectConnection = useCallback((id: string | null) => {
    setSelectedConnectionIds(id ? new Set([id]) : new Set());
    if (id) {
      setSelectedBlockIds(new Set());
      setSelectedShapeIds(new Set());
    }
  }, []);

  const selectAll = useCallback(() => {
    setSelectedBlockIds(new Set(state.blocks.map((b) => b.id)));
    setSelectedShapeIds(new Set(state.shapes.map((s) => s.id)));
    setSelectedConnectionIds(new Set());
  }, [state.blocks, state.shapes]);

  const deselectAll = useCallback(() => {
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
    setSelectedShapeIds(new Set());
    setEditingBlockId(null);
  }, []);

  const addShape = useCallback(
    (shape: Omit<CanvasShape, 'id'>) => {
      pushUndo();
      const newShape: CanvasShape = {
        ...shape,
        id: generateId(),
        zIndex: shape.zIndex ?? state.shapes.length + 1,
      };
      setState((s) => ({ ...s, shapes: [...s.shapes, newShape] }));
      setSelectedShapeIds(new Set([newShape.id]));
      setSelectedBlockIds(new Set());
      setSelectedConnectionIds(new Set());
      return newShape.id;
    },
    [state.shapes.length, pushUndo]
  );

  const deleteShape = useCallback(
    (id: string) => {
      pushUndo();
      setState((s) => ({
        ...s,
        shapes: s.shapes.filter((sh) => sh.id !== id),
        connections: s.connections.filter((c) => !connectionReferencesEntity(c, id)),
      }));
      setSelectedShapeIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedConnectionIds((prev) => {
        const next = new Set(prev);
        state.connections.forEach((c) => {
          if (connectionReferencesEntity(c, id)) next.delete(c.id);
        });
        return next;
      });
    },
    [pushUndo, state.connections]
  );

  const updateShape = useCallback(
    (id: string, updates: Partial<CanvasShape>) => {
      pushUndo();
      setState((s) => ({
        ...s,
        shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...updates } : sh)),
      }));
    },
    [pushUndo]
  );

  const moveShape = useCallback((id: string, dx: number, dy: number) => {
    setState((s) => ({
      ...s,
      shapes: s.shapes.map((sh) => {
        if (sh.id !== id) return sh;
        if (sh.type === 'line' || sh.type === 'arrow') {
          return {
            ...sh,
            x1: (sh.x1 ?? 0) + dx,
            y1: (sh.y1 ?? 0) + dy,
            x2: (sh.x2 ?? 0) + dx,
            y2: (sh.y2 ?? 0) + dy,
          };
        }
        if (sh.type === 'freehand' && sh.points) {
          return {
            ...sh,
            points: sh.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
          };
        }
        return { ...sh, x: (sh.x ?? 0) + dx, y: (sh.y ?? 0) + dy };
      }),
    }));
  }, []);

  const moveShapes = useCallback((ids: Set<string>, dx: number, dy: number) => {
    setState((s) => ({
      ...s,
      shapes: s.shapes.map((sh) => {
        if (!ids.has(sh.id)) return sh;
        if (sh.type === 'line' || sh.type === 'arrow') {
          return {
            ...sh,
            x1: (sh.x1 ?? 0) + dx,
            y1: (sh.y1 ?? 0) + dy,
            x2: (sh.x2 ?? 0) + dx,
            y2: (sh.y2 ?? 0) + dy,
          };
        }
        if (sh.type === 'freehand' && sh.points) {
          return {
            ...sh,
            points: sh.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
          };
        }
        return { ...sh, x: (sh.x ?? 0) + dx, y: (sh.y ?? 0) + dy };
      }),
    }));
  }, []);

  const resizeShape = useCallback(
    (id: string, updates: Partial<Pick<CanvasShape, 'x' | 'y' | 'width' | 'height' | 'x1' | 'y1' | 'x2' | 'y2' | 'points'>>) => {
      setState((s) => ({
        ...s,
        shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...updates } : sh)),
      }));
    },
    []
  );

  const rotateShape = useCallback(
    (id: string, rotation: number) => {
      setState((s) => ({
        ...s,
        shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, rotation: ((rotation % 360) + 360) % 360 } : sh)),
      }));
    },
    []
  );

  const bringShapeToFront = useCallback((id: string) => {
    pushUndo();
    setState((s) => {
      const maxZ = Math.max(0, ...s.shapes.map((sh) => sh.zIndex ?? 0));
      return {
        ...s,
        shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: maxZ + 1 } : sh)),
      };
    });
  }, [pushUndo]);

  const sendShapeToBack = useCallback((id: string) => {
    pushUndo();
    setState((s) => {
      const minZ = Math.min(0, ...s.shapes.map((sh) => sh.zIndex ?? 0));
      return {
        ...s,
        shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: minZ - 1 } : sh)),
      };
    });
  }, [pushUndo]);

  const duplicate = useCallback(() => {
    const blockIds = selectedBlockIds;
    const shapeIds = selectedShapeIds;
    if (blockIds.size === 0 && shapeIds.size === 0) return;
    pushUndo();
    const blockIdMap = new Map<string, string>();
    const shapeIdMap = new Map<string, string>();
    const newBlocks: CanvasBlock[] = [];
    const newShapes: CanvasShape[] = [];

    state.blocks.forEach((b) => {
      if (blockIds.has(b.id)) {
        const newId = generateId();
        blockIdMap.set(b.id, newId);
        newBlocks.push({ ...b, id: newId, x: b.x + 20, y: b.y + 20 });
      }
    });

    state.shapes.forEach((sh) => {
      if (shapeIds.has(sh.id)) {
        const newId = generateId();
        shapeIdMap.set(sh.id, newId);
        const dup = { ...sh, id: newId };
        if (dup.type === 'line' || dup.type === 'arrow') {
          dup.x1 = (dup.x1 ?? 0) + 20;
          dup.y1 = (dup.y1 ?? 0) + 20;
          dup.x2 = (dup.x2 ?? 0) + 20;
          dup.y2 = (dup.y2 ?? 0) + 20;
        } else if (dup.type === 'freehand' && dup.points) {
          dup.points = dup.points.map(([px, py]) => [px + 20, py + 20] as [number, number]);
        } else {
          dup.x = (dup.x ?? 0) + 20;
          dup.y = (dup.y ?? 0) + 20;
        }
        newShapes.push(dup);
      }
    });

    const resolveEntityId = (eid: string) =>
      blockIdMap.get(eid) ?? shapeIdMap.get(eid) ?? eid;

    const newConnections: CanvasConnection[] = state.connections
      .filter((c) => {
        const fromOk = blockIds.has(c.from.entityId) || shapeIds.has(c.from.entityId);
        const toOk = blockIds.has(c.to.entityId) || shapeIds.has(c.to.entityId);
        return fromOk && toOk;
      })
      .map((c) => ({
        ...c,
        id: generateId(),
        from: { entityId: resolveEntityId(c.from.entityId), side: c.from.side },
        to: { entityId: resolveEntityId(c.to.entityId), side: c.to.side },
      }));

    setState((s) => ({
      ...s,
      blocks: [...s.blocks, ...newBlocks],
      shapes: [...s.shapes, ...newShapes],
      connections: [...s.connections, ...newConnections],
    }));
    if (newBlocks.length > 0) setSelectedBlockIds(new Set(newBlocks.map((b) => b.id)));
    else if (newShapes.length > 0) setSelectedShapeIds(new Set(newShapes.map((s) => s.id)));
  }, [selectedBlockIds, selectedShapeIds, state.blocks, state.shapes, state.connections, pushUndo]);

  const copy = useCallback(() => {
    const ids = selectedBlockIds;
    if (ids.size === 0) return;
    const blocks = state.blocks.filter((b) => ids.has(b.id));
    setCopiedBlocks(blocks.map((b) => ({ ...b })));
  }, [selectedBlockIds, state.blocks]);

  const paste = useCallback(
    (x: number, y: number) => {
      if (copiedBlocks.length === 0) return;
      pushUndo();
      const minX = Math.min(...copiedBlocks.map((b) => b.x));
      const minY = Math.min(...copiedBlocks.map((b) => b.y));
      const idMap = new Map<string, string>();
      const newBlocks: CanvasBlock[] = copiedBlocks.map((b) => {
        const newId = generateId();
        idMap.set(b.id, newId);
        return {
          ...b,
          id: newId,
          x: x + (b.x - minX),
          y: y + (b.y - minY),
        };
      });
      setState((s) => ({
        ...s,
        blocks: [...s.blocks, ...newBlocks],
      }));
      setSelectedBlockIds(new Set(newBlocks.map((b) => b.id)));
    },
    [copiedBlocks, pushUndo]
  );

  const deleteSelected = useCallback(() => {
    pushUndo();
    const blockIdsToDelete = selectedBlockIds;
    const shapeIdsToDelete = selectedShapeIds;
    const connIdsToDelete = selectedConnectionIds;
    setState((s) => ({
      ...s,
      blocks: s.blocks.filter((b) => !blockIdsToDelete.has(b.id)),
      shapes: s.shapes.filter((sh) => !shapeIdsToDelete.has(sh.id)),
      connections: s.connections.filter(
        (c) =>
          !blockIdsToDelete.has(c.from.entityId) &&
          !blockIdsToDelete.has(c.to.entityId) &&
          !shapeIdsToDelete.has(c.from.entityId) &&
          !shapeIdsToDelete.has(c.to.entityId) &&
          !connIdsToDelete.has(c.id)
      ),
    }));
    setSelectedBlockIds(new Set());
    setSelectedShapeIds(new Set());
    setSelectedConnectionIds(new Set());
    setEditingBlockId(null);
  }, [selectedBlockIds, selectedShapeIds, selectedConnectionIds, pushUndo]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, createStateSnapshot(state)]);
    setUndoStack((u) => u.slice(0, -1));
    setState(prev);
    setEditingBlockId(null);
  }, [undoStack, state]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, createStateSnapshot(state)]);
    setRedoStack((r) => r.slice(0, -1));
    setState(next);
  }, [redoStack, state]);

  return {
    state,
    pushUndo,
    selectedBlockIds,
    selectedConnectionIds,
    selectedShapeIds,
    editingBlockId,
    setEditingBlockId,
    addBlock,
    deleteBlock,
    moveBlock,
    moveBlocks,
    addShape,
    deleteShape,
    updateShape,
    moveShape,
    moveShapes,
    resizeShape,
    rotateShape,
    bringShapeToFront,
    sendShapeToBack,
    resizeBlock,
    updateBlockText,
    updateBlockColor,
    updateBlockFontColor,
    updateBlockFontSize,
    updateBlockTextAlign,
    addConnection,
    deleteConnection,
    updateConnection,
    setViewport,
    setGridEnabled,
    selectBlock,
    selectBlocks,
    selectShape,
    selectShapes,
    selectConnection,
    selectAll,
    deselectAll,
    duplicate,
    copy,
    paste,
    deleteSelected,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    copiedBlocksCount: copiedBlocks.length,
  };
}
