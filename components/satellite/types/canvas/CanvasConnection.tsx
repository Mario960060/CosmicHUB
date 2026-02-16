'use client';

import type { CanvasConnection as ConnType, CanvasBlock, CanvasShape, LabelFontSize } from './useCanvasState';
import { getPortPosition, computeBezierPath, getArrowAngleForToSide, reverseBezierPath, getBezierTangentAngleAtMid } from './canvas-utils';
import { getShapePortPosition } from './shape-utils';

const LABEL_FONT_SIZES: Record<LabelFontSize, number> = { sm: 10, md: 16, lg: 20 };
const HIT_STROKE_WIDTH = 16;

interface CanvasConnectionProps {
  connection: ConnType;
  blocks: CanvasBlock[];
  shapes?: CanvasShape[];
  selected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent, whichEnd: 'from' | 'to') => void;
  dimmed?: boolean;
}

const STROKE_DASH: Record<ConnType['style'], string> = {
  solid: 'none',
  dashed: '5,5',
  dotted: '2,3',
};

function getEntityPortPosition(
  blocks: CanvasBlock[],
  shapes: CanvasShape[],
  entityId: string,
  side: 'top' | 'bottom' | 'left' | 'right'
): { x: number; y: number } | null {
  const block = blocks.find((b) => b.id === entityId);
  if (block) return getPortPosition(block, side);
  const shape = shapes.find((s) => s.id === entityId);
  if (shape) return getShapePortPosition(shape, side);
  return null;
}

export function CanvasConnection({
  connection,
  blocks,
  shapes = [],
  selected,
  onClick,
  onContextMenu,
  onPointerDown,
  dimmed,
}: CanvasConnectionProps) {
  const from = getEntityPortPosition(blocks, shapes, connection.from.entityId, connection.from.side);
  const to = getEntityPortPosition(blocks, shapes, connection.to.entityId, connection.to.side);
  if (!from || !to) return null;

  const fromSide = connection.from.side;
  const toSide = connection.to.side;
  const path = computeBezierPath(from, to, fromSide, toSide);

  const strokeColor = dimmed ? 'rgba(255,255,255,0.06)' : (selected ? '#f97316' : 'rgba(255,255,255,0.15)');
  const strokeWidth = selected ? 2 : 1.5;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!onPointerDown) return;
    (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId);
    const svg = (e.target as SVGElement).ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());
    const dx = svgPt.x - from.x;
    const dy = svgPt.y - from.y;
    const distFrom = Math.sqrt(dx * dx + dy * dy);
    const ex = svgPt.x - to.x;
    const ey = svgPt.y - to.y;
    const distTo = Math.sqrt(ex * ex + ey * ey);
    const whichEnd = distFrom <= distTo ? 'from' : 'to';
    onPointerDown(e, whichEnd);
  };

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={onPointerDown ? handlePointerDown : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={STROKE_DASH[connection.style]}
        markerEnd={connection.arrow !== 'none' ? (() => {
          const angle = getArrowAngleForToSide(toSide);
          return selected ? `url(#arrowhead-selected-${angle})` : `url(#arrowhead-${angle})`;
        })() : undefined}
        markerStart={connection.arrow === 'both' ? (selected ? 'url(#arrowhead-start-selected)' : 'url(#arrowhead-start)') : undefined}
        style={{
          filter: selected ? 'drop-shadow(0 0 4px rgba(249,115,22,0.3))' : undefined,
        }}
      />
      {/* Invisible wide stroke for easy clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'stroke' }}
      />
      {connection.label && (() => {
        const angle = getBezierTangentAngleAtMid(path);
        const upsideDown = angle > 90 && angle < 270;
        const textPathD = upsideDown ? reverseBezierPath(path) : path;
        const fontSize = LABEL_FONT_SIZES[connection.labelFontSize ?? 'md'];
        return (
          <>
            <path id={`path-label-${connection.id}`} d={textPathD} fill="none" stroke="none" />
            <text
              fill={connection.labelColor ?? 'rgba(255,255,255,0.45)'}
              fontSize={fontSize}
              fontFamily="Rajdhani, sans-serif"
              fontWeight={600}
              letterSpacing={0.3}
              style={{ pointerEvents: 'none' }}
            >
              <textPath href={`#path-label-${connection.id}`} startOffset="50%" textAnchor="middle">
                <tspan dy={-fontSize * 0.5}>{connection.label}</tspan>
              </textPath>
            </text>
          </>
        );
      })()}
    </g>
  );
}
