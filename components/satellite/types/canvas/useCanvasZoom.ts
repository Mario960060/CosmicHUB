'use client';

import { useCallback } from 'react';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

export function useCanvasZoom(
  viewport: { x: number; y: number; zoom: number },
  setViewport: (v: Partial<{ x: number; y: number; zoom: number }>) => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
  blocks: { x: number; y: number; width: number; height: number }[]
) {
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom + delta));

      const scale = newZoom / viewport.zoom;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      setViewport({
        zoom: newZoom,
        x: viewport.x + dx * (1 - scale),
        y: viewport.y + dy * (1 - scale),
      });
    },
    [viewport, setViewport, containerRef]
  );

  const zoomToFit = useCallback(() => {
    if (!containerRef.current || blocks.length === 0) {
      setViewport({ zoom: 1, x: 0, y: 0 });
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const minX = Math.min(...blocks.map((b) => b.x));
    const minY = Math.min(...blocks.map((b) => b.y));
    const maxX = Math.max(...blocks.map((b) => b.x + b.width));
    const maxY = Math.max(...blocks.map((b) => b.y + b.height));
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const zoom = Math.min(
      (rect.width - padding * 2) / contentW,
      (rect.height - padding * 2) / contentH,
      2
    );
    const x = rect.width / 2 - (minX - padding + contentW / 2) * zoom;
    const y = rect.height / 2 - (minY - padding + contentH / 2) * zoom;
    setViewport({ zoom, x, y });
  }, [blocks, containerRef, setViewport]);

  const resetView = useCallback(() => {
    setViewport({ zoom: 1, x: 0, y: 0 });
  }, [setViewport]);

  const setZoom = useCallback(
    (zoom: number) => {
      setViewport({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) });
    },
    [setViewport]
  );

  return { handleWheel, zoomToFit, resetView, setZoom };
}
