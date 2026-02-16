'use client';

import type { CanvasShapeData, ShapeStrokeColor } from './canvas-types';
import { SHAPE_STROKE_COLOR_SWATCHES } from './canvas-types';
import { getShapeCenter } from './shape-utils';

/** Invisible stroke/line width for expanded hit area - makes shapes easier to click */
const HIT_EXPAND_STROKE = 24;

const STROKE_DASH: Record<string, string> = {
  solid: 'none',
  dashed: '6,4',
  dotted: '2,4',
};

interface CanvasShapeProps {
  shape: CanvasShapeData;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function CanvasShapeComponent({
  shape,
  selected,
  onPointerDown,
  onContextMenu,
}: CanvasShapeProps) {
  const strokeColor = SHAPE_STROKE_COLOR_SWATCHES[shape.stroke?.color ?? 'white'] ?? SHAPE_STROKE_COLOR_SWATCHES.white;
  const strokeWidth = shape.stroke?.width ?? 2;
  const strokeDasharray = STROKE_DASH[shape.stroke?.style ?? 'solid'] ?? 'none';
  const fillColor = shape.fill?.color && shape.fill.color !== 'none'
    ? SHAPE_STROKE_COLOR_SWATCHES[shape.fill.color as ShapeStrokeColor] ?? 'transparent'
    : 'none';
  const fillOpacity = shape.fill?.opacity ?? 0.25;
  const rotation = shape.rotation ?? 0;
  const center = getShapeCenter(shape);

  const transform = rotation
    ? `rotate(${rotation} ${center.x} ${center.y})`
    : undefined;

  const commonProps = {
    stroke: selected ? '#f97316' : strokeColor,
    strokeWidth: selected ? Math.max(strokeWidth, 2) : strokeWidth,
    strokeDasharray,
    fill: fillColor !== 'none' ? fillColor : 'none',
    fillOpacity: fillColor !== 'none' ? fillOpacity : 0,
    transform,
    style: { pointerEvents: (fillColor !== 'none' ? 'visiblePainted' : 'stroke') as React.CSSProperties['pointerEvents'] },
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      onPointerDown(e);
    },
    onContextMenu: onContextMenu
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e);
        }
      : undefined,
  };

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x1 ?? 0;
    const y1 = shape.y1 ?? 0;
    const x2 = shape.x2 ?? 0;
    const y2 = shape.y2 ?? 0;
    return (
      <g>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={HIT_EXPAND_STROKE}
          fill="none"
          transform={transform}
          style={{ pointerEvents: 'stroke' }}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
          onContextMenu={onContextMenu ? (ev) => { ev.preventDefault(); ev.stopPropagation(); onContextMenu(ev); } : undefined}
        />
        <defs>
          {shape.arrowEnd && (
            <marker
              id={`shape-arrow-end-${shape.id}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={strokeColor} />
            </marker>
          )}
          {shape.arrowStart && (
            <marker
              id={`shape-arrow-start-${shape.id}`}
              markerWidth="8"
              markerHeight="6"
              refX="1"
              refY="3"
              orient="auto"
            >
              <polygon points="8 0, 0 3, 8 6" fill={strokeColor} />
            </marker>
          )}
        </defs>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          markerEnd={shape.arrowEnd ? `url(#shape-arrow-end-${shape.id})` : undefined}
          markerStart={shape.arrowStart ? `url(#shape-arrow-start-${shape.id})` : undefined}
          {...commonProps}
        />
      </g>
    );
  }

  if (shape.type === 'rectangle') {
    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;
    const r = shape.cornerRadius ?? 0;
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        {...commonProps}
      />
    );
  }

  if (shape.type === 'ellipse') {
    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;
    const hitHandler = { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e); }, onContextMenu: onContextMenu ? (ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); onContextMenu(ev); } : undefined };
    return (
      <>
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} stroke="transparent" strokeWidth={HIT_EXPAND_STROKE} fill="none" transform={transform} style={{ pointerEvents: 'stroke' }} {...hitHandler} />
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...commonProps} />
      </>
    );
  }

  if (shape.type === 'triangle') {
    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;
    const points = `${x + w / 2},${y} ${x},${y + h} ${x + w},${y + h}`;
    const hitHandler = { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e); }, onContextMenu: onContextMenu ? (ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); onContextMenu(ev); } : undefined };
    return (
      <>
        <polygon points={points} stroke="transparent" strokeWidth={HIT_EXPAND_STROKE} fill="none" transform={transform} style={{ pointerEvents: 'stroke' }} {...hitHandler} />
        <polygon points={points} {...commonProps} />
      </>
    );
  }

  if (shape.type === 'diamond') {
    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;
    const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
    return <polygon points={points} {...commonProps} />;
  }

  if (shape.type === 'freehand' && shape.points && shape.points.length >= 2) {
    const d = shape.points
      .map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px} ${py}`)
      .join(' ');
    const hitHandler = { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onPointerDown(e); }, onContextMenu: onContextMenu ? (ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); onContextMenu(ev); } : undefined };
    return (
      <>
        <path d={d} stroke="transparent" strokeWidth={HIT_EXPAND_STROKE} fill="none" transform={transform} style={{ pointerEvents: 'stroke' }} {...hitHandler} />
        <path d={d} {...commonProps} fill="none" />
      </>
    );
  }

  return null;
}
