'use client';

import { useEffect, useCallback } from 'react';

interface UseCanvasKeyboardProps {
  onAddBlock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: (x: number, y: number) => void;
  onZoomFit: () => void;
  onResetView: () => void;
  onGridToggle: () => void;
  onDeselect: () => void;
  hasSelection: boolean;
  hasCopiedBlocks: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCanvasKeyboard({
  onAddBlock,
  onDelete,
  onDuplicate,
  onSelectAll,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onZoomFit,
  onResetView,
  onGridToggle,
  onDeselect,
  hasSelection,
  hasCopiedBlocks,
  containerRef,
}: UseCanvasKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
      if (isInput && e.key !== 'Escape') return;

      if (!containerRef.current?.contains(active) && active !== document.body) return;

      switch (e.key) {
        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onAddBlock();
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (hasSelection) {
            e.preventDefault();
            onDelete();
          }
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onDuplicate();
          }
          break;
        case 'a':
        case 'A':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSelectAll();
          }
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) onRedo();
            else onUndo();
          }
          break;
        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onRedo();
          }
          break;
        case 'c':
        case 'C':
          if (e.ctrlKey || e.metaKey && hasSelection) {
            onCopy();
          }
          break;
        case 'v':
        case 'V':
          if (e.ctrlKey || e.metaKey && hasCopiedBlocks) {
            e.preventDefault();
            onPaste(100, 100);
          }
          break;
        case '1':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onZoomFit();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onResetView();
          }
          break;
        case 'g':
        case 'G':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onGridToggle();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onDeselect();
          break;
      }
    },
    [
      onAddBlock,
      onDelete,
      onDuplicate,
      onSelectAll,
      onUndo,
      onRedo,
      onCopy,
      onPaste,
      onZoomFit,
      onResetView,
      onGridToggle,
      onDeselect,
      hasSelection,
      hasCopiedBlocks,
      containerRef,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
