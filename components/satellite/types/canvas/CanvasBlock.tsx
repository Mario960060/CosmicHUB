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
  onResizeStart: (e: React.PointerEvent) => void;
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
          }}
        >
          {headerLine}
        </div>
      )}

      {editing ? (
        <textarea
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
            minHeight: 40,
            color: fontColors?.header ?? 'rgba(255,255,255,0.85)',
            fontSize,
            fontFamily: 'Exo 2, sans-serif',
            lineHeight: 1.5,
            outline: 'none',
            resize: 'none',
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
          }}
        >
          {(headerLine ? bodyLines.join('\n') : block.text) || 'Type here...'}
        </div>
      )}

      <div
        className="canvas-block-resize"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 14,
          height: 14,
          cursor: 'se-resize',
          opacity: hovered || selected ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e);
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 3,
            right: 3,
            width: 7,
            height: 7,
            borderRight: '1.5px solid rgba(255,255,255,0.2)',
            borderBottom: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: '0 0 2px 0',
          }}
        />
      </div>

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
            zIndex: 10,
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
