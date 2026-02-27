'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useTaskMembers, useProjectMembers, useModuleMembers, useDependenciesForSubtasks } from '@/lib/pm/queries';
import { useAuth } from '@/hooks/use-auth';
import { X, Plus, UsersRound, Layers, GitBranch, UserPlus, Telescope } from 'lucide-react';
import { SubtaskTypeIcon } from '@/components/satellite/SubtaskTypeIcon';
import { AddProgressDialog } from './AddProgressDialog';
import { CollapsibleSection } from './CollapsibleSection';
import { AssignTeamModal } from '@/app/(protected)/pm/projects/[id]/components/AssignTeamModal';
import {
  getStatusBadgeStyle,
  getInitials,
  renderStars,
  getDependencyTypeColor,
  DependencyRow,
} from './DetailCardShared';
import {
  calculateTaskProgress,
  calculateDaysRemaining,
  getDueDateStyle,
  countSubtasksByStatus,
  sumMinitaskEstimatedHours,
} from '@/lib/galactic/progress';

interface MoonDetailCardProps {
  taskId: string;
  onClose: () => void;
  onZoomIn?: (moduleId: string) => void;
  onContextMenu?: (object: { id: string; type: 'task' | 'minitask' | 'subtask'; name: string; metadata?: Record<string, unknown> }, e: React.MouseEvent) => void;
  onNavigateToSubtask?: (subtaskId: string) => void;
}

interface TaskWithSubtasks {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  estimated_hours: number | null;
  due_date: string | null;
  priority_stars: number;
  status: string;
  progress_percent?: number | null;
  subtasks?: {
    id: string;
    name: string;
    status: string;
    assigned_to: string | null;
    work_logs?: { hours_spent: number }[];
  }[];
  module?: {
    id: string;
    project_id: string;
  };
}

function useMoonDetails(taskId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['moon-details', taskId],
    queryFn: async () => {
      const [taskRes, minitasksRes] = await Promise.all([
        supabase
          .from('tasks')
          .select(
            `
            *,
            module:modules (id, project_id),
            subtasks (
              id,
              name,
              status,
              assigned_to,
              work_logs (hours_spent)
            )
          `
          )
          .eq('id', taskId!)
          .single(),
        supabase.from('minitasks').select('id, estimated_hours').eq('task_id', taskId!),
      ]);
      if (taskRes.error) throw taskRes.error;
      const data = { ...taskRes.data, minitasks: minitasksRes.data || [] } as TaskWithSubtasks & { minitasks: { id: string; estimated_hours: number | null }[] };
      return data;
    },
    enabled: !!taskId,
  });
}

export function MoonDetailCard({ taskId, onClose, onZoomIn, onContextMenu, onNavigateToSubtask }: MoonDetailCardProps) {
  const { user } = useAuth();
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [expandedHierarchy, setExpandedHierarchy] = useState(false);
  const [expandedDeps, setExpandedDeps] = useState(false);
  const [expandedAssigned, setExpandedAssigned] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const { data, isLoading } = useMoonDetails(taskId);
  const subtasksForAssigned = data?.subtasks ?? [];
  const projectId = data?.module?.project_id ?? null;
  const moduleId = data?.module_id ?? null;

  const { data: taskMembers } = useTaskMembers(taskId);
  const { data: projectMembers } = useProjectMembers(projectId);
  const { data: moduleMembers } = useModuleMembers(moduleId);

  const isPM = projectMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'manager');
  const isModuleLead = moduleMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'lead');
  const canAssignTeam = user?.role === 'admin' || isPM || isModuleLead;

  const allSubtaskIds = useMemo(() => subtasksForAssigned.map((s) => s.id), [subtasksForAssigned]);
  const { data: dependencies } = useDependenciesForSubtasks(allSubtaskIds);

  if (isLoading || !data) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ padding: 48, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
          {isLoading ? 'Loading...' : 'Task not found'}
        </div>
      </div>
    );
  }

  const subtasks = data.subtasks || [];
  const progress = calculateTaskProgress(subtasks, data.progress_percent);
  const daysRemaining = calculateDaysRemaining(data.due_date);
  const dueStyle = getDueDateStyle(daysRemaining);
  const subCounts = countSubtasksByStatus(subtasks);

  const loggedTotal = subtasks.reduce((acc, st) => {
    const logs = st.work_logs || [];
    return acc + logs.reduce((lacc, l) => lacc + (l.hours_spent || 0), 0);
  }, 0);
  const minitasks = (data as { minitasks?: { estimated_hours: number | null }[] }).minitasks ?? [];
  const estimatedFromMinitasks = data.estimated_hours == null ? sumMinitaskEstimatedHours(minitasks) : null;
  const estimated = data.estimated_hours ?? estimatedFromMinitasks;
  const hoursDisplay =
    estimated !== null
      ? `${Math.round(loggedTotal * 10) / 10}h / ${estimated}h`
      : `${Math.round(loggedTotal * 10) / 10}h / ?`;

  const statusStyle = getStatusBadgeStyle(data.status);
  const cardTheme = { border: 'rgba(0, 217, 255, 0.3)', header: '#00d9ff', accent: 'rgba(0, 217, 255, 0.15)', accentBorder: 'rgba(0, 217, 255, 0.4)' };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target !== e.currentTarget && onContextMenu) {
      onContextMenu({ id: taskId, type: 'task', name: data.name, metadata: { moduleId, taskId } }, e);
    }
  };

  return (
    <div
      onContextMenuCapture={(e) => e.preventDefault()}
      onContextMenu={handleContextMenu}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          maxHeight: '85vh',
          background: 'rgba(21, 27, 46, 0.95)',
          backdropFilter: 'blur(30px)',
          border: `1px solid ${cardTheme.border}`,
          borderRadius: 20,
          boxShadow: `0 0 60px ${cardTheme.border.replace('0.3', '0.2')}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            padding: '24px 28px',
            background: 'rgba(21, 27, 46, 0.98)',
            borderBottom: `1px solid ${cardTheme.border.replace('0.3', '0.2')}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 22, fontFamily: 'Orbitron, sans-serif', color: cardTheme.header, fontWeight: 'bold', margin: 0 }}>
                {data.name}
              </h2>
              {data.description && (
                <>
                  <div
                    style={{
                      marginTop: 8,
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      WebkitLineClamp: descExpanded ? 'unset' : 3,
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {data.description}
                  </div>
                  {data.description.length > 120 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                      style={{ marginTop: 4, background: 'none', border: 'none', color: cardTheme.header, fontSize: 12, cursor: 'pointer', padding: 0 }}
                    >
                      {descExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
              {statusStyle.text}
            </span>
            {renderStars(data.priority_stars ?? 1, cardTheme.header)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Due:</span>
            <span style={{ color: dueStyle.color, fontWeight: 600 }}>
              {data.due_date ? new Date(data.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </span>
            <span style={{ color: dueStyle.color, fontSize: 13 }}>({dueStyle.text})</span>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Logged: {Math.round(loggedTotal * 10) / 10}h / Estimated: {estimated ?? '?'}h
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Progress: {progress}%</span>
            <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: progress === 100 ? '#22c55e' : progress > 50 ? 'linear-gradient(90deg, #00d9ff, #22c55e)' : 'linear-gradient(90deg, #f59e0b, #00d9ff)',
                  borderRadius: 5,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          <CollapsibleSection
            title="Subtasks"
            summary={`${subCounts.total} subtasks`}
            icon={<Layers size={16} />}
            expanded={expandedHierarchy}
            onToggle={() => setExpandedHierarchy(!expandedHierarchy)}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.({ id: st.id, type: 'subtask', name: st.name, metadata: { moduleId, taskId, subtaskId: st.id } }, e); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'context-menu' }}
                >
                  <SubtaskTypeIcon satelliteType={(st as { satellite_type?: string }).satellite_type} size={10} />
                  <span>{st.name}</span>
                </div>
              ))}
              {subtasks.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>No subtasks.</div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Dependencies"
            summary={(dependencies?.length ?? 0) > 0 ? `${dependencies?.length}` : 'None'}
            icon={<GitBranch size={16} />}
            expanded={expandedDeps}
            onToggle={() => setExpandedDeps(!expandedDeps)}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              {dependencies && dependencies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dependencies.map((dep) => (
                    <DependencyRow key={dep.id} dep={dep} onNavigateToSubtask={onNavigateToSubtask} />
                  ))}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>No dependencies between subtasks.</div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Assigned"
            summary={taskMembers && taskMembers.length > 0 ? `${taskMembers.length} people` : 'None'}
            icon={<UsersRound size={16} />}
            expanded={expandedAssigned}
            onToggle={() => setExpandedAssigned(!expandedAssigned)}
          >
            {taskMembers && taskMembers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {taskMembers.map((m: { user_id: string; role: string; user?: { full_name?: string; avatar_url?: string | null } }) => {
                  const u = m.user;
                  const uName = u?.full_name || 'Unknown';
                  const uAvatar = u?.avatar_url;
                  const roleLabel = m.role === 'responsible' ? 'Odpowiedzialny' : 'Pracownik';
                  return (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `2px solid ${cardTheme.accentBorder}`,
                          flexShrink: 0,
                        }}
                      >
                        {uAvatar ? (
                          <img src={uAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0, 217, 255, 0.2)',
                              color: cardTheme.header,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {getInitials(uName)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>{uName}</span>
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: m.role === 'responsible' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0, 217, 255, 0.15)',
                            color: m.role === 'responsible' ? '#fbbf24' : 'rgba(0, 217, 255, 0.8)',
                            fontWeight: 600,
                          }}
                        >
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>No assigned people.</div>
            )}
          </CollapsibleSection>
        </div>

        {/* Sticky footer: Zoom In, Add progress, Assign Team — w jednej linii */}
        <div
          style={{
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            padding: '16px 28px',
            background: 'rgba(21, 27, 46, 0.98)',
            borderTop: `1px solid ${cardTheme.border.replace('0.3', '0.2')}`,
            display: 'flex',
            gap: 12,
            flexWrap: 'nowrap',
            alignItems: 'center',
            overflowX: 'auto',
          }}
        >
          {onZoomIn && moduleId && (
            <button
              onClick={async (e) => { e.stopPropagation(); await onZoomIn(moduleId); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: 8,
                padding: '12px 20px',
                background: cardTheme.accent,
                border: `1px solid ${cardTheme.border}`,
                borderRadius: 10,
                color: cardTheme.header,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Telescope size={18} />
              Zoom In
            </button>
          )}
          <button
            onClick={() => setShowAddProgress(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              gap: 8,
              padding: '12px 20px',
              background: cardTheme.accent,
              border: `1px solid ${cardTheme.border}`,
              borderRadius: 10,
              color: cardTheme.header,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            Add progress
          </button>
          {canAssignTeam && projectId && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAssignTeam(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: 8,
                padding: '12px 20px',
                background: cardTheme.accent,
                border: `1px solid ${cardTheme.border}`,
                borderRadius: 10,
                color: cardTheme.header,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <UserPlus size={18} />
              Assign Team
            </button>
          )}
        </div>
      </div>

      <AssignTeamModal
        open={showAssignTeam}
        onClose={() => setShowAssignTeam(false)}
        mode="task"
        taskId={taskId}
        taskName={data.name}
        projectId={projectId!}
        title="Assign team to task"
      />

      <AddProgressDialog
        open={showAddProgress}
        entityType="task"
        entityId={taskId}
        entityName={data.name}
        onClose={() => setShowAddProgress(false)}
        onSuccess={() => setShowAddProgress(false)}
      />
    </div>
  );
}
