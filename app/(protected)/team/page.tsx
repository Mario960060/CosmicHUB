// REDESIGN: Team Directory - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Search, Mail, Calendar, Shield } from 'lucide-react';
import { isUserOnline, formatLastSeen } from '@/lib/utils';

const supabase = createClient();

export default function TeamDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-directory'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('full_name', { ascending: true });
      return data;
    },
  });

  const filtered = members?.filter((m) => {
    const matchesSearch = m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      admin: '#a855f7',
      project_manager: '#00d9ff',
      worker: '#ff6b35',
      client: '#10b981',
    };
    return colors[role] || '#00d9ff';
  };

  const getRoleEmoji = (role: string): string => {
    const emojis: Record<string, string> = {
      admin: '👑',
      project_manager: '📊',
      worker: '🛠️',
      client: '👤',
    };
    return emojis[role] || '👤';
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
            <span style={{ fontSize: '48px' }}>👥</span>
            <h1 style={{
              fontSize: '48px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              textShadow: '0 0 30px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0,
            }}>
              Team Directory
            </h1>
          </div>
          <p style={{
            fontSize: '16px',
            color: 'rgba(0, 217, 255, 0.7)',
            marginLeft: '64px',
          }}>
            <span style={{ color: '#00d9ff', fontWeight: 'bold' }}>{members?.length || 0}</span> cosmic crew members
          </p>
        </div>

        {/* Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
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
              placeholder="Search by name or email..."
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

          {/* Role Filter */}
          <div style={{ position: 'relative' }}>
            <Shield
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
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
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
                cursor: 'pointer',
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
            >
              <option value="all">All Roles</option>
              <option value="admin">👑 Admin</option>
              <option value="project_manager">📊 Project Manager</option>
              <option value="worker">🛠️ Worker</option>
              <option value="client">👤 Client</option>
            </select>
          </div>
        </div>

        {/* Members Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px',
        }}>
          {filtered.map((member) => (
            <div
              key={member.id}
              onMouseEnter={() => setHoveredCard(member.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                position: 'relative',
                background: 'rgba(21, 27, 46, 0.6)',
                backdropFilter: 'blur(20px)',
                border: hoveredCard === member.id
                  ? '1px solid rgba(0, 217, 255, 0.5)'
                  : '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: hoveredCard === member.id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hoveredCard === member.id
                  ? '0 0 40px rgba(0, 217, 255, 0.3)'
                  : 'none',
              }}
            >
              {/* Glow Orb */}
              <div style={{
                position: 'absolute',
                top: '-40%',
                right: '-30%',
                width: '200px',
                height: '200px',
                background: getRoleColor(member.role),
                borderRadius: '50%',
                filter: 'blur(60px)',
                opacity: hoveredCard === member.id ? 0.2 : 0.1,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none',
              }} />

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Avatar & Basic Info */}
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}>
                  {/* Avatar with Online Indicator */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          border: `2px solid ${getRoleColor(member.role)}`,
                          boxShadow: `0 0 20px ${getRoleColor(member.role)}40`,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getRoleColor(member.role)}40, ${getRoleColor(member.role)}20)`,
                        border: `2px solid ${getRoleColor(member.role)}`,
                        boxShadow: `0 0 20px ${getRoleColor(member.role)}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#00d9ff',
                      }}>
                        {member.full_name.charAt(0)}
                      </div>
                    )}
                    {/* Online Status */}
                    {isUserOnline(member.last_seen) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '16px',
                        height: '16px',
                        background: '#10b981',
                        borderRadius: '50%',
                        border: '3px solid rgba(21, 27, 46, 1)',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                        animation: 'pulse-online 2s infinite',
                      }} />
                    )}
                  </div>

                  {/* Name & Email */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontFamily: 'Orbitron, sans-serif',
                      color: '#00d9ff',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {member.full_name}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                    }}>
                      <Mail size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                      <p style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: `${getRoleColor(member.role)}20`,
                  border: `1px solid ${getRoleColor(member.role)}60`,
                  borderRadius: '20px',
                  marginBottom: '12px',
                  boxShadow: `0 0 15px ${getRoleColor(member.role)}20`,
                }}>
                  <span style={{ fontSize: '14px' }}>{getRoleEmoji(member.role)}</span>
                  <span style={{
                    fontSize: '12px',
                    color: getRoleColor(member.role),
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                  }}>
                    {member.role.replace('_', ' ')}
                  </span>
                </div>

                {/* Bio */}
                {member.bio && (
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {member.bio}
                  </p>
                )}

                {/* Last Seen */}
                {member.last_seen && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(0, 217, 255, 0.1)',
                  }}>
                    <Calendar size={12} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.4)',
                    }}>
                      {isUserOnline(member.last_seen) ? 'Online now' : `Last seen ${formatLastSeen(member.last_seen)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'rgba(21, 27, 46, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '20px',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{
              fontSize: '24px',
              fontFamily: 'Orbitron, sans-serif',
              color: 'rgba(0, 217, 255, 0.5)',
              marginBottom: '8px',
            }}>
              No Team Members Found
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-online {
          0%, 100% {
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
          }
          50% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 1);
          }
        }

        input::placeholder,
        select option {
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
