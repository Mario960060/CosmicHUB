'use client';

import { useRef, useCallback, useState } from 'react';
import { snapAngleTo45, snapAngleTo90FromPrevious } from '../shape-utils';
import { simplifyFreehandPath } from '../shape-utils';
import type { CanvasShape } from '../useCanvasState';
import type { CanvasTool } from '../useCanvasKeyboard';

const GRID_SIZE = 24;

function snapToGrid(x: number, gridEnabled: boolean): number {
  if (!gridEnabled) return x;
  return Math.round(x / GRID_SIZE) * GRID_SIZE;
}

interface UseDrawingToolsProps {
  addShape: (shape: Omit<CanvasShape, 'id'>) => string;
  activeTool: CanvasTool;
  toolLocked: boolean;
  gridEnabled: boolean;
  onToolChange: (tool: CanvasTool) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: { x: number; y: number; zoom: number };
  screenToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
}

export function useDrawingTools({
  addShape,
  activeTool,
  toolLocked,
  gridEnabled,
  onToolChange,
  containerRef,
  viewport,
  screenToCanvas,
}: UseDrawingToolsProps) {
  const drawRef = useRef<{
    tool: CanvasTool;
    startX: number;
    startY: number;
    points?: [number, number][];
    /** When extending from line endpoint: previous segment angle in degrees, for Shift=orthogonal snap */
    extendFromAngle?: number;
  } | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const [preview, setPreview] = useState<{
    type: CanvasTool;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: [number, number][];
  } | null>(null);

  const [angleIndicator, setAngleIndicator] = useState<{ angle: number; length: number } | null>(null);

  const startFromPoint = useCallback(
    (sx: number, sy: number, extendFromAngleDeg?: number, toolOverride?: 'line' | 'arrow') => {
      if (!containerRef.current) return;
      const tool = toolOverride ?? (activeTool === 'line' || activeTool === 'arrow' ? activeTool : 'line');
      drawRef.current = {
        tool,
        startX: sx,
        startY: sy,
        extendFromAngle: extendFromAngleDeg,
      };
      setIsDrawing(true);
      setPreview({ type: tool, x1: sx, y1: sy, x2: sx, y2: sy, x: sx, y: sy, width: 0, height: 0 });
    },
    [activeTool, containerRef]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (
        activeTool === 'select' ||
        activeTool === 'block' ||
        !containerRef.current
      )
        return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const sx = snapToGrid(x, gridEnabled);
      const sy = snapToGrid(y, gridEnabled);

      drawRef.current = {
        tool: activeTool,
        startX: sx,
        startY: sy,
        points: activeTool === 'freehand' ? [[sx, sy]] : undefined,
      };
      setIsDrawing(true);

      if (activeTool === 'freehand') {
        setPreview({ type: 'freehand', points: [[sx, sy]] });
      } else {
        setPreview({ type: activeTool, x1: sx, y1: sy, x2: sx, y2: sy, x: sx, y: sy, width: 0, height: 0 });
      }
    },
    [activeTool, gridEnabled, containerRef, screenToCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = drawRef.current;
      if (!session) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const mx = snapToGrid(x, gridEnabled);
      const my = snapToGrid(y, gridEnabled);

      if (session.tool === 'freehand' && session.points) {
        session.points.push([mx, my]);
        setPreview({ type: 'freehand', points: [...session.points] });
        return;
      }

      let x2 = mx;
      let y2 = my;

      if (session.tool === 'line' || session.tool === 'arrow') {
        if (e.shiftKey) {
          const angle = Math.atan2(my - session.startY, mx - session.startX) * (180 / Math.PI);
          const snapped =
            session.extendFromAngle != null
              ? snapAngleTo90FromPrevious(angle, session.extendFromAngle)
              : snapAngleTo45(angle);
          const rad = (snapped * Math.PI) / 180;
          const len = Math.sqrt(
            (mx - session.startX) ** 2 + (my - session.startY) ** 2
          );
          x2 = session.startX + Math.cos(rad) * len;
          y2 = session.startY + Math.sin(rad) * len;
        }
        const angle = Math.atan2(y2 - session.startY, x2 - session.startX) * (180 / Math.PI);
        const length = Math.sqrt(
          (x2 - session.startX) ** 2 + (y2 - session.startY) ** 2
        );
        setAngleIndicator({ angle: Math.round(angle), length: Math.round(length) });
      } else {
        setAngleIndicator(null);
      }

      if (session.tool === 'rect' || session.tool === 'ellipse') {
        const w = x2 - session.startX;
        const h = y2 - session.startY;
        if (e.shiftKey) {
          const s = Math.min(Math.abs(w), Math.abs(h));
          x2 = session.startX + (w >= 0 ? s : -s);
          y2 = session.startY + (h >= 0 ? s : -s);
        }
        setPreview({
          type: session.tool,
          x: Math.min(session.startX, x2),
          y: Math.min(session.startY, y2),
          width: Math.abs(x2 - session.startX),
          height: Math.abs(y2 - session.startY),
        });
      } else if (session.tool === 'triangle' || session.tool === 'diamond') {
        const w = x2 - session.startX;
        const h = y2 - session.startY;
        if (e.shiftKey && session.tool === 'triangle') {
          const s = Math.min(Math.abs(w), Math.abs(h) * 1.15);
          x2 = session.startX + (w >= 0 ? s : -s);
          y2 = session.startY + (h >= 0 ? s : -s);
        } else if (e.shiftKey && session.tool === 'diamond') {
          const s = Math.min(Math.abs(w), Math.abs(h));
          x2 = session.startX + (w >= 0 ? s : -s);
          y2 = session.startY + (h >= 0 ? s : -s);
        }
        setPreview({
          type: session.tool,
          x: Math.min(session.startX, x2),
          y: Math.min(session.startY, y2),
          width: Math.abs(x2 - session.startX),
          height: Math.abs(y2 - session.startY),
        });
      } else {
        setPreview({
          type: session.tool,
          x1: session.startX,
          y1: session.startY,
          x2,
          y2,
        });
      }
    },
    [gridEnabled, screenToCanvas]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const session = drawRef.current;
      if (!session) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const mx = snapToGrid(x, gridEnabled);
      const my = snapToGrid(y, gridEnabled);

      if (session.tool === 'freehand' && session.points && session.points.length >= 2) {
        const simplified = simplifyFreehandPath(session.points);
        addShape({
          type: 'freehand',
          points: simplified,
          stroke: { color: 'white', width: 2, style: 'solid' },
          zIndex: 1,
        });
      } else if (session.tool === 'line' || session.tool === 'arrow') {
        let x2 = mx;
        let y2 = my;
        if (e.shiftKey) {
          const angle = Math.atan2(my - session.startY, mx - session.startX) * (180 / Math.PI);
          const snapped = snapAngleTo45(angle);
          const rad = (snapped * Math.PI) / 180;
          const len = Math.sqrt(
            (mx - session.startX) ** 2 + (my - session.startY) ** 2
          );
          x2 = session.startX + Math.cos(rad) * len;
          y2 = session.startY + Math.sin(rad) * len;
        }
        const minLen = 4;
        if (
          Math.sqrt((x2 - session.startX) ** 2 + (y2 - session.startY) ** 2) >=
          minLen
        ) {
          addShape({
            type: session.tool,
            x1: session.startX,
            y1: session.startY,
            x2,
            y2,
            rotation: 0,
            stroke: { color: 'white', width: 2, style: 'solid' },
            arrowStart: session.tool === 'arrow' ? false : false,
            arrowEnd: session.tool === 'arrow',
            zIndex: 1,
          });
        }
      } else if (
        session.tool === 'rect' ||
        session.tool === 'ellipse' ||
        session.tool === 'triangle' ||
        session.tool === 'diamond'
      ) {
        let x2 = mx;
        let y2 = my;
        if (e.shiftKey) {
          const w = x2 - session.startX;
          const h = y2 - session.startY;
          const s = Math.min(Math.abs(w), Math.abs(h));
          x2 = session.startX + (w >= 0 ? s : -s);
          y2 = session.startY + (h >= 0 ? s : -s);
        }
        const w = Math.abs(x2 - session.startX);
        const h = Math.abs(y2 - session.startY);
        if (w >= 4 && h >= 4) {
          const px = Math.min(session.startX, x2);
          const py = Math.min(session.startY, y2);
          const shapeType = session.tool === 'rect' ? 'rectangle' : session.tool;
          addShape({
            type: shapeType,
            x: px,
            y: py,
            width: w,
            height: h,
            rotation: 0,
            stroke: { color: 'white', width: 2, style: 'solid' },
            fill: { color: 'none', opacity: 0.25 },
            ...(shapeType === 'rectangle' && { cornerRadius: 0 }),
            zIndex: 1,
          });
        }
      }

      drawRef.current = null;
      setIsDrawing(false);
      setPreview(null);
      setAngleIndicator(null);

      if (!toolLocked && session.tool !== 'freehand') {
        onToolChange('select');
      }
    },
    [addShape, gridEnabled, toolLocked, onToolChange, screenToCanvas]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    startFromPoint,
    preview,
    angleIndicator,
    isDrawing,
  };
}
