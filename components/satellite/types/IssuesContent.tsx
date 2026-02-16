'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
import { CosmicDropdown } from '../CosmicDropdown';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface AssignablePerson {
  user_id: string;
  user?: { id: string; full_name: string };
}

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix';
  type: 'bug' | 'risk' | 'debt' | 'warning';
  reported_by?: string;
  assigned_to?: string | null;
  assigned_to_all?: boolean;
  created_at: string;
  resolved_at?: string | null;
  linked_task_id?: string | null;
  comments: unknown[];
}

interface IssuesContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  subtaskName?: string;
  assignablePeople?: AssignablePerson[];
  createdBy?: string | null;
  isAdmin?: boolean;
  isProjectManager?: boolean;
  isTaskResponsible?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

function normalizeAssignable(people: AssignablePerson[] | undefined): AssignablePerson[] {
  if (!Array.isArray(people)) return [];
  return people.map((p) => ({
    user_id: p.user_id,
    user: p.user ?? { id: p.user_id, full_name: 'Unknown' },
  }));
}

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
    assigned_to_all: i.assigned_to_all ?? false,
    created_at: i.created_at || new Date().toISOString(),
    resolved_at: i.resolved_at,
    linked_task_id: i.linked_task_id,
    comments: Array.isArray(i.comments) ? i.comments : [],
  }));
}

export function IssuesContent({
  subtaskId,
  satelliteData,
  subtaskName = '',
  assignablePeople = [],
  createdBy,
  isAdmin = false,
  isProjectManager = false,
  isTaskResponsible = false,
}: IssuesContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
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

  const people = normalizeAssignable(assignablePeople);
  const canDelete = !!user && (isAdmin || isProjectManager || isTaskResponsible || createdBy === user.id);

  useEffect(() => {
    setIssues(getIssues(satelliteData));
  }, [subtaskId, satelliteData]);

  const save = async (
    next: Issue[],
    activityEntry?: { user_id: string; action: string; detail: string; actor_name?: string }
  ) => {
    setSaving(true);
    const { error } = await saveSatelliteData(subtaskId, { issues: next }, {
      activityEntry,
      onSuccess: () => invalidate(subtaskId),
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
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
    const next = [issue, ...issues];
    save(next, { user_id: user.id, action: 'added_issue', detail: newTitle.trim(), actor_name: user.full_name });
    setNewTitle('');
    setNewDesc('');
    setShowReport(false);
  };

  const assignIssue = async (id: string, value: string) => {
    const issue = issues.find((i) => i.id === id);
    if (!issue) return;
    const isAssignAll = value === '__all__';
    const userId = isAssignAll ? null : (value === '__none__' ? null : value);
    const next = issues.map((i) =>
      i.id === id
        ? {
            ...i,
            assigned_to: userId,
            assigned_to_all: isAssignAll,
          }
        : i
    );
    await save(next, { user_id: user!.id, action: 'assigned_issue', detail: issue.title ?? '', actor_name: user!.full_name });
    const supabase = createClient();
    if (isAssignAll && people.length > 0) {
      for (const p of people) {
        await supabase.rpc('create_notification', {
          p_user_id: p.user_id,
          p_type: 'issue_assigned',
          p_title: 'Issue assigned',
          p_message: `You were assigned to an issue: "${issue.title}"`,
          p_related_id: subtaskId,
          p_related_type: 'subtask',
          p_actor_id: user!.id,
        });
      }
    } else if (userId) {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'issue_assigned',
        p_title: 'Issue assigned',
        p_message: `You were assigned to an issue: "${issue.title}"`,
        p_related_id: subtaskId,
        p_related_type: 'subtask',
        p_actor_id: user!.id,
      });
    }
  };

  const updateStatus = (id: string, status: Issue['status']) => {
    const issue = issues.find((i) => i.id === id);
    const next = issues.map((i) =>
      i.id === id
        ? {
            ...i,
            status,
            resolved_at: status === 'fixed' || status === 'wont_fix' ? new Date().toISOString() : null,
          }
        : i
    );
    save(next, { user_id: user!.id, action: 'status_change_issue', detail: `${issue?.title ?? ''} → ${status}`, actor_name: user!.full_name });
  };

  const deleteIssue = (id: string) => {
    if (!canDelete) return;
    const issue = issues.find((i) => i.id === id);
    const next = issues.filter((i) => i.id !== id);
    save(next, { user_id: user!.id, action: 'deleted_issue', detail: issue?.title ?? '', actor_name: user!.full_name });
    setExpandedId(null);
  };

  const filtered = issues.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterType !== 'all' && i.type !== filterType) return false;
    return true;
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const fixedCount = issues.filter((i) => i.status === 'fixed').length;

  const getAssignValue = (issue: Issue) => {
    if (issue.assigned_to_all) return '__all__';
    return issue.assigned_to ?? '__none__';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
        <CosmicDropdown
          value={filterStatus}
          options={[
            { value: 'all', label: 'All status' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'fixed', label: 'Fixed' },
            { value: 'wont_fix', label: "Won't Fix" },
          ]}
          onChange={(v) => setFilterStatus(v)}
        />
        <CosmicDropdown
          value={filterType}
          options={[
            { value: 'all', label: 'All types' },
            { value: 'bug', label: 'Bug' },
            { value: 'risk', label: 'Risk' },
            { value: 'debt', label: 'Debt' },
            { value: 'warning', label: 'Warning' },
          ]}
          onChange={(v) => setFilterType(v)}
        />
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
          + Report Issue
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
            <CosmicDropdown
              value={newSeverity}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              onChange={(v) => setNewSeverity(v as Issue['severity'])}
              style={{ minWidth: 120 }}
            />
            <CosmicDropdown
              value={newType}
              options={[
                { value: 'bug', label: 'Bug' },
                { value: 'risk', label: 'Risk' },
                { value: 'debt', label: 'Debt' },
                { value: 'warning', label: 'Warning' },
              ]}
              onChange={(v) => setNewType(v as Issue['type'])}
              style={{ minWidth: 120 }}
            />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{issue.title}</span>
                    {people.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <CosmicDropdown
                          value={getAssignValue(issue)}
                          options={[
                            { value: '__none__', label: 'Unassigned' },
                            { value: '__all__', label: 'Assign all' },
                            ...people.map((pm) => ({
                              value: pm.user_id,
                              label: pm.user?.full_name ?? 'Unknown',
                            })),
                          ]}
                          onChange={(v) => assignIssue(issue.id, v)}
                          style={{ minWidth: 130 }}
                        />
                      </div>
                    )}
                  </div>
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

              {isExpanded && (
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
                  {(['open', 'in_progress', 'fixed', 'wont_fix'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateStatus(issue.id, s)}
                      disabled={saving || issue.status === s}
                      style={{
                        padding: '6px 12px',
                        background: issue.status === s ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${issue.status === s ? '#00d9ff' : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: '6px',
                        color: issue.status === s ? '#00d9ff' : 'rgba(255, 255, 255, 0.8)',
                        fontSize: '12px',
                        cursor: saving || issue.status === s ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {s === 'wont_fix' ? "Won't Fix" : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteIssue(issue.id)}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
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
