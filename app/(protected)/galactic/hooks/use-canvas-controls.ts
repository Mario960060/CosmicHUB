// CURSOR: Pan and zoom state for galaxy canvas
// Handles wheel zoom (0.2 to 3.0), pan (drag on background)
// Ctrl+drag on background = box selection

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.001;

export interface CanvasState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface UseCanvasControlsOptions {
  onBoxSelect?: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
}

export function useCanvasControls(options?: UseCanvasControlsOptions) {
  const onBoxSelectRef = useRef(options?.onBoxSelect);
  onBoxSelectRef.current = options?.onBoxSelect;

  const [state, setState] = useState<CanvasState>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const selectionBoxRef = useRef<SelectionBox | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    setState((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta)),
    }));
  }, []);

  const handleWheelNative = useCallback((deltaY: number) => {
    const delta = -deltaY * ZOOM_SENSITIVITY;
    setState((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta)),
    }));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Never pan/select when clicking on galactic objects
      if (target.closest('[data-galactic-object]')) return;
      if (e.button !== 0) return;

      const modKey = e.ctrlKey || e.metaKey;
      if (modKey && onBoxSelectRef.current) {
        // Ctrl+LMB on any background area = start box selection
        e.preventDefault();
        e.stopPropagation();
        isSelectingRef.current = true;
        isPanningRef.current = false;
        const box: SelectionBox = {
          startX: e.clientX,
          startY: e.clientY,
          endX: e.clientX,
          endY: e.clientY,
        };
        selectionBoxRef.current = box;
        setSelectionBox(box);
      } else {
        isPanningRef.current = true;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [] // no deps needed — uses ref for onBoxSelect
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectingRef.current) {
      const updated: SelectionBox = {
        ...selectionBoxRef.current!,
        endX: e.clientX,
        endY: e.clientY,
      };
      selectionBoxRef.current = updated;
      setSelectionBox(updated);
    } else if (isPanningRef.current) {
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      setState((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
    }
  }, []);

  const finishSelection = useCallback(() => {
    if (!isSelectingRef.current) return;
    const box = selectionBoxRef.current;
    isSelectingRef.current = false;
    selectionBoxRef.current = null;
    setSelectionBox(null);
    if (box && onBoxSelectRef.current) {
      onBoxSelectRef.current(
        { x: box.startX, y: box.startY },
        { x: box.endX, y: box.endY }
      );

      // After mouseup, a click event fires on the same spot. That click would
      // trigger handleCanvasClick → onCanvasBackgroundClick → clear selection.
      // Intercept and swallow that click in capture phase so it never reaches React.
      const swallowClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      // Safety cleanup if no click fires (e.g. mouse moved too far for browser to emit click)
      setTimeout(() => window.removeEventListener('click', swallowClick, true), 300);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    finishSelection();
    isPanningRef.current = false;
  }, [finishSelection]);

  const handleMouseLeave = useCallback(() => {
    if (isSelectingRef.current) {
      finishSelection();
    }
    isPanningRef.current = false;
  }, [finishSelection]);

  // Stop panning/selecting when mouse released outside container
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isSelectingRef.current) {
        finishSelection();
      }
      isPanningRef.current = false;
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, [finishSelection]);

  const reset = useCallback(() => {
    setState({ panX: 0, panY: 0, zoom: 1 });
  }, []);

  return {
    state,
    setState,
    selectionBox,
    handleWheel,
    handleWheelNative,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    reset,
  };
}
