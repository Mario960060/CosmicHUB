'use client';

import { useEffect, useCallback } from 'react';

export type CanvasTool =
  | 'select'
  | 'block'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'freehand';

interface UseCanvasKeyboardProps {
  onAddBlock: () => void;
  onToolChange?: (tool: CanvasTool) => void;
  onToolLockToggle?: () => void;
  activeTool?: CanvasTool;
  toolLocked?: boolean;
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
  onToolChange,
  onToolLockToggle,
  activeTool = 'select',
  toolLocked = false,
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/89d4929e-cf8c-4162-a41e-04d63dc3fa83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvasKeyboard.ts:handleKeyDown-entry',message:'keydown fired',data:{key:e.key,activeTag:active?.tagName??'null',activeId:(active as HTMLElement)?.id??'',activeClass:(active as HTMLElement)?.className?.toString().slice(0,80)??'',isInput:!!isInput,isContentEditable:(active as HTMLElement)?.isContentEditable??false,containerExists:!!containerRef.current,containerContainsActive:containerRef.current?.contains(active)??false,activeIsBody:active===document.body},timestamp:Date.now(),hypothesisId:'H-A,H-B,H-C'})}).catch(()=>{});
      // #endregion

      if (isInput && e.key !== 'Escape') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/89d4929e-cf8c-4162-a41e-04d63dc3fa83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvasKeyboard.ts:isInput-guard',message:'blocked by isInput guard',data:{key:e.key,activeTag:active?.tagName},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
        // #endregion
        return;
      }

      if (!containerRef.current?.contains(active) && active !== document.body) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/89d4929e-cf8c-4162-a41e-04d63dc3fa83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvasKeyboard.ts:focus-guard',message:'blocked by focus/container guard',data:{key:e.key,activeTag:active?.tagName??'null',activeId:(active as HTMLElement)?.id??'',containerExists:!!containerRef.current,containerContainsActive:containerRef.current?.contains(active)??false,activeIsBody:active===document.body},timestamp:Date.now(),hypothesisId:'H-A,H-B'})}).catch(()=>{});
        // #endregion
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/89d4929e-cf8c-4162-a41e-04d63dc3fa83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvasKeyboard.ts:passed-guards',message:'key event passed all guards - executing action',data:{key:e.key},timestamp:Date.now(),hypothesisId:'passed'})}).catch(()=>{});
      // #endregion

      switch (e.key) {
        case 'v':
        case 'V':
          if (e.ctrlKey || e.metaKey) {
            if (hasCopiedBlocks) {
              e.preventDefault();
              onPaste(100, 100);
            }
          } else {
            e.preventDefault();
            onToolChange?.('select');
          }
          break;
        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onAddBlock();
          }
          break;
        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('line');
          }
          break;
        case 'a':
        case 'A':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('arrow');
          }
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('rect');
          }
          break;
        case 'o':
        case 'O':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('ellipse');
          }
          break;
        case 't':
        case 'T':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('triangle');
          }
          break;
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToolChange?.('freehand');
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
          } else {
            e.preventDefault();
            onToolChange?.('diamond');
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
          if (activeTool !== 'select') {
            onToolChange?.('select');
          } else if (toolLocked) {
            onToolLockToggle?.();
          } else {
            onDeselect();
          }
          break;
      }
    },
    [
      onAddBlock,
      onToolChange,
      onToolLockToggle,
      activeTool,
      toolLocked,
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
