'use client';

import { useState } from 'react';
import type { CanvasShapeData, PortSide } from './canvas-types';
import { getShapeCenter, getShapeBoundingBox, getShapePorts } from './shape-utils';

const HANDLE_SIZE = 16;
const PORT_RADIUS = 10;
const ROTATION_HANDLE_DIST = 20;

interface CanvasShapeHandlesProps {
  shape: CanvasShapeData;
  onResizeStart?: (handle: string, e: React.PointerEvent) => void;
  onRotateStart?: (e: React.PointerEvent) => void;
  onPortPointerDown?: (side: PortSide, e: React.PointerEvent) => void;
}

export function CanvasShapeHandles({
  shape,
  onResizeStart,
  onRotateStart,
  onPortPointerDown,
}: CanvasShapeHandlesProps) {
  const [hovered, setHovered] = useState(false);
  const center = getShapeCenter(shape);
  const bbox = getShapeBoundingBox(shape);

  const getHandles = (): { id: string; x: number; y: number; cursor: string }[] => {
    if (shape.type === 'line' || shape.type === 'arrow') {
      const x1 = shape.x1 ?? 0;
      const y1 = shape.y1 ?? 0;
      const x2 = shape.x2 ?? 0;
      const y2 = shape.y2 ?? 0;
      return [
        { id: 'start', x: x1, y: y1, cursor: 'nwse-resize' },
        { id: 'end', x: x2, y: y2, cursor: 'nwse-resize' },
      ];
    }

    if (shape.type === 'freehand') return [];

    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;

    if (shape.type === 'rectangle' || shape.type === 'ellipse') {
      return [
        { id: 'nw', x, y, cursor: 'nwse-resize' },
        { id: 'n', x: x + w / 2, y, cursor: 'ns-resize' },
        { id: 'ne', x: x + w, y, cursor: 'nesw-resize' },
        { id: 'e', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
        { id: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
        { id: 's', x: x + w / 2, y: y + h, cursor: 'ns-resize' },
        { id: 'sw', x, y: y + h, cursor: 'nesw-resize' },
        { id: 'w', x, y: y + h / 2, cursor: 'ew-resize' },
      ];
    }

    if (shape.type === 'triangle') {
      return [
        { id: 'top', x: x + w / 2, y, cursor: 'ns-resize' },
        { id: 'left', x, y: y + h, cursor: 'nwse-resize' },
        { id: 'right', x: x + w, y: y + h, cursor: 'nesw-resize' },
      ];
    }

    if (shape.type === 'diamond') {
      return [
        { id: 'top', x: x + w / 2, y, cursor: 'ns-resize' },
        { id: 'right', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
        { id: 'bottom', x: x + w / 2, y: y + h, cursor: 'ns-resize' },
        { id: 'left', x, y: y + h / 2, cursor: 'ew-resize' },
      ];
    }

    return [];
  };

  const handles = getHandles();
  const showRotation = shape.type !== 'line' && shape.type !== 'arrow' && shape.type !== 'freehand';
  const ports = getShapePorts(shape);
  const rotation = shape.rotation ?? 0;
  const handleTransform = rotation ? `rotate(${rotation} ${center.x} ${center.y})` : undefined;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ pointerEvents: 'auto' }}
    >
      <g transform={handleTransform}>
      {handles.map((h) => (
        <circle
          key={h.id}
          cx={h.x}
          cy={h.y}
          r={HANDLE_SIZE / 2}
          fill="rgba(249,115,22,0.4)"
          stroke="rgba(249,115,22,0.6)"
          strokeWidth={1}
          style={{ cursor: h.cursor, pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart?.(h.id, e);
          }}
        />
      ))}
      {showRotation && (
        <g>
          <line
            x1={center.x}
            y1={center.y - bbox.height / 2}
            x2={center.x}
            y2={center.y - bbox.height / 2 - ROTATION_HANDLE_DIST}
            stroke="rgba(249,115,22,0.2)"
            strokeWidth={1}
          />
          <circle
            cx={center.x}
            cy={center.y - bbox.height / 2 - ROTATION_HANDLE_DIST}
            r={HANDLE_SIZE / 2}
            fill="rgba(249,115,22,0.4)"
            stroke="rgba(249,115,22,0.6)"
            strokeWidth={1}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onRotateStart?.(e);
            }}
          />
        </g>
      )}
      </g>
      {ports.map((port) => (
        <circle
          key={port.side}
          cx={port.x}
          cy={port.y}
          r={PORT_RADIUS}
          fill="rgba(249,115,22,0.5)"
          stroke="rgba(249,115,22,0.8)"
          strokeWidth={1}
          style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPortPointerDown?.(port.side, e);
          }}
        />
      ))}
    </g>
  );
}
