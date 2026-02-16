/**
 * Canvas utilities: port positions, Bezier path calculation, hit testing
 */

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export interface BlockRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const BLOCK_PADDING = 14;

/** Get port center position in canvas coordinates (block has padding 14 on each side) */
export function getPortPosition(block: BlockRect, side: PortSide): Point {
  const totalW = block.width + BLOCK_PADDING * 2;
  const totalH = block.height + BLOCK_PADDING * 2;
  const cx = block.x + totalW / 2;
  const cy = block.y + totalH / 2;

  switch (side) {
    case 'top':
      return { x: cx, y: block.y };
    case 'bottom':
      return { x: cx, y: block.y + totalH };
    case 'left':
      return { x: block.x, y: cy };
    case 'right':
      return { x: block.x + totalW, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

/** Compute Bezier path between two ports (S-curve) */
export function computeBezierPath(
  from: Point,
  to: Point,
  fromSide: PortSide,
  toSide: PortSide,
  curvature = 80
): string {
  let c1: Point;
  let c2: Point;

  switch (fromSide) {
    case 'top':
      c1 = { x: from.x, y: from.y - curvature };
      break;
    case 'bottom':
      c1 = { x: from.x, y: from.y + curvature };
      break;
    case 'left':
      c1 = { x: from.x - curvature, y: from.y };
      break;
    case 'right':
      c1 = { x: from.x + curvature, y: from.y };
      break;
    default:
      c1 = { x: from.x, y: from.y };
  }

  switch (toSide) {
    case 'top':
      c2 = { x: to.x, y: to.y - curvature };
      break;
    case 'bottom':
      c2 = { x: to.x, y: to.y + curvature };
      break;
    case 'left':
      c2 = { x: to.x - curvature, y: to.y };
      break;
    case 'right':
      c2 = { x: to.x + curvature, y: to.y };
      break;
    default:
      c2 = { x: to.x, y: to.y };
  }

  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

/** Reverse a cubic Bezier path (for text to read left-to-right, never upside down) */
export function reverseBezierPath(path: string): string {
  const m = path.match(/M\s+([\d.-]+)\s+([\d.-]+)\s+C\s+([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)/);
  if (!m) return path;
  const [, x0, y0, x1, y1, x2, y2, x3, y3] = m.map(Number);
  return `M ${x3} ${y3} C ${x2} ${y2}, ${x1} ${y1}, ${x0} ${y0}`;
}

/** Tangent angle at t=0.5 of cubic Bezier (degrees, 0=right, 90=down). Text is upside down when angle in (90, 270). */
export function getBezierTangentAngleAtMid(path: string): number {
  const m = path.match(/M\s+([\d.-]+)\s+([\d.-]+)\s+C\s+([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)/);
  if (!m) return 0;
  const [, x0, y0, x1, y1, x2, y2, x3, y3] = m.map(Number);
  const dx = 0.75 * (x1 - x0) + 1.5 * (x2 - x1) + 0.75 * (x3 - x2);
  const dy = 0.75 * (y1 - y0) + 1.5 * (y2 - y1) + 0.75 * (y3 - y2);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Hit test: find block at point (in canvas coordinates, includes padding) */
export function getBlockAtPoint(blocks: BlockRect[], x: number, y: number): BlockRect | null {
  const pad = BLOCK_PADDING * 2;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (x >= b.x && x <= b.x + b.width + pad && y >= b.y && y <= b.y + b.height + pad) {
      return b;
    }
  }
  return null;
}

/** Arrow angle when connecting TO a side - arrow points INTO the block */
export function getArrowAngleForToSide(toSide: PortSide): number {
  switch (toSide) {
    case 'top': return 90;
    case 'bottom': return 270;
    case 'left': return 0;
    case 'right': return 180;
    default: return 0;
  }
}

/** Arrow angle for the side the line EXITS from (used during drag) */
export function getArrowAngleForSide(side: PortSide): number {
  switch (side) {
    case 'top': return 270;
    case 'bottom': return 90;
    case 'left': return 180;
    case 'right': return 0;
    default: return 0;
  }
}

/** Angle from point A to point B in degrees */
export function getAngleToward(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** Get the port side whose center is closest to the given point */
export function getClosestPort(block: BlockRect, point: Point): PortSide {
  const ports: { side: PortSide; pos: Point }[] = (
    ['top', 'right', 'bottom', 'left'] as PortSide[]
  ).map((side) => ({ side, pos: getPortPosition(block, side) }));
  let best = ports[0];
  let bestDist = Infinity;
  for (const p of ports) {
    const d = (p.pos.x - point.x) ** 2 + (p.pos.y - point.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best.side;
}

/** Find closest port among all blocks (excluding one), returns info or null */
export function getClosestPortAmongBlocks(
  blocks: BlockRect[],
  point: Point,
  excludeBlockId?: string
): { block: BlockRect; side: PortSide; pos: Point; dist: number } | null {
  let best: { block: BlockRect; side: PortSide; pos: Point; dist: number } | null = null;
  for (const block of blocks) {
    if (block.id === excludeBlockId) continue;
    const side = getClosestPort(block, point);
    const pos = getPortPosition(block, side);
    const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
    if (!best || dist < best.dist) {
      best = { block, side, pos, dist };
    }
  }
  return best;
}

/** Convert screen coordinates to canvas coordinates */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: { x: number; y: number; zoom: number }
): Point {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  };
}
