/**
 * Entity utilities: resolve blocks and shapes for connections
 */

import { getBlockAtPoint, getPortPosition, getClosestPort } from './canvas-utils';
import { getShapeAtPoint, getShapeNearPoint, getShapePorts, getShapePortPosition } from './shape-utils';
import type { BlockRect, Point, PortSide } from './canvas-utils';
import type { CanvasShapeData } from './canvas-types';

export type EntityKind = 'block' | 'shape';

export interface EntityAtPoint {
  kind: EntityKind;
  id: string;
  block?: BlockRect;
  shape?: CanvasShapeData;
}

/** Get entity (block or shape) at point. Blocks take precedence for overlap. */
export function getEntityAtPoint(
  blocks: BlockRect[],
  shapes: CanvasShapeData[],
  x: number,
  y: number
): EntityAtPoint | null {
  const block = getBlockAtPoint(blocks, x, y);
  if (block) return { kind: 'block', id: block.id, block };

  const shape = getShapeAtPoint(shapes, x, y);
  if (shape) return { kind: 'shape', id: shape.id, shape };

  return null;
}


/** Get port position for block or shape */
export function getEntityPortPosition(
  entity: EntityAtPoint,
  side: PortSide
): Point {
  if (entity.kind === 'block' && entity.block) {
    return getPortPosition(entity.block, side);
  }
  if (entity.kind === 'shape' && entity.shape) {
    return getShapePortPosition(entity.shape, side);
  }
  return { x: 0, y: 0 };
}

/** Find closest port among blocks and shapes */
export function getClosestPortAmongEntities(
  blocks: BlockRect[],
  shapes: CanvasShapeData[],
  point: Point,
  excludeId?: string
): { entity: EntityAtPoint; side: PortSide; pos: Point; dist: number } | null {
  let best: { entity: EntityAtPoint; side: PortSide; pos: Point; dist: number } | null = null;

  for (const block of blocks) {
    if (block.id === excludeId) continue;
    const side = getClosestPort(block, point);
    const pos = getPortPosition(block, side);
    const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
    if (!best || dist < best.dist) {
      best = { entity: { kind: 'block', id: block.id, block }, side, pos, dist };
    }
  }

  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    const ports = getShapePorts(shape);
    for (const port of ports) {
      const dist = Math.sqrt((port.x - point.x) ** 2 + (port.y - point.y) ** 2);
      if (!best || dist < best.dist) {
        best = {
          entity: { kind: 'shape', id: shape.id, shape },
          side: port.side,
          pos: { x: port.x, y: port.y },
          dist,
        };
      }
    }
  }

  return best;
}
