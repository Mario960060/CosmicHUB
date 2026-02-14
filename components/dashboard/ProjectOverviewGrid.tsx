'use client';

import { useRouter } from 'next/navigation';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  end_date?: string | null;
  progressPercent?: number;
  doneCount?: number;
  totalCount?: number;
}

interface ProjectOverviewGridProps {
  projects: ProjectSummary[];
}

export function ProjectOverviewGrid({ projects }: ProjectOverviewGridProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 217, 255, 0.15)' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', margin: 0 }}>
          Moje Projekty
        </h2>
      </div>
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => router.push(`/pm/projects/${p.id}`)}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.5)';
              e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.2)';
              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
            }}
          >
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{p.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              {p.status} {p.end_date && `• Due ${new Date(p.end_date).toLocaleDateString()}`}
            </div>
            {(p.progressPercent != null || (p.doneCount != null && p.totalCount != null)) && (
              <div>
                <div
                  style={{
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${p.progressPercent ?? (p.totalCount && p.doneCount != null ? (p.doneCount / p.totalCount) * 100 : 0)}%`,
                      height: '100%',
                      background: '#00d9ff',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  {p.doneCount ?? 0}/{p.totalCount ?? 0} tasks
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {projects.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
          No projects. Create your first project.
        </div>
      )}
    </div>
  );
}
