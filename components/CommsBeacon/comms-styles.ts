export const COMMS_STYLES = {
  accent: '#00f0ff',
  accentRgba: (a: number) => `rgba(0, 240, 255, ${a})`,
  bg: 'rgba(8, 16, 32, 0.98)',
  border: 'rgba(0, 240, 255, 0.1)',
  text: '#94a3b8',
  muted: '#334155',
  textPreview: '#94a3b8',
  unread: '#f43f5e',
  online: '#22c55e',
  away: '#f59e0b',
  groupTag: '#a855f7',
  taskTag: '#f59e0b',
};

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getChannelDisplayName(ch: any, currentUserId?: string) {
  if (ch.type === 'dm') {
    const otherName = ch.other_user?.full_name?.trim();
    if (otherName) return otherName;
    const lastMsg = ch.last_message;
    if (lastMsg?.user_id !== currentUserId && lastMsg?.user) {
      const u = Array.isArray(lastMsg.user) ? lastMsg.user[0] : lastMsg.user;
      if (u?.full_name) return u.full_name;
    }
    return 'Unknown';
  }
  if (ch.type === 'tasks') return ch.project?.name ? `${ch.project.name} Tasks` : 'Tasks';
  if (ch.type === 'group') return ch.name || 'Group';
  return ch.name || 'Unknown';
}

export function getChannelInitials(ch: any, currentUserId?: string) {
  const name = getChannelDisplayName(ch, currentUserId);
  return getInitials(name);
}
