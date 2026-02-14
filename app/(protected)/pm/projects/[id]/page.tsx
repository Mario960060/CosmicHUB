// REDESIGN: Project Detail Page - Cosmic Theme

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject, useModules, useProjectMembers } from '@/lib/pm/queries';
import { CreateModuleDialog } from './components/CreateModuleDialog';
import { CreateTaskDialog } from './components/CreateTaskDialog';
import { CreateSubtaskDialog } from './components/CreateSubtaskDialog';
import { AssignTeamModal } from './components/AssignTeamModal';
import { Calendar, Users, Rocket, Satellite, Plus, UserPlus } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: modules, isLoading: loadingModules } = useModules(projectId);
  const { data: projectMembers } = useProjectMembers(projectId);
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [selectedModuleForTask, setSelectedModuleForTask] = useState<string | null>(null);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<{ id: string; name: string } | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [showAssignProjectTeam, setShowAssignProjectTeam] = useState(false);
  const [selectedModuleForAssign, setSelectedModuleForAssign] = useState<{ id: string; name: string } | null>(null);

  if (loadingProject) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid rgba(0, 217, 255, 0.2)', 
            borderTop: '3px solid #00d9ff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          background: 'rgba(21, 27, 46, 0.6)', 
          backdropFilter: 'blur(20px)', 
          border: '1px solid rgba(0, 217, 255, 0.2)', 
          borderRadius: '16px', 
          padding: '48px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔍</div>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Top bar: Back left, Assign team right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button 
            onClick={() => router.push('/pm/projects')}
            onMouseEnter={() => setHoveredBackButton(true)}
            onMouseLeave={() => setHoveredBackButton(false)}
            style={{
              padding: '10px 20px',
              background: hoveredBackButton ? 'rgba(21, 27, 46, 0.8)' : 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: hoveredBackButton ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '8px',
              color: '#00d9ff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredBackButton ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
            }}
          >
            ← Back to Projects
          </button>
          <button
            onClick={() => setShowAssignProjectTeam(true)}
            onMouseEnter={() => setHoveredButton('assign-project')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: hoveredButton === 'assign-project' ? 'rgba(21, 27, 46, 0.8)' : 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: hoveredButton === 'assign-project' ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '8px',
              color: '#00d9ff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredButton === 'assign-project' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
            }}
          >
            <UserPlus size={18} />
            Assign team
          </button>
        </div>

        {/* Project Header */}
        <div style={{ 
          background: 'rgba(21, 27, 46, 0.6)', 
          backdropFilter: 'blur(20px)', 
          border: '1px solid rgba(0, 217, 255, 0.2)', 
          borderRadius: '16px', 
          padding: '32px', 
          marginBottom: '32px', 
          position: 'relative', 
          overflow: 'hidden' 
        }}>
          {/* Glow effect */}
          <div style={{ 
            position: 'absolute', 
            top: '-50%', 
            right: '-10%', 
            width: '400px', 
            height: '400px', 
            background: 'rgba(0, 217, 255, 0.1)', 
            borderRadius: '50%', 
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }} />
          
          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <h1 style={{ 
                fontSize: '40px', 
                fontFamily: 'Orbitron, sans-serif', 
                color: '#00d9ff', 
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0,
                flex: 1
              }}>
                {project.name}
              </h1>
              <span style={{
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                borderRadius: '12px',
                border: project.status === 'active' 
                  ? '1px solid rgba(16, 185, 129, 0.5)' 
                  : project.status === 'on_hold'
                  ? '1px solid rgba(168, 85, 247, 0.5)'
                  : '1px solid rgba(0, 217, 255, 0.5)',
                background: project.status === 'active' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : project.status === 'on_hold'
                  ? 'rgba(168, 85, 247, 0.1)'
                  : 'rgba(0, 217, 255, 0.1)',
                color: project.status === 'active' 
                  ? '#10b981' 
                  : project.status === 'on_hold'
                  ? '#a855f7'
                  : '#00d9ff',
                boxShadow: project.status === 'active' 
                  ? '0 0 15px rgba(16,185,129,0.3)' 
                  : project.status === 'on_hold'
                  ? '0 0 15px rgba(168,85,247,0.3)'
                  : '0 0 15px rgba(0,217,255,0.3)',
              }}>
                {project.status}
              </span>
            </div>
            
            {project.description && (
              <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px', lineHeight: '1.6' }}>
                {project.description}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'rgba(0, 217, 255, 0.7)' }} />
                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {projectMembers?.length || 0} team members
                </span>
              </div>
              
              {project.start_date && project.end_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} style={{ color: 'rgba(0, 217, 255, 0.7)' }} />
                  <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {new Date(project.start_date).toLocaleDateString()} → {project.end_date === 'Ongoing' ? 'Ongoing' : new Date(project.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {project.client && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👤</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Created by {project.client.full_name || 'Cosmic Admin'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontFamily: 'Orbitron, sans-serif', 
            color: '#00d9ff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: 0
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 217, 255, 0.3)',
            }}>
              <Satellite size={22} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 4px #00d9ff)' }} />
            </div>
            Modules
          </h2>
          <button
            onClick={() => setShowCreateModule(true)}
            onMouseEnter={() => setHoveredButton('create-module')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '12px 24px',
              background: hoveredButton === 'create-module' ? 'rgba(21, 27, 46, 0.8)' : 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: hoveredButton === 'create-module' ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '8px',
              color: '#00d9ff',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredButton === 'create-module' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
            }}
          >
            + Create Module
          </button>
        </div>

        {/* Modules Grid */}
        {loadingModules ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255, 255, 255, 0.5)' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '3px solid rgba(0, 217, 255, 0.2)', 
              borderTop: '3px solid #00d9ff', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            Loading modules...
          </div>
        ) : modules && modules.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            {modules.map((module) => (
              <div 
                key={module.id}
                style={{ 
                  background: 'rgba(21, 27, 46, 0.6)', 
                  backdropFilter: 'blur(20px)', 
                  border: '1px solid rgba(0, 217, 255, 0.2)', 
                  borderRadius: '16px', 
                  padding: '24px', 
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Colored glow matching module color */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-30%', 
                  right: '-20%', 
                  width: '200px', 
                  height: '200px', 
                  background: module.color || '#a855f7', 
                  borderRadius: '50%', 
                  filter: 'blur(50px)', 
                  opacity: 0.3,
                  pointerEvents: 'none'
                }} />
                
                {/* Header */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', minWidth: 0 }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: module.color || '#a855f7', 
                      boxShadow: `0 0 15px ${module.color || '#a855f7'}`,
                      flexShrink: 0,
                      marginTop: 4
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        fontSize: '20px', 
                        fontFamily: 'Orbitron, sans-serif', 
                        color: '#00d9ff',
                        fontWeight: '600',
                        margin: 0,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        lineHeight: 1.3
                      }}>
                        {module.name}
                      </h3>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '16px' }}>
                    <button
                      onClick={() => setSelectedModuleForAssign({ id: module.id, name: module.name })}
                      onMouseEnter={() => setHoveredButton(`assign-module-${module.id}`)}
                      onMouseLeave={() => setHoveredButton(null)}
                      style={{
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: hoveredButton === `assign-module-${module.id}` ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)',
                        border: hoveredButton === `assign-module-${module.id}` ? '1px solid rgba(0,217,255,0.5)' : '1px solid rgba(0,217,255,0.2)',
                        borderRadius: '6px',
                        color: 'rgba(0,217,255,0.9)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Assign team to module"
                    >
                      <UserPlus size={14} />
                      Assign team
                    </button>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                      {module.module_members?.length || 0} members
                    </span>
                  </div>

                  {module.description && (
                    <p style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      marginBottom: '16px',
                      lineHeight: '1.5'
                    }}>
                      {module.description}
                    </p>
                  )}

                  {/* Tasks */}
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {module.tasks && module.tasks.length > 0 ? (
                      module.tasks.map((task: any) => {
                        const isTaskHovered = hoveredTask === task.id;
                        return (
                          <div 
                            key={task.id}
                            onMouseEnter={() => setHoveredTask(task.id)}
                            onMouseLeave={() => setHoveredTask(null)}
                            style={{ 
                              padding: '12px', 
                              background: 'rgba(0,0,0,0.3)', 
                              borderRadius: '8px', 
                              border: isTaskHovered ? '1px solid rgba(0,217,255,0.5)' : '1px solid rgba(0,217,255,0.1)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div 
                              onClick={() => router.push(`/workstation?task=${task.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>{task.name}</span>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                                {[1, 2, 3].map(star => (
                                  <svg 
                                    key={star} 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 24 24" 
                                    fill={star <= (task.priority_stars || 1) ? '#fbbf24' : 'rgba(251,191,36,0.2)'}
                                    style={{ filter: star <= (task.priority_stars || 1) ? 'drop-shadow(0 0 3px #fbbf24)' : 'none' }}
                                  >
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                ))}
                              </div>
                              
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                {task.subtasks?.length || 0} subtasks
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskForSubtask({ id: task.id, name: task.name });
                              }}
                              onMouseEnter={() => setHoveredButton(`add-subtask-${task.id}`)}
                              onMouseLeave={() => setHoveredButton(null)}
                              style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '6px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: hoveredButton === `add-subtask-${task.id}` ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)',
                                border: hoveredButton === `add-subtask-${task.id}` ? '1px solid rgba(0,217,255,0.5)' : '1px dashed rgba(0,217,255,0.3)',
                                borderRadius: '6px',
                                color: 'rgba(0,217,255,0.8)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Plus size={14} />
                              Add Subtask
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontSize: '13px'
                      }}>
                        No tasks yet
                      </div>
                    )}
                  </div>

                  {/* Add Task Button */}
                  <button 
                    onClick={() => setSelectedModuleForTask(module.id)}
                    onMouseEnter={() => setHoveredButton(`add-task-${module.id}`)}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{ 
                      width: '100%', 
                      marginTop: '12px', 
                      padding: '10px', 
                      background: hoveredButton === `add-task-${module.id}` ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)', 
                      border: hoveredButton === `add-task-${module.id}` ? '1px solid rgba(0,217,255,0.5)' : '1px dashed rgba(0,217,255,0.3)', 
                      borderRadius: '8px', 
                      color: 'rgba(0,217,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    + Add Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '48px', 
            background: 'rgba(21, 27, 46, 0.4)', 
            backdropFilter: 'blur(20px)', 
            border: '1px solid rgba(0, 217, 255, 0.2)', 
            borderRadius: '16px' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛰️</div>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>No modules yet</p>
            <button
              onClick={() => setShowCreateModule(true)}
              style={{
                padding: '12px 24px',
                background: 'rgba(21, 27, 46, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '8px',
                color: '#00d9ff',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Create First Module
            </button>
          </div>
        )}
      </div>

      <CreateModuleDialog
        open={showCreateModule}
        onClose={() => setShowCreateModule(false)}
        projectId={projectId}
      />

      {selectedModuleForTask && (
        <CreateTaskDialog
          open={!!selectedModuleForTask}
          onClose={() => setSelectedModuleForTask(null)}
          moduleId={selectedModuleForTask}
        />
      )}

      {selectedTaskForSubtask && (
        <CreateSubtaskDialog
          open={!!selectedTaskForSubtask}
          onClose={() => setSelectedTaskForSubtask(null)}
          parentTaskId={selectedTaskForSubtask.id}
          parentTaskName={selectedTaskForSubtask.name}
        />
      )}

      <AssignTeamModal
        open={showAssignProjectTeam}
        onClose={() => setShowAssignProjectTeam(false)}
        mode="project"
        projectId={projectId}
        title="Project team"
      />

      {selectedModuleForAssign && (
        <AssignTeamModal
          open={!!selectedModuleForAssign}
          onClose={() => setSelectedModuleForAssign(null)}
          mode="module"
          moduleId={selectedModuleForAssign.id}
          moduleName={selectedModuleForAssign.name}
          projectId={projectId}
          title="Module team"
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
