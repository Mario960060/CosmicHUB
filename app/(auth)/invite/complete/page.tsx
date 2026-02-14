'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Page shown after email confirmation. Calls complete_invite_signup RPC
 * and redirects to workstation.
 */
export default function InviteCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }

    const complete = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data } = await supabase.rpc('complete_invite_signup', {
        p_token: token,
        p_full_name: session.user.user_metadata?.full_name ?? null,
      });

      const result = data as { success?: boolean; error?: string } | null;
      if (result?.success === false) {
        setError(result.error || 'Failed to complete signup');
        return;
      }

      router.replace('/workstation');
      router.refresh();
    };

    complete();
  }, [token, router]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(2, 6, 23)' }}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#fecaca', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/login')}
            style={{ padding: '12px 24px', background: 'rgba(0, 217, 255, 0.2)', border: '2px solid #00d9ff', borderRadius: '12px', color: '#00d9ff', cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(2, 6, 23)' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={48} style={{ color: '#00d9ff', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'rgba(0, 217, 255, 0.8)', marginTop: '24px' }}>Completing your account...</p>
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
