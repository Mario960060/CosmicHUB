'use client';

import {
  HelpCircle,
  AlertTriangle,
  FileText,
  File,
  CheckSquare,
  BarChart2,
  Lightbulb,
  GitBranch,
  LayoutGrid,
} from 'lucide-react';
import { SATELLITE_TYPES } from './satellite-types';
import type { SatelliteType } from './satellite-types';

const SATELLITE_ICONS: Record<SatelliteType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  questions: HelpCircle,
  issues: AlertTriangle,
  notes: FileText,
  documents: File,
  checklist: CheckSquare,
  metrics: BarChart2,
  ideas: Lightbulb,
  repo: GitBranch,
  canvas: LayoutGrid,
};

interface SubtaskTypeIconProps {
  satelliteType?: string | null;
  size?: number;
  style?: React.CSSProperties;
}

export function SubtaskTypeIcon({ satelliteType, size = 12, style }: SubtaskTypeIconProps) {
  const type = (satelliteType || 'notes') as SatelliteType;
  const config = SATELLITE_TYPES.find((t) => t.type === type) ?? SATELLITE_TYPES.find((t) => t.type === 'notes')!;
  const Icon = SATELLITE_ICONS[type] ?? SATELLITE_ICONS.notes;

  return (
    <Icon
      size={size}
      style={{
        color: config.color,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
