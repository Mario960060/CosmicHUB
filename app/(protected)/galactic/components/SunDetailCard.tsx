'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useProjectMembers, useDependenciesForSubtasks } from '@/lib/pm/queries';
import { useAuth } from '@/hooks/use-auth';
import { X, Telescope, Users, Layers, GitBranch, UsersRound, ChevronDown, UserPlus } from 'lucide-react';
import { SubtaskTypeIcon } from '@/components/satellite/SubtaskTypeIcon';
import { AssignTeamModal } from '@/app/(protected)/pm/projects/[id]/components/AssignTeamModal';
import { CollapsibleSection } from './CollapsibleSection';
import {
  getStatusBadgeStyle,
  getStatusDotColor,
  getInitials,
  renderStars,
  formatDependencyType,
  getDependencyTypeColor,
  HierarchyMetaRow,
} from './DetailCardShared';
import {
  calculateProjectProgress,
  calculateDaysRemaining,
  getDueDateStyle,
  sumEstimatedHours,
  countTasksByStatus,
  calculateModuleProgress,
  calculateTaskProgress,
  getAssignedPeople,
  sumLoggedHours,
} from '@/lib/galactic/progress';

interface SunDetailCardProps {
  projectId: string;
  onClose: () => void;
  onZoomIn?: () => void;
}

interface ProjectWithModules {
  id: string;
  name: string;
  description: string | null;
  status: string;
  due_date: string | null;
  priority_stars?: number | null;
  estimated_hours?: number | null;
  sun_type?: string | null;
  modules?: {
    id: string;
    name: string;
    due_date: string | null;
    progress_percent?: number | null;
    priority_stars?: number | null;
    subtasks?: { id: string; name: string; status: string; assigned_to: string | null; work_logs?: { hours_spent: number }[] }[];
    tasks?: {
      id: string;
      name: string;
      status: string;
      estimated_hours: number | null;
      priority_stars?: number | null;
      progress_percent?: number | null;
      subtasks?: { id: string; name: string; status: string; assigned_to: string | null; work_logs?: { hours_spent: number }[] }[];
    }[];
  }[];
}

function useSunDetails(projectId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['sun-details', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          id,
          name,
          description,
          status,
          due_date,
          priority_stars,
          estimated_hours,
          sun_type,
          modules (
            id,
            name,
            due_date,
            progress_percent,
            priority_stars,
            tasks (
              id,
              name,
              status,
              estimated_hours,
              priority_stars,
              progress_percent,
              subtasks (
                id,
                name,
                status,
                satellite_type,
                assigned_to,
                work_logs (hours_spent)
              )
            )
          )
        `
        )
        .eq('id', projectId!)
        .single();
      if (error) throw error;

      // Fetch project-level and module-level subtasks (requires migration 036)
      let projectSubtasks: { id: string; name: string; status: string; satellite_type?: string | null; work_logs?: { hours_spent: number }[] }[] = [];
      const moduleSubtasksMap: Record<string, { id: string; name: string; status: string; satellite_type?: string | null; assigned_to: string | null; work_logs: { hours_spent: number }[] }[]> = {};
      try {
        const { data: ps } = await supabase
          .from('subtasks')
          .select('id, name, status, satellite_type, assigned_to, work_logs(hours_spent)')
          .eq('project_id', projectId!);
        projectSubtasks = (ps || []) as typeof projectSubtasks;
      } catch {
        /* column may not exist before migration */
      }
      try {
        const moduleIds = ((data as ProjectWithModules).modules || []).map((m) => m.id);
        if (moduleIds.length > 0) {
          const { data: ms } = await supabase
            .from('subtasks')
            .select('id, name, status, satellite_type, module_id, assigned_to, work_logs(hours_spent)')
            .in('module_id', moduleIds);
            if (ms) {
            for (const st of ms as { id: string; name: string; status: string; module_id: string; assigned_to?: string | null; work_logs?: { hours_spent: number }[] }[]) {
              if (st.module_id) {
                if (!moduleSubtasksMap[st.module_id]) moduleSubtasksMap[st.module_id] = [];
                moduleSubtasksMap[st.module_id].push({
                  id: st.id,
                  name: st.name,
                  status: st.status,
                  satellite_type: (st as { satellite_type?: string | null }).satellite_type ?? null,
                  assigned_to: st.assigned_to ?? null,
                  work_logs: st.work_logs ?? [],
                });
              }
            }
          }
        }
      } catch {
        /* column may not exist before migration */
      }

      const modulesWithSubs = ((data as ProjectWithModules).modules || []).map((m) => ({
        ...m,
        subtasks: moduleSubtasksMap[m.id] ?? [],
      }));

      return {
        ...(data as ProjectWithModules),
        modules: modulesWithSubs,
        projectSubtasks,
      } as ProjectWithModules & { projectSubtasks: { id: string; name: string; status: string; satellite_type?: string | null }[] };
    },
    enabled: !!projectId,
  });
}

export function SunDetailCard({ projectId, onClose, onZoomIn }: SunDetailCardProps) {
  const [expandedHierarchy, setExpandedHierarchy] = useState(false);
  const [expandedDeps, setExpandedDeps] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { user } = useAuth();
  const [showAssignTeam, setShowAssignTeam] = useState(false);

  const { data, isLoading } = useSunDetails(projectId);
  const { data: members } = useProjectMembers(projectId);

  const isPM = (members || []).some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'manager');
  const canAssignTeam = user?.role === 'admin' || isPM;

  const modules = data?.modules || [];
  const projectSubtasksPre = (data as any)?.projectSubtasks || [];
  const allSubtaskIds = useMemo(() => {
    const taskSubs = modules.flatMap((m) => (m.tasks || []).flatMap((t) => t.subtasks || []));
    const modSubs = modules.flatMap((m) => m.subtasks || []);
    return [
      ...taskSubs.map((s) => s.id),
      ...modSubs.map((s) => s.id),
      ...projectSubtasksPre.map((s: { id: string }) => s.id),
    ];
  }, [modules, projectSubtasksPre]);
  const { data: dependencies } = useDependenciesForSubtasks(allSubtaskIds);

  if (isLoading || !data) {
    return (
      <div
        onClick={onClose}
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
          {isLoading ? 'Loading...' : 'Project not found'}
        </div>
      </div>
    );
  }

  const projectSubtasks = projectSubtasksPre;
  const allTasks = modules.flatMap((m) => m.tasks || []);
  const progress = calculateProjectProgress(modules);
  const daysRemaining = calculateDaysRemaining(data.due_date);
  const dueStyle = getDueDateStyle(daysRemaining);
  const taskCounts = countTasksByStatus(allTasks);
  const estimatedTotal = data.estimated_hours ?? sumEstimatedHours(allTasks);
  const priorityStars = data.priority_stars ?? 1;

  const loggedTotal = allTasks.reduce((acc, task) => {
    const subtasks = task.subtasks || [];
    const sum = subtasks.reduce((sacc, st) => {
      const logs = st.work_logs || [];
      return sacc + logs.reduce((lacc, l) => lacc + (l.hours_spent || 0), 0);
    }, 0);
    return acc + sum;
  }, 0);

  const hoursDisplay =
    estimatedTotal !== null
      ? `${Math.round(loggedTotal * 10) / 10}h / ${estimatedTotal}h`
      : `${Math.round(loggedTotal * 10) / 10}h / ?`;

  const depCount = dependencies?.length ?? 0;

  const statusStyle = getStatusBadgeStyle(data.status);

  const cardTheme = { border: 'rgba(255, 184, 0, 0.4)', header: '#fbbf24', accent: 'rgba(251, 191, 36, 0.4)' };

  return (
    <div
      onClick={onClose}
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
          boxShadow: `0 0 60px ${cardTheme.border.replace('0.4', '0.2')}`,
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
            borderBottom: `1px solid ${cardTheme.border.replace('0.4', '0.2')}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 22, fontFamily: 'Orbitron, sans-serif', color: cardTheme.header, fontWeight: 'bold', margin: 0 }}>
                ☀️ {data.name}
              </h2>
              {data.description && (
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
              )}
              {data.description && data.description.length > 120 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                  style={{ marginTop: 4, background: 'none', border: 'none', color: cardTheme.header, fontSize: 12, cursor: 'pointer', padding: 0 }}
                >
                  {descExpanded ? 'Collapse' : 'Expand'}
                </button>
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
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: statusStyle.bg,
                color: statusStyle.color,
              }}
            >
              {statusStyle.text}
            </span>
            {renderStars(priorityStars, cardTheme.header)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Due:</span>
            <span style={{ color: dueStyle.color, fontWeight: 600 }}>
              {data.due_date
                ? new Date(data.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-'}
            </span>
            <span style={{ color: dueStyle.color, fontSize: 13 }}>({dueStyle.text})</span>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Logged: {Math.round(loggedTotal * 10) / 10}h / Estimated: {estimatedTotal ?? '?'}h
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Progress: {progress}%</span>
            <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: progress === 100 ? '#22c55e' : progress > 50 ? 'linear-gradient(90deg, #fbbf24, #22c55e)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  borderRadius: 5,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          <CollapsibleSection
            title="Hierarchy"
            summary={`${modules.length} modules, ${taskCounts.total} tasks`}
            icon={<Layers size={16} />}
            expanded={expandedHierarchy}
            onToggle={() => setExpandedHierarchy(!expandedHierarchy)}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              {modules.map((mod) => {
                const modExp = expandedModules.has(mod.id);
                const taskCount = (mod.tasks || []).length;
                const modSubCount = (mod.subtasks || []).length;
                const modSummary = `${taskCount} tasks${modSubCount > 0 ? `, ${modSubCount} on module` : ''}`;
                const allModSubtasks = [...(mod.tasks || []).flatMap((t) => t.subtasks || []), ...(mod.subtasks || [])];
                const modProgress = calculateModuleProgress(mod.tasks || [], mod.progress_percent);
                const modLoggedHours = allModSubtasks.reduce(
                  (acc, st) => acc + sumLoggedHours((st as { work_logs?: { hours_spent: number }[] }).work_logs || []),
                  0
                );
                const modEstimatedHours = sumEstimatedHours(mod.tasks || []);
                const modAssignedCount = getAssignedPeople(allModSubtasks as { assigned_to: string | null }[]).length;
                const modStars = mod.priority_stars ?? 1;
                return (
                  <div key={mod.id} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 0',
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <ChevronDown size={16} style={{ flexShrink: 0, transform: modExp ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                      <span style={{ fontWeight: 600 }}>› {mod.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>({modSummary})</span>
                      <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <HierarchyMetaRow
                          progress={modProgress}
                          loggedHours={modLoggedHours}
                          estimatedHours={modEstimatedHours}
                          assignedCount={modAssignedCount}
                          stars={modStars}
                          accentColor="#fbbf24"
                        />
                      </span>
                    </button>
                    {modExp && (
                      <div style={{ paddingLeft: 24 }}>
                        {(mod.tasks || []).map((task) => {
                          const taskExp = expandedTasks.has(task.id);
                          const subCount = (task.subtasks || []).length;
                          const taskProgress = calculateTaskProgress(task.subtasks || [], task.progress_percent);
                          const taskLoggedHours = (task.subtasks || []).reduce(
                            (acc, st) => acc + sumLoggedHours(st.work_logs || []),
                            0
                          );
                          const taskAssignedCount = getAssignedPeople((task.subtasks || []) as { assigned_to: string | null }[]).length;
                          const taskStars = task.priority_stars ?? 1;
                          return (
                            <div key={task.id} style={{ marginBottom: 6 }}>
                              <button
                                onClick={() => toggleTask(task.id)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '4px 0',
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <ChevronDown size={14} style={{ flexShrink: 0, transform: taskExp ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusDotColor(task.status), flexShrink: 0 }} />
                                <span>{task.name}</span>
                                {subCount > 0 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>({subCount})</span>}
                                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                  <HierarchyMetaRow
                                    progress={taskProgress}
                                    loggedHours={taskLoggedHours}
                                    estimatedHours={task.estimated_hours}
                                    assignedCount={taskAssignedCount}
                                    stars={taskStars}
                                    accentColor="#fbbf24"
                                  />
                                </span>
                              </button>
                              {taskExp && (
                                <div style={{ paddingLeft: 24 }}>
                                  {(task.subtasks || []).map((st) => (
                                    <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, padding: '4px 0' }}>
                                      <SubtaskTypeIcon satelliteType={(st as { satellite_type?: string }).satellite_type} size={10} />
                                      <span style={{ fontSize: 12 }}>{st.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(mod.subtasks || []).length > 0 && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 }}>On module:</div>
                            {(mod.subtasks || []).map((st) => (
                              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0, padding: '4px 0' }}>
                                <SubtaskTypeIcon satelliteType={(st as { satellite_type?: string }).satellite_type} size={10} />
                                <span>{st.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {projectSubtasks.length > 0 && (
                <div style={{ paddingLeft: 0, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 6 }}>Unassigned:</div>
                  {projectSubtasks.map((st: { id: string; name: string; status: string; satellite_type?: string | null }) => (
                    <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', paddingLeft: 24 }}>
                      <SubtaskTypeIcon satelliteType={st.satellite_type} size={10} />
                      <span>{st.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Dependencies"
            summary={depCount > 0 ? `${depCount}` : 'None'}
            icon={<GitBranch size={16} />}
            expanded={expandedDeps}
            onToggle={() => setExpandedDeps(!expandedDeps)}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              {dependencies && dependencies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dependencies.map((dep) => {
                    const from = dep.dependent_subtask?.name || '?';
                    const to = dep.depends_on_subtask?.name || '?';
                    const typ = dep.dependency_type || 'depends_on';
                    const color = getDependencyTypeColor(typ);
                    return (
                      <div key={dep.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ color, fontSize: 11, fontWeight: 600 }}>{formatDependencyType(typ)}</span>
                        {dep.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{dep.note}</div>}
                        <div style={{ marginTop: 2 }}>{from} → {to}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>No dependencies between subtasks.</div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Team"
            summary={members && members.length > 0 ? `${members.length} people` : 'None'}
            icon={<UsersRound size={16} />}
            expanded={expandedTeam}
            onToggle={() => setExpandedTeam(!expandedTeam)}
          >
            {members && members.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(members as { user_id: string; user?: { full_name?: string; avatar_url?: string | null } }[]).map((m) => {
                  const u = m.user || (m as any);
                  const name = u?.full_name || 'Unknown';
                  const avatar = u?.avatar_url;
                  return (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `2px solid ${cardTheme.accent}`,
                          flexShrink: 0,
                        }}
                      >
                        {avatar ? (
                          <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: cardTheme.accent,
                              color: cardTheme.header,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {getInitials(name)}
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.9)' }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>No team members.</div>
            )}
          </CollapsibleSection>
        </div>

        {/* Sticky footer */}
        {(onZoomIn || canAssignTeam) && (
          <div
            style={{
              flexShrink: 0,
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
              padding: '16px 28px',
              background: 'rgba(21, 27, 46, 0.98)',
              borderTop: `1px solid ${cardTheme.border.replace('0.4', '0.2')}`,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {canAssignTeam && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAssignTeam(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: 'rgba(0, 217, 255, 0.15)',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  borderRadius: 10,
                  color: '#00d9ff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={18} />
                Assign Team
              </button>
            )}
            {onZoomIn && (
              <button
                onClick={() => { onClose(); onZoomIn(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: `linear-gradient(135deg, ${cardTheme.accent}, rgba(251, 184, 0, 0.2))`,
                  border: `1px solid ${cardTheme.border}`,
                  borderRadius: 10,
                  color: cardTheme.header,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <Telescope size={18} />
                Zoom In
              </button>
            )}
          </div>
        )}
      </div>

      <AssignTeamModal
        open={showAssignTeam}
        onClose={() => setShowAssignTeam(false)}
        mode="project"
        projectId={projectId}
        title="Assign team to project"
      />
    </div>
  );
}
