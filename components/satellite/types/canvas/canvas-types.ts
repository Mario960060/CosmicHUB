/**
 * Types for Canvas satellite — list of canvases per subtask
 */

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
  zIndex: number;
}

export type LabelFontSize = 'sm' | 'md' | 'lg';

export interface CanvasConnectionData {
  id: string;
  from: string;
  to: string;
  fromSide: 'top' | 'bottom' | 'left' | 'right';
  toSide: 'top' | 'bottom' | 'left' | 'right';
  label: string;
  labelFontSize?: LabelFontSize;
  labelColor?: string | null;
  style: 'solid' | 'dashed' | 'dotted';
  arrow: 'none' | 'forward' | 'both';
  color: string;
}

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
  };
}

export function normalizeLegacyCanvas(raw: Record<string, unknown>): Omit<CanvasItem, 'id' | 'name' | 'description' | 'assigned_to'> {
  const vp = raw?.viewport as { x?: number; y?: number; zoom?: number } | undefined;
  return {
    viewport: {
      x: typeof vp?.x === 'number' ? vp.x : 0,
      y: typeof vp?.y === 'number' ? vp.y : 0,
      zoom: typeof vp?.zoom === 'number' ? vp.zoom : 1,
    },
    gridEnabled: (raw?.gridEnabled as boolean) ?? false,
    blocks: Array.isArray(raw?.blocks) ? (raw.blocks as CanvasBlockData[]) : [],
    connections: Array.isArray(raw?.connections) ? (raw.connections as CanvasConnectionData[]) : [],
  };
}
