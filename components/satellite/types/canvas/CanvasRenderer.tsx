'use client';

import { useRef, useEffect } from 'react';
import { CanvasBlock } from './CanvasBlock';
import { CanvasConnection } from './CanvasConnection';
import { SpaceCanvasBackground } from './SpaceCanvasBackground';
import { getPortPosition, computeBezierPath, getArrowAngleForSide, getArrowAngleForToSide, getAngleToward, getClosestPortAmongBlocks, getClosestPort, getBlockAtPoint, screenToCanvas } from './canvas-utils';
import type { CanvasBlock as BlockType, CanvasConnection as ConnType } from './useCanvasState';
import type { PortSide } from './canvas-utils';

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 4000;

interface CanvasRendererProps {
  blocks: BlockType[];
  connections: ConnType[];
  viewport: { x: number; y: number; zoom: number };
  gridEnabled: boolean;
  selectedBlockIds: Set<string>;
  selectedConnectionIds: Set<string>;
  editingBlockId: string | null;
  addBlockMode: boolean;
  isPanning?: boolean;
  connectionDrag: { fromBlockId: string; fromSide: PortSide; clientX: number; clientY: number } | null;
  connectionEndDrag: { connId: string; whichEnd: 'from' | 'to'; clientX: number; clientY: number } | null;
  boxSelection?: { x1: number; y1: number; x2: number; y2: number } | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBlockPointerDown: (e: React.PointerEvent, target: 'body' | PortSide, blockId: string) => void;
  onBlockDoubleClick: (blockId: string) => void;
  onBlockTextChange: (blockId: string, text: string) => void;
  onBlockResizeStart: (blockId: string, e: React.PointerEvent) => void;
  onConnectionClick: (connId: string) => void;
  onConnectionContextMenu: (connId: string, e: React.MouseEvent) => void;
  onBackgroundPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onConnectionPointerDown?: (connId: string, whichEnd: 'from' | 'to', e: React.PointerEvent) => void;
  onPointerLeave?: () => void;
  onBlockContextMenu?: (blockId: string, e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
}

export function CanvasRenderer({
  blocks,
  connections,
  viewport,
  gridEnabled,
  selectedBlockIds,
  selectedConnectionIds,
  editingBlockId,
  addBlockMode,
  isPanning = false,
  connectionDrag,
  connectionEndDrag,
  boxSelection,
  containerRef,
  onBlockPointerDown,
  onBlockDoubleClick,
  onBlockTextChange,
  onBlockResizeStart,
  onConnectionClick,
  onConnectionContextMenu,
  onBackgroundPointerDown,
  onPointerMove,
  onPointerUp,
  onConnectionPointerDown,
  onPointerLeave,
  onBlockContextMenu,
  onWheel,
}: CanvasRendererProps) {
  const transformRef = useRef<HTMLDivElement>(null);

  // Attach wheel listener with { passive: false } so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onWheel(e as unknown as React.WheelEvent);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onWheel, containerRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: addBlockMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
        background: '#050a14',
      }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <SpaceCanvasBackground />
      {gridEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(249,115,22,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            opacity: 0.8,
          }}
        />
      )}

      <div
        ref={transformRef}
        data-canvas-transform
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Blocks rendered first (lower z) */}
        {blocks.map((block) => (
          <CanvasBlock
            key={block.id}
            block={block}
            selected={selectedBlockIds.has(block.id)}
            editing={editingBlockId === block.id}
            onPointerDown={(e, target) => onBlockPointerDown(e, target, block.id)}
            onDoubleClick={() => onBlockDoubleClick(block.id)}
            onTextChange={(text) => onBlockTextChange(block.id, text)}
            onResizeStart={(e) => onBlockResizeStart(block.id, e)}
            onContextMenu={onBlockContextMenu ? (e) => onBlockContextMenu(block.id, e) : undefined}
          />
        ))}

        {/* SVG connections rendered on top with high z-index for clickability */}
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          overflow="visible"
          style={{ position: 'absolute', inset: 0, zIndex: 1000, pointerEvents: 'none' }}
        >
          <defs>
            {[0, 90, 180, 270].map((angle) => (
              <marker key={angle} id={`arrowhead-${angle}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient={angle}>
                <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.2)" />
              </marker>
            ))}
            {[0, 90, 180, 270].map((angle) => (
              <marker key={`sel-${angle}`} id={`arrowhead-selected-${angle}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient={angle}>
                <polygon points="0 0, 8 3, 0 6" fill="rgba(249,115,22,0.5)" />
              </marker>
            ))}
            <marker id="arrowhead-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
              <polygon points="8 0, 0 3, 8 6" fill="rgba(255,255,255,0.2)" />
            </marker>
            <marker id="arrowhead-start-selected" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
              <polygon points="8 0, 0 3, 8 6" fill="rgba(249,115,22,0.5)" />
            </marker>
          {connectionDrag && containerRef.current && (() => {
            const rect = containerRef.current!.getBoundingClientRect();
            const toCanvas = (cx: number, cy: number) => ({
              x: (cx - rect.left - viewport.x) / viewport.zoom,
              y: (cy - rect.top - viewport.y) / viewport.zoom,
            });
            const cursor = toCanvas(connectionDrag.clientX, connectionDrag.clientY);
            const MAGNET_DIST = 70;
              const closest = getClosestPortAmongBlocks(blocks, cursor, connectionDrag.fromBlockId);
              const useMagnet = closest && closest.dist < MAGNET_DIST;
              const angle = useMagnet ? getAngleToward(cursor, closest!.pos) : getArrowAngleForSide(connectionDrag.fromSide);
              return (
                <marker key="arrowhead-drag" id="arrowhead-drag" markerWidth="8" markerHeight="6" refX="7" refY="3" orient={angle}>
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(249,115,22,0.5)" />
                </marker>
              );
            })()}
          </defs>

          {/* Drag preview line */}
          {connectionDrag && containerRef.current && (() => {
            const fromBlock = blocks.find((b) => b.id === connectionDrag.fromBlockId);
            if (!fromBlock) return null;
            const rect = containerRef.current.getBoundingClientRect();
            const toCanvas = (cx: number, cy: number) => ({
              x: (cx - rect.left - viewport.x) / viewport.zoom,
              y: (cy - rect.top - viewport.y) / viewport.zoom,
            });
            const from = getPortPosition(fromBlock, connectionDrag.fromSide);
            const cursor = toCanvas(connectionDrag.clientX, connectionDrag.clientY);
            const MAGNET_DIST = 70;
            const closest = getClosestPortAmongBlocks(blocks, cursor, connectionDrag.fromBlockId);
            const useMagnet = closest && closest.dist < MAGNET_DIST;
            const toSide = useMagnet ? closest!.side : 'right';
            const to = cursor;
            const path = computeBezierPath(from, to, connectionDrag.fromSide, toSide);
            return (
              <path
                key="connection-drag"
                d={path}
                fill="none"
                stroke="rgba(249,115,22,0.6)"
                strokeWidth={2}
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead-drag)"
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}

          {/* Drag preview for repositioning existing connection */}
          {connectionEndDrag && containerRef.current && (() => {
            const conn = connections.find((c) => c.id === connectionEndDrag.connId);
            if (!conn) return null;
            const fromBlock = blocks.find((b) => b.id === conn.from);
            const toBlock = blocks.find((b) => b.id === conn.to);
            if (!fromBlock || !toBlock) return null;

            const rect = containerRef.current!.getBoundingClientRect();
            const cursor = screenToCanvas(connectionEndDrag.clientX, connectionEndDrag.clientY, rect, viewport);

            const MAGNET_DIST = 70;
            const excludeBlockId = connectionEndDrag.whichEnd === 'from' ? conn.to : conn.from;
            const closest = getClosestPortAmongBlocks(blocks, cursor, excludeBlockId);
            const useMagnet = closest && closest.dist < MAGNET_DIST;

            let fromPt, toPt, fromSide: PortSide, toSide: PortSide;
            if (connectionEndDrag.whichEnd === 'from') {
              toPt = getPortPosition(toBlock, conn.toSide);
              toSide = conn.toSide;
              if (useMagnet && closest) {
                fromPt = getPortPosition(closest.block, closest.side);
                fromSide = closest.side;
              } else {
                fromPt = cursor;
                fromSide = 'right';
              }
            } else {
              fromPt = getPortPosition(fromBlock, conn.fromSide);
              fromSide = conn.fromSide;
              if (useMagnet && closest) {
                toPt = getPortPosition(closest.block, closest.side);
                toSide = closest.side;
              } else {
                toPt = cursor;
                toSide = 'left';
              }
            }

            const path = computeBezierPath(fromPt, toPt, fromSide, toSide);
            const angle = useMagnet ? getAngleToward(
              connectionEndDrag.whichEnd === 'from' ? fromPt : toPt,
              connectionEndDrag.whichEnd === 'from' ? closest!.pos : closest!.pos
            ) : (connectionEndDrag.whichEnd === 'to' ? getArrowAngleForToSide(toSide) : getArrowAngleForSide(fromSide));

            return (
              <>
                <marker id="arrowhead-enddrag" markerWidth="8" markerHeight="6" refX="7" refY="3" orient={angle}>
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(249,115,22,0.5)" />
                </marker>
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(249,115,22,0.6)"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead-enddrag)"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            );
          })()}

          {/* Existing connections */}
          {connections.map((conn) => {
            const isBeingRepositioned = connectionEndDrag?.connId === conn.id;
            return (
              <CanvasConnection
                key={conn.id}
                connection={conn}
                blocks={blocks}
                selected={selectedConnectionIds.has(conn.id)}
                onClick={() => onConnectionClick(conn.id)}
                onContextMenu={(e) => onConnectionContextMenu(conn.id, e)}
                onPointerDown={!isBeingRepositioned && onConnectionPointerDown ? (e, whichEnd) => onConnectionPointerDown(conn.id, whichEnd, e) : undefined}
                dimmed={isBeingRepositioned}
              />
            );
          })}
        </svg>

        {boxSelection && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(boxSelection.x1, boxSelection.x2),
              top: Math.min(boxSelection.y1, boxSelection.y2),
              width: Math.abs(boxSelection.x2 - boxSelection.x1),
              height: Math.abs(boxSelection.y2 - boxSelection.y1),
              border: '1px dashed rgba(249,115,22,0.5)',
              background: 'rgba(249,115,22,0.05)',
              pointerEvents: 'none',
              zIndex: 2000,
            }}
          />
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: 0.5,
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        ZOOM {Math.round(viewport.zoom * 100)}% · SCROLL TO ZOOM · LEFT-DRAG TO PAN · CTRL+DRAG TO SELECT
      </div>
    </div>
  );
}
