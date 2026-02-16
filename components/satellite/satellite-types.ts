// Satellite types — maps to SATELLITE_SYSTEM_SPEC
// Used by SatelliteTypePicker, data-transformer, GalacticScene

export const SATELLITE_TYPES = [
  { type: 'questions' as const, name: 'Questions', icon: '🔮', color: '#00f0ff', description: 'Collect questions that need answers' },
  { type: 'issues' as const, name: 'Issues', icon: '⚠️', color: '#f43f5e', description: 'Track bugs, risks, technical debt' },
  { type: 'notes' as const, name: 'Notes', icon: '📡', color: '#818cf8', description: 'Store knowledge, context, research' },
  { type: 'documents' as const, name: 'Documents', icon: '🏗️', color: '#14b8a6', description: 'Files, assets, external resources' },
  { type: 'checklist' as const, name: 'Checklist', icon: '✅', color: '#22c55e', description: 'Quick action items to check off' },
  { type: 'metrics' as const, name: 'Metrics', icon: '📊', color: '#f59e0b', description: 'Track KPIs and data' },
  { type: 'ideas' as const, name: 'Ideas', icon: '💡', color: '#a855f7', description: 'Parking lot for unformed thoughts' },
  { type: 'repo' as const, name: 'Repo/Dev', icon: '🔧', color: '#64748b', description: 'Git, code workspace (coming soon)' },
  { type: 'canvas' as const, name: 'Canvas', icon: '📋', color: '#f97316', description: 'Infinite whiteboard — blocks and connections' },
] as const;

export type SatelliteType = (typeof SATELLITE_TYPES)[number]['type'];

// Plural names for auto-generated subtask names: [parentName] [typePlural]
export const SATELLITE_TYPE_PLURAL: Record<SatelliteType, string> = {
  questions: 'Questions',
  issues: 'Issues',
  notes: 'Notes',
  documents: 'Documents',
  checklist: 'Checklists',
  metrics: 'Metrics',
  ideas: 'Ideas',
  repo: 'Repo/Dev',
  canvas: 'Canvases',
};

// Map satellite_type to galaxy CSS class
export const SATELLITE_TYPE_TO_CSS: Record<SatelliteType, string> = {
  questions: 'sphere-drone',
  issues: 'hex-drone',
  notes: 'voyager-probe',
  documents: 'space-station',
  checklist: 'pulse-beacon',
  metrics: 'astro-gauge',
  ideas: 'nebula-spark',
  repo: 'core-module',
  canvas: 'nexus-drone',
};

// Reverse: spacecraft CSS class -> satellite_type (for palette drop)
export const SPACECRAFT_TO_SATELLITE: Record<string, SatelliteType> = {
  'sphere-drone': 'questions',
  'hex-drone': 'issues',
  'voyager-probe': 'notes',
  'space-station': 'documents',
  'pulse-beacon': 'checklist',
  'astro-gauge': 'metrics',
  'nebula-spark': 'ideas',
  'core-module': 'repo',
  'nexus-drone': 'canvas',
};
