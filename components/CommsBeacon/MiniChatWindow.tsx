'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useChannelMessages, useGroupMembers, useTeamUsers } from '@/lib/chat/queries';
import { useSendMessage, useMarkChannelRead, useAddGroupMember, useLeaveGroup, usePromoteGroupMember, useDemoteGroupMember, useRemoveGroupMember } from '@/lib/chat/mutations';
import { useChatRealtime } from '@/lib/chat/realtime';
import { X, Send, Minus, Settings, MessageCircle, UserMinus, Shield, ShieldOff } from 'lucide-react';
import { COMMS_STYLES, getInitials, getChannelDisplayName, getChannelInitials } from './comms-styles';
import { canRemoveMember, canPromoteMember, canDemoteMember, canManageMembers } from '@/lib/chat/permissions';
import { isUserOnline } from '@/lib/utils';
import type { MessageWithUser } from '@/lib/chat/queries';

interface MiniChatWindowProps {
  channel: any;
  isActive: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onLeave?: () => void;
}

function formatTimeDivider(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  return d.toLocaleDateString();
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    in_progress: '#f59e0b',
    todo: '#475569',
    done: '#22c55e',
    blocked: '#f43f5e',
    review: COMMS_STYLES.accent,
  };
  return map[status?.toLowerCase()] || COMMS_STYLES.accent;
}

function TaskRefCard({ task }: { task: { id: string; name: string; status: string } }) {
  const statusColor = getStatusColor(task.status);
  const displayStatus = task.status?.replace(/_/g, ' ').toUpperCase() || 'TODO';
  return (
    <div
      style={{
        marginTop: 6,
        padding: '8px 12px',
        borderRadius: 8,
        background: COMMS_STYLES.accentRgba(0.025),
        border: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 14 }}>⚡</span>
      <span style={{ flex: 1, fontSize: 11, color: COMMS_STYLES.text, fontWeight: 500 }}>{task.name}</span>
      <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{displayStatus}</span>
    </div>
  );
}

function getMentionState(text: string, cursorPos: number): { query: string; start: number } | null {
  const beforeCursor = text.slice(0, cursorPos);
  const atMatch = beforeCursor.match(/@([^\s@]*)$/);
  if (!atMatch) return null;
  return { query: atMatch[1].toLowerCase(), start: cursorPos - atMatch[0].length };
}

/** Znajduje najdłuższy dopasowany prefix dla @mention. Segment = tekst po @. */
function findMentionMatch(segment: string, mentionableNames: string[]): { matched: string; len: number } | null {
  const sorted = [...mentionableNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const segLower = segment.toLowerCase();
    const nameLower = name.toLowerCase();
    if (segLower.startsWith(nameLower)) {
      const afterName = segment[nameLower.length];
      const len = nameLower.length + (afterName === ' ' ? 1 : 0);
      return { matched: name, len: Math.min(len, segment.length) };
    }
    if (nameLower.startsWith(segLower)) {
      return { matched: name, len: segment.length };
    }
  }
  return null;
}

/** Renders text with @mentions highlighted in cyan. Mentions stay highlighted even when more text follows. */
function renderTextWithMentions(text: string, mentionableNames: string[], baseColor: string = COMMS_STYLES.text) {
  if (!text) return null;
  const parts: { text: string; isMention: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    const atIdx = text.indexOf('@', i);
    if (atIdx === -1) {
      parts.push({ text: text.slice(i), isMention: false });
      break;
    }
    if (atIdx > i) {
      parts.push({ text: text.slice(i, atIdx), isMention: false });
    }
    const segment = text.slice(atIdx + 1);
    const match = findMentionMatch(segment, mentionableNames);
    if (match) {
      const mentionText = '@' + segment.slice(0, match.len);
      parts.push({ text: mentionText, isMention: true });
      i = atIdx + 1 + match.len;
    } else {
      const nextAt = segment.indexOf('@');
      const chunkEnd = nextAt === -1 ? text.length : atIdx + 1 + nextAt;
      parts.push({ text: text.slice(atIdx, chunkEnd), isMention: false });
      i = chunkEnd;
    }
  }
  return (
    <>
      {parts.map((p, i) =>
        p.isMention ? (
          <span key={i} style={{ color: COMMS_STYLES.accent, fontWeight: 500 }}>
            {p.text}
          </span>
        ) : (
          <span key={i} style={{ color: baseColor }}>{p.text}</span>
        )
      )}
    </>
  );
}

export function MiniChatWindow({ channel, isActive, onMinimize, onClose, onLeave }: MiniChatWindowProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [mentionHighlight, setMentionHighlight] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef(0);
  const { data: messages } = useChannelMessages(channel?.id, !!channel && isActive);
  const sendMessage = useSendMessage();
  const markRead = useMarkChannelRead();
  const { data: teamUsers } = useTeamUsers(user?.id, user?.role);
  const { data: groupMembers } = useGroupMembers(channel?.type === 'group' ? channel?.id : null, !!channel);

  useChatRealtime(user?.id, isActive ? channel?.id : null);

  const mentionState = getMentionState(inputValue, cursorPosRef.current);
  const mentionablePeople = (() => {
    const people: { id: string; name: string; type: 'user' }[] = [];
    const seen = new Set<string>();
    (groupMembers || [])
      .filter((m: any) => m.user && m.user.id !== user?.id)
      .forEach((m: any) => {
        const u = m.user;
        if (u && !seen.has(u.id)) {
          seen.add(u.id);
          people.push({ id: u.id, name: u.full_name || 'Unknown', type: 'user' });
        }
      });
    (teamUsers || []).forEach((u) => {
      if (u.id !== user?.id && !seen.has(u.id)) {
        seen.add(u.id);
        people.push({ id: u.id, name: u.full_name || 'Unknown', type: 'user' });
      }
    });
    return people;
  })();
  const filteredMentions = mentionState
    ? mentionablePeople.filter((p) => p.name.toLowerCase().includes(mentionState.query)).slice(0, 8)
    : [];
  const showMentionDropdown = mentionState && (filteredMentions.length > 0 || mentionState.query === '');

  useEffect(() => {
    if (isActive && messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isActive]);

  useEffect(() => {
    if (isActive && channel && user?.id) {
      const t = setTimeout(() => {
        markRead.mutate({ channelId: channel.id, userId: user.id });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isActive, channel?.id, user?.id]);

  useEffect(() => {
    if (showMentionDropdown) setMentionHighlight(0);
    else setMentionHighlight(-1);
  }, [showMentionDropdown]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !channel || !user?.id || channel.type === 'tasks') return;
    setInputValue('');
    setMentionHighlight(-1);
    sendMessage.mutate(
      {
        channelId: channel.id,
        content,
        userId: user.id,
        userFullName: user.full_name,
        mentionablePeople,
      },
      {
        onError: (err) => {
          toast.error('Failed to send message', { description: err.message });
        },
      }
    );
  };

  const insertMention = (name: string) => {
    if (!mentionState || !inputRef.current) return;
    const before = inputValue.slice(0, mentionState.start);
    const after = inputValue.slice(cursorPosRef.current);
    const replacement = `@${name} `;
    setInputValue(before + replacement + after);
    setMentionHighlight(-1);
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = mentionState.start + replacement.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
      cursorPosRef.current = newPos;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionDropdown && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight((h) => (h < filteredMentions.length - 1 ? h + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight((h) => (h <= 0 ? filteredMentions.length - 1 : h - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentions[mentionHighlight >= 0 ? mentionHighlight : 0];
        if (selected) insertMention(selected.name);
        return;
      }
      if (e.key === 'Escape') {
        setMentionHighlight(-1);
        return;
      }
    }
    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!channel || !user) return null;

  const isTasksChannel = channel.type === 'tasks';
  const isDM = channel.type === 'dm';
  const isGroup = channel.type === 'group';
  const otherUser = channel.other_user;
  const online = isDM && otherUser?.last_seen ? isUserOnline(otherUser.last_seen) : false;

  const addMember = useAddGroupMember();
  const leaveGroup = useLeaveGroup();
  const promoteMember = usePromoteGroupMember();
  const demoteMember = useDemoteGroupMember();
  const removeMember = useRemoveGroupMember();

  const memberIds = new Set((groupMembers || []).map((m: any) => m.user_id));
  const currentUserMember = (groupMembers || []).find((m: any) => m.user_id === user?.id);
  const permCtx = {
    currentUserId: user?.id ?? '',
    currentUserProfileRole: user?.role,
    currentMemberRole: currentUserMember?.role as 'owner' | 'moderator' | 'member' | undefined,
  };
  const usersToAdd = (teamUsers || []).filter((u) => !memberIds.has(u.id));

  // Group messages by date for time dividers
  const grouped: { divider?: string; messages: MessageWithUser[] }[] = [];
  let lastDate = '';
  for (const msg of messages || []) {
    const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : '';
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      grouped.push({ divider: msg.created_at ? formatTimeDivider(msg.created_at) : undefined, messages: [msg] });
    } else {
      if (grouped.length) grouped[grouped.length - 1].messages.push(msg);
      else grouped.push({ messages: [msg] });
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 88,
        right: 24,
        width: 320,
        minWidth: 320,
        maxWidth: 320,
        height: 430,
        minHeight: 430,
        maxHeight: 430,
        borderRadius: 14,
        background: `linear-gradient(175deg, ${COMMS_STYLES.bg}, rgba(3,8,18,0.99))`,
        border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,240,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9997,
        fontFamily: '"Exo 2", sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 12px',
          borderBottom: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: COMMS_STYLES.accentRgba(0.02),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isDM && otherUser ? (
            <>
              <div style={{ position: 'relative' }}>
                {otherUser.avatar_url ? (
                  <img src={otherUser.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: COMMS_STYLES.accentRgba(0.2),
                      color: COMMS_STYLES.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {getChannelInitials(channel, user?.id)}
                  </span>
                )}
                {online && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: COMMS_STYLES.online,
                      border: '2px solid rgba(8,16,32,0.9)',
                    }}
                  />
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: COMMS_STYLES.accent }}>{getChannelDisplayName(channel, user?.id)}</div>
                <div style={{ fontSize: 10, color: online ? COMMS_STYLES.online : COMMS_STYLES.muted }}>{online ? 'online' : ''}</div>
              </div>
            </>
          ) : (
            <>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: COMMS_STYLES.accentRgba(0.15),
                      color: COMMS_STYLES.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {getChannelInitials(channel, user?.id)}
                  </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: COMMS_STYLES.accent }}>
                {channel.type === 'channel' && '# '}
                {getChannelDisplayName(channel, user?.id)}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {isGroup && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
                color: COMMS_STYLES.text,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={showSettings ? 'Back to chat' : 'Settings'}
            >
              {showSettings ? <MessageCircle size={14} /> : <Settings size={14} />}
            </button>
          )}
          <button
            onClick={onMinimize}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
              color: COMMS_STYLES.text,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
              color: COMMS_STYLES.text,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages or Settings */}
      <div
        className="scrollbar-cosmic"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {isGroup && showSettings ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: COMMS_STYLES.muted, fontFamily: 'Rajdhani', marginBottom: 8 }}>Members</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(groupMembers || []).map((m: any) => {
                  const u = m.user;
                  if (!u) return null;
                  const isSelf = u.id === user?.id;
                  const targetMember = {
                    userId: u.id,
                    memberRole: (m.role || 'member') as 'owner' | 'moderator' | 'member',
                    userProfileRole: u.role,
                  };
                  const canRemove = canRemoveMember(permCtx, targetMember);
                  const canPromote = canPromoteMember(permCtx, targetMember);
                  const canDemote = canDemoteMember(permCtx, targetMember);
                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: COMMS_STYLES.accentRgba(0.03),
                        border: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
                      }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: COMMS_STYLES.accentRgba(0.2),
                            color: COMMS_STYLES.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {getInitials(u.full_name || '?')}
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: COMMS_STYLES.text }}>{u.full_name || 'Unknown'}</span>
                          {isSelf && <span style={{ fontSize: 10, color: COMMS_STYLES.muted }}>You</span>}
                          {m.role === 'owner' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COMMS_STYLES.accentRgba(0.25), color: COMMS_STYLES.accent }}>Założyciel</span>}
                          {m.role === 'moderator' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COMMS_STYLES.accentRgba(0.12), color: COMMS_STYLES.accent }}>Moderator</span>}
                          {u.role === 'admin' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COMMS_STYLES.accentRgba(0.15), color: COMMS_STYLES.accent }}>Admin</span>}
                        </div>
                      </div>
                      {canManageMembers(permCtx) && !(u.id === user?.id) && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {canPromote && (
                            <button
                              onClick={() =>
                                promoteMember.mutate(
                                  { channelId: channel.id, userId: u.id },
                                  { onError: (err) => toast.error('Could not promote', { description: err.message }) }
                                )
                              }
                              disabled={promoteMember.isPending}
                              title="Promote to moderator"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
                                background: 'transparent',
                                color: COMMS_STYLES.accent,
                                cursor: promoteMember.isPending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          {canDemote && (
                            <button
                              onClick={() =>
                                demoteMember.mutate(
                                  { channelId: channel.id, userId: u.id },
                                  { onError: (err) => toast.error('Could not demote', { description: err.message }) }
                                )
                              }
                              disabled={demoteMember.isPending}
                              title="Remove moderator role"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
                                background: 'transparent',
                                color: COMMS_STYLES.text,
                                cursor: demoteMember.isPending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <ShieldOff size={14} />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              onClick={() =>
                                removeMember.mutate(
                                  { channelId: channel.id, userId: u.id },
                                  { onError: (err) => toast.error('Could not remove', { description: err.message }) }
                                )
                              }
                              disabled={removeMember.isPending}
                              title="Remove from group"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${COMMS_STYLES.unread}66`,
                                background: 'transparent',
                                color: COMMS_STYLES.unread,
                                cursor: removeMember.isPending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {usersToAdd.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: COMMS_STYLES.muted, fontFamily: 'Rajdhani', marginBottom: 8 }}>Add member</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {usersToAdd.map((u) => (
                    <button
                      key={u.id}
                      onClick={() =>
                        addMember.mutate(
                          { channelId: channel.id, userId: u.id },
                          {
                            onError: (err) => toast.error('Could not add member', { description: err.message }),
                          }
                        )
                      }
                      disabled={addMember.isPending}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
                        color: COMMS_STYLES.text,
                        cursor: addMember.isPending ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        fontSize: 12,
                      }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: COMMS_STYLES.accentRgba(0.2),
                            color: COMMS_STYLES.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {getInitials(u.full_name || '?')}
                        </span>
                      )}
                      <span style={{ flex: 1 }}>{u.full_name || 'Unknown'}</span>
                      <span style={{ color: COMMS_STYLES.accent, fontSize: 11 }}>+ Add</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <button
                onClick={() =>
                  leaveGroup.mutate(
                    { channelId: channel.id },
                    {
                      onSuccess: () => {
                        onLeave?.();
                        onClose();
                      },
                      onError: (err) => toast.error('Could not leave', { description: err.message }),
                    }
                  )
                }
                disabled={leaveGroup.isPending}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${COMMS_STYLES.unread}66`,
                  background: 'transparent',
                  color: COMMS_STYLES.unread,
                  fontSize: 12,
                  cursor: leaveGroup.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {leaveGroup.isPending ? 'Leaving...' : 'Leave group'}
              </button>
            </div>
          </div>
        ) : (messages || []).length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>No messages yet</span>
          </div>
        ) : (
          <>
            {grouped.map((g, gi) => (
              <div key={gi}>
                {g.divider && (
                  <div style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: 10, color: COMMS_STYLES.text, fontFamily: 'Rajdhani' }}>
                    —— {g.divider} ——
                  </div>
                )}
                {g.messages.map((msg, idx) => {
                  const isOwn = msg.user_id === user?.id;
                  const prevMsg = g.messages[idx - 1];
                  const isConsecutive = prevMsg && prevMsg.user_id === msg.user_id && prevMsg.type === msg.type && msg.type === 'user';
                  return (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: isConsecutive ? 2 : 8, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    {msg.type === 'user' && msg.user ? (
                      <>
                        {!isConsecutive ? (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: COMMS_STYLES.accentRgba(0.12),
                              color: COMMS_STYLES.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {isOwn ? getInitials(user?.full_name || 'Ty') : getInitials(msg.user.full_name || '?')}
                          </div>
                        ) : (
                          <div style={{ width: 28, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                          {!isConsecutive && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: COMMS_STYLES.accent }}>{isOwn ? 'Ty' : msg.user.full_name}</span>
                              <span style={{ fontFamily: 'Rajdhani', fontSize: 10, color: COMMS_STYLES.text }}>
                                {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <p style={{ fontSize: 12, lineHeight: 1.55, margin: 0, textAlign: isOwn ? 'right' : 'left' }}>
                            {msg.content ? renderTextWithMentions(msg.content, mentionablePeople.map((p) => p.name), COMMS_STYLES.text) : null}
                          </p>
                          {msg.task && <TaskRefCard task={msg.task} />}
                        </div>
                      </>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center', padding: '6px 0' }}>
                        <span
                          style={{
                            fontFamily: 'Exo 2',
                            fontSize: 11,
                            color: COMMS_STYLES.muted,
                            padding: '3px 12px',
                            borderRadius: 10,
                            background: COMMS_STYLES.accentRgba(0.02),
                            border: `1px solid ${COMMS_STYLES.accentRgba(0.04)}`,
                          }}
                        >
                          {msg.content}
                        </span>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {!isTasksChannel && !(isGroup && showSettings) && (
        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            padding: 12,
            borderTop: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                minHeight: 38,
                maxHeight: 80,
                padding: '9px 14px',
                borderRadius: 10,
                background: COMMS_STYLES.accentRgba(0.03),
                border: `1px solid transparent`,
                fontFamily: 'Exo 2',
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              {renderTextWithMentions(inputValue || '', mentionablePeople.map((p) => p.name), '#e2e8f0')}
            </div>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                cursorPosRef.current = e.target.selectionStart ?? 0;
                setInputValue(e.target.value);
              }}
              onSelect={(e) => {
                cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart ?? 0;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Transmit message... (type @ to mention)"
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                minHeight: 38,
                maxHeight: 80,
                padding: '9px 14px',
                borderRadius: 10,
                background: 'transparent',
                border: `1px solid ${COMMS_STYLES.accentRgba(0.08)}`,
                fontFamily: 'Exo 2',
                fontSize: 12,
                color: 'transparent',
                caretColor: COMMS_STYLES.accent,
                resize: 'none',
                outline: 'none',
              }}
              className="comms-mention-input"
            />
            {showMentionDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 6,
                  maxHeight: 180,
                  overflowY: 'auto',
                  background: 'rgba(8, 16, 32, 0.98)',
                  border: `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: 10, color: COMMS_STYLES.muted, fontFamily: 'Orbitron' }}>
                  Oznacz osobę @
                </div>
                {filteredMentions.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => insertMention(p.name)}
                    onMouseEnter={() => setMentionHighlight(i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: mentionHighlight === i ? COMMS_STYLES.accentRgba(0.15) : 'transparent',
                      border: 'none',
                      color: COMMS_STYLES.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: COMMS_STYLES.accentRgba(0.2),
                        color: COMMS_STYLES.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(p.name)}
                    </span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
              background: COMMS_STYLES.accentRgba(0.06),
              color: COMMS_STYLES.accent,
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              opacity: inputValue.trim() ? 1 : 0.3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
