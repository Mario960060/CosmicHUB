'use client';

import type { CanvasTool } from './useCanvasKeyboard';

export type { CanvasTool };

interface CanvasToolbarProps {
  zoom: number;
  gridEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: CanvasTool;
  toolLocked: boolean;
  onToolChange: (tool: CanvasTool) => void;
  onToolLockToggle: () => void;
  onAddBlock: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomFit: () => void;
  onGridToggle: () => void;
  onShortcutsClick?: () => void;
}

export function CanvasToolbar({
  zoom,
  gridEnabled,
  canUndo,
  canRedo,
  activeTool,
  toolLocked,
  onToolChange,
  onToolLockToggle,
  onAddBlock,
  onUndo,
  onRedo,
  onZoomChange,
  onZoomFit,
  onGridToggle,
  onShortcutsClick,
}: CanvasToolbarProps) {
  const zoomPercent = Math.round(zoom * 100);

  const toolBtn = (tool: CanvasTool, label: string, shortcut: string, icon?: React.ReactNode) => {
    const isActive = activeTool === tool;
    return (
      <button
        key={tool}
        type="button"
        onClick={() => {
          if (activeTool === tool) onToolLockToggle();
          else onToolChange(tool);
        }}
        style={{
          ...tbBtnStyle,
          ...(isActive ? { borderColor: '#f97316', color: '#f97316', background: 'rgba(249,115,22,0.08)' } : {}),
          ...(toolLocked && isActive ? { boxShadow: '0 0 0 2px rgba(249,115,22,0.4)' } : {}),
        }}
        onMouseEnter={(e) => !isActive && Object.assign(e.currentTarget.style, tbBtnHover)}
        onMouseLeave={(e) => {
          if (!isActive) Object.assign(e.currentTarget.style, tbBtnStyle);
        }}
        title={`${label} (${shortcut})`}
      >
        {icon ?? label}
        <span style={shortcutStyle}>{shortcut}</span>
        {toolLocked && isActive && <LockIcon />}
      </button>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(249,115,22,0.08)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* Section 1: Select, Block */}
      {toolBtn('select', 'Select', 'V', <SelectIcon />)}
      <button
        type="button"
        onClick={() => {
          if (activeTool === 'block') onToolLockToggle();
          else onAddBlock();
        }}
        style={{
          ...tbBtnStyle,
          ...(activeTool === 'block' ? { borderColor: '#f97316', color: '#f97316', background: 'rgba(249,115,22,0.08)' } : {}),
          ...(toolLocked && activeTool === 'block' ? { boxShadow: '0 0 0 2px rgba(249,115,22,0.4)' } : {}),
        }}
        onMouseEnter={(e) => activeTool !== 'block' && Object.assign(e.currentTarget.style, tbBtnHover)}
        onMouseLeave={(e) => {
          if (activeTool !== 'block') Object.assign(e.currentTarget.style, tbBtnStyle);
        }}
        title="Add block (B)"
      >
        <span style={{ fontSize: 13 }}>+</span> Block
        <span style={shortcutStyle}>B</span>
        {toolLocked && activeTool === 'block' && <LockIcon />}
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

      {/* Section 2: Drawing tools */}
      {toolBtn('line', 'Line', 'L', <LineIcon />)}
      {toolBtn('arrow', 'Arrow', 'A', <ArrowIcon />)}
      {toolBtn('rect', 'Rect', 'R', <RectIcon />)}
      {toolBtn('ellipse', 'Ellipse', 'O', <EllipseIcon />)}
      {toolBtn('triangle', 'Triangle', 'T', <TriangleIcon />)}
      {toolBtn('diamond', 'Diamond', 'D', <DiamondIcon />)}
      {toolBtn('freehand', 'Free', 'P', <FreehandIcon />)}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

      {/* Section 3: Undo, Redo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        style={{ ...tbBtnStyle, opacity: canUndo ? 1 : 0.4 }}
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        style={{ ...tbBtnStyle, opacity: canRedo ? 1 : 0.4 }}
        title="Redo (Ctrl+Shift+Z)"
      >
        <RedoIcon />
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

      {/* Section 4: Zoom, Fit */}
      <button
        type="button"
        onClick={() => {
          const next = [50, 75, 100, 150, 200].find((p) => p > zoomPercent) ?? 200;
          onZoomChange(next / 100);
        }}
        style={tbZoomStyle}
        title="Zoom"
      >
        {zoomPercent}%
      </button>
      <button
        type="button"
        onClick={onZoomFit}
        style={tbBtnStyle}
        title="Zoom to fit (Ctrl+1)"
      >
        <FitIcon />
        <span style={shortcutStyle}>Ctrl+1</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

      {/* Section 5: Grid */}
      <button
        type="button"
        onClick={onGridToggle}
        style={{
          ...tbBtnStyle,
          ...(gridEnabled ? { borderColor: '#f97316', color: '#f97316', background: 'rgba(249,115,22,0.08)' } : {}),
        }}
        title="Toggle grid (G)"
      >
        <GridIcon />
        Grid
        <span style={shortcutStyle}>G</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

      {/* Section 6: Shortcuts */}
      {onShortcutsClick && (
        <button
          type="button"
          onClick={onShortcutsClick}
          style={tbBtnStyle}
          title="Keyboard shortcuts"
        >
          <ShortcutsIcon />
          Shortcuts
        </button>
      )}
    </div>
  );
}

const tbBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  fontFamily: 'Rajdhani, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  borderRadius: 5,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(249,115,22,0.35)',
  background: 'rgba(249,115,22,0.06)',
  color: '#f97316',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const tbBtnHover: React.CSSProperties = {
  borderColor: 'rgba(249,115,22,0.7)',
  color: '#f97316',
  background: 'rgba(249,115,22,0.12)',
};

const tbZoomStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontFamily: 'Rajdhani, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  color: '#f97316',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(249,115,22,0.35)',
  borderRadius: 4,
  background: 'rgba(249,115,22,0.06)',
  cursor: 'pointer',
};

const shortcutStyle: React.CSSProperties = {
  fontSize: 9,
  padding: '1px 4px',
  borderRadius: 3,
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.3)',
  marginLeft: 2,
};

function SelectIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 4l7 16 3-7 7-3L4 4z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1={4} y1={20} x2={20} y2={4} />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={3} y={3} width={18} height={18} rx={2} />
    </svg>
  );
}

function EllipseIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <ellipse cx={12} cy={12} rx={9} ry={6} />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L2 22h20L12 2z" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2l9 10-9 10L3 12 12 2z" />
    </svg>
  );
}

function FreehandIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 19c-1.5 0-2-1.5-2.5-3-.5-1.5-1-3-2-4.5S5 9 4 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={3} y={3} width={7} height={7} />
      <rect x={14} y={3} width={7} height={7} />
      <rect x={14} y={14} width={7} height={7} />
      <rect x={3} y={14} width={7} height={7} />
    </svg>
  );
}

function ShortcutsIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={2} y={4} width={20} height={16} rx={2} />
      <path d="M6 9h2M10 9h2M14 9h2M18 9h2M6 13h2M10 13h2M14 13h2M18 13h2M6 17h2M10 17h2M14 17h2M18 17h2" strokeLinecap="round" />
    </svg>
  );
}
