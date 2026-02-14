// CURSOR: Click and hover detection

import type { CanvasObject, Point, ViewState } from './types';
import { screenToCanvas } from './zoom';

// Check if point is inside object
export function isPointInObject(
  point: Point,
  obj: CanvasObject
): boolean {
  const dx = point.x - obj.position.x;
  const dy = point.y - obj.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= obj.radius;
}

// Find object at screen position
export function findObjectAtPosition(
  screenX: number,
  screenY: number,
  objects: CanvasObject[],
  viewState: ViewState
): CanvasObject | undefined {
  const canvasPoint = screenToCanvas(screenX, screenY, viewState);

  // Check from smallest to largest (prioritize smaller objects)
  const sorted = [...objects].sort((a, b) => a.radius - b.radius);

  for (const obj of sorted) {
    if (isPointInObject(canvasPoint, obj)) {
      return obj;
    }
  }

  return undefined;
}

// Handle click on object
export function handleObjectClick(
  obj: CanvasObject,
  currentZoom: string,
  navigate: (path: string) => void,
  onZoomChange: (level: string, focusId?: string) => void
) {
  switch (obj.type) {
    case 'project':
      if (currentZoom === 'galaxy') {
        // Zoom into project
        onZoomChange('project', obj.id);
      } else {
        // Zoom out to galaxy
        onZoomChange('galaxy');
      }
      break;

    case 'module':
      if (currentZoom === 'project') {
        // Zoom into module
        onZoomChange('module', obj.id);
      } else {
        // Zoom out to project
        onZoomChange('project', obj.metadata?.projectId);
      }
      break;

    case 'task':
    case 'subtask':
      // Navigate to workstation with task selected
      navigate(`/workstation?task=${obj.id}`);
      break;
  }
}
