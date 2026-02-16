'use client';

import { useState, useCallback } from 'react';
import type { PortSide } from './canvas-utils';

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
  zIndex: number;
}

export type ConnectionStyle = 'solid' | 'dashed' | 'dotted';
export type ConnectionArrow = 'none' | 'forward' | 'both';

export type LabelFontSize = 'sm' | 'md' | 'lg';

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  fromSide: 'top' | 'bottom' | 'left' | 'right';
  toSide: 'top' | 'bottom' | 'left' | 'right';
  label: string;
  labelFontSize: LabelFontSize;
  labelColor?: string | null;
  style: ConnectionStyle;
  arrow: ConnectionArrow;
  color: string;
}

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
  };
}

function normalizeBlock(b: CanvasBlock | Record<string, unknown>): CanvasBlock {
  const block = b as CanvasBlock & { fontColor?: BlockColor | null };
  return {
    ...block,
    fontColor: block.fontColor ?? null,
  };
}

function normalizeConnection(c: CanvasConnection | Record<string, unknown>): CanvasConnection {
  const conn = c as CanvasConnection & { labelFontSize?: LabelFontSize; labelColor?: string | null };
  return {
    ...conn,
    labelFontSize: conn.labelFontSize ?? 'md',
    labelColor: conn.labelColor ?? null,
  };
}

export function useCanvasState(initial: Partial<CanvasState>) {
  const [state, setState] = useState<CanvasState>(() => ({
    viewport: initial.viewport ?? { x: 0, y: 0, zoom: 1 },
    gridEnabled: initial.gridEnabled ?? false,
    blocks: (initial.blocks ?? []).map(normalizeBlock),
    connections: (initial.connections ?? []).map(normalizeConnection),
  }));

  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [copiedBlocks, setCopiedBlocks] = useState<CanvasBlock[]>([]);

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
        connections: s.connections.filter((c) => c.from !== id && c.to !== id),
      }));
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedConnectionIds((prev) => {
        const next = new Set(prev);
        state.connections.forEach((c) => {
          if (c.from === id || c.to === id) next.delete(c.id);
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
    (id: string, width: number, height: number) => {
      pushUndo();
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.id === id
            ? {
                ...b,
                width: Math.max(120, Math.min(600, width)),
                height: Math.max(80, Math.min(400, height)),
              }
            : b
        ),
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

  const addConnection = useCallback(
    (from: string, to: string, fromSide: PortSide, toSide: PortSide) => {
      if (from === to) return;
      pushUndo();
      const conn: CanvasConnection = {
        id: generateId(),
        from,
        to,
        fromSide,
        toSide,
        label: '',
        labelFontSize: 'md',
        style: 'solid',
        arrow: 'forward',
        color: 'slate',
      };
      setState((s) => ({ ...s, connections: [...s.connections, conn] }));
      setSelectedConnectionIds(new Set([conn.id]));
      setSelectedBlockIds(new Set());
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
  }, []);

  const selectBlocks = useCallback((ids: Set<string>) => {
    setSelectedBlockIds(ids);
    setSelectedConnectionIds(new Set());
  }, []);

  const selectConnection = useCallback((id: string | null) => {
    setSelectedConnectionIds(id ? new Set([id]) : new Set());
    if (id) setSelectedBlockIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedBlockIds(new Set(state.blocks.map((b) => b.id)));
    setSelectedConnectionIds(new Set());
  }, [state.blocks]);

  const deselectAll = useCallback(() => {
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
    setEditingBlockId(null);
  }, []);

  const duplicate = useCallback(() => {
    const ids = selectedBlockIds;
    if (ids.size === 0) return;
    pushUndo();
    const idMap = new Map<string, string>();
    const newBlocks: CanvasBlock[] = [];
    state.blocks.forEach((b) => {
      if (ids.has(b.id)) {
        const newId = generateId();
        idMap.set(b.id, newId);
        newBlocks.push({
          ...b,
          id: newId,
          x: b.x + 20,
          y: b.y + 20,
        });
      }
    });
    const newConnections: CanvasConnection[] = state.connections
      .filter((c) => ids.has(c.from) && ids.has(c.to))
      .map((c) => ({
        ...c,
        id: generateId(),
        from: idMap.get(c.from) ?? c.from,
        to: idMap.get(c.to) ?? c.to,
      }));
    setState((s) => ({
      ...s,
      blocks: [...s.blocks, ...newBlocks],
      connections: [...s.connections, ...newConnections],
    }));
    setSelectedBlockIds(new Set(newBlocks.map((b) => b.id)));
  }, [selectedBlockIds, state.blocks, state.connections, pushUndo]);

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
    const connIdsToDelete = selectedConnectionIds;
    setState((s) => ({
      ...s,
      blocks: s.blocks.filter((b) => !blockIdsToDelete.has(b.id)),
      connections: s.connections.filter(
        (c) => !blockIdsToDelete.has(c.from) && !blockIdsToDelete.has(c.to) && !connIdsToDelete.has(c.id)
      ),
    }));
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
    setEditingBlockId(null);
  }, [selectedBlockIds, selectedConnectionIds, pushUndo]);

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
    selectedBlockIds,
    selectedConnectionIds,
    editingBlockId,
    setEditingBlockId,
    addBlock,
    deleteBlock,
    moveBlock,
    moveBlocks,
    resizeBlock,
    updateBlockText,
    updateBlockColor,
    updateBlockFontColor,
    updateBlockFontSize,
    addConnection,
    deleteConnection,
    updateConnection,
    setViewport,
    setGridEnabled,
    selectBlock,
    selectBlocks,
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
