'use client';

import type { BlockColor } from './useCanvasState';

const BLOCK_COLORS: BlockColor[] = ['neutral', 'cyan', 'rose', 'indigo', 'teal', 'green', 'amber', 'purple', 'orange'];

const COLOR_SWATCHES: Record<BlockColor, string> = {
  neutral: 'rgba(255,255,255,0.15)',
  cyan: '#0891b2',
  rose: '#e11d48',
  indigo: '#6366f1',
  teal: '#0d9488',
  green: '#16a34a',
  amber: '#d97706',
  purple: '#9333ea',
  orange: '#ea580c',
};

interface BlockContextMenuProps {
  x: number;
  y: number;
  blockColor: BlockColor;
  blockFontColor: BlockColor | null;
  onEditText: () => void;
  onColorChange: (color: BlockColor) => void;
  onFontColorChange: (color: BlockColor | null) => void;
  onFontSize: (size: 'sm' | 'md' | 'lg') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BlockContextMenu({
  x,
  y,
  blockColor,
  blockFontColor,
  onEditText,
  onColorChange,
  onFontColorChange,
  onFontSize,
  onDuplicate,
  onDelete,
  onClose,
}: BlockContextMenuProps) {
  const fontColorOptions = BLOCK_COLORS.filter((c) => c !== blockColor);

  return (
    <div
      data-context-menu
      style={{
        position: 'fixed',
        left: x,
        top: y,
        minWidth: 170,
        background: '#0c1829',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 10,
        padding: 6,
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(249,115,22,0.04)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CtxItem icon="Edit text" onClick={onEditText} shortcut="Dbl-click" />
      <div style={{ padding: '6px 12px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Color</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {BLOCK_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => onColorChange(c)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: COLOR_SWATCHES[c],
                cursor: 'pointer',
                border: blockColor === c ? '2px solid #fff' : '1.5px solid transparent',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ padding: '6px 12px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Font color</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <div
            onClick={() => onFontColorChange(null)}
            title="Default"
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              border: !blockFontColor ? '2px solid #fff' : '1.5px solid transparent',
            }}
          />
          {fontColorOptions.map((c) => (
            <div
              key={c}
              onClick={() => onFontColorChange(c)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: COLOR_SWATCHES[c],
                cursor: 'pointer',
                border: blockFontColor === c ? '2px solid #fff' : '1.5px solid transparent',
              }}
            />
          ))}
        </div>
      </div>
      <CtxItem icon="Font size S" onClick={() => onFontSize('sm')} />
      <CtxItem icon="Font size M" onClick={() => onFontSize('md')} />
      <CtxItem icon="Font size L" onClick={() => onFontSize('lg')} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 8px' }} />
      <CtxItem icon="Duplicate" onClick={onDuplicate} shortcut="Ctrl+D" />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 8px' }} />
      <CtxItem icon="Delete" onClick={onDelete} shortcut="Del" danger />
    </div>
  );
}

interface LineContextMenuProps {
  x: number;
  y: number;
  onEditLabel: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function LineContextMenu({ x, y, onEditLabel, onDelete, onClose }: LineContextMenuProps) {
  return (
    <div
      data-context-menu
      style={{
        position: 'fixed',
        left: x,
        top: y,
        minWidth: 150,
        background: '#0c1829',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 10,
        padding: 6,
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CtxItem icon="Edit label" onClick={onEditLabel} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 8px' }} />
      <CtxItem icon="Delete" onClick={onDelete} danger />
    </div>
  );
}

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onAddBlock: () => void;
  onPaste: () => void;
  onZoomFit: () => void;
  onResetView: () => void;
  onGridToggle: () => void;
  canPaste: boolean;
  onClose: () => void;
}

export function CanvasContextMenu({
  x,
  y,
  onAddBlock,
  onPaste,
  onZoomFit,
  onResetView,
  onGridToggle,
  canPaste,
  onClose,
}: CanvasContextMenuProps) {
  return (
    <div
      data-context-menu
      style={{
        position: 'fixed',
        left: x,
        top: y,
        minWidth: 170,
        background: '#0c1829',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 10,
        padding: 6,
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CtxItem icon="New block here" onClick={onAddBlock} shortcut="B" />
      <CtxItem icon="Paste" onClick={onPaste} shortcut="Ctrl+V" disabled={!canPaste} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 8px' }} />
      <CtxItem icon="Zoom to fit" onClick={onZoomFit} shortcut="Ctrl+1" />
      <CtxItem icon="Reset view" onClick={onResetView} shortcut="Ctrl+0" />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 8px' }} />
      <CtxItem icon="Toggle grid" onClick={onGridToggle} shortcut="G" />
    </div>
  );
}

function CtxItem({
  icon,
  onClick,
  shortcut,
  danger,
  disabled,
}: {
  icon: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        color: disabled ? 'rgba(255,255,255,0.3)' : danger ? '#f43f5e' : 'rgba(255,255,255,0.5)',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = danger ? 'rgba(244,63,94,0.08)' : 'rgba(249,115,22,0.08)';
        if (!disabled) e.currentTarget.style.color = danger ? '#f43f5e' : '#f97316';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.3)' : danger ? '#f43f5e' : 'rgba(255,255,255,0.5)';
      }}
    >
      <span>{icon}</span>
      {shortcut && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{shortcut}</span>
      )}
    </div>
  );
}
