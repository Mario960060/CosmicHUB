// CURSOR: Full notification center page

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/lib/notifications/queries';
import { useMarkAsRead, useMarkAllAsRead } from '@/lib/notifications/mutations';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';
import { Bell, HelpCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

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
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
            }}>
              <Bell size={28} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
            </div>
            <h1 style={{ 
              fontSize: '48px', 
              fontFamily: 'Orbitron, sans-serif', 
              color: '#00d9ff', 
              textShadow: '0 0 30px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0
            }}>
              Notifications
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginLeft: '72px' }}>
            Stay updated on your cosmic missions
          </p>
        </div>

        {/* Main Container */}
        <div style={{
          background: 'rgba(21, 27, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {/* Notifications List */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '3px solid rgba(0, 217, 255, 0.2)',
                borderTopColor: '#00d9ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Loading notifications...</p>
            </div>
          ) : notifications && notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(0, 217, 255, 0.3)',
              }}>
                <Bell size={40} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 10px #00d9ff)' }} />
              </div>
              <p style={{ 
                fontSize: '18px', 
                fontFamily: 'Orbitron, sans-serif',
                color: 'rgba(0, 217, 255, 0.9)',
                fontWeight: 600
              }}>
                No notifications yet
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '8px' }}>
                You're all caught up!
              </p>
            </div>
          ) : (
            <div>
              {notifications?.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '24px 28px',
                    borderBottom: index === notifications.length - 1 ? 'none' : '1px solid rgba(0, 217, 255, 0.1)',
                    cursor: 'pointer',
                    opacity: notification.read ? 0.5 : 1,
                    background: notification.read ? 'transparent' : 'rgba(0, 217, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.read ? 'transparent' : 'rgba(0, 217, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {/* Active indicator for unread */}
                  {!notification.read && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '50%',
                      background: '#00d9ff',
                      borderRadius: '0 3px 3px 0',
                      boxShadow: '0 0 10px #00d9ff',
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                    {/* Avatar */}
                    {notification.actor?.avatar_url ? (
                      <img
                        src={notification.actor.avatar_url}
                        alt={notification.actor.full_name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          border: '2px solid rgba(0, 217, 255, 0.3)',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : notification.actor?.full_name ? (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(0, 217, 255, 0.2)',
                        border: '2px solid rgba(0, 217, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#00d9ff',
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}>
                        {notification.actor.full_name.charAt(0)}
                      </div>
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(0, 217, 255, 0.25)',
                        border: '2px solid rgba(0, 217, 255, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)',
                      }}>
                        <HelpCircle 
                          size={24} 
                          style={{ 
                            color: '#7dd3fc', 
                            filter: 'drop-shadow(0 0 8px #00d9ff) drop-shadow(0 0 16px rgba(0, 217, 255, 0.8)' 
                          }} 
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: notification.read ? 'rgba(0, 217, 255, 0.85)' : '#00d9ff',
                        marginBottom: '6px',
                        fontFamily: 'system-ui, sans-serif'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '8px',
                        lineHeight: '1.5'
                      }}>
                        {notification.message}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>🕐</span>
                        <span>{formatRelativeTime(notification.created_at)}</span>
                      </div>
                    </div>

                    {/* Unread indicator dot */}
                    {!notification.read && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#ff6b35',
                        marginTop: '6px',
                        flexShrink: 0,
                        boxShadow: '0 0 10px rgba(255, 107, 53, 0.6)',
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mark all as read button */}
          {notifications && notifications.length > 0 && notifications.some((n) => !n.read) && (
            <div style={{ 
              padding: '20px 28px',
              borderTop: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'rgba(0, 217, 255, 0.03)',
            }}>
              <button
                onClick={() => user && markAllAsRead.mutate(user.id)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'rgba(0, 217, 255, 0.15)',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 217, 255, 0.25)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 217, 255, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
