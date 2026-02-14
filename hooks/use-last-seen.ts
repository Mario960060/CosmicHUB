'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Updates last_seen in the database periodically while the user is active.
 * Enables "Online" status in admin dashboard, team page, and users list.
 */
export function useLastSeen(userId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      try {
        const supabase = createClient();
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        console.debug('[last_seen] Update failed:', err);
      }
    };

    // Update immediately on mount
    updateLastSeen();

    // Then every minute
    intervalRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId]);
}
