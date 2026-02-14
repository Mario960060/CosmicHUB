/**
 * Shared helpers for SunDetailCard, PlanetDetailCard, MoonDetailCard
 */

export function getStatusBadgeStyle(status: string): {
  bg: string;
  color: string;
  text: string;
} {
  switch (status) {
    case 'done':
      return { bg: 'rgba(34, 197, 94, 0.25)', color: '#22c55e', text: 'Done' };
    case 'in_progress':
    case 'in progress':
      return { bg: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b', text: 'In progress' };
    case 'blocked':
      return { bg: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', text: 'Blocked' };
    case 'todo':
    default:
      return { bg: 'rgba(148, 163, 184, 0.25)', color: '#94a3b8', text: 'Todo' };
  }
}

export function getStatusDotColor(status: string): string {
  switch (status) {
    case 'done':
      return '#22c55e';
    case 'in_progress':
    case 'in progress':
      return '#f59e0b';
    case 'blocked':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDependencyType(type: string): string {
  switch (type) {
    case 'blocks': return 'Blocks';
    case 'depends_on': return 'Depends on';
    case 'related_to': return 'Related to';
    default: return type;
  }
}

export function getDependencyTypeColor(type: string): string {
  switch (type) {
    case 'blocks': return '#ef4444';
    case 'depends_on': return '#f59e0b';
    case 'related_to': return '#fff';
    default: return 'rgba(255,255,255,0.6)';
  }
}

export function renderStars(stars: number, color = '#fbbf24', size = 16) {
  const fullStars = Math.floor(stars);
  const hasHalf = stars % 1 >= 0.5;
  const emptyStars = 3 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span style={{ color, fontSize: size, letterSpacing: '1px' }}>
      {'★'.repeat(fullStars)}
      {hasHalf ? '☆' : ''}
      {'☆'.repeat(Math.max(0, emptyStars))}
    </span>
  );
}

/** Compact meta row for hierarchy: progress %, hours, assigned count, stars */
export function HierarchyMetaRow({
  progress,
  loggedHours,
  estimatedHours,
  assignedCount,
  stars,
  accentColor = '#fbbf24',
}: {
  progress: number;
  loggedHours: number;
  estimatedHours: number | null;
  assignedCount: number;
  stars: number;
  accentColor?: string;
}) {
  const hoursStr =
    estimatedHours != null
      ? `${Math.round(loggedHours * 10) / 10}h / ${estimatedHours}h`
      : `${Math.round(loggedHours * 10) / 10}h / ?`;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
      <span>{progress}%</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{hoursStr}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{assignedCount} assigned</span>
      {renderStars(stars, accentColor, 12)}
    </span>
  );
}
