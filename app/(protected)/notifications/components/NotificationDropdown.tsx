'use client';

import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/lib/notifications/queries';
import { useMarkAsRead, useMarkAllAsRead } from '@/lib/notifications/mutations';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import { BellOff, HelpCircle } from 'lucide-react';

interface NotificationDropdownProps {
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function NotificationDropdown({ onClose, buttonRef }: NotificationDropdownProps) {
  const { user } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef?.current?.contains(target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, buttonRef]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }

    if (notification.related_type && notification.related_id) {
      switch (notification.related_type) {
        case 'task':
        case 'subtask':
          router.push(`/workstation?task=${notification.related_id}`);
          break;
        case 'project':
          router.push(`/pm/projects/${notification.related_id}`);
          break;
        case 'request':
          router.push('/pm/requests');
          break;
        case 'user':
          router.push('/admin/users');
          break;
        case 'channel':
          window.dispatchEvent(new CustomEvent('open-comms-channel', { detail: { channelId: notification.related_id } }));
          break;
      }
    }
    onClose();
  };

  const handleMarkAsReadOnly = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }
  };

  // Show only unread notifications in dropdown
  const recentNotifications = notifications?.filter(n => !n.read).slice(0, 10) || [];

  return (
    <div
      ref={dropdownRef}
      style={{
        width: '384px',
        maxHeight: '600px',
        background: 'rgba(21, 27, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 0 30px rgba(0, 217, 255, 0.2)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
        background: 'rgba(0, 217, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00d9ff' }}>Notifications</h3>
        {recentNotifications.some((n) => !n.read) && (
          <button
            onClick={() => user && markAllAsRead.mutate(user.id)}
            style={{
              fontSize: '12px',
              padding: '4px 12px',
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '8px',
              color: '#00d9ff',
              cursor: 'pointer'
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="scrollbar-cosmic" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {recentNotifications.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
              margin: '0 auto 16px',
            }}>
              <BellOff size={32} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
            </div>
            <p style={{ color: 'rgba(0, 217, 255, 0.9)', fontSize: '14px', fontWeight: '600' }}>No notifications</p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
                cursor: 'pointer',
                opacity: notification.read ? 0.6 : 1,
                background: notification.read ? 'transparent' : 'rgba(0, 217, 255, 0.05)',
                borderLeft: notification.read ? 'none' : '2px solid #00d9ff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? 'transparent' : 'rgba(0, 217, 255, 0.05)'}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                {notification.actor?.avatar_url ? (
                  <img
                    src={notification.actor.avatar_url}
                    alt={notification.actor.full_name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(0, 217, 255, 0.3)' }}
                  />
                ) : notification.actor?.full_name ? (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 217, 255, 0.2)',
                    border: '1px solid rgba(0, 217, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: '#00d9ff',
                    fontFamily: 'Orbitron, sans-serif',
                  }}>
                    {notification.actor.full_name.charAt(0)}
                  </div>
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 217, 255, 0.25)',
                    border: '1px solid rgba(0, 217, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(0, 217, 255, 0.5)',
                  }}>
                    <HelpCircle 
                      size={18} 
                      style={{ 
                        color: '#7dd3fc', 
                        filter: 'drop-shadow(0 0 6px #00d9ff) drop-shadow(0 0 12px rgba(0, 217, 255, 0.8)' 
                      }} 
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#00d9ff' }}>{notification.title}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                    {notification.message}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsReadOnly(e, notification)}
                    title="Mark as read"
                    style={{
                      width: '14px',
                      height: '14px',
                      minWidth: '14px',
                      minHeight: '14px',
                      padding: 0,
                      borderRadius: '50%',
                      background: '#ff6b35',
                      border: 'none',
                      marginTop: '4px',
                      cursor: 'pointer',
                      boxShadow: '0 0 8px rgba(255, 107, 53, 0.5)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid rgba(0, 217, 255, 0.2)',
        background: 'rgba(0, 217, 255, 0.05)'
      }}>
        <button
          onClick={() => {
            router.push('/notifications');
            onClose();
          }}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            color: '#00d9ff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
}