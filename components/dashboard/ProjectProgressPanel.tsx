'use client';

import { useRouter } from 'next/navigation';

interface ProjectProgress {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  progressPercent: number;
  modules?: { name: string; progress: number }[];
}

interface ProjectProgressPanelProps {
  projects: ProjectProgress[];
}

export function ProjectProgressPanel({ projects }: ProjectProgressPanelProps) {
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
      <div style={{ padding: '16px' }}>
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => router.push(`/galactic`)}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'rgba(0,0,0,0.2)',
              marginBottom: '12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, color: '#fff' }}>{p.name}</span>
              <span style={{ fontSize: '14px', color: '#00d9ff', fontWeight: 600 }}>{p.progressPercent}%</span>
            </div>
            <div
              style={{
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: `${p.progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00d9ff, #00ff88)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            {p.modules?.map((m) => (
              <div key={m.name} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                {m.name}: {m.progress}%
              </div>
            ))}
            {(p.start_date || p.end_date) && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                {p.start_date && new Date(p.start_date).toLocaleDateString()}
                {p.start_date && p.end_date && ' → '}
                {p.end_date && new Date(p.end_date).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
