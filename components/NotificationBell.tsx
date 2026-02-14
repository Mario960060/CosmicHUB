'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/lib/notifications/queries';
import { useNotificationRealtime } from '@/lib/notifications/realtime';
import { useSubtaskRealtime } from '@/lib/dashboard/realtime';
import { Bell } from 'lucide-react';
import { createPortal } from 'react-dom';
import { NotificationDropdown } from '@/app/(protected)/notifications/components/NotificationDropdown';

export function NotificationBell() {
  const { user } = useAuth();
  const { data: unreadCount } = useUnreadCount(user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useNotificationRealtime(user?.id);
  useSubtaskRealtime();

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  const dropdown = isOpen && (
    <div style={{
      position: 'fixed',
      top: `${dropdownPosition.top}px`,
      right: `${dropdownPosition.right}px`,
      zIndex: 99999
    }}>
      <NotificationDropdown onClose={() => setIsOpen(false)} />
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '8px'
        }}
      >
        <Bell size={20} style={{ color: '#00d9ff' }} />
        {unreadCount !== undefined && unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '18px',
            height: '18px',
            background: '#ff6b35',
            color: 'white',
            fontSize: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            boxShadow: '0 0 10px rgba(255, 107, 53, 0.5)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {typeof window !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  );
}