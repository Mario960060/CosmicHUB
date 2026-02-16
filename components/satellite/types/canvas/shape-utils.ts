/**
 * Shape utilities: port positions, hit testing, path smoothing
 */

import type { CanvasShapeData, PortSide } from './canvas-types';

export interface PortInfo {
  side: PortSide;
  x: number;
  y: number;
}

/** Get shape center for rotation transform */
export function getShapeCenter(shape: CanvasShapeData): { x: number; y: number } {
  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x1 ?? 0;
    const y1 = shape.y1 ?? 0;
    const x2 = shape.x2 ?? 0;
    const y2 = shape.y2 ?? 0;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  if (shape.type === 'freehand' && shape.points && shape.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of shape.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  const x = shape.x ?? 0;
  const y = shape.y ?? 0;
  const w = shape.width ?? 0;
  const h = shape.height ?? 0;
  return { x: x + w / 2, y: y + h / 2 };
}

/** Apply rotation to a point around center */
function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** Get ports for a shape (unrotated positions in shape-local space, then we apply rotation) */
function getShapePortsLocal(shape: CanvasShapeData): PortInfo[] {
  const rot = shape.rotation ?? 0;
  const center = getShapeCenter(shape);

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x1 ?? 0;
    const y1 = shape.y1 ?? 0;
    const x2 = shape.x2 ?? 0;
    const y2 = shape.y2 ?? 0;
    const p1 = rot ? rotatePoint(x1, y1, center.x, center.y, rot) : { x: x1, y: y1 };
    const p2 = rot ? rotatePoint(x2, y2, center.x, center.y, rot) : { x: x2, y: y2 };
    const leftmost = p1.x <= p2.x ? p1 : p2;
    const rightmost = p1.x <= p2.x ? p2 : p1;
    return [
      { side: 'left', x: leftmost.x, y: leftmost.y },
      { side: 'right', x: rightmost.x, y: rightmost.y },
    ];
  }

  if (shape.type === 'freehand') return [];

  const x = shape.x ?? 0;
  const y = shape.y ?? 0;
  const w = shape.width ?? 0;
  const h = shape.height ?? 0;

  if (shape.type === 'rectangle') {
    const ports: PortInfo[] = [
      { side: 'top', x: x + w / 2, y },
      { side: 'right', x: x + w, y: y + h / 2 },
      { side: 'bottom', x: x + w / 2, y: y + h },
      { side: 'left', x, y: y + h / 2 },
    ];
    return rot ? ports.map((p) => ({ ...p, ...rotatePoint(p.x, p.y, center.x, center.y, rot) })) : ports;
  }

  if (shape.type === 'ellipse') {
    const ports: PortInfo[] = [
      { side: 'top', x: x + w / 2, y },
      { side: 'right', x: x + w, y: y + h / 2 },
      { side: 'bottom', x: x + w / 2, y: y + h },
      { side: 'left', x, y: y + h / 2 },
    ];
    return rot ? ports.map((p) => ({ ...p, ...rotatePoint(p.x, p.y, center.x, center.y, rot) })) : ports;
  }

  if (shape.type === 'triangle') {
    const top = { x: x + w / 2, y };
    const left = { x, y: y + h };
    const right = { x: x + w, y: y + h };
    const centroid = { x: x + w / 2, y: y + (h * 2) / 3 };
    const ports: PortInfo[] = [
      { side: 'top', ...top },
      { side: 'left', ...left },
      { side: 'right', ...right },
      { side: 'bottom', ...centroid },
    ];
    return rot ? ports.map((p) => ({ ...p, ...rotatePoint(p.x, p.y, center.x, center.y, rot) })) : ports;
  }

  if (shape.type === 'diamond') {
    const top = { x: x + w / 2, y };
    const right = { x: x + w, y: y + h / 2 };
    const bottom = { x: x + w / 2, y: y + h };
    const left = { x, y: y + h / 2 };
    const ports: PortInfo[] = [
      { side: 'top', ...top },
      { side: 'right', ...right },
      { side: 'bottom', ...bottom },
      { side: 'left', ...left },
    ];
    return rot ? ports.map((p) => ({ ...p, ...rotatePoint(p.x, p.y, center.x, center.y, rot) })) : ports;
  }

  return [];
}

/** Get all ports for a shape with world coordinates */
export function getShapePorts(shape: CanvasShapeData): PortInfo[] {
  return getShapePortsLocal(shape);
}

/** Get port position for a specific side */
export function getShapePortPosition(shape: CanvasShapeData, side: PortSide): { x: number; y: number } {
  const ports = getShapePorts(shape);
  const p = ports.find((pr) => pr.side === side);
  if (p) return { x: p.x, y: p.y };
  return getShapeCenter(shape);
}

/** For line/arrow: angle of the segment pointing toward the given port (for orthogonal extension). Radians. */
export function getLineSegmentAngleTowardPort(shape: CanvasShapeData, side: PortSide): number {
  if (shape.type !== 'line' && shape.type !== 'arrow') return 0;
  const x1 = shape.x1 ?? 0;
  const y1 = shape.y1 ?? 0;
  const x2 = shape.x2 ?? 0;
  const y2 = shape.y2 ?? 0;
  const left = x1 <= x2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
  const right = x1 <= x2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
  const [from, to] = side === 'left' ? [right, left] : [left, right];
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Extra padding for hit testing - makes shapes easier to click */
const HIT_EXPAND = 14;

/** Hit test: find shape at point (reverse order for z-index) */
export function getShapeAtPoint(
  shapes: CanvasShapeData[],
  x: number,
  y: number
): CanvasShapeData | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (hitTestShape(s, x, y)) return s;
  }
  return null;
}

/** Find closest shape within maxDist pixels (for snap-to-nearest when clicking near) */
export function getShapeNearPoint(
  shapes: CanvasShapeData[],
  x: number,
  y: number,
  maxDist: number = 20
): { shape: CanvasShapeData; dist: number } | null {
  let best: { shape: CanvasShapeData; dist: number } | null = null;
  for (const s of shapes) {
    const d = distToShape(s, x, y);
    if (d <= maxDist && (!best || d < best.dist)) {
      best = { shape: s, dist: d };
    }
  }
  return best;
}

function distToShape(shape: CanvasShapeData, x: number, y: number): number {
  const bbox = getShapeBoundingBox(shape);
  const pad = HIT_EXPAND;
  const minX = bbox.x - pad;
  const minY = bbox.y - pad;
  const maxX = bbox.x + bbox.width + pad;
  const maxY = bbox.y + bbox.height + pad;
  const dx = x < minX ? minX - x : x > maxX ? x - maxX : 0;
  const dy = y < minY ? minY - y : y > maxY ? y - maxY : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

function hitTestShape(shape: CanvasShapeData, x: number, y: number): boolean {
  const rot = shape.rotation ?? 0;
  const center = getShapeCenter(shape);

  const unrotate = (px: number, py: number) => {
    if (!rot) return { x: px, y: py };
    return rotatePoint(px, py, center.x, center.y, -rot);
  };

  const pt = unrotate(x, y);

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x1 ?? 0;
    const y1 = shape.y1 ?? 0;
    const x2 = shape.x2 ?? 0;
    const y2 = shape.y2 ?? 0;
    const dist = distToSegment(pt.x, pt.y, x1, y1, x2, y2);
    const stroke = (shape.stroke?.width ?? 2) * 6;
    const tolerance = Math.max(stroke, 20);
    return dist <= tolerance;
  }

  if (shape.type === 'freehand' && shape.points && shape.points.length >= 2) {
    for (let i = 0; i < shape.points.length - 1; i++) {
      const [x1, y1] = shape.points[i];
      const [x2, y2] = shape.points[i + 1];
      if (distToSegment(pt.x, pt.y, x1, y1, x2, y2) <= HIT_EXPAND) return true;
    }
    return false;
  }

  const sx = shape.x ?? 0;
  const sy = shape.y ?? 0;
  const sw = shape.width ?? 0;
  const sh = shape.height ?? 0;
  const pad = HIT_EXPAND;

  if (shape.type === 'rectangle') {
    return pt.x >= sx - pad && pt.x <= sx + sw + pad && pt.y >= sy - pad && pt.y <= sy + sh + pad;
  }

  if (shape.type === 'ellipse') {
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const rx = sw / 2 + pad;
    const ry = sh / 2 + pad;
    return ((pt.x - cx) ** 2) / (rx * rx) + ((pt.y - cy) ** 2) / (ry * ry) <= 1;
  }

  if (shape.type === 'triangle') {
    const top = [sx + sw / 2, sy - pad];
    const left = [sx - pad, sy + sh + pad];
    const right = [sx + sw + pad, sy + sh + pad];
    return pointInTriangle(pt.x, pt.y, top[0], top[1], left[0], left[1], right[0], right[1]);
  }

  if (shape.type === 'diamond') {
    const top = [sx + sw / 2, sy - pad];
    const right = [sx + sw + pad, sy + sh / 2];
    const bottom = [sx + sw / 2, sy + sh + pad];
    const left = [sx - pad, sy + sh / 2];
    return pointInTriangle(pt.x, pt.y, top[0], top[1], left[0], left[1], right[0], right[1]) ||
      pointInTriangle(pt.x, pt.y, bottom[0], bottom[1], right[0], right[1], left[0], left[1]);
  }

  return false;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / (len * len);
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
}

function pointInTriangle(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): boolean {
  const sign = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/** Get axis-aligned bounding box of shape */
export function getShapeBoundingBox(shape: CanvasShapeData): { x: number; y: number; width: number; height: number } {
  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x1 ?? 0;
    const y1 = shape.y1 ?? 0;
    const x2 = shape.x2 ?? 0;
    const y2 = shape.y2 ?? 0;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    return {
      x: minX,
      y: minY,
      width: Math.abs(x2 - x1) || 1,
      height: Math.abs(y2 - y1) || 1,
    };
  }
  if (shape.type === 'freehand' && shape.points && shape.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of shape.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
  }
  const x = shape.x ?? 0;
  const y = shape.y ?? 0;
  const w = shape.width ?? 0;
  const h = shape.height ?? 0;
  return { x, y, width: w, height: h };
}

/** Snap angle to nearest 45° (0, 45, 90, 135, 180, 225, 270, 315) */
export function snapAngleTo45(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const step = 45;
  const nearest = Math.round(normalized / step) * step;
  return nearest % 360;
}

/** Snap angle to 90° from previous segment (orthogonal extension). Returns prevAngle+90 or prevAngle-90, whichever is closer. */
export function snapAngleTo90FromPrevious(angle: number, prevAngle: number): number {
  const a = ((angle % 360) + 360) % 360;
  const p = ((prevAngle % 360) + 360) % 360;
  const opt1 = (p + 90) % 360;
  const opt2 = (p - 90 + 360) % 360;
  const d1 = Math.min(Math.abs(a - opt1), 360 - Math.abs(a - opt1));
  const d2 = Math.min(Math.abs(a - opt2), 360 - Math.abs(a - opt2));
  return d1 <= d2 ? opt1 : opt2;
}

/** Snap angle to nearest 15° */
export function snapAngleTo15(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const step = 15;
  const nearest = Math.round(normalized / step) * step;
  return nearest % 360;
}

/** Simplify and smooth freehand path - reduce points + Catmull-Rom smoothing */
export function simplifyFreehandPath(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return points;

  const tolerance = 2;
  const simplified = douglasPeucker(points, tolerance);

  if (simplified.length <= 2) return simplified;

  return smoothWithCatmullRom(simplified, 4);
}

function douglasPeucker(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dist = distToSegment(px, py, sx, sy, ex, ey);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist < tolerance) {
    return [points[0], points[points.length - 1]];
  }

  const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
  const right = douglasPeucker(points.slice(maxIdx), tolerance);
  return [...left.slice(0, -1), ...right];
}

function smoothWithCatmullRom(points: [number, number][], subdivisions: number): [number, number][] {
  const result: [number, number][] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];

    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      result.push([x, y]);
    }
  }
  result.push(points[n - 1]);
  return result;
}
