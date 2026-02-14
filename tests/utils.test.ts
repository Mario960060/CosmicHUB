/**
 * Testy dla lib/utils.ts
 * Formatowanie dat, relative time, online/away detection
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatRelativeTime, isUserOnline, isUserAway, getStatusLabel } from '@/lib/utils';

describe('formatDate', () => {
  it('formats ISO string to readable date', () => {
    const result = formatDate('2026-02-12T10:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('12');
  });

  it('handles Date object', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toContain('2026');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for < 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns "Xm ago" for minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns "Xh ago" for hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns "Xd ago" for days (< 7)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for >= 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(tenDaysAgo);
    // Should fall back to formatDate, not "Xd ago"
    expect(result).not.toContain('d ago');
  });
});

describe('isUserOnline', () => {
  it('returns true if last_seen within 15 minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isUserOnline(fiveMinAgo)).toBe(true);
  });

  it('returns false if last_seen > 15 minutes ago', () => {
    const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect(isUserOnline(twentyMinAgo)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isUserOnline(null)).toBe(false);
  });
});

describe('isUserAway', () => {
  it('returns true if last_seen 15-60 min ago', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isUserAway(thirtyMinAgo)).toBe(true);
  });

  it('returns false if last_seen < 15 min ago (online, not away)', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isUserAway(fiveMinAgo)).toBe(false);
  });

  it('returns false if last_seen > 60 min ago (offline, not away)', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isUserAway(twoHoursAgo)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isUserAway(null)).toBe(false);
  });
});

describe('getStatusLabel', () => {
  it('returns human-readable labels for known statuses', () => {
    expect(getStatusLabel('todo')).toBe('To Do');
    expect(getStatusLabel('in_progress')).toBe('In Progress');
    expect(getStatusLabel('done')).toBe('Done');
    expect(getStatusLabel('blocked')).toBe('Blocked');
    expect(getStatusLabel('review')).toBe('In Review');
  });

  it('returns status as-is for unknown statuses', () => {
    expect(getStatusLabel('custom_status')).toBe('custom_status');
  });
});
