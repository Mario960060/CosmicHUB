// REDESIGN: Workstation - Tasks (Moons) as main view, subtasks in detail + popup

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';
import { useWorkstationTasks, useWorkstationMinitasks } from '@/lib/workstation/queries';
import type { TaskWithDetails, MinitaskWithDetails } from '@/lib/workstation/queries';
import { Search, Wrench, X, FileText } from 'lucide-react';
import { SubtaskTypeIcon } from '@/components/satellite/SubtaskTypeIcon';
import { SatelliteDetailPanel } from '@/components/satellite/SatelliteDetailPanel';
import { getInitials } from '@/app/(protected)/galactic/components/DetailCardShared';
import { getStatusLabel } from '@/lib/utils';

export default function WorkstationPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('task') || null;

  const [activeTab, setActiveTab] = useState<'tasks' | 'sub-tasks'>('tasks');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [selectedMinitaskId, setSelectedMinitaskId] = useState<string | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const { data: allTasks } = useWorkstationTasks();
  const { data: allMinitasks } = useWorkstationMinitasks();

  const isTaskMember = (task: TaskWithDetails) =>
    task.task_members?.some((m) => m.user_id === user?.id) ?? false;
  const hasNoMembers = (task: TaskWithDetails) =>
    !task.task_members || task.task_members.length === 0;

  const isMinitaskAssigned = (mt: MinitaskWithDetails) => mt.assigned_to === user?.id;
  const hasNoMinitaskAssignee = (mt: MinitaskWithDetails) => !mt.assigned_to;

  const filteredTasks =
    allTasks?.filter((task) => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'my-tasks') return matchesSearch && isTaskMember(task);
      if (filter === 'available') return matchesSearch && hasNoMembers(task);
      return matchesSearch;
    }) ?? [];

  const filteredMinitasks =
    allMinitasks?.filter((mt) => {
      const matchesSearch = mt.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'my-tasks') return matchesSearch && isMinitaskAssigned(mt);
      if (filter === 'available') return matchesSearch && hasNoMinitaskAssignee(mt);
      return matchesSearch;
    }) ?? [];

  const selectedTask = selectedTaskId
    ? filteredTasks.find((t) => t.id === selectedTaskId)
    : null;
  const selectedMinitask = selectedMinitaskId
    ? filteredMinitasks.find((m) => m.id === selectedMinitaskId)
    : null;

  const getTaskProgress = (task: TaskWithDetails) => {
    const subs = task.subtasks || [];
    if (subs.length === 0) return task.progress_percent ?? 0;
    const done = subs.filter((s) => s.status === 'done').length;
    return Math.round((done / subs.length) * 100);
  };

  const getTaskLoggedHours = (task: TaskWithDetails) => {
    return (
      task.subtasks?.reduce((acc, st) => {
        const logs = (st as { work_logs?: { hours_spent: number }[] }).work_logs || [];
        return acc + logs.reduce((s, w) => s + (w.hours_spent || 0), 0);
      }, 0) ?? 0
    );
  };

  const getMinitaskProgress = (mt: MinitaskWithDetails) => {
    const subs = mt.subtasks || [];
    if (subs.length === 0) return mt.progress_percent ?? 0;
    const done = subs.filter((s) => s.status === 'done').length;
    return Math.round((done / subs.length) * 100);
  };

  const getMinitaskLoggedHours = (mt: MinitaskWithDetails) => {
    return (
      mt.subtasks?.reduce((acc, st) => {
        const logs = (st as { work_logs?: { hours_spent: number }[] }).work_logs || [];
        return acc + logs.reduce((s, w) => s + (w.hours_spent || 0), 0);
      }, 0) ?? 0
    );
  };

  const getMinitaskParentName = (mt: MinitaskWithDetails) => {
    if (mt.task?.module?.project?.name && mt.task?.module?.name && mt.task?.name)
      return `${mt.task.module.project.name} › ${mt.task.module.name} › ${mt.task.name}`;
    if (mt.module?.project?.name && mt.module?.name)
      return `${mt.module.project.name} › ${mt.module.name}`;
    if (mt.project?.name) return mt.project.name;
    return '—';
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
              }}
            >
              <Wrench size={28} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
            </div>
            <h1
              style={{
                fontSize: '48px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Workstation
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '56px' }}>
            Your cosmic workspace for task management
          </p>
        </div>

        {/* Split View */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '450px 1fr',
            gap: 0,
            minHeight: '800px',
          }}
        >
          {/* LEFT PANEL - Tasks (Moons) List */}
          <div
            style={{
              background: 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '20px 0 0 20px',
              borderRight: 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
                background: 'rgba(0, 217, 255, 0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
                  paddingBottom: '12px',
                }}
              >
                {[
                  { key: 'tasks' as const, label: 'Tasks' },
                  { key: 'sub-tasks' as const, label: 'Sub-tasks' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelectedTaskId(null);
                      setSelectedMinitaskId(null);
                    }}
                    style={{
                      padding: '8px 20px',
                      background: activeTab === tab.key ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                      border:
                        activeTab === tab.key
                          ? '1px solid rgba(0, 217, 255, 0.5)'
                          : '1px solid rgba(0, 217, 255, 0.2)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: 'Orbitron, sans-serif',
                      color: activeTab === tab.key ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: activeTab === tab.key ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'my-tasks', label: 'My Tasks' },
                  { key: 'available', label: 'Available' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    onMouseEnter={() => setHoveredFilter(f.key)}
                    onMouseLeave={() => setHoveredFilter(null)}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background:
                        filter === f.key
                          ? 'rgba(0, 217, 255, 0.2)'
                          : hoveredFilter === f.key
                            ? 'rgba(0, 0, 0, 0.4)'
                            : 'rgba(0, 0, 0, 0.3)',
                      border:
                        filter === f.key
                          ? '1px solid rgba(0, 217, 255, 0.5)'
                          : '1px solid rgba(0, 217, 255, 0.2)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: filter === f.key ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: filter === f.key ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(0, 217, 255, 0.5)',
                  }}
                />
                <input
                  type="text"
                  placeholder={activeTab === 'tasks' ? 'Search tasks...' : 'Search sub-tasks...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 16px 10px 36px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="scrollbar-cosmic" style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'tasks' && filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const isActive = selectedTaskId === task.id;
                  const isHovered = hoveredTask === task.id;
                  const progress = getTaskProgress(task);
                  const loggedHours = getTaskLoggedHours(task);
                  const memberCount = task.task_members?.length ?? 0;

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setSelectedMinitaskId(null);
                      }}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      style={{
                        position: 'relative',
                        background: isActive
                          ? 'rgba(0, 217, 255, 0.1)'
                          : isHovered
                            ? 'rgba(0, 217, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.3)',
                        border: isActive
                          ? '1px solid rgba(0, 217, 255, 0.6)'
                          : isHovered
                            ? '1px solid rgba(0, 217, 255, 0.4)'
                            : '1px solid rgba(0, 217, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                        boxShadow: isActive ? '0 0 20px rgba(0, 217, 255, 0.2)' : 'none',
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '60%',
                            background: '#00d9ff',
                            borderRadius: '0 3px 3px 0',
                            boxShadow: '0 0 10px #00d9ff',
                          }}
                        />
                      )}

                      <div style={{ marginBottom: '10px' }}>
                        <h3
                          style={{
                            fontSize: '14px',
                            color: '#00d9ff',
                            fontWeight: '600',
                            marginBottom: '6px',
                            margin: 0,
                          }}
                        >
                          {task.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3].map((star) => (
                            <svg
                              key={star}
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill={
                                star <= (task.priority_stars || 1) ? '#fbbf24' : 'rgba(251,191,36,0.2)'
                              }
                              style={{
                                filter:
                                  star <= (task.priority_stars || 1)
                                    ? 'drop-shadow(0 0 3px #fbbf24)'
                                    : 'none',
                              }}
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          flexWrap: 'wrap',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background:
                              task.status === 'in_progress'
                                ? 'rgba(0, 217, 255, 0.2)'
                                : task.status === 'done'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(100, 116, 139, 0.3)',
                            border:
                              task.status === 'in_progress'
                                ? '1px solid rgba(0, 217, 255, 0.4)'
                                : task.status === 'done'
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : 'none',
                            color:
                              task.status === 'in_progress'
                                ? '#00d9ff'
                                : task.status === 'done'
                                  ? '#10b981'
                                  : '#94a3b8',
                          }}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {memberCount} members · {Math.round(loggedHours * 10) / 10}h · {progress}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : activeTab === 'sub-tasks' && filteredMinitasks.length > 0 ? (
                filteredMinitasks.map((mt) => {
                  const isActive = selectedMinitaskId === mt.id;
                  const isHovered = hoveredTask === mt.id;
                  const progress = getMinitaskProgress(mt);
                  const loggedHours = getMinitaskLoggedHours(mt);
                  const subCount = mt.subtasks?.length ?? 0;

                  return (
                    <div
                      key={mt.id}
                      onClick={() => {
                        setSelectedMinitaskId(mt.id);
                        setSelectedTaskId(null);
                      }}
                      onMouseEnter={() => setHoveredTask(mt.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      style={{
                        position: 'relative',
                        background: isActive
                          ? 'rgba(0, 217, 255, 0.1)'
                          : isHovered
                            ? 'rgba(0, 217, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.3)',
                        border: isActive
                          ? '1px solid rgba(0, 217, 255, 0.6)'
                          : isHovered
                            ? '1px solid rgba(0, 217, 255, 0.4)'
                            : '1px solid rgba(0, 217, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                        boxShadow: isActive ? '0 0 20px rgba(0, 217, 255, 0.2)' : 'none',
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '60%',
                            background: '#00d9ff',
                            borderRadius: '0 3px 3px 0',
                            boxShadow: '0 0 10px #00d9ff',
                          }}
                        />
                      )}
                      <div style={{ marginBottom: '10px' }}>
                        <h3
                          style={{
                            fontSize: '14px',
                            color: '#00d9ff',
                            fontWeight: '600',
                            marginBottom: '6px',
                            margin: 0,
                          }}
                        >
                          {mt.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3].map((star) => (
                            <svg
                              key={star}
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill={
                                star <= (mt.priority_stars || 1) ? '#fbbf24' : 'rgba(251,191,36,0.2)'
                              }
                              style={{
                                filter:
                                  star <= (mt.priority_stars || 1)
                                    ? 'drop-shadow(0 0 3px #fbbf24)'
                                    : 'none',
                              }}
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          flexWrap: 'wrap',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background:
                              mt.status === 'in_progress'
                                ? 'rgba(0, 217, 255, 0.2)'
                                : mt.status === 'done'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(100, 116, 139, 0.3)',
                            border:
                              mt.status === 'in_progress'
                                ? '1px solid rgba(0, 217, 255, 0.4)'
                                : mt.status === 'done'
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : 'none',
                            color:
                              mt.status === 'in_progress'
                                ? '#00d9ff'
                                : mt.status === 'done'
                                  ? '#10b981'
                                  : '#94a3b8',
                          }}
                        >
                          {getStatusLabel(mt.status)}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {subCount} subtasks · {Math.round(loggedHours * 10) / 10}h · {progress}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 0',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {searchQuery
                    ? activeTab === 'tasks'
                      ? 'No tasks found'
                      : 'No sub-tasks found'
                    : activeTab === 'tasks'
                      ? 'No tasks available'
                      : 'No sub-tasks available'}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Task details + subtasks */}
          <div
            style={{
              position: 'relative',
              background: 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '0 20px 20px 0',
              borderLeft: 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-30%',
                right: '-20%',
                width: '400px',
                height: '400px',
                background: 'rgba(0, 217, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(80px)',
                pointerEvents: 'none',
              }}
            />

            {(activeTab === 'tasks' && selectedTask) || (activeTab === 'sub-tasks' && selectedMinitask) ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {activeTab === 'tasks' && selectedTask ? (
                  <>
                    {/* Task header */}
                    <div
                      style={{
                        padding: '24px',
                        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
                        background: 'rgba(0, 217, 255, 0.05)',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '20px',
                          fontFamily: 'Orbitron, sans-serif',
                          color: '#00d9ff',
                          margin: '0 0 8px 0',
                        }}
                      >
                        {selectedTask.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                          fontSize: 13,
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <span>{selectedTask.module?.project?.name ?? '—'}</span>
                        <span>›</span>
                        <span>{selectedTask.module?.name ?? '—'}</span>
                        <span style={{ marginLeft: 'auto' }}>
                          {selectedTask.task_members?.length ?? 0} assigned
                        </span>
                      </div>
                    </div>

                    {/* Description - above subtasks */}
                    {selectedTask.description && (
                  <div
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
                      background: 'rgba(0, 217, 255, 0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        fontSize: 14,
                        color: 'rgba(255, 255, 255, 0.85)',
                        lineHeight: 1.5,
                      }}
                    >
                      <FileText
                        size={18}
                        style={{ color: 'rgba(0, 217, 255, 0.7)', flexShrink: 0, marginTop: 2 }}
                      />
                      <span>{selectedTask.description}</span>
                    </div>
                  </div>
                )}

                {/* Subtasks list */}
                <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  <h4
                    style={{
                      fontSize: 14,
                      color: 'rgba(0, 217, 255, 0.8)',
                      marginBottom: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Subtasks
                  </h4>
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedTask.subtasks.map((st) => {
                        const stWithLogs = st as {
                          id: string;
                          name: string;
                          status: string;
                          work_logs?: { hours_spent: number }[];
                        };
                        const hours =
                          stWithLogs.work_logs?.reduce((s, w) => s + (w.hours_spent || 0), 0) ?? 0;
                        return (
                          <button
                            key={st.id}
                            onClick={() => setSelectedSubtaskId(st.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              width: '100%',
                              padding: '12px 16px',
                              background: 'rgba(0, 217, 255, 0.05)',
                              border: '1px solid rgba(0, 217, 255, 0.2)',
                              borderRadius: 10,
                              color: '#fff',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: 14,
                            }}
                          >
                            <SubtaskTypeIcon
                              satelliteType={(st as { satellite_type?: string }).satellite_type}
                              size={14}
                            />
                            <span style={{ flex: 1 }}>{st.name}</span>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.5)',
                              }}
                            >
                              {getStatusLabel(st.status)} · {Math.round(hours * 10) / 10}h
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>
                      No subtasks yet.
                    </div>
                  )}

                  {/* Assigned members */}
                  {selectedTask.task_members && selectedTask.task_members.length > 0 && (
                    <>
                      <h4
                        style={{
                          fontSize: 14,
                          color: 'rgba(0, 217, 255, 0.8)',
                          marginTop: 24,
                          marginBottom: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        Assigned
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedTask.task_members.map((m) => {
                          const u = m.user;
                          const name = u?.full_name || '?';
                          return (
                            <div
                              key={m.user_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(0, 217, 255, 0.1)',
                                borderRadius: 8,
                                border: '1px solid rgba(0, 217, 255, 0.2)',
                              }}
                            >
                              {u?.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt=""
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: 'rgba(0, 217, 255, 0.3)',
                                    color: '#00d9ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}
                                >
                                  {getInitials(name)}
                                </span>
                              )}
                              <span style={{ fontSize: 13 }}>{name}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background:
                                    m.role === 'responsible'
                                      ? 'rgba(251, 191, 36, 0.2)'
                                      : 'rgba(0, 217, 255, 0.15)',
                                  color: m.role === 'responsible' ? '#fbbf24' : '#00d9ff',
                                }}
                              >
                                {m.role === 'responsible' ? 'Odpowiedzialny' : 'Pracownik'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                  </>
                ) : selectedMinitask ? (
                  <>
                    {/* Minitask (Sub-task) header */}
                    <div
                      style={{
                        padding: '24px',
                        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
                        background: 'rgba(0, 217, 255, 0.05)',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '20px',
                          fontFamily: 'Orbitron, sans-serif',
                          color: '#00d9ff',
                          margin: '0 0 8px 0',
                        }}
                      >
                        {selectedMinitask.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                          fontSize: 13,
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <span>{getMinitaskParentName(selectedMinitask)}</span>
                      </div>
                    </div>

                    {selectedMinitask.description && (
                      <div
                        style={{
                          padding: '16px 24px',
                          borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
                          background: 'rgba(0, 217, 255, 0.03)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            fontSize: 14,
                            color: 'rgba(255, 255, 255, 0.85)',
                            lineHeight: 1.5,
                          }}
                        >
                          <FileText
                            size={18}
                            style={{ color: 'rgba(0, 217, 255, 0.7)', flexShrink: 0, marginTop: 2 }}
                          />
                          <span>{selectedMinitask.description}</span>
                        </div>
                      </div>
                    )}

                    <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                      <h4
                        style={{
                          fontSize: 14,
                          color: 'rgba(0, 217, 255, 0.8)',
                          marginBottom: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        Subtasks
                      </h4>
                      {selectedMinitask.subtasks && selectedMinitask.subtasks.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedMinitask.subtasks.map((st) => {
                            const stWithLogs = st as {
                              id: string;
                              name: string;
                              status: string;
                              work_logs?: { hours_spent: number }[];
                            };
                            const hours =
                              stWithLogs.work_logs?.reduce((s, w) => s + (w.hours_spent || 0), 0) ?? 0;
                            return (
                              <button
                                key={st.id}
                                onClick={() => setSelectedSubtaskId(st.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  width: '100%',
                                  padding: '12px 16px',
                                  background: 'rgba(0, 217, 255, 0.05)',
                                  border: '1px solid rgba(0, 217, 255, 0.2)',
                                  borderRadius: 10,
                                  color: '#fff',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: 14,
                                }}
                              >
                                <SubtaskTypeIcon
                                  satelliteType={(st as { satellite_type?: string }).satellite_type}
                                  size={14}
                                />
                                <span style={{ flex: 1 }}>{st.name}</span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: 'rgba(255,255,255,0.5)',
                                  }}
                                >
                                  {getStatusLabel(st.status)} · {Math.round(hours * 10) / 10}h
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>
                          No subtasks yet.
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.3 }}>📋</div>
                <h3
                  style={{
                    fontSize: '24px',
                    fontFamily: 'Orbitron, sans-serif',
                    color: 'rgba(0, 217, 255, 0.5)',
                    marginBottom: '8px',
                  }}
                >
                  {activeTab === 'tasks' ? 'Select a task to view details' : 'Select a sub-task to view details'}
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.3)' }}>
                  {activeTab === 'tasks' ? 'Choose a task from the left panel' : 'Choose a sub-task from the left panel'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtask detail popup */}
      {selectedSubtaskId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedSubtaskId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 600,
              maxHeight: '90vh',
              background: 'rgba(21, 27, 46, 0.98)',
              borderRadius: 20,
              border: '1px solid rgba(0, 217, 255, 0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Subtask details</span>
              <button
                onClick={() => setSelectedSubtaskId(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto' }}>
              <SatelliteDetailPanel subtaskId={selectedSubtaskId} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
