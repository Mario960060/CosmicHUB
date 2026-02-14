// CURSOR: Supabase realtime subscriptions for notifications

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useNotificationRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New notification', {
              body: (payload.new as any).message,
              icon: '/icon.png',
            });
          }
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['whats-new'] });
        }
      )
      .subscribe();

    return () => {
      // unsubscribe() is enough – removeChannel can throw when WebSocket
      // is still connecting (e.g. Strict Mode, quick navigation)
      channel.unsubscribe().catch(() => {});
    };
  }, [userId, queryClient]);
}
