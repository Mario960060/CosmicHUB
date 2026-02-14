// CURSOR: Main canvas component with rendering loop

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CanvasObject, Dependency, ViewState, ZoomLevel } from '@/lib/galactic/types';
import { clearCanvas, drawStarfield, drawObject, drawDependency } from '@/lib/galactic/renderer';
import { getZoomConfig, animateZoom } from '@/lib/galactic/zoom';
import { findObjectAtPosition, handleObjectClick } from '@/lib/galactic/interactions';
import { Tooltip } from './Tooltip';

interface GalacticCanvasProps {
  objects: CanvasObject[];
  dependencies: Dependency[];
  initialZoom?: ZoomLevel;
  initialFocusId?: string;
}

export function GalacticCanvas({
  objects,
  dependencies,
  initialZoom = 'galaxy',
  initialFocusId,
}: GalacticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>({
    zoom: initialZoom,
    focusedProjectId: initialFocusId,
    offset: { x: 0, y: 0 },
    scale: 1,
  });

  const [hoveredObject, setHoveredObject] = useState<CanvasObject | undefined>();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      if (!ctx || !canvas) return;

      // Clear
      clearCanvas(ctx, canvas.width, canvas.height);

      // Draw starfield
      drawStarfield(ctx, canvas.width, canvas.height);

      // Apply zoom transform
      ctx.save();
      ctx.translate(viewState.offset.x, viewState.offset.y);
      ctx.scale(viewState.scale, viewState.scale);

      // Draw dependencies first (behind objects)
      dependencies.forEach((dep) => drawDependency(ctx, dep));

      // Draw objects
      objects.forEach((obj) => {
        const isHovered = hoveredObject?.id === obj.id;
        drawObject(ctx, obj, isHovered);
      });

      ctx.restore();
    }

    render();
  }, [objects, dependencies, viewState, hoveredObject]);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setMousePos({ x: e.clientX, y: e.clientY });

      const obj = findObjectAtPosition(mouseX, mouseY, objects, viewState);
      setHoveredObject(obj);

      // Change cursor
      canvas.style.cursor = obj ? 'pointer' : 'default';
    },
    [objects, viewState]
  );

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const obj = findObjectAtPosition(mouseX, mouseY, objects, viewState);
      if (!obj) return;

      handleObjectClick(
        obj,
        viewState.zoom,
        router.push,
        (newZoom, focusId) => {
          const targetPos = obj.position;
          const config = getZoomConfig(
            newZoom as ZoomLevel,
            targetPos,
            canvas.width,
            canvas.height
          );

          animateZoom(viewState, config, setViewState, () => {
            setViewState((prev) => ({
              ...prev,
              zoom: newZoom as ZoomLevel,
              focusedProjectId: newZoom === 'project' ? focusId : undefined,
              focusedModuleId: newZoom === 'module' ? focusId : undefined,
            }));
          });
        }
      );
    },
    [objects, viewState, router]
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {hoveredObject && (
        <Tooltip x={mousePos.x} y={mousePos.y} object={hoveredObject} />
      )}
    </>
  );
}
