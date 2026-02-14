// REDESIGN: Activity Log - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useActivityLog } from '@/lib/admin/queries';
import { DatePicker } from '@/components/ui/DatePicker';
import { Download, Filter, Calendar, User, Activity } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'joined', label: 'Joined Project' },
  { value: 'left', label: 'Left Project' },
  { value: 'accepted', label: 'Accepted Invite' },
];

export default function ActivityLogPage() {
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const { data: logs, isLoading } = useActivityLog(filters);

  const handleExport = () => {
    if (!logs) return;

    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'IP Address'].join(','),
      ...logs.map((log) =>
        [
          new Date(log.created_at).toISOString(),
          log.user?.full_name || 'Unknown',
          log.action,
          log.entity_type || '',
          log.entity_name || '',
          log.ip_address || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActionColor = (action: string): { bg: string; border: string; color: string } => {
    const colors: Record<string, any> = {
      login: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', color: '#10b981' },
      logout: { bg: 'rgba(100, 116, 139, 0.2)', border: 'rgba(100, 116, 139, 0.5)', color: 'rgba(255, 255, 255, 0.6)' },
      created: { bg: 'rgba(0, 217, 255, 0.2)', border: '#00d9ff', color: '#00d9ff' },
      updated: { bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24', color: '#fbbf24' },
      deleted: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', color: '#ef4444' },
      joined: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', color: '#22c55e' },
      left: { bg: 'rgba(248, 113, 113, 0.2)', border: '#f87171', color: '#f87171' },
      accepted: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6', color: '#8b5cf6' },
    };
    return colors[action] || { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', color: '#a855f7' };
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '48px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '48px' }}>📝</span>
              <h1 style={{
                fontSize: '48px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0,
              }}>
                Activity Log
              </h1>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginLeft: '64px',
            }}>
              Track system activities and user actions
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!logs || logs.length === 0}
            onMouseEnter={() => setHoveredButton('export')}
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
              cursor: !logs || logs.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              transform: hoveredButton === 'export' && logs && logs.length > 0 ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredButton === 'export' && logs && logs.length > 0
                ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                : 'none',
              opacity: !logs || logs.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {/* Action Filter */}
          <div>
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
              <Filter size={14} />
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              onFocus={() => setFocusedInput('action')}
              onBlur={() => setFocusedInput(null)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: focusedInput === 'action'
                  ? '1px solid #00d9ff'
                  : '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '12px',
                color: '#00d9ff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: focusedInput === 'action'
                  ? '0 0 20px rgba(0, 217, 255, 0.3)'
                  : 'none',
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
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
              <Calendar size={14} />
              Start Date
            </label>
            <DatePicker
              value={filters.startDate}
              onChange={(v) => setFilters({ ...filters, startDate: v })}
              placeholder="dd/mm/yyyy"
              max={filters.endDate || undefined}
            />
          </div>

          {/* End Date */}
          <div>
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
              <Calendar size={14} />
              End Date
            </label>
            <DatePicker
              value={filters.endDate}
              onChange={(v) => setFilters({ ...filters, endDate: v })}
              placeholder="dd/mm/yyyy"
              min={filters.startDate || undefined}
            />
          </div>
        </div>

        {/* Activity Log Table */}
        <div style={{
          background: 'rgba(21, 27, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {logs && logs.length > 0 ? (
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
                      Timestamp
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
                      Action
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
                      Entity
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
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionColors = getActionColor(log.action);
                    return (
                      <tr
                        key={log.id}
                        onMouseEnter={() => setHoveredRow(log.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
                          background: hoveredRow === log.id
                            ? 'rgba(0, 217, 255, 0.05)'
                            : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <td style={{
                          padding: '16px 20px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontFamily: 'monospace',
                        }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{
                          padding: '16px 20px',
                          fontSize: '14px',
                          color: '#00d9ff',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={14} style={{ color: 'rgba(0, 217, 255, 0.6)' }} />
                            {log.user?.full_name || 'System'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            background: actionColors.bg,
                            border: `1px solid ${actionColors.border}`,
                            borderRadius: '20px',
                            fontSize: '12px',
                            color: actionColors.color,
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            boxShadow: `0 0 10px ${actionColors.bg}`,
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{
                          padding: '16px 20px',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.5)',
                        }}>
                          {log.entity_type && log.entity_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Activity size={14} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                              <span>{log.entity_type}: {log.entity_name}</span>
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '16px 20px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontFamily: 'monospace',
                        }}>
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty State */
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
              <h3 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: 'rgba(0, 217, 255, 0.5)',
                marginBottom: '8px',
              }}>
                No Activity Found
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        select option {
          background: rgba(21, 27, 46, 1);
          color: #00d9ff;
        }
      `}</style>
    </div>
  );
}
