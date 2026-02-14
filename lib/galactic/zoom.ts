// CURSOR: Zoom level transitions and camera control

import type { ZoomLevel, ViewState, Point } from './types';

export interface ZoomConfig {
  scale: number;
  offset: Point;
  duration: number; // ms
}

// Get target zoom config for level
export function getZoomConfig(
  level: ZoomLevel,
  targetPosition?: Point,
  canvasWidth: number = 800,
  canvasHeight: number = 600
): ZoomConfig {
  switch (level) {
    case 'galaxy':
      return {
        scale: 1,
        offset: { x: 0, y: 0 },
        duration: 800,
      };

    case 'project':
      return {
        scale: 2,
        offset: targetPosition
          ? {
              x: canvasWidth / 2 - targetPosition.x * 2,
              y: canvasHeight / 2 - targetPosition.y * 2,
            }
          : { x: 0, y: 0 },
        duration: 800,
      };

    case 'module':
      return {
        scale: 3,
        offset: targetPosition
          ? {
              x: canvasWidth / 2 - targetPosition.x * 3,
              y: canvasHeight / 2 - targetPosition.y * 3,
            }
          : { x: 0, y: 0 },
        duration: 800,
      };

    default:
      return {
        scale: 1,
        offset: { x: 0, y: 0 },
        duration: 800,
      };
  }
}

// Smooth interpolation between two values
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Easing function for smooth zoom
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Animate zoom transition
export function animateZoom(
  currentState: ViewState,
  targetConfig: ZoomConfig,
  onUpdate: (state: ViewState) => void,
  onComplete?: () => void
) {
  const startTime = Date.now();
  const startScale = currentState.scale;
  const startOffset = currentState.offset;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / targetConfig.duration, 1);
    const eased = easeInOutCubic(progress);

    const newState: ViewState = {
      ...currentState,
      scale: lerp(startScale, targetConfig.scale, eased),
      offset: {
        x: lerp(startOffset.x, targetConfig.offset.x, eased),
        y: lerp(startOffset.y, targetConfig.offset.y, eased),
      },
    };

    onUpdate(newState);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(animate);
}

// Transform screen coordinates to canvas coordinates
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewState: ViewState
): Point {
  return {
    x: (screenX - viewState.offset.x) / viewState.scale,
    y: (screenY - viewState.offset.y) / viewState.scale,
  };
}

// Transform canvas coordinates to screen coordinates
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewState: ViewState
): Point {
  return {
    x: canvasX * viewState.scale + viewState.offset.x,
    y: canvasY * viewState.scale + viewState.offset.y,
  };
}
