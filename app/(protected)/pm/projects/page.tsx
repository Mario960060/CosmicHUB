// REDESIGN: Projects List Page - Cosmic Theme

'use client';

import { useProjects } from '@/lib/pm/queries';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Users, Rocket, Calendar, FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState(false);

  if (isLoading) {
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
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
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
                <FolderKanban size={28} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
              </div>
              <h1 style={{ 
                fontSize: '48px', 
                fontFamily: 'Orbitron, sans-serif', 
                color: '#00d9ff', 
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0
              }}>
                Projects
              </h1>
            </div>
          </div>
          <button
            onClick={() => router.push('/pm/projects/new')}
            onMouseEnter={() => setHoveredButton(true)}
            onMouseLeave={() => setHoveredButton(false)}
            style={{
              padding: '12px 24px',
              background: hoveredButton ? 'rgba(21, 27, 46, 0.8)' : 'rgba(21, 27, 46, 0.6)',
              backdropFilter: 'blur(20px)',
              border: hoveredButton ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '8px',
              color: '#00d9ff',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: hoveredButton ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
            }}
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {projects && projects.length === 0 ? (
          <div style={{ 
            maxWidth: '600px', 
            margin: '80px auto', 
            textAlign: 'center', 
            padding: '48px', 
            background: 'rgba(21, 27, 46, 0.4)', 
            backdropFilter: 'blur(20px)', 
            border: '1px solid rgba(0, 217, 255, 0.2)', 
            borderRadius: '16px' 
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚀</div>
            <h3 style={{ fontSize: '24px', color: '#00d9ff', marginBottom: '12px', fontFamily: 'Orbitron, sans-serif' }}>No Projects Yet</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px' }}>Start your cosmic journey by creating your first project</p>
            <button
              onClick={() => router.push('/pm/projects/new')}
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
              Create First Project
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
            gap: '24px' 
          }}>
            {projects?.map((project) => {
              const modulesCount = project.modules?.length || 0;
              const isHovered = hoveredCard === project.id;
              
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/pm/projects/${project.id}`)}
                  onMouseEnter={() => setHoveredCard(project.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    position: 'relative',
                    background: 'rgba(21, 27, 46, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: isHovered ? '1px solid rgba(0, 217, 255, 0.5)' : '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 0 40px rgba(0, 217, 255, 0.3)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Glow orb */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-20%',
                    width: '200px',
                    height: '200px',
                    background: project.status === 'active' 
                      ? 'rgba(16, 185, 129, 0.15)' 
                      : project.status === 'on_hold' 
                      ? 'rgba(168, 85, 247, 0.15)' 
                      : 'rgba(0, 217, 255, 0.15)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    pointerEvents: 'none',
                  }} />

                  {/* Content */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <h3 style={{ 
                        fontSize: '24px', 
                        fontFamily: 'Orbitron, sans-serif', 
                        color: '#00d9ff',
                        fontWeight: '600',
                        margin: 0,
                        flex: 1,
                        marginRight: '12px'
                      }}>
                        {project.name}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        fontSize: '11px',
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
                        whiteSpace: 'nowrap',
                      }}>
                        {project.status}
                      </span>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '20px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.5',
                      }}>
                        {project.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      marginBottom: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(0, 217, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} style={{ color: 'rgba(0, 217, 255, 0.7)' }} />
                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {project.members?.length || 5} members
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Rocket size={16} style={{ color: 'rgba(0, 217, 255, 0.7)' }} />
                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {modulesCount} modules
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    {project.start_date && project.end_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'rgba(0, 217, 255, 0.5)' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          {new Date(project.start_date).toLocaleDateString()} → {project.end_date === 'Ongoing' ? 'Ongoing' : new Date(project.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
