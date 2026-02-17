'use client';

import { useRef, useEffect } from 'react';
import { CanvasBlock } from './CanvasBlock';
import { CanvasConnection } from './CanvasConnection';
import { CanvasShapeComponent } from './CanvasShape';
import { CanvasShapeHandles } from './CanvasShapeHandles';
import { SpaceCanvasBackground } from './SpaceCanvasBackground';
import { getPortPosition, computeBezierPath, getArrowAngleForSide, getArrowAngleForToSide, getAngleToward, getClosestPort, getBlockAtPoint, screenToCanvas } from './canvas-utils';
import { getShapePortPosition } from './shape-utils';
import { getClosestPortAmongEntities } from './entity-utils';
import type { CanvasBlock as BlockType, CanvasConnection as ConnType, CanvasShape as ShapeType } from './useCanvasState';
import type { PortSide } from './canvas-utils';

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 4000;

interface CanvasRendererProps {
  blocks: BlockType[];
  connections: ConnType[];
  shapes?: ShapeType[];
  viewport: { x: number; y: number; zoom: number };
  gridEnabled: boolean;
  selectedBlockIds: Set<string>;
  selectedConnectionIds: Set<string>;
  selectedShapeIds?: Set<string>;
  editingBlockId: string | null;
  addBlockMode: boolean;
  isPanning?: boolean;
  connectionDrag: { fromEntityId: string; fromSide: PortSide; clientX: number; clientY: number } | null;
  connectionEndDrag: { connId: string; whichEnd: 'from' | 'to'; clientX: number; clientY: number } | null;
  boxSelection?: { x1: number; y1: number; x2: number; y2: number } | null;
  snapGuides?: { horizontal?: number; vertical?: number } | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBlockPointerDown: (e: React.PointerEvent, target: 'body' | PortSide, blockId: string) => void;
  onBlockDoubleClick: (blockId: string) => void;
  onBlockTextChange: (blockId: string, text: string) => void;
  onBlockResizeStart: (blockId: string, handle: string, e: React.PointerEvent) => void;
  onConnectionClick: (connId: string) => void;
  onConnectionContextMenu: (connId: string, e: React.MouseEvent) => void;
  onBackgroundPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onConnectionPointerDown?: (connId: string, whichEnd: 'from' | 'to', e: React.PointerEvent) => void;
  onPointerLeave?: () => void;
  onBlockContextMenu?: (blockId: string, e: React.MouseEvent) => void;
  onShapePointerDown?: (shapeId: string, e: React.PointerEvent) => void;
  onShapeContextMenu?: (shapeId: string, e: React.MouseEvent) => void;
  onShapeResizeStart?: (shapeId: string, handle: string, e: React.PointerEvent) => void;
  onShapeRotateStart?: (shapeId: string, e: React.PointerEvent) => void;
  onShapePortPointerDown?: (shapeId: string, side: PortSide, e: React.PointerEvent) => void;
  drawPreview?: {
    type: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: [number, number][];
  } | null;
  angleIndicator?: { angle: number; length: number } | null;
  onWheel: (e: React.WheelEvent) => void;
}

export function CanvasRenderer({
  blocks,
  connections,
  shapes = [],
  viewport,
  gridEnabled,
  selectedBlockIds,
  selectedConnectionIds,
  selectedShapeIds = new Set(),
  editingBlockId,
  addBlockMode,
  isPanning = false,
  connectionDrag,
  connectionEndDrag,
  boxSelection,
  snapGuides,
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
  onShapePointerDown,
  onShapeContextMenu,
  onShapeResizeStart,
  onShapeRotateStart,
  onShapePortPointerDown,
  drawPreview = null,
  angleIndicator = null,
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
        {/* Snap alignment guides - full canvas lines when edges align */}
        {snapGuides && (
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', inset: 0, zIndex: 999, pointerEvents: 'none' }}
          >
            {snapGuides.vertical !== undefined && (
              <line
                x1={snapGuides.vertical}
                y1={0}
                x2={snapGuides.vertical}
                y2={CANVAS_HEIGHT}
                stroke="rgba(249,115,22,0.6)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
            {snapGuides.horizontal !== undefined && (
              <line
                x1={0}
                y1={snapGuides.horizontal}
                x2={CANVAS_WIDTH}
                y2={snapGuides.horizontal}
                stroke="rgba(249,115,22,0.6)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
          </svg>
        )}

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
            onResizeStart={(handle, e) => onBlockResizeStart(block.id, handle, e)}
            onContextMenu={onBlockContextMenu ? (e) => onBlockContextMenu(block.id, e) : undefined}
          />
        ))}

        {/* SVG layer: shapes + connections */}
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          overflow="visible"
          style={{ position: 'absolute', inset: 0, zIndex: 1000, pointerEvents: 'none' }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {/* Shapes - sorted by zIndex */}
            {[...shapes]
              .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
              .map((shape) => (
                <g key={shape.id}>
                  <CanvasShapeComponent
                    shape={shape}
                    selected={selectedShapeIds.has(shape.id)}
                    onPointerDown={(e) => onShapePointerDown?.(shape.id, e)}
                    onContextMenu={onShapeContextMenu ? (e) => onShapeContextMenu(shape.id, e) : undefined}
                  />
                  {selectedShapeIds.has(shape.id) && (
                    <CanvasShapeHandles
                      shape={shape}
                      onResizeStart={(handle, e) => onShapeResizeStart?.(shape.id, handle, e)}
                      onRotateStart={(e) => onShapeRotateStart?.(shape.id, e)}
                      onPortPointerDown={(side, e) => onShapePortPointerDown?.(shape.id, side, e)}
                    />
                  )}
                </g>
              ))}
            {/* Draw preview */}
            {drawPreview && (
              <g style={{ pointerEvents: 'none' }}>
                {drawPreview.type === 'line' || drawPreview.type === 'arrow' ? (
                  <line
                    x1={drawPreview.x1 ?? 0}
                    y1={drawPreview.y1 ?? 0}
                    x2={drawPreview.x2 ?? 0}
                    y2={drawPreview.y2 ?? 0}
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                ) : drawPreview.type === 'rect' ? (
                  <rect
                    x={drawPreview.x ?? 0}
                    y={drawPreview.y ?? 0}
                    width={drawPreview.width ?? 0}
                    height={drawPreview.height ?? 0}
                    fill="none"
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                ) : drawPreview.type === 'ellipse' ? (
                  <ellipse
                    cx={(drawPreview.x ?? 0) + (drawPreview.width ?? 0) / 2}
                    cy={(drawPreview.y ?? 0) + (drawPreview.height ?? 0) / 2}
                    rx={(drawPreview.width ?? 0) / 2}
                    ry={(drawPreview.height ?? 0) / 2}
                    fill="none"
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                ) : drawPreview.type === 'triangle' ? (
                  <polygon
                    points={`${(drawPreview.x ?? 0) + (drawPreview.width ?? 0) / 2},${drawPreview.y ?? 0} ${drawPreview.x ?? 0},${(drawPreview.y ?? 0) + (drawPreview.height ?? 0)} ${(drawPreview.x ?? 0) + (drawPreview.width ?? 0)},${(drawPreview.y ?? 0) + (drawPreview.height ?? 0)}`}
                    fill="none"
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                ) : drawPreview.type === 'diamond' ? (
                  <polygon
                    points={`${(drawPreview.x ?? 0) + (drawPreview.width ?? 0) / 2},${drawPreview.y ?? 0} ${(drawPreview.x ?? 0) + (drawPreview.width ?? 0)},${(drawPreview.y ?? 0) + (drawPreview.height ?? 0) / 2} ${(drawPreview.x ?? 0) + (drawPreview.width ?? 0) / 2},${(drawPreview.y ?? 0) + (drawPreview.height ?? 0)} ${drawPreview.x ?? 0},${(drawPreview.y ?? 0) + (drawPreview.height ?? 0) / 2}`}
                    fill="none"
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                ) : drawPreview.type === 'freehand' && drawPreview.points && drawPreview.points.length >= 2 ? (
                  <path
                    d={drawPreview.points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px} ${py}`).join(' ')}
                    fill="none"
                    stroke="rgba(249,115,22,0.6)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
            )}
          </g>
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
            const closest = getClosestPortAmongEntities(blocks, shapes, cursor, connectionDrag.fromEntityId);
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
            const fromBlock = blocks.find((b) => b.id === connectionDrag.fromEntityId);
            const fromShape = shapes.find((s) => s.id === connectionDrag.fromEntityId);
            const from = fromBlock
              ? getPortPosition(fromBlock, connectionDrag.fromSide)
              : fromShape
                ? getShapePortPosition(fromShape, connectionDrag.fromSide)
                : null;
            if (!from) return null;
            const rect = containerRef.current.getBoundingClientRect();
            const toCanvas = (cx: number, cy: number) => ({
              x: (cx - rect.left - viewport.x) / viewport.zoom,
              y: (cy - rect.top - viewport.y) / viewport.zoom,
            });
            const cursor = toCanvas(connectionDrag.clientX, connectionDrag.clientY);
            const MAGNET_DIST = 70;
            const closest = getClosestPortAmongEntities(blocks, shapes, cursor, connectionDrag.fromEntityId);
            const useMagnet = closest && closest.dist < MAGNET_DIST;
            const toSide = useMagnet ? closest!.side : 'right';
            const to = useMagnet ? closest!.pos : cursor;
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
            const fromBlock = blocks.find((b) => b.id === conn.from.entityId);
            const fromShape = shapes.find((s) => s.id === conn.from.entityId);
            const toBlock = blocks.find((b) => b.id === conn.to.entityId);
            const toShape = shapes.find((s) => s.id === conn.to.entityId);
            const fromPt = fromBlock
              ? getPortPosition(fromBlock, conn.from.side)
              : fromShape
                ? getShapePortPosition(fromShape, conn.from.side)
                : null;
            const toPt = toBlock
              ? getPortPosition(toBlock, conn.to.side)
              : toShape
                ? getShapePortPosition(toShape, conn.to.side)
                : null;
            if (!fromPt || !toPt) return null;

            const rect = containerRef.current!.getBoundingClientRect();
            const cursor = screenToCanvas(connectionEndDrag.clientX, connectionEndDrag.clientY, rect, viewport);

            const MAGNET_DIST = 70;
            const excludeId = connectionEndDrag.whichEnd === 'from' ? conn.to.entityId : conn.from.entityId;
            const closest = getClosestPortAmongEntities(blocks, shapes, cursor, excludeId);
            const useMagnet = closest && closest.dist < MAGNET_DIST;

            let fromPtFinal, toPtFinal, fromSide: PortSide, toSide: PortSide;
            if (connectionEndDrag.whichEnd === 'from') {
              toPtFinal = toPt;
              toSide = conn.to.side;
              if (useMagnet && closest) {
                const targetBlock = blocks.find((b) => b.id === closest.entity.id);
                const targetShape = shapes.find((s) => s.id === closest.entity.id);
                fromPtFinal = targetBlock
                  ? getPortPosition(targetBlock, closest.side)
                  : targetShape
                    ? getShapePortPosition(targetShape, closest.side)
                    : cursor;
                fromSide = closest.side;
              } else {
                fromPtFinal = cursor;
                fromSide = 'right';
              }
            } else {
              fromPtFinal = fromPt;
              fromSide = conn.from.side;
              if (useMagnet && closest) {
                const targetBlock = blocks.find((b) => b.id === closest.entity.id);
                const targetShape = shapes.find((s) => s.id === closest.entity.id);
                toPtFinal = targetBlock
                  ? getPortPosition(targetBlock, closest.side)
                  : targetShape
                    ? getShapePortPosition(targetShape, closest.side)
                    : cursor;
                toSide = closest.side;
              } else {
                toPtFinal = cursor;
                toSide = 'left';
              }
            }

            const path = computeBezierPath(fromPtFinal, toPtFinal, fromSide, toSide);
            const angle = useMagnet ? getAngleToward(
              connectionEndDrag.whichEnd === 'from' ? fromPtFinal : toPtFinal,
              closest!.pos
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
                shapes={shapes}
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
