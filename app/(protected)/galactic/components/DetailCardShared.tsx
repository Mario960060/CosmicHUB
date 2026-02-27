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

/** Clickable dependency row – from/to are links that call onNavigateToSubtask */
export function DependencyRow({
  dep,
  onNavigateToSubtask,
}: {
  dep: { id: string; dependency_type?: string; note?: string | null; dependent_subtask?: { id: string; name: string } | null; depends_on_subtask?: { id: string; name: string } | null };
  onNavigateToSubtask?: (subtaskId: string) => void;
}) {
  const from = dep.dependent_subtask?.name || '?';
  const to = dep.depends_on_subtask?.name || '?';
  const fromId = dep.dependent_subtask?.id;
  const toId = dep.depends_on_subtask?.id;
  const typ = dep.dependency_type || 'depends_on';
  const color = getDependencyTypeColor(typ);

  const linkStyle: React.CSSProperties = {
    color: 'rgba(0,217,255,0.9)',
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ color, fontSize: 11, fontWeight: 600 }}>{formatDependencyType(typ)}</span>
      {dep.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{dep.note}</div>}
      <div style={{ marginTop: 2 }}>
        {onNavigateToSubtask && fromId ? (
          <span
            role="button"
            tabIndex={0}
            onClick={() => onNavigateToSubtask(fromId)}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateToSubtask(fromId)}
            style={linkStyle}
          >
            {from}
          </span>
        ) : (
          <span>{from}</span>
        )}
        {' → '}
        {onNavigateToSubtask && toId ? (
          <span
            role="button"
            tabIndex={0}
            onClick={() => onNavigateToSubtask(toId)}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateToSubtask(toId)}
            style={linkStyle}
          >
            {to}
          </span>
        ) : (
          <span>{to}</span>
        )}
      </div>
    </div>
  );
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
