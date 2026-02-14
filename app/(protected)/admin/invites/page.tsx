// REDESIGN: Invites Management - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useInvites } from '@/lib/admin/queries';
import { useCreateInvite, useCancelInvite } from '@/lib/admin/mutations';
import { Plus, Copy, X, Mail, Shield, Clock, Send, Check } from 'lucide-react';

export default function InvitesPage() {
  const { user } = useAuth();
  const { data: invites } = useInvites();
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'worker',
    expiresIn: 7,
    message: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const token = await createInvite.mutateAsync({
      ...formData,
      createdBy: user.id,
    });

    copyInviteLink(token);
    setShowCreate(false);
    setFormData({ email: '', role: 'worker', expiresIn: 7, message: '' });
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string): { bg: string; border: string; color: string; shadow: string } => {
    const colors: Record<string, any> = {
      pending: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', color: '#eab308', shadow: 'rgba(234, 179, 8, 0.3)' },
      accepted: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', color: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' },
      expired: { bg: 'rgba(100, 116, 139, 0.2)', border: 'rgba(100, 116, 139, 0.5)', color: 'rgba(255, 255, 255, 0.5)', shadow: 'none' },
      cancelled: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' },
    };
    return colors[status] || colors.pending;
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '48px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '48px' }}>✉️</span>
              <h1 style={{
                fontSize: '48px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0,
              }}>
                Invites
              </h1>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginLeft: '64px',
            }}>
              Manage team invitations and access
            </p>
          </div>

          {/* Create Invite Button */}
          <button
            onClick={() => setShowCreate(true)}
            onMouseEnter={() => setHoveredButton('create-main')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
              border: '1px solid #00d9ff',
              borderRadius: '12px',
              color: '#00d9ff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: hoveredButton === 'create-main' ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredButton === 'create-main'
                ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                : 'none',
            }}
          >
            <Plus size={18} />
            Create Invite
          </button>
        </div>

        {/* Invites List */}
        {invites && invites.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {invites.map((invite) => {
              const statusColors = getStatusColor(invite.status);
              return (
                <div
                  key={invite.id}
                  onMouseEnter={() => setHoveredCard(invite.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    position: 'relative',
                    background: 'rgba(21, 27, 46, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: hoveredCard === invite.id
                      ? '1px solid rgba(0, 217, 255, 0.4)'
                      : '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    transform: hoveredCard === invite.id ? 'translateX(4px)' : 'translateX(0)',
                  }}
                >
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '16px',
                      color: '#00d9ff',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <Mail size={16} />
                      {invite.email}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Role Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: `${getRoleColor(invite.role)}20`,
                        border: `1px solid ${getRoleColor(invite.role)}60`,
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: getRoleColor(invite.role),
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        boxShadow: `0 0 10px ${getRoleColor(invite.role)}20`,
                      }}>
                        <Shield size={12} />
                        {invite.role.replace('_', ' ')}
                      </span>

                      {/* Status Badge */}
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: statusColors.bg,
                        border: `1px solid ${statusColors.border}`,
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: statusColors.color,
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        boxShadow: statusColors.shadow ? `0 0 10px ${statusColors.shadow}` : 'none',
                      }}>
                        {invite.status}
                      </span>

                      {/* Expiry Date */}
                      {invite.expires_at && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.5)',
                        }}>
                          <Clock size={12} />
                          Expires: {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {invite.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {/* Copy Button */}
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        onMouseEnter={() => setHoveredButton(`copy-${invite.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                        style={{
                          padding: '10px',
                          background: copiedId === invite.token
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(0, 217, 255, 0.1)',
                          border: copiedId === invite.token
                            ? '1px solid #10b981'
                            : hoveredButton === `copy-${invite.id}`
                            ? '1px solid rgba(0, 217, 255, 0.5)'
                            : '1px solid rgba(0, 217, 255, 0.2)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: hoveredButton === `copy-${invite.id}` ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: hoveredButton === `copy-${invite.id}`
                            ? '0 0 15px rgba(0, 217, 255, 0.3)'
                            : copiedId === invite.token
                            ? '0 0 15px rgba(16, 185, 129, 0.3)'
                            : 'none',
                        }}
                      >
                        {copiedId === invite.token ? (
                          <Check size={16} style={{ color: '#10b981' }} />
                        ) : (
                          <Copy size={16} style={{ color: '#00d9ff' }} />
                        )}
                      </button>

                      {/* Cancel Button */}
                      <button
                        onClick={() => {
                          if (confirm('Cancel this invite?')) {
                            cancelInvite.mutate(invite.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredButton(`cancel-${invite.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                        style={{
                          padding: '10px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: hoveredButton === `cancel-${invite.id}`
                            ? '1px solid rgba(239, 68, 68, 0.5)'
                            : '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: hoveredButton === `cancel-${invite.id}` ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: hoveredButton === `cancel-${invite.id}`
                            ? '0 0 15px rgba(239, 68, 68, 0.3)'
                            : 'none',
                        }}
                      >
                        <X size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'rgba(21, 27, 46, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '20px',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📧</div>
            <h3 style={{
              fontSize: '24px',
              fontFamily: 'Orbitron, sans-serif',
              color: 'rgba(0, 217, 255, 0.5)',
              marginBottom: '12px',
            }}>
              No Invites Yet
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '24px' }}>
              Start inviting team members to join your cosmic crew
            </p>
            <button
              onClick={() => setShowCreate(true)}
              onMouseEnter={() => setHoveredButton('create-empty')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                border: '1px solid #00d9ff',
                borderRadius: '12px',
                color: '#00d9ff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: hoveredButton === 'create-empty' ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredButton === 'create-empty'
                  ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                  : 'none',
              }}
            >
              <Plus size={18} />
              Create First Invite
            </button>
          </div>
        )}
      </div>

      {/* Create Invite Modal */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'rgba(21, 27, 46, 0.95)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '20px',
              boxShadow: '0 0 60px rgba(0, 217, 255, 0.3)',
              animation: 'slideIn 0.3s ease-out',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'rgba(0, 217, 255, 0.05)',
              position: 'relative',
            }}>
              {/* Animated Glow */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)',
                animation: 'shimmer 2s infinite',
              }} />

              <h2 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                textShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                fontWeight: 'bold',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Mail size={24} />
                Create Invite
              </h2>

              {/* Close Button */}
              <button
                onClick={() => setShowCreate(false)}
                onMouseEnter={() => setHoveredButton('close')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  position: 'absolute',
                  right: '24px',
                  top: '24px',
                  width: '32px',
                  height: '32px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  color: hoveredButton === 'close' ? '#ef4444' : 'rgba(255, 255, 255, 0.6)',
                  transform: hoveredButton === 'close' ? 'rotate(90deg)' : 'rotate(0)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} style={{ padding: '32px' }}>
              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
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
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'email'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'email'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                  }}
                />
              </div>

              {/* Role */}
              <div style={{ marginBottom: '20px' }}>
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
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  onFocus={() => setFocusedInput('role')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'role'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'role'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                  }}
                >
                  <option value="worker">Worker</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="client">Client</option>
                </select>
              </div>

              {/* Expires In */}
              <div style={{ marginBottom: '20px' }}>
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
                  <Clock size={14} />
                  Expires In
                </label>
                <select
                  value={formData.expiresIn.toString()}
                  onChange={(e) => setFormData({ ...formData, expiresIn: parseInt(e.target.value) })}
                  onFocus={() => setFocusedInput('expires')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'expires'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'expires'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                  }}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="0">Never</option>
                </select>
              </div>

              {/* Message */}
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
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  placeholder="Welcome to the team!"
                  onFocus={() => setFocusedInput('message')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'message'
                      ? '1px solid #00d9ff'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'message'
                      ? '0 0 20px rgba(0, 217, 255, 0.3)'
                      : 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  onMouseEnter={() => setHoveredButton('cancel')}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(100, 116, 139, 0.2)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredButton === 'cancel' ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: hoveredButton === 'cancel'
                      ? '0 4px 15px rgba(100, 116, 139, 0.3)'
                      : 'none',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvite.isPending}
                  onMouseEnter={() => setHoveredButton('submit')}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                    border: '1px solid #00d9ff',
                    borderRadius: '12px',
                    color: '#00d9ff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: createInvite.isPending ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transform: hoveredButton === 'submit' && !createInvite.isPending
                      ? 'translateY(-2px)'
                      : 'translateY(0)',
                    boxShadow: hoveredButton === 'submit' && !createInvite.isPending
                      ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                      : 'none',
                    opacity: createInvite.isPending ? 0.7 : 1,
                  }}
                >
                  <Send size={16} />
                  {createInvite.isPending ? 'Creating...' : 'Create Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        select option {
          background: rgba(21, 27, 46, 1);
          color: #00d9ff;
        }
      `}</style>
    </div>
  );
}
