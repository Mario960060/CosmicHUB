/**
 * Realtime subscriptions for dashboard queries - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 5.3
 * Invalidates red-flags, focus-queue, pm-attention-items on subtask changes.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useSubtaskRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-subtasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['red-flags'] });
          queryClient.invalidateQueries({ queryKey: ['deadline-timeline'] });
          queryClient.invalidateQueries({ queryKey: ['focus-queue'] });
          queryClient.invalidateQueries({ queryKey: ['pm-attention-items'] });
          queryClient.invalidateQueries({ queryKey: ['my-blockers'] });
          queryClient.invalidateQueries({ queryKey: ['my-dependency-waits'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch(() => {});
    };
  }, [queryClient]);
}
