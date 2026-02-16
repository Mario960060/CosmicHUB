'use client';

interface CanvasToolbarProps {
  zoom: number;
  gridEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onAddBlock: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomFit: () => void;
  onGridToggle: () => void;
}

export function CanvasToolbar({
  zoom,
  gridEnabled,
  canUndo,
  canRedo,
  onAddBlock,
  onUndo,
  onRedo,
  onZoomChange,
  onZoomFit,
  onGridToggle,
}: CanvasToolbarProps) {
  const zoomPercent = Math.round(zoom * 100);

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
      }}
    >
      <button
        type="button"
        onClick={onAddBlock}
        style={tbBtnStyle}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, tbBtnHover)}
        onMouseLeave={(e) => Object.assign(e.currentTarget.style, tbBtnStyle)}
        title="Add block (B)"
      >
        <span style={{ fontSize: 13 }}>+</span> Block
        <span style={shortcutStyle}>B</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

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
