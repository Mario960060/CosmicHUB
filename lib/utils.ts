import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ensure URL has protocol so it opens externally, not as relative path */
export function ensureAbsoluteUrl(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Parses last_seen from DB (UTC) as UTC. DB returns timestamp without Z; JS treats that as local. */
function parseLastSeenAsUtc(lastSeen: string | null): number | null {
  if (!lastSeen) return null;
  const s = String(lastSeen).trim().replace(' ', 'T');
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s).getTime();
  return new Date(s + 'Z').getTime();
}

/** User is online if last_seen (UTC) is within last 15 minutes. */
export function isUserOnline(lastSeen: string | null): boolean {
  const ts = parseLastSeenAsUtc(lastSeen);
  if (ts == null) return false;
  return ts > Date.now() - 15 * 60 * 1000;
}

/** User is away if last_seen is 15-60 min ago. */
export function isUserAway(lastSeen: string | null): boolean {
  const ts = parseLastSeenAsUtc(lastSeen);
  if (ts == null) return false;
  const now = Date.now();
  const fifteenMinAgo = now - 15 * 60 * 1000;
  const sixtyMinAgo = now - 60 * 60 * 1000;
  return ts <= fifteenMinAgo && ts > sixtyMinAgo;
}

/** Format last_seen (UTC from DB) for display in local timezone. */
export function formatLastSeen(lastSeen: string | null): string {
  const ts = parseLastSeenAsUtc(lastSeen);
  if (ts == null) return '';
  return new Date(ts).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Task/subtask status display labels */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    blocked: 'Blocked',
    review: 'In Review',
  };
  return labels[status] || status;
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
