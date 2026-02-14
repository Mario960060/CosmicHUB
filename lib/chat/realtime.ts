// CURSOR: Comms Beacon realtime subscriptions

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useChatRealtime(userId: string | undefined, channelId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.channel_id === channelId) {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', channelId] });
          }
          queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
          queryClient.invalidateQueries({ queryKey: ['chat-total-unread'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch(() => {});
    };
  }, [userId, channelId, queryClient]);
}
