'use client';

import { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTeamUsersGrouped } from '@/lib/chat/queries';
import { useProjectMembers, useModuleMembers, useTaskMembers } from '@/lib/pm/queries';
import {
  useAddProjectMember,
  useRemoveProjectMember,
  useAddModuleMember,
  useRemoveModuleMember,
  useAddTaskMember,
  useRemoveTaskMember,
} from '@/lib/pm/mutations';
import { toast } from 'sonner';

const CREW_GROUPS = [
  { key: 'admins', label: 'COMMAND', usersKey: 'admins' as const },
  { key: 'project_managers', label: 'PROJECT MANAGERS', usersKey: 'project_managers' as const },
  { key: 'workers', label: 'CO-WORKERS', usersKey: 'workers' as const },
  { key: 'clients', label: 'CLIENTS', usersKey: 'clients' as const },
];

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    admin: '#a855f7',
    project_manager: '#00d9ff',
    worker: '#ff6b35',
    client: '#10b981',
    manager: '#00d9ff',
    member: 'rgba(0, 217, 255, 0.6)',
    lead: '#fbbf24',
    responsible: '#fbbf24',
  };
  return colors[role] || '#00d9ff';
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type AssignTeamModalProps =
  | {
      open: boolean;
      onClose: () => void;
      mode: 'project';
      projectId: string;
      title: string;
    }
  | {
      open: boolean;
      onClose: () => void;
      mode: 'module';
      moduleId: string;
      moduleName: string;
      projectId: string;
      title: string;
    }
  | {
      open: boolean;
      onClose: () => void;
      mode: 'task';
      taskId: string;
      taskName: string;
      projectId: string;
      title: string;
    };

export function AssignTeamModal(props: AssignTeamModalProps) {
  const { user } = useAuth();
  const [addRoleProject, setAddRoleProject] = useState<'manager' | 'member'>('member');
  const [addRoleModule, setAddRoleModule] = useState<'lead' | 'member'>('member');
  const [addRoleTask, setAddRoleTask] = useState<'responsible' | 'member'>('member');

  const { data: teamUsersGrouped } = useTeamUsersGrouped(user?.id, user?.role);

  const isProject = props.mode === 'project';
  const isTask = props.mode === 'task';
  const projectId = props.projectId;
  const { data: projectMembers } = useProjectMembers(isProject ? projectId : null);
  const moduleId = props.mode === 'module' ? props.moduleId : null;
  const taskId = props.mode === 'task' ? props.taskId : null;
  const { data: moduleMembers } = useModuleMembers(moduleId);
  const { data: taskMembers } = useTaskMembers(taskId);

  const addProjectMember = useAddProjectMember();
  const removeProjectMember = useRemoveProjectMember();
  const addModuleMember = useAddModuleMember();
  const removeModuleMember = useRemoveModuleMember();
  const addTaskMember = useAddTaskMember();
  const removeTaskMember = useRemoveTaskMember();

  const currentMembers = isProject ? projectMembers : isTask ? taskMembers : moduleMembers;
  const memberIds = new Set((currentMembers || []).map((m: any) => m.user_id));

  const clients = user?.role === 'admin' ? (teamUsersGrouped?.clients ?? []) : [];
  const usersToAdd = teamUsersGrouped
    ? [
        ...(teamUsersGrouped.admins ?? []),
        ...(teamUsersGrouped.project_managers ?? []),
        ...(teamUsersGrouped.workers ?? []),
        ...clients,
      ].filter((u: { id: string }) => !memberIds.has(u.id))
    : [];

  const handleAdd = (userId: string) => {
    if (isProject) {
      addProjectMember.mutate(
        { projectId, userId, role: addRoleProject },
        {
          onSuccess: () => {
            toast.success('Member added to project');
          },
          onError: (err) => toast.error('Could not add member', { description: err.message }),
        }
      );
    } else if (moduleId) {
      addModuleMember.mutate(
        { moduleId, userId, role: addRoleModule },
        {
          onSuccess: () => {
            toast.success('Member added to module team');
          },
          onError: (err) => toast.error('Could not add member', { description: err.message }),
        }
      );
    } else if (taskId) {
      addTaskMember.mutate(
        { taskId, userId, role: addRoleTask },
        {
          onSuccess: () => {
            toast.success('Member added to task');
          },
          onError: (err) => toast.error('Could not add member', { description: err.message }),
        }
      );
    }
  };

  const handleRemove = (userId: string) => {
    if (isProject) {
      removeProjectMember.mutate(
        { projectId, userId },
        {
          onSuccess: () => toast.success('Member removed from project'),
          onError: (err) => toast.error('Could not remove member', { description: err.message }),
        }
      );
    } else if (moduleId) {
      removeModuleMember.mutate(
        { moduleId, userId },
        {
          onSuccess: () => toast.success('Member removed from module team'),
          onError: (err) => toast.error('Could not remove member', { description: err.message }),
        }
      );
    } else if (taskId) {
      removeTaskMember.mutate(
        { taskId, userId },
        {
          onSuccess: () => toast.success('Member removed from task'),
          onError: (err) => toast.error('Could not remove member', { description: err.message }),
        }
      );
    }
  };

  if (!props.open) return null;

  const displayTitle = isProject
    ? props.title
    : isTask
      ? `${props.title} — ${props.taskName}`
      : `${props.title} — ${'moduleName' in props ? props.moduleName : ''}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          width: 440,
          maxHeight: '85vh',
          background: 'rgba(21, 27, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', margin: 0 }}>
            {displayTitle}
          </h2>
          <button
            onClick={props.onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'transparent',
              color: '#00d9ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Current members */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'rgba(0, 217, 255, 0.5)', fontFamily: 'Rajdhani', marginBottom: 10, textTransform: 'uppercase' }}>
              Current team ({currentMembers?.length || 0})
            </div>
            {currentMembers && currentMembers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentMembers.map((m: any) => {
                  const u = m.user || m;
                  const uId = m.user_id;
                  const uName = u?.full_name || 'Unknown';
                  const uAvatar = u?.avatar_url;
                  const role = m.role;
                  return (
                    <div
                      key={uId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(0, 217, 255, 0.05)',
                        border: '1px solid rgba(0, 217, 255, 0.15)',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {uAvatar ? (
                          <img src={uAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'rgba(0, 217, 255, 0.2)',
                              color: '#00d9ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {getInitials(uName)}
                          </span>
                        )}
                        <div>
                          <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{uName}</div>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: `${getRoleColor(role)}20`,
                              color: getRoleColor(role),
                              fontWeight: 600,
                            }}
                          >
                            {role === 'responsible' ? 'Odpowiedzialny' : role === 'lead' ? 'Lead' : role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(uId)}
                        disabled={
                          removeProjectMember.isPending ||
                          removeModuleMember.isPending ||
                          removeTaskMember.isPending
                        }
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                        title="Remove from team"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>No members yet. Add below.</p>
            )}
          </div>

          {/* Add member */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0, 217, 255, 0.5)', fontFamily: 'Rajdhani', marginBottom: 10, textTransform: 'uppercase' }}>
              Add member
            </div>
            {usersToAdd.length === 0 ? (
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>All users are already in the team.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isProject && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: 'rgba(0, 217, 255, 0.6)', marginRight: 8 }}>Role when adding:</label>
                    <select
                      className="assign-modal-select"
                      value={addRoleProject}
                      onChange={(e) => setAddRoleProject(e.target.value as 'manager' | 'member')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(21, 27, 46, 0.98)',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        color: '#00d9ff',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="manager">Project Manager</option>
                    </select>
                  </div>
                )}
                {props.mode === 'module' && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: 'rgba(0, 217, 255, 0.6)', marginRight: 8 }}>Role when adding:</label>
                    <select
                      className="assign-modal-select"
                      value={addRoleModule}
                      onChange={(e) => setAddRoleModule(e.target.value as 'lead' | 'member')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(21, 27, 46, 0.98)',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        color: '#00d9ff',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="lead">Module Lead</option>
                    </select>
                  </div>
                )}
                {isTask && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: 'rgba(0, 217, 255, 0.6)', marginRight: 8 }}>Role when adding:</label>
                    <select
                      className="assign-modal-select"
                      value={addRoleTask}
                      onChange={(e) => setAddRoleTask(e.target.value as 'responsible' | 'member')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(21, 27, 46, 0.98)',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        color: '#00d9ff',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="member">Member (worker)</option>
                      <option value="responsible">Responsible</option>
                    </select>
                  </div>
                )}
                <div className="scrollbar-cosmic" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {CREW_GROUPS.filter((g) => {
                    const users = (teamUsersGrouped?.[g.usersKey] || []).filter((u: any) => !memberIds.has(u.id));
                    return users.length > 0 && (g.usersKey !== 'clients' || user?.role === 'admin');
                  }).map(({ key, label, usersKey }) => {
                    const users = ((teamUsersGrouped?.[usersKey] || []) as any[]).filter((u) => !memberIds.has(u.id));
                    if (users.length === 0) return null;
                    return (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: 'rgba(0, 217, 255, 0.4)', marginBottom: 6, letterSpacing: 1 }}>
                          {label}
                        </div>
                        {users.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleAdd(u.id)}
                            disabled={
                              addProjectMember.isPending ||
                              addModuleMember.isPending ||
                              addTaskMember.isPending
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: '#fff',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  background: `${getRoleColor(u.role || '')}30`,
                                  color: getRoleColor(u.role || ''),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {getInitials(u.full_name || '?')}
                              </span>
                            )}
                            <span style={{ flex: 1 }}>{u.full_name || 'Unknown'}</span>
                            <UserPlus size={14} style={{ color: 'rgba(0, 217, 255, 0.7)' }} />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
