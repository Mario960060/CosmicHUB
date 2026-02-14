// CURSOR: Pan & zoom canvas container
// Wraps GalacticScene with transform: translate(x,y) scale(zoom)
// Handles wheel zoom (0.2-3.0), left-drag on background for pan
// Ctrl+drag for box selection

'use client';

import { useEffect, useRef } from 'react';
import { useCanvasControls, MIN_ZOOM, MAX_ZOOM } from '../hooks/use-canvas-controls';

interface GalaxyCanvasProps {
  children: React.ReactNode;
  onBoxSelect?: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
}

export function GalaxyCanvas({ children, onBoxSelect }: GalaxyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    state,
    setState,
    selectionBox,
    handleWheelNative,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useCanvasControls({ onBoxSelect });

  // Use native listener with passive: false so preventDefault works (blocks page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleWheelNative(e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [handleWheelNative]);

  const zoomPercent = Math.round(state.zoom * 100);
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const zoom = MIN_ZOOM + (val / 100) * (MAX_ZOOM - MIN_ZOOM);
    setState((prev) => ({ ...prev, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }));
  };
  const sliderPercent = ((state.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Selection box overlay - Ctrl+drag */}
      {selectionBox && containerRef.current && (() => {
        const rect = containerRef.current!.getBoundingClientRect();
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.min(selectionBox.startX, selectionBox.endX) - rect.left,
              top: Math.min(selectionBox.startY, selectionBox.endY) - rect.top,
              width: Math.max(4, Math.abs(selectionBox.endX - selectionBox.startX)),
              height: Math.max(4, Math.abs(selectionBox.endY - selectionBox.startY)),
              background: 'rgba(139, 92, 246, 0.25)',
              border: '2px solid rgba(139, 92, 246, 0.9)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          />
        );
      })()}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>

      {/* Zoom slider - vertical, bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 10px',
          background: 'rgba(21, 27, 46, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 0 20px rgba(0, 217, 255, 0.15)',
        }}
      >
        <span
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: '#00d9ff',
          }}
        >
          {zoomPercent}%
        </span>
        <div style={{ height: '100px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderPercent}
            onChange={handleZoomChange}
            style={{
              width: '100px',
              height: '6px',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              accentColor: '#00d9ff',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}
