/**
 * Global canvas clipboard - persists across canvas switches within the same session.
 * Uses sessionStorage so all canvases (including in different satellites/tasks) share one clipboard.
 * Allows copy in one canvas and paste into another.
 */

import type { CanvasBlock, CanvasShape } from './useCanvasState';

const STORAGE_KEY = 'gacaltic-canvas-clipboard';

function readFromStorage(): { blocks: CanvasBlock[]; shapes: CanvasShape[] } {
  if (typeof window === 'undefined') return { blocks: [], shapes: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { blocks: [], shapes: [] };
    const parsed = JSON.parse(raw) as { blocks: CanvasBlock[]; shapes: CanvasShape[] };
    return {
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      shapes: Array.isArray(parsed.shapes) ? parsed.shapes : [],
    };
  } catch {
    return { blocks: [], shapes: [] };
  }
}

function writeToStorage(blocks: CanvasBlock[], shapes: CanvasShape[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ blocks, shapes }));
  } catch {
    /* ignore */
  }
}

export function getCanvasClipboard(): { blocks: CanvasBlock[]; shapes: CanvasShape[] } {
  return readFromStorage();
}

const CLIPBOARD_CHANGE_EVENT = 'gacaltic-canvas-clipboard-change';

export function setCanvasClipboard(blocks: CanvasBlock[], shapes: CanvasShape[]): void {
  const normalizedBlocks = blocks.map((b) => ({ ...b }));
  const normalizedShapes = shapes.map((s) => ({
    ...s,
    stroke: { ...s.stroke },
    fill: s.fill ? { ...s.fill } : undefined,
  }));
  writeToStorage(normalizedBlocks, normalizedShapes);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLIPBOARD_CHANGE_EVENT));
  }
}

export function subscribeToClipboardChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CLIPBOARD_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CLIPBOARD_CHANGE_EVENT, callback);
}

export function hasCanvasClipboardContent(): boolean {
  const { blocks, shapes } = readFromStorage();
  return blocks.length > 0 || shapes.length > 0;
}
