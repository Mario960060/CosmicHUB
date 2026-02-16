/**
 * Initial satellite_data for each satellite type.
 * Used when creating new subtasks (galactic drop, CreateSubtaskDialog).
 */

import type { SatelliteType } from '@/components/satellite/satellite-types';

export function getInitialSatelliteData(type: SatelliteType): Record<string, unknown> {
  switch (type) {
    case 'questions':
      return { questions: [] };
    case 'issues':
      return { issues: [] };
    case 'notes':
      return { notes: [] };
    case 'documents':
      return { files: [], links: [], folders: [] };
    case 'checklist':
      return { items: [] };
    case 'metrics':
      return { metrics: [], primary_metric_id: null, chart_type: 'line' };
    case 'ideas':
      return { ideas: [] };
    case 'repo':
      return {};
    case 'canvas':
      return { canvases: [] };
    default:
      return {};
  }
}
