/**
 * Testy dla lib/galactic/interactions.ts
 * Hit detection: czy klik trafił w obiekt, znajdowanie obiektu na pozycji
 */
import { describe, it, expect } from 'vitest';
import { isPointInObject, findObjectAtPosition } from '@/lib/galactic/interactions';
import type { CanvasObject, ViewState } from '@/lib/galactic/types';

const makeObject = (id: string, x: number, y: number, radius: number): CanvasObject => ({
  id,
  type: 'module',
  name: `Object ${id}`,
  position: { x, y },
  radius,
  color: '#fff',
});

describe('isPointInObject', () => {
  const obj = makeObject('a', 100, 100, 30);

  it('returns true when point is inside', () => {
    expect(isPointInObject({ x: 110, y: 110 }, obj)).toBe(true);
  });

  it('returns true when point is exactly on edge', () => {
    expect(isPointInObject({ x: 130, y: 100 }, obj)).toBe(true);
  });

  it('returns false when point is outside', () => {
    expect(isPointInObject({ x: 200, y: 200 }, obj)).toBe(false);
  });

  it('returns true when point is at center', () => {
    expect(isPointInObject({ x: 100, y: 100 }, obj)).toBe(true);
  });
});

describe('findObjectAtPosition', () => {
  const viewState: ViewState = {
    scale: 1,
    offset: { x: 0, y: 0 },
    zoomLevel: 'galaxy',
  };

  const objects = [
    makeObject('big', 200, 200, 50),
    makeObject('small', 210, 210, 15),
  ];

  it('returns undefined when clicking empty space', () => {
    expect(findObjectAtPosition(500, 500, objects, viewState)).toBeUndefined();
  });

  it('finds object when clicking on it', () => {
    const result = findObjectAtPosition(200, 200, objects, viewState);
    expect(result).toBeDefined();
  });

  it('prioritizes smaller object when overlapping', () => {
    // Click at 210,210 - inside both big (radius 50) and small (radius 15)
    const result = findObjectAtPosition(210, 210, objects, viewState);
    expect(result?.id).toBe('small');
  });

  it('returns big object when only it covers the point', () => {
    // Click at 160,200 - inside big (distance=40 < 50) but not small (distance=~51 > 15)
    const result = findObjectAtPosition(160, 200, objects, viewState);
    expect(result?.id).toBe('big');
  });

  it('works with zoom (scale 2)', () => {
    const zoomed: ViewState = { scale: 2, offset: { x: 0, y: 0 }, zoomLevel: 'project' };
    // Screen 400,400 -> canvas 200,200 (at scale 2)
    const result = findObjectAtPosition(400, 400, objects, zoomed);
    expect(result).toBeDefined();
  });
});
