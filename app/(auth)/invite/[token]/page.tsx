'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Zap, Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';

const STARS = Array.from({ length: 50 }).map(() => ({
  top: Math.random() * 100,
  left: Math.random() * 100,
  opacity: Math.random() * 0.5 + 0.3,
  duration: 2 + Math.random() * 3,
  delay: Math.random() * 2,
}));

export default function InviteSignupPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchState, setFetchState] = useState<'loading' | 'found' | 'invalid' | 'email_sent'>('loading');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setFetchState('invalid');
      return;
    }

    // Check if user is logged in - if so, reject immediately
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setError('You are already logged in. Please logout first to use an invitation link.');
        setFetchState('invalid');
        return;
      }

      // Fetch invite
      const { data, error } = await supabase
        .from('invites')
        .select('email, role')
        .eq('token', token)
        .eq('status', 'pending')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .single();

      if (error || !data) {
        setFetchState('invalid');
        return;
      }
      setInvite(data);
      setFetchState('found');
    };

    checkAuth();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite!.email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/invite/complete?token=${encodeURIComponent(token)}`,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user && signUpData.session) {
        // Session exists - immediately complete signup
        const { data: rpcData } = await supabase.rpc('complete_invite_signup', {
          p_token: token,
          p_full_name: fullName.trim(),
        });

        const result = rpcData as { success?: boolean; error?: string } | null;
        if (result?.success === false) {
          throw new Error(result.error || 'Failed to complete signup');
        }

        router.push('/workstation');
        router.refresh();
      } else if (signUpData.user) {
        // Email confirmation required
        setError('');
        setLoading(false);
        setFetchState('email_sent');
      } else {
        setError('Signup failed - please try again');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%' as const,
    padding: '14px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '2px solid rgba(0, 217, 255, 0.4)',
    borderRadius: '12px',
    color: '#cffafe',
    fontSize: '14px',
    fontWeight: 600,
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: '12px',
    fontWeight: 900,
    fontFamily: 'Orbitron, sans-serif',
    color: '#00d9ff',
    marginBottom: '8px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '33.33%',
            left: '25%',
            width: '500px',
            height: '500px',
            background: 'rgba(0, 217, 255, 0.08)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float 25s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '33.33%',
            width: '600px',
            height: '600px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float 30s ease-in-out infinite reverse',
            animationDelay: '1s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 188, 212, 0.05) 25%, rgba(0, 188, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 188, 212, 0.05) 75%, rgba(0, 188, 212, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 188, 212, 0.05) 25%, rgba(0, 188, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 188, 212, 0.05) 75%, rgba(0, 188, 212, 0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {mounted &&
        STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              background: 'rgb(103, 232, 249)',
              borderRadius: '50%',
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity * 0.7,
              boxShadow: `0 0 10px rgba(0, 188, 212, ${star.opacity})`,
            }}
          />
        ))}

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px' }}>
        <div
          style={{
            position: 'relative',
            background: 'rgba(21, 27, 46, 0.85)',
            backdropFilter: 'blur(40px)',
            borderRadius: '24px',
            padding: '48px 40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)' }} />

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', marginBottom: '24px' }}>
              <div
                style={{
                  background: 'rgb(15, 23, 42)',
                  borderRadius: '16px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(0, 188, 212, 0.5)',
                }}
              >
                <UserPlus style={{ color: 'rgb(103, 232, 249)' }} size={40} strokeWidth={2.5} />
              </div>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', marginBottom: '8px' }}>
              Join Cosmic Hub
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(0, 217, 255, 0.7)' }}>
              Create your account
            </p>
          </div>

          {fetchState === 'loading' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Loader2 size={40} style={{ color: '#00d9ff', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <p style={{ color: 'rgba(0, 217, 255, 0.7)', marginTop: '16px' }}>Loading invite...</p>
            </div>
          )}

          {fetchState === 'invalid' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: '#fecaca', fontSize: '16px', marginBottom: '24px' }}>
                Invalid or expired invite link
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'rgba(0, 217, 255, 0.2)',
                  border: '2px solid rgba(0, 217, 255, 0.5)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Go to Login
              </Link>
            </div>
          )}

          {fetchState === 'email_sent' && invite && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: '#10b981', fontSize: '16px', marginBottom: '16px' }}>
                Check your email
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '24px' }}>
                We sent a confirmation link to <strong style={{ color: '#00d9ff' }}>{invite.email}</strong>.
                Click the link in the email to complete your registration.
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'rgba(0, 217, 255, 0.2)',
                  border: '2px solid rgba(0, 217, 255, 0.5)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Go to Login
              </Link>
            </div>
          )}

          {fetchState === 'found' && invite && (
            <>
              {error && (
                <div
                  style={{
                    marginBottom: '24px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.7)',
                  }}
                >
                  <p style={{ color: '#fecaca', fontSize: '14px', fontWeight: 'bold' }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={invite.email}
                    readOnly
                    style={{ ...inputStyle, opacity: 0.8, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                    style={inputStyle}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={inputStyle}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={inputStyle}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '8px',
                    padding: '16px',
                    background: loading ? 'rgba(0, 188, 212, 0.15)' : 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                    border: '2px solid rgba(0, 217, 255, 0.7)',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#cffafe', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', fontSize: '14px' }}>
                    {loading ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>CREATING ACCOUNT...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>CREATE ACCOUNT</span>
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link href="/login" style={{ color: 'rgba(0, 217, 255, 0.7)', fontSize: '14px', textDecoration: 'underline' }}>
              Already have an account? Log in
            </Link>
          </div>
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
