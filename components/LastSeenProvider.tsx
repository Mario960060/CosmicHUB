'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds

/**
 * Invisible component that updates last_seen for the current user.
 * Uses direct UPDATE (RPC requires migration 014 in Supabase).
 */
export function LastSeenProvider() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateLastSeen = async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
      if (error) console.warn('[LastSeen] Update failed:', error.message);
    };

    const startHeartbeat = (userId: string) => {
      updateLastSeen(userId);
      intervalRef.current = setInterval(() => updateLastSeen(userId), HEARTBEAT_INTERVAL_MS);
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) startHeartbeat(session.user.id);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (session?.user?.id) startHeartbeat(session.user.id);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
