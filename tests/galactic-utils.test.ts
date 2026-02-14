/**
 * Testy dla lib/galactic/utils.ts
 * Math utilities: distance, angle, clamp, lerp, mapRange
 */
import { describe, it, expect } from 'vitest';
import { distance, angle, clamp, lerp, mapRange } from '@/lib/galactic/utils';

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('calculates horizontal distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
  });

  it('calculates diagonal distance (3-4-5 triangle)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('angle', () => {
  it('returns 0 for point to the right', () => {
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });

  it('returns PI/2 for point above', () => {
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
  });

  it('returns PI for point to the left', () => {
    expect(angle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(Math.PI);
  });
});

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles edge: value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('handles edge: value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
  });

  it('returns end when t=1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('mapRange', () => {
  it('maps 0-1 to 0-100', () => {
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
  });

  it('maps 0-10 to 0-1', () => {
    expect(mapRange(5, 0, 10, 0, 1)).toBe(0.5);
  });

  it('maps min to outMin', () => {
    expect(mapRange(0, 0, 10, 100, 200)).toBe(100);
  });

  it('maps max to outMax', () => {
    expect(mapRange(10, 0, 10, 100, 200)).toBe(200);
  });
});
