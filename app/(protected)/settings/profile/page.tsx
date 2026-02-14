// REDESIGN: Profile Settings - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { User, Mail, Shield, Lock, Save, Check } from 'lucide-react';

const supabase = createClient();

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccess(false);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
        })
        .eq('id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['auth'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      admin: '#a855f7',
      project_manager: '#00d9ff',
      worker: '#ff6b35',
      client: '#10b981',
    };
    return colors[role] || '#00d9ff';
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>⚙️</span>
            <h1 style={{
              fontSize: '48px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              textShadow: '0 0 30px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0,
            }}>
              Profile Settings
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginLeft: '64px',
          }}>
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Information Card */}
        <div style={{
          position: 'relative',
          background: 'rgba(21, 27, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '300px',
            height: '300px',
            background: 'rgba(0, 217, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <User size={24} style={{ color: '#00d9ff' }} />
              <h2 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                fontWeight: 'bold',
                margin: 0,
              }}>
                Profile Information
              </h2>
            </div>

            <form onSubmit={handleSave}>
              {/* Full Name */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <User size={14} />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'name'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'name'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                  }}
                />
              </div>

              {/* Email (Read-only) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <Mail size={14} />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '12px',
                    color: 'rgba(0, 217, 255, 0.5)',
                    fontSize: '14px',
                    cursor: 'not-allowed',
                  }}
                />
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  🔒 Email cannot be changed
                </p>
              </div>

              {/* Role (Read-only) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <Shield size={14} />
                  Role
                </label>
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: `1px solid ${getRoleColor(user?.role || '')}40`,
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: getRoleColor(user?.role || ''),
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                  }}>
                    {user?.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell us about yourself..."
                  onFocus={() => setFocusedInput('bio')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'bio'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'bio'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '6px',
                  textAlign: 'right',
                }}>
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                onMouseEnter={() => setHoveredButton('save')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '14px 32px',
                  background: success
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.2))'
                    : 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                  border: success
                    ? '1px solid #10b981'
                    : '1px solid #00d9ff',
                  borderRadius: '12px',
                  color: success ? '#10b981' : '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transform: hoveredButton === 'save' && !saving ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hoveredButton === 'save' && !saving
                    ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                    : success
                    ? '0 0 20px rgba(16, 185, 129, 0.4)'
                    : 'none',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {success ? (
                  <>
                    <Check size={18} />
                    Saved!
                  </>
                ) : saving ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0, 217, 255, 0.3)',
                      borderTop: '2px solid #00d9ff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Security Card */}
        <div style={{
          position: 'relative',
          background: 'rgba(21, 27, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '20px',
          padding: '32px',
          overflow: 'hidden',
        }}>
          {/* Purple Glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-20%',
            width: '300px',
            height: '300px',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Lock size={24} style={{ color: '#a855f7' }} />
              <h2 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#a855f7',
                fontWeight: 'bold',
                margin: 0,
              }}>
                Account Security
              </h2>
            </div>

            {/* Info Box */}
            <div style={{
              padding: '20px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>🔒</div>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    color: '#a855f7',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                  }}>
                    Password Protection
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: '1.6',
                  }}>
                    Keep your account secure with a strong password. We recommend changing it regularly.
                  </p>
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <button
              onClick={() => alert('Password change feature coming soon!')}
              onMouseEnter={() => setHoveredButton('password')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.2))',
                border: '1px solid #a855f7',
                borderRadius: '12px',
                color: '#a855f7',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transform: hoveredButton === 'password' ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredButton === 'password'
                  ? '0 8px 25px rgba(168, 85, 247, 0.4)'
                  : 'none',
              }}
            >
              <Lock size={18} />
              Change Password
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
