'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Zap, Sparkles } from 'lucide-react';

// Generate stars once
const STARS = Array.from({ length: 50 }).map(() => ({
  top: Math.random() * 100,
  left: Math.random() * 100,
  opacity: Math.random() * 0.5 + 0.3,
  duration: 2 + Math.random() * 3,
  delay: Math.random() * 2,
}));

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      router.push('/workstation');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{
          position: 'absolute',
          top: '33.33%',
          left: '25%',
          width: '500px',
          height: '500px',
          background: 'rgba(0, 217, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 25s ease-in-out infinite',
        }} />
        <div style={{
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
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          width: '400px',
          height: '400px',
          background: 'rgba(34, 211, 238, 0.05)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 20s ease-in-out infinite',
          animationDelay: '2s',
        }} />

        {/* Animated grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 188, 212, 0.05) 25%, rgba(0, 188, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 188, 212, 0.05) 75%, rgba(0, 188, 212, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 188, 212, 0.05) 25%, rgba(0, 188, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 188, 212, 0.05) 75%, rgba(0, 188, 212, 0.05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite',
        }} />
      </div>

      {/* Stars */}
      {mounted && STARS.map((star, i) => (
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
            animation: `twinkle ${star.duration}s infinite ${star.delay}s`,
            boxShadow: `0 0 10px rgba(0, 188, 212, ${star.opacity})`,
          }}
        />
      ))}

      {/* Main card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px' }}>
        <div style={{ position: 'relative' }}>
          
          {/* Main card */}
          <div style={{
            position: 'relative',
            background: 'rgba(21, 27, 46, 0.85)',
            backdropFilter: 'blur(40px)',
            borderRadius: '24px',
            padding: '48px 40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            transition: 'all 0.3s ease',
          }}>
            
            {/* Holographic glow at top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)',
              animation: 'shimmer 3s infinite',
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              {/* Icon */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                marginBottom: '24px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to right, rgb(6, 182, 212), rgb(59, 130, 246))',
                  borderRadius: '16px',
                  filter: 'blur(20px)',
                  opacity: 0.6,
                  animation: 'pulse 2s infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to right, rgb(34, 211, 238), rgb(96, 165, 250))',
                  borderRadius: '16px',
                  filter: 'blur(12px)',
                  opacity: 0.4,
                }} />
                
                <div style={{
                  position: 'relative',
                  background: 'rgb(15, 23, 42)',
                  borderRadius: '16px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(0, 188, 212, 0.5)',
                }}>
                  <Zap style={{
                    color: 'rgb(103, 232, 249)',
                    animation: 'pulse 2s infinite',
                  }} size={40} strokeWidth={2.5} />
                </div>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: '56px',
                fontWeight: 900,
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                marginBottom: '8px',
                letterSpacing: '0.2em',
                textShadow: '0 0 50px rgba(0, 217, 255, 1), 0 0 100px rgba(0, 217, 255, 0.6)',
                animation: 'neonGlow 3s infinite alternate',
              }}>
                COSMIC
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={12} style={{ color: '#00d9ff', opacity: 0.7 }} />
                <p style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#00d9ff',
                  opacity: 0.7,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                }}>AI PROJECT HUB</p>
                <Sparkles size={12} style={{ color: '#00d9ff', opacity: 0.7 }} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '2px solid rgba(239, 68, 68, 0.7)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
              }}>
                <p style={{
                  color: '#fecaca',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    background: 'rgb(248, 113, 113)',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite',
                  }} />
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#00d9ff',
                  marginBottom: '8px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  Email Address
                </label>
                  
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 217, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#cffafe',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.9)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 217, 255, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="admin@cosmic.app"
                />
              </div>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#00d9ff',
                  marginBottom: '8px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  Password
                </label>
                  
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 217, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#cffafe',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.9)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 217, 255, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="••••••••••••"
                />
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '16px',
                  background: loading 
                    ? 'rgba(0, 188, 212, 0.15)'
                    : 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                  border: '2px solid rgba(0, 217, 255, 0.7)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: 'inset 0 0 25px rgba(0, 217, 255, 0.25), 0 0 25px rgba(0, 217, 255, 0.35)',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.95)';
                    e.currentTarget.style.boxShadow = 'inset 0 0 30px rgba(0, 217, 255, 0.35), 0 0 40px rgba(0, 217, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.7)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 25px rgba(0, 217, 255, 0.25), 0 0 25px rgba(0, 217, 255, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#cffafe',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '14px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: '0 0 20px rgba(0, 217, 255, 0.8)',
                }}>
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>LAUNCHING...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '16px' }}>▶</span>
                      <span>ENTER HUB</span>
                    </>
                  )}
                </span>
              </button>

              <p style={{
                textAlign: 'center',
                color: 'rgba(0, 217, 255, 0.6)',
                fontSize: '12px',
                fontWeight: '600',
                marginTop: '8px',
              }}>
                🔒 Secure cosmic authentication
              </p>
            </form>

            {/* Divider */}
            <div style={{
              margin: '32px 0',
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(0, 217, 255, 0.4), transparent)',
            }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{
                color: 'rgba(0, 217, 255, 0.7)',
                fontSize: '12px',
                lineHeight: '1.5',
                fontWeight: '600',
              }}>
                Need access? <span style={{ color: '#00d9ff', fontWeight: 900 }}>Contact your admin</span>
              </p>
              <p style={{
                color: 'rgba(0, 217, 255, 0.5)',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}>v1.0.0 • Powered by AI ✨</p>
            </div>
          </div>
        </div>

        {/* Bottom glow */}
        <div style={{
          position: 'absolute',
          bottom: '-96px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '160px',
          background: 'linear-gradient(to top, rgba(6, 182, 212, 0.2), transparent)',
          filter: 'blur(60px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          animation: 'pulse 3s infinite',
        }} />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes neonGlow {
          from {
            text-shadow: 0 0 30px rgba(0, 217, 255, 0.6), 0 0 60px rgba(0, 217, 255, 0.4);
          }
          to {
            text-shadow: 0 0 50px rgba(0, 217, 255, 1), 0 0 100px rgba(0, 217, 255, 0.6);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        input::placeholder {
          color: rgba(0, 217, 255, 0.3);
        }

        @font-face {
          font-family: 'Orbitron';
          src: url('/fonts/Orbitron-VariableFont_wght.ttf') format('truetype');
          font-weight: 400 900;
          font-display: swap;
        }
      `}</style>
    </div>
  );
}
