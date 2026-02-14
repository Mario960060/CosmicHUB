'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { AlertTriangle, Plus } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix';
  type: 'bug' | 'risk' | 'debt' | 'warning';
  reported_by?: string;
  assigned_to?: string | null;
  created_at: string;
  resolved_at?: string | null;
  linked_task_id?: string | null;
  comments: unknown[];
}

interface IssuesContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

function getIssues(data: Record<string, unknown>): Issue[] {
  const raw = data.issues;
  if (!Array.isArray(raw)) return [];
  return raw.map((i: any) => ({
    id: i.id || crypto.randomUUID(),
    title: i.title || '',
    description: i.description || '',
    severity: i.severity || 'medium',
    status: i.status || 'open',
    type: i.type || 'bug',
    reported_by: i.reported_by,
    assigned_to: i.assigned_to,
    created_at: i.created_at || new Date().toISOString(),
    resolved_at: i.resolved_at,
    linked_task_id: i.linked_task_id,
    comments: Array.isArray(i.comments) ? i.comments : [],
  }));
}

export function IssuesContent({ subtaskId, satelliteData }: IssuesContentProps) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>(() => getIssues(satelliteData));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showReport, setShowReport] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<Issue['severity']>('medium');
  const [newType, setNewType] = useState<Issue['type']>('bug');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIssues(getIssues(satelliteData));
  }, [subtaskId]);

  const save = async (next: Issue[]) => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { issues: next },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
    setIssues(next);
  };

  const reportIssue = () => {
    if (!newTitle.trim() || !user) return;
    const issue: Issue = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      severity: newSeverity,
      status: 'open',
      type: newType,
      reported_by: user.id,
      created_at: new Date().toISOString(),
      comments: [],
    };
    const next = [...issues, issue];
    save(next);
    setNewTitle('');
    setNewDesc('');
    setShowReport(false);
  };

  const updateStatus = (id: string, status: Issue['status']) => {
    const next = issues.map((i) =>
      i.id === id
        ? {
            ...i,
            status,
            resolved_at: status === 'fixed' || status === 'wont_fix' ? new Date().toISOString() : null,
          }
        : i
    );
    save(next);
  };

  const filtered = issues.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterType !== 'all' && i.type !== filterType) return false;
    return true;
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const fixedCount = issues.filter((i) => i.status === 'fixed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="fixed">Fixed</option>
          <option value="wont_fix">Won&apos;t Fix</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <option value="all">All types</option>
          <option value="bug">Bug</option>
          <option value="risk">Risk</option>
          <option value="debt">Debt</option>
          <option value="warning">Warning</option>
        </select>
        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', alignSelf: 'center' }}>
          {criticalCount > 0 && <span style={{ color: '#ef4444' }}>🔴 {criticalCount} critical</span>}
          {mediumCount > 0 && (
            <span style={{ marginLeft: '8px', color: '#f59e0b' }}>🟡 {mediumCount} medium</span>
          )}
          <span style={{ marginLeft: '8px', color: '#22c55e' }}>🟢 {fixedCount} fixed</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setShowReport(!showReport)}
          style={{
            padding: '10px 16px',
            background: 'rgba(244, 63, 94, 0.2)',
            border: '1px solid rgba(244, 63, 94, 0.5)',
            borderRadius: '8px',
            color: '#f43f5e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          Report Issue
        </button>
      </div>

      {showReport && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: '12px',
          }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Issue title"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              marginBottom: '10px',
              outline: 'none',
            }}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              marginBottom: '10px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as Issue['severity'])}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as Issue['type'])}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <option value="bug">Bug</option>
              <option value="risk">Risk</option>
              <option value="debt">Debt</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={reportIssue}
              disabled={saving || !newTitle.trim()}
              style={{
                padding: '8px 16px',
                background: 'rgba(244, 63, 94, 0.3)',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                borderRadius: '8px',
                color: '#f43f5e',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving || !newTitle.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((issue) => {
          const isExpanded = expandedId === issue.id;
          const color = SEVERITY_COLORS[issue.severity] || '#6b7280';
          const isResolved = issue.status === 'fixed' || issue.status === 'wont_fix';

          return (
            <div
              key={issue.id}
              onClick={() => setExpandedId(isExpanded ? null : issue.id)}
              style={{
                padding: '12px 14px',
                background: isResolved ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.2)',
                borderLeft: `4px solid ${color}`,
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: isResolved ? 0.8 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    borderRadius: '6px',
                    color,
                    flexShrink: 0,
                  }}
                >
                  {issue.severity} · {issue.type}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{issue.title}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginTop: '4px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'none' : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {issue.description || 'No description'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                    {formatRelativeTime(issue.created_at)}
                    {issue.status === 'fixed' && issue.resolved_at && (
                      <> · Fixed {formatRelativeTime(issue.resolved_at)}</>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && !isResolved && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateStatus(issue.id, 'in_progress')}
                    disabled={saving}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '6px',
                      color: '#f59e0b',
                      fontSize: '12px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(issue.id, 'fixed')}
                    disabled={saving}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '6px',
                      color: '#22c55e',
                      fontSize: '12px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(issue.id, 'wont_fix')}
                    disabled={saving}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(107, 114, 128, 0.2)',
                      border: '1px solid rgba(107, 114, 128, 0.4)',
                      borderRadius: '6px',
                      color: '#9ca3af',
                      fontSize: '12px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Won&apos;t Fix
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px',
          }}
        >
          <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          No issues yet. Click &quot;Report Issue&quot; to add one.
        </div>
      )}
    </div>
  );
}
