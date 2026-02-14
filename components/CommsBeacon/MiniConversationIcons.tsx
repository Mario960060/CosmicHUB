'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { COMMS_STYLES, getChannelDisplayName, getChannelInitials } from './comms-styles';
import { isUserOnline } from '@/lib/utils';

const MAX_VISIBLE = 4;

export interface OpenChat {
  id: string;
  channel: any;
  isMinimized: boolean;
}

interface MiniConversationIconsProps {
  openChats: OpenChat[];
  activeId: string | null;
  currentUserId?: string;
  onToggle: (channelId: string) => void;
  onClose: (channelId: string) => void;
  onOverflowClick?: () => void;
}

function IconWithClose({
  id,
  channel,
  isDM,
  otherUser,
  initials,
  online,
  isActive,
  onToggle,
  onClose,
}: {
  id: string;
  channel: any;
  isDM: boolean;
  otherUser: any;
  initials: string;
  online: boolean;
  isActive: boolean;
  onToggle: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      key={id}
      style={{ position: 'relative', width: 42, height: 42 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onToggle(id)}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: isDM ? COMMS_STYLES.accentRgba(0.15) : COMMS_STYLES.accentRgba(0.12),
          border: isActive ? `2px solid ${COMMS_STYLES.accent}` : `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
          color: COMMS_STYLES.accent,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? `0 0 12px ${COMMS_STYLES.accent}66` : 'none',
        }}
      >
        {otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </button>
      {online && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: COMMS_STYLES.online,
            border: '2px solid #050510',
          }}
        />
      )}
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(id);
          }}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: COMMS_STYLES.unread,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

export function MiniConversationIcons({ openChats, activeId, currentUserId, onToggle, onClose, onOverflowClick }: MiniConversationIconsProps) {
  const visible = openChats.slice(0, MAX_VISIBLE);
  const overflow = openChats.length - MAX_VISIBLE;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 76,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
        zIndex: 9996,
      }}
    >
      {overflow > 0 && (
        <button
          onClick={onOverflowClick}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: COMMS_STYLES.accentRgba(0.08),
            border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
            color: COMMS_STYLES.accent,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +{overflow}
        </button>
      )}
      {visible.map(({ id, channel }) => {
        const isActive = activeId === id;
        const isDM = channel?.type === 'dm';
        const otherUser = channel?.other_user;
        const online = isDM && otherUser?.last_seen ? isUserOnline(otherUser.last_seen) : false;
        const displayName = getChannelDisplayName(channel, currentUserId);
        const initials = getChannelInitials(channel, currentUserId);

        return (
          <IconWithClose
            key={id}
            id={id}
            channel={channel}
            isDM={isDM}
            otherUser={otherUser}
            initials={initials}
            online={online}
            isActive={isActive}
            onToggle={onToggle}
            onClose={onClose}
          />
        );
      })}
    </div>
  );
}
