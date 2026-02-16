'use client';

import { useRef, useCallback } from 'react';
import { getBlockAtPoint } from './canvas-utils';
import type { CanvasBlock } from './useCanvasState';
import type { PortSide } from './canvas-utils';

interface UseCanvasDragProps {
  blocks: CanvasBlock[];
  viewport: { x: number; y: number; zoom: number };
  selectedBlockIds: Set<string>;
  containerRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<HTMLDivElement>;
  onMoveBlock: (id: string, dx: number, dy: number) => void;
  onMoveBlocks: (ids: Set<string>, dx: number, dy: number) => void;
  onPan: (dx: number, dy: number) => void;
  onAddConnection: (from: string, to: string, fromSide: PortSide, toSide: PortSide) => void;
  onSelectBlock: (id: string | null, addToSelection?: boolean) => void;
  onSelectBlocks: (ids: Set<string>) => void;
  onDeselectAll: () => void;
}

/** Convert screen coordinates to canvas coordinates */
function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  viewport: { x: number; y: number; zoom: number }
): { x: number; y: number } {
  const x = (screenX - containerRect.left - viewport.x) / viewport.zoom;
  const y = (screenY - containerRect.top - viewport.y) / viewport.zoom;
  return { x, y };
}

export function useCanvasDrag({
  blocks,
  viewport,
  selectedBlockIds,
  containerRef,
  transformRef,
  onMoveBlock,
  onMoveBlocks,
  onPan,
  onAddConnection,
  onSelectBlock,
  onSelectBlocks,
  onDeselectAll,
}: UseCanvasDragProps) {
  const dragRef = useRef<{
    mode: 'pan' | 'move' | 'connect' | 'box';
    startX: number;
    startY: number;
    lastDx?: number;
    lastDy?: number;
    blockId?: string;
    fromBlockId?: string;
    fromSide?: PortSide;
    startPositions?: Map<string, { x: number; y: number }>;
    boxStart?: { x: number; y: number };
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, target: 'background' | 'body' | PortSide, blockId?: string) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const canvas = screenToCanvas(e.clientX, e.clientY, rect, viewport);

      if (target === 'background') {
        if (e.shiftKey) {
          dragRef.current = { mode: 'box', startX: e.clientX, startY: e.clientY, boxStart: canvas };
        } else {
          dragRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY };
          onDeselectAll();
        }
      } else if (target === 'body' && blockId) {
        const block = blocks.find((b) => b.id === blockId);
        if (!block) return;
        if (!selectedBlockIds.has(blockId)) {
          onSelectBlock(blockId, e.shiftKey);
        }
        const ids = selectedBlockIds.has(blockId) ? selectedBlockIds : new Set([blockId]);
        const startPositions = new Map<string, { x: number; y: number }>();
        ids.forEach((id) => {
          const b = blocks.find((x) => x.id === id);
          if (b) startPositions.set(id, { x: b.x, y: b.y });
        });
        dragRef.current = {
          mode: 'move',
          startX: e.clientX,
          startY: e.clientY,
          blockId,
          startPositions,
        };
      } else if (typeof target === 'string' && (target as PortSide) && blockId) {
        dragRef.current = {
          mode: 'connect',
          startX: e.clientX,
          startY: e.clientY,
          fromBlockId: blockId,
          fromSide: target as PortSide,
        };
      }

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [blocks, viewport, selectedBlockIds, onSelectBlock, onDeselectAll]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const dx = (e.clientX - session.startX) / viewport.zoom;
      const dy = (e.clientY - session.startY) / viewport.zoom;

      if (session.mode === 'pan') {
        onPan(e.clientX - session.startX, e.clientY - session.startY);
        dragRef.current = { ...session, startX: e.clientX, startY: e.clientY };
      } else if (session.mode === 'move' && session.startPositions) {
        const lastDx = session.lastDx ?? 0;
        const lastDy = session.lastDy ?? 0;
        const incDx = dx - lastDx;
        const incDy = dy - lastDy;
        onMoveBlocks(new Set(session.startPositions.keys()), incDx, incDy);
        dragRef.current = { ...session, lastDx: dx, lastDy: dy };
      }
      // connect mode: drawing line - handled by a separate component that shows the temp line
    },
    [viewport, onPan, onMoveBlocks, blocks]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (_) {}

      if (session.mode === 'connect' && session.fromBlockId && session.fromSide && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvas = screenToCanvas(e.clientX, e.clientY, rect, viewport);
        const targetBlock = getBlockAtPoint(blocks, canvas.x, canvas.y);
        if (targetBlock && targetBlock.id !== session.fromBlockId) {
          const toSide = session.fromSide === 'left' ? 'right' : session.fromSide === 'right' ? 'left' : session.fromSide === 'top' ? 'bottom' : 'top';
          onAddConnection(session.fromBlockId, targetBlock.id, session.fromSide, toSide);
        }
      }

      dragRef.current = null;
    },
    [blocks, viewport, onAddConnection]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    dragSession: dragRef.current,
  };
}
