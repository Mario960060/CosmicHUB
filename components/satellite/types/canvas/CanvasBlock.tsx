'use client';

import { useState } from 'react';
import type { CanvasBlock as BlockType, BlockColor } from './useCanvasState';
import type { PortSide } from './canvas-utils';

const BLOCK_COLORS: Record<BlockColor, { bg: string; border: string; header: string }> = {
  neutral: { bg: 'rgba(255,255,255,0.06)', border: '#ffffff', header: 'rgba(255,255,255,0.85)' },
  cyan: { bg: 'rgba(0,240,255,0.1)', border: '#67e8f9', header: '#67e8f9' },
  rose: { bg: 'rgba(244,63,94,0.1)', border: '#fb7185', header: '#fb7185' },
  indigo: { bg: 'rgba(129,140,248,0.1)', border: '#a5b4fc', header: '#a5b4fc' },
  teal: { bg: 'rgba(20,184,166,0.1)', border: '#5eead4', header: '#5eead4' },
  green: { bg: 'rgba(34,197,94,0.1)', border: '#4ade80', header: '#4ade80' },
  amber: { bg: 'rgba(245,158,11,0.1)', border: '#fbbf24', header: '#fbbf24' },
  purple: { bg: 'rgba(168,85,247,0.1)', border: '#c084fc', header: '#c084fc' },
  orange: { bg: 'rgba(249,115,22,0.1)', border: '#fb923c', header: '#fb923c' },
};

const FONT_SIZES = { sm: 11, md: 15, lg: 20 };

interface CanvasBlockProps {
  block: BlockType;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent, target: 'body' | PortSide) => void;
  onDoubleClick: () => void;
  onTextChange: (text: string) => void;
  onResizeStart: (handle: string, e: React.PointerEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function CanvasBlock({
  block,
  selected,
  editing,
  onPointerDown,
  onDoubleClick,
  onTextChange,
  onResizeStart,
  onContextMenu,
}: CanvasBlockProps) {
  const [hovered, setHovered] = useState(false);
  const colors = BLOCK_COLORS[block.color];
  const fontColors = block.fontColor ? BLOCK_COLORS[block.fontColor] : null;
  const headerColor = fontColors?.header ?? colors.header;
  const bodyColor = fontColors ? fontColors.header : 'rgba(255,255,255,0.6)';
  const fontSize = FONT_SIZES[block.fontSize];

  const lines = block.text.split('\n');
  const headerLine = lines[0]?.startsWith('#') ? lines[0].slice(1).trim() : null;
  const bodyLines = headerLine ? lines.slice(1) : lines;

  const EXTEND = 24;
  return (
    <div
      className="canvas-block-wrapper"
      style={{
        position: 'absolute',
        left: block.x - EXTEND,
        top: block.y - EXTEND,
        width: block.width + EXTEND * 2,
        height: block.height + EXTEND * 2,
        zIndex: block.zIndex,
      }}
    >
      <div
        className={`canvas-block ${editing ? 'block-editing' : ''}`}
        style={{
          position: 'absolute',
          left: EXTEND,
          top: EXTEND,
          width: block.width,
          height: block.height,
          background: colors.bg,
          borderWidth: selected ? 2 : 1,
          borderStyle: 'solid',
          borderColor: colors.border,
          borderRadius: 8,
          padding: 14,
          cursor: editing ? 'text' : 'grab',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          boxShadow: selected ? '0 0 20px rgba(255,255,255,0.04)' : undefined,
          ...(!editing && { userSelect: 'none', WebkitUserSelect: 'none' as const }),
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.canvas-block-port') || (e.target as HTMLElement).closest('.canvas-block-resize')) return;
          onPointerDown(e, 'body');
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
      {headerLine && (
        <div
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: fontSize + 1,
            fontWeight: 700,
            marginBottom: 6,
            letterSpacing: 0.3,
            color: headerColor,
            textAlign: block.textAlign ?? 'left',
          }}
        >
          {headerLine}
        </div>
      )}

      {editing ? (
        <textarea
          className={`scrollbar-cosmic-${block.color}`}
          value={block.text}
          onChange={(e) => onTextChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          autoFocus
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'transparent',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: 'rgba(249,115,22,0.3)',
            borderRadius: 4,
            padding: 4,
            margin: -4,
            minHeight: 0,
            color: fontColors?.header ?? 'rgba(255,255,255,0.85)',
            fontSize,
            fontFamily: 'Exo 2, sans-serif',
            lineHeight: 1.5,
            outline: 'none',
            resize: 'none',
            textAlign: block.textAlign ?? 'left',
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            fontFamily: 'Exo 2, sans-serif',
            fontSize,
            lineHeight: 1.5,
            color: bodyColor,
            whiteSpace: 'pre-wrap',
            textAlign: block.textAlign ?? 'left',
          }}
        >
          {(headerLine ? bodyLines.join('\n') : block.text) || 'Type here...'}
        </div>
      )}

      {/* Resize handles: 4 corners + 4 edges (full edge length) */}
      {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((handle) => {
        const isCorner = ['nw', 'ne', 'sw', 'se'].includes(handle);
        const size = isCorner ? 12 : 8;
        const cursors: Record<string, string> = {
          nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
          se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
        };
        const base: React.CSSProperties = {
          position: 'absolute',
          cursor: cursors[handle],
          opacity: hovered || selected ? 1 : 0,
          transition: 'opacity 0.15s',
          zIndex: isCorner ? 12 : 11,
        };
        /* Block has padding: 14; right/bottom are relative to padding edge, so add pad to reach border */
        const edge = 6;
        const pad = 14;
        const style: React.CSSProperties = isCorner
          ? {
              ...base,
              ...(handle === 'nw' && { left: -edge - pad, top: -edge - pad, width: size, height: size }),
              ...(handle === 'ne' && { right: -edge - pad, top: -edge - pad, width: size, height: size }),
              ...(handle === 'se' && { right: -edge - pad, bottom: -edge - pad, width: size, height: size }),
              ...(handle === 'sw' && { left: -edge - pad, bottom: -edge - pad, width: size, height: size }),
            }
          : {
              ...base,
              ...(handle === 'n' && { left: size, top: -edge - pad, right: size, height: size }),
              ...(handle === 's' && { left: size, bottom: -edge - pad, right: size, height: size }),
              ...(handle === 'w' && { top: size, left: -edge - pad, bottom: size, width: size }),
              ...(handle === 'e' && { top: size, right: -edge - pad, bottom: size, width: size }),
            };
        return (
          <div
            key={handle}
            className="canvas-block-resize"
            style={style}
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(handle, e);
            }}
          />
        );
      })}

      {/* Connection ports - rendered last with zIndex so they are on top */}
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <div
          key={side}
          className={`canvas-block-port port-${side}`}
          style={{
            position: 'absolute',
            width: 28,
            height: 28,
            borderRadius: '50%',
            cursor: 'crosshair',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            ...(side === 'top' && { left: '50%', top: -15, transform: 'translateX(-50%)' }),
            ...(side === 'bottom' && { left: '50%', bottom: -15, transform: 'translateX(-50%)' }),
            ...(side === 'left' && { left: -15, top: '50%', transform: 'translateY(-50%)' }),
            ...(side === 'right' && { right: -15, top: '50%', transform: 'translateY(-50%)' }),
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onPointerDown(e, side);
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'rgba(249,115,22,0.5)',
              opacity: hovered || selected ? 1 : 0.3,
              transition: 'all 0.15s',
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}
      </div>
    </div>
  );
}
