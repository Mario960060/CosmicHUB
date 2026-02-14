// REDESIGN: User Management - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/admin/queries';
import { useUpdateUser, useDeactivateUser } from '@/lib/admin/mutations';
import { Search, Edit2, UserX, Mail, Shield, User, X, Save, Users } from 'lucide-react';
import { isUserOnline } from '@/lib/utils';

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const filtered = users?.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updateUser.mutateAsync({
      userId: editingUser.id,
      updates: {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        bio: editingUser.bio,
      },
    });

    setEditingUser(null);
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

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '4px solid rgba(0, 217, 255, 0.2)',
          borderTop: '4px solid #00d9ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
            }}>
              <Users size={28} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
            </div>
            <h1 style={{
              fontSize: '48px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              textShadow: '0 0 30px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0,
            }}>
              User Management
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginLeft: '64px',
          }}>
            Manage team members, roles, and permissions
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(0, 217, 255, 0.6)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              background: 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              color: '#00d9ff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.border = '1px solid #00d9ff';
              e.target.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid rgba(0, 217, 255, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Users Table */}
        <div style={{
          background: 'rgba(21, 27, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 217, 255, 0.1)',
                  borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
                }}>
                  <th style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#00d9ff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    User
                  </th>
                  <th style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#00d9ff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Email
                  </th>
                  <th style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#00d9ff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Role
                  </th>
                  <th style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#00d9ff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#00d9ff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    onMouseEnter={() => setHoveredRow(user.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
                      background: hoveredRow === user.id
                        ? 'rgba(0, 217, 255, 0.05)'
                        : 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isUserOnline(user.last_seen) && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: '#10b981',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                            animation: 'pulse-online 2s infinite',
                          }} />
                        )}
                        <span style={{
                          fontSize: '14px',
                          color: '#00d9ff',
                          fontWeight: 'bold',
                        }}>
                          {user.full_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                      }}>
                        {user.email}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: `${getRoleColor(user.role)}20`,
                        border: `1px solid ${getRoleColor(user.role)}60`,
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: getRoleColor(user.role),
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        boxShadow: `0 0 10px ${getRoleColor(user.role)}20`,
                      }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: isUserOnline(user.last_seen)
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(100, 116, 139, 0.2)',
                        border: isUserOnline(user.last_seen)
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : '1px solid rgba(100, 116, 139, 0.3)',
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: isUserOnline(user.last_seen) ? '#10b981' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: 'bold',
                        boxShadow: isUserOnline(user.last_seen)
                          ? '0 0 10px rgba(16, 185, 129, 0.3)'
                          : 'none',
                      }}>
                        {isUserOnline(user.last_seen) ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingUser(user)}
                          onMouseEnter={() => setHoveredButton(`edit-${user.id}`)}
                          onMouseLeave={() => setHoveredButton(null)}
                          style={{
                            padding: '8px',
                            background: 'rgba(0, 217, 255, 0.1)',
                            border: hoveredButton === `edit-${user.id}`
                              ? '1px solid rgba(0, 217, 255, 0.5)'
                              : '1px solid rgba(0, 217, 255, 0.2)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            transform: hoveredButton === `edit-${user.id}`
                              ? 'scale(1.1)'
                              : 'scale(1)',
                            boxShadow: hoveredButton === `edit-${user.id}`
                              ? '0 0 15px rgba(0, 217, 255, 0.3)'
                              : 'none',
                          }}
                        >
                          <Edit2 size={16} style={{ color: '#00d9ff' }} />
                        </button>

                        {/* Deactivate Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate ${user.full_name}?`)) {
                              deactivateUser.mutate(user.id);
                            }
                          }}
                          onMouseEnter={() => setHoveredButton(`delete-${user.id}`)}
                          onMouseLeave={() => setHoveredButton(null)}
                          style={{
                            padding: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: hoveredButton === `delete-${user.id}`
                              ? '1px solid rgba(239, 68, 68, 0.5)'
                              : '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            transform: hoveredButton === `delete-${user.id}`
                              ? 'scale(1.1)'
                              : 'scale(1)',
                            boxShadow: hoveredButton === `delete-${user.id}`
                              ? '0 0 15px rgba(239, 68, 68, 0.3)'
                              : 'none',
                          }}
                        >
                          <UserX size={16} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
              <h3 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: 'rgba(0, 217, 255, 0.5)',
                marginBottom: '8px',
              }}>
                No Users Found
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
                Try adjusting your search
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          onClick={() => setEditingUser(null)}
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
                <User size={24} />
                Edit User
              </h2>

              {/* Close Button */}
              <button
                onClick={() => setEditingUser(null)}
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
            <form onSubmit={handleSaveUser} style={{ padding: '32px' }}>
              {/* Full Name */}
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
                  <User size={14} />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  required
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
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
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
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
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
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
                  <option value="admin">Admin</option>
                </select>
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
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  rows={3}
                  onFocus={() => setFocusedInput('bio')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
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
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
                  disabled={updateUser.isPending}
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
                    cursor: updateUser.isPending ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transform: hoveredButton === 'submit' && !updateUser.isPending
                      ? 'translateY(-2px)'
                      : 'translateY(0)',
                    boxShadow: hoveredButton === 'submit' && !updateUser.isPending
                      ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                      : 'none',
                    opacity: updateUser.isPending ? 0.7 : 1,
                  }}
                >
                  <Save size={16} />
                  {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-online {
          0%, 100% {
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
          }
          50% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 1);
          }
        }

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
