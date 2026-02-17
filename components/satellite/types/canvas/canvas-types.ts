/**
 * Types for Canvas satellite — list of canvases per subtask
 */

export type ShapeStrokeColor =
  | 'white'
  | 'cyan'
  | 'rose'
  | 'indigo'
  | 'teal'
  | 'green'
  | 'amber'
  | 'purple'
  | 'orange';

/** Shared color swatches for shape stroke/fill - used by CanvasShape and CanvasContextMenu */
export const SHAPE_STROKE_COLOR_SWATCHES: Record<ShapeStrokeColor, string> = {
  white: 'rgba(255,255,255,0.9)',
  cyan: '#0891b2',
  rose: '#e11d48',
  indigo: '#6366f1',
  teal: '#0d9488',
  green: '#16a34a',
  amber: '#d97706',
  purple: '#9333ea',
  orange: '#ea580c',
};

export type ShapeStrokeWidth = 1 | 2 | 3 | 5;
export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface ShapeStroke {
  color: ShapeStrokeColor;
  width: ShapeStrokeWidth;
  style: ShapeStrokeStyle;
}

export interface ShapeFill {
  color: ShapeStrokeColor | 'none';
  opacity: number;
}

export type CanvasShapeType =
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'freehand';

export interface CanvasShapeData {
  id: string;
  type: CanvasShapeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: [number, number][];
  rotation?: number;
  stroke: ShapeStroke;
  fill?: ShapeFill;
  cornerRadius?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  zIndex: number;
}

export interface CanvasItem {
  id: string;
  name: string;
  description?: string;
  assigned_to?: string | null;
  created_by?: string | null;
  viewport: { x: number; y: number; zoom: number };
  gridEnabled: boolean;
  blocks: CanvasBlockData[];
  connections: CanvasConnectionData[];
  shapes?: CanvasShapeData[];
}

export interface CanvasBlockData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontColor?: string | null;
  fontSize: 'sm' | 'md' | 'lg';
  textAlign?: 'left' | 'center' | 'right';
  zIndex: number;
}

export type LabelFontSize = 'sm' | 'md' | 'lg';

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export interface ConnectionEndpoint {
  entityId: string;
  side: PortSide;
}

export interface CanvasConnectionData {
  id: string;
  from: ConnectionEndpoint;
  to: ConnectionEndpoint;
  fromSide?: PortSide;
  toSide?: PortSide;
  label: string;
  labelFontSize?: LabelFontSize;
  labelColor?: string | null;
  style: 'solid' | 'dashed' | 'dotted';
  arrow: 'none' | 'forward' | 'both';
  color: string;
}

/** Raw connection before migration (from/to may be legacy strings) */
type RawConnectionData = Omit<CanvasConnectionData, 'from' | 'to'> & {
  from: string | ConnectionEndpoint;
  to: string | ConnectionEndpoint;
};

export function createEmptyCanvas(
  name: string,
  description?: string,
  assigned_to?: string | null,
  created_by?: string | null
): CanvasItem {
  return {
    id: crypto.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    description: description ?? '',
    assigned_to: assigned_to ?? null,
    created_by: created_by ?? null,
    viewport: { x: 0, y: 0, zoom: 1 },
    gridEnabled: false,
    blocks: [],
    connections: [],
    shapes: [],
  };
}

export function normalizeLegacyCanvas(raw: Record<string, unknown>): Omit<CanvasItem, 'id' | 'name' | 'description' | 'assigned_to'> {
  const vp = raw?.viewport as { x?: number; y?: number; zoom?: number } | undefined;
  const connections = Array.isArray(raw?.connections) ? (raw.connections as RawConnectionData[]) : [];
  return {
    viewport: {
      x: typeof vp?.x === 'number' ? vp.x : 0,
      y: typeof vp?.y === 'number' ? vp.y : 0,
      zoom: typeof vp?.zoom === 'number' ? vp.zoom : 1,
    },
    gridEnabled: (raw?.gridEnabled as boolean) ?? false,
    blocks: Array.isArray(raw?.blocks) ? (raw.blocks as CanvasBlockData[]) : [],
    connections: connections.map(migrateConnection),
    shapes: Array.isArray(raw?.shapes) ? (raw.shapes as CanvasShapeData[]) : [],
  };
}

/** Migrate legacy connection (from/to as strings) to { entityId, side } format */
function migrateConnection(c: RawConnectionData): CanvasConnectionData {
  const from = typeof c.from === 'string'
    ? { entityId: c.from, side: (c.fromSide ?? 'right') as PortSide }
    : c.from;
  const to = typeof c.to === 'string'
    ? { entityId: c.to, side: (c.toSide ?? 'left') as PortSide }
    : c.to;
  return { ...c, from, to };
}
