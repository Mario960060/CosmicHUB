/**
 * Testy dla lib/galactic/zoom.ts
 * Zoom config, easing, screen<->canvas coordinate conversion
 */
import { describe, it, expect } from 'vitest';
import {
  getZoomConfig,
  lerp,
  easeInOutCubic,
  screenToCanvas,
  canvasToScreen,
} from '@/lib/galactic/zoom';

describe('getZoomConfig', () => {
  it('galaxy level: scale 1, offset 0,0', () => {
    const config = getZoomConfig('galaxy');
    expect(config.scale).toBe(1);
    expect(config.offset).toEqual({ x: 0, y: 0 });
  });

  it('project level: scale 2', () => {
    const config = getZoomConfig('project', { x: 100, y: 100 }, 800, 600);
    expect(config.scale).toBe(2);
  });

  it('module level: scale 3', () => {
    const config = getZoomConfig('module', { x: 100, y: 100 }, 800, 600);
    expect(config.scale).toBe(3);
  });

  it('project level centers on target position', () => {
    const config = getZoomConfig('project', { x: 200, y: 150 }, 800, 600);
    // offset = canvasWidth/2 - targetX * scale
    expect(config.offset.x).toBe(800 / 2 - 200 * 2);
    expect(config.offset.y).toBe(600 / 2 - 150 * 2);
  });

  it('without target position: offset 0,0', () => {
    const config = getZoomConfig('project');
    expect(config.offset).toEqual({ x: 0, y: 0 });
  });

  it('unknown level falls back to galaxy defaults', () => {
    const config = getZoomConfig('unknown' as any);
    expect(config.scale).toBe(1);
  });
});

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at t=0.5', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('first half accelerates (value < t)', () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });

  it('second half decelerates (value > t)', () => {
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
  });
});

describe('screenToCanvas / canvasToScreen', () => {
  const viewState = {
    scale: 2,
    offset: { x: 100, y: 50 },
    zoomLevel: 'project' as const,
  };

  it('screenToCanvas converts correctly', () => {
    const result = screenToCanvas(300, 250, viewState);
    // x = (300 - 100) / 2 = 100
    // y = (250 - 50) / 2 = 100
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it('canvasToScreen converts correctly', () => {
    const result = canvasToScreen(100, 100, viewState);
    // x = 100 * 2 + 100 = 300
    // y = 100 * 2 + 50 = 250
    expect(result.x).toBe(300);
    expect(result.y).toBe(250);
  });

  it('round-trip: screen -> canvas -> screen returns original', () => {
    const screenX = 400;
    const screenY = 300;
    const canvas = screenToCanvas(screenX, screenY, viewState);
    const screen = canvasToScreen(canvas.x, canvas.y, viewState);
    expect(screen.x).toBeCloseTo(screenX);
    expect(screen.y).toBeCloseTo(screenY);
  });

  it('scale 1, offset 0 = identity', () => {
    const identity = { scale: 1, offset: { x: 0, y: 0 }, zoomLevel: 'galaxy' as const };
    const result = screenToCanvas(150, 200, identity);
    expect(result.x).toBe(150);
    expect(result.y).toBe(200);
  });
});
