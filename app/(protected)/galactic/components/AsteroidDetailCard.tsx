'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useDependenciesForSubtasks } from '@/lib/pm/queries';
import { X, Layers, GitBranch, Plus, Telescope } from 'lucide-react';
import { AddProgressDialog } from './AddProgressDialog';
import { SubtaskTypeIcon } from '@/components/satellite/SubtaskTypeIcon';
import { CollapsibleSection } from './CollapsibleSection';
import {
  getStatusBadgeStyle,
  renderStars,
  formatDependencyType,
  getDependencyTypeColor,
} from './DetailCardShared';
import { calculateTaskProgress, calculateDaysRemaining, getDueDateStyle } from '@/lib/galactic/progress';

interface AsteroidDetailCardProps {
  minitaskId: string;
  onClose: () => void;
  onZoomIn?: () => void;
}

interface MinitaskWithSubtasks {
  id: string;
  task_id?: string | null;
  module_id?: string | null;
  name: string;
  description: string | null;
  estimated_hours: number | null;
  due_date: string | null;
  priority_stars: number;
  status: string;
  asteroid_type: string;
  progress_percent?: number | null;
  subtasks?: {
    id: string;
    name: string;
    status: string;
    satellite_type?: string | null;
  }[];
}

function useAsteroidDetails(minitaskId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['asteroid-details', minitaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('minitasks')
        .select(
          `
          *,
          subtasks (
            id,
            name,
            status,
            satellite_type
          )
        `
        )
        .eq('id', minitaskId!)
        .single();
      if (error) throw error;
      return data as MinitaskWithSubtasks;
    },
    enabled: !!minitaskId,
  });
}

export function AsteroidDetailCard({ minitaskId, onClose, onZoomIn }: AsteroidDetailCardProps) {
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [expandedHierarchy, setExpandedHierarchy] = useState(false);
  const [expandedDeps, setExpandedDeps] = useState(false);

  const { data, isLoading } = useAsteroidDetails(minitaskId);
  const subtasks = data?.subtasks ?? [];
  const allSubtaskIds = subtasks.map((s) => s.id);
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
        <div onClick={(e) => e.stopPropagation()} style={{ padding: 48, color: 'rgba(255,255,255,0.6)', fontSize: 16, fontFamily: 'Exo 2, sans-serif' }}>
          {isLoading ? 'Loading...' : 'Minitask not found'}
        </div>
      </div>
    );
  }

  const progress = calculateTaskProgress(subtasks, data.progress_percent);
  const daysRemaining = calculateDaysRemaining(data.due_date);
  const dueStyle = getDueDateStyle(daysRemaining);
  const statusStyle = getStatusBadgeStyle(data.status);
  const cardTheme = { border: 'rgba(139, 92, 46, 0.5)', header: '#a78b5a', accent: 'rgba(139, 92, 46, 0.2)', accentBorder: 'rgba(139, 92, 46, 0.5)' };

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
          maxWidth: 480,
          maxHeight: '85vh',
          background: 'rgba(21, 27, 46, 0.95)',
          backdropFilter: 'blur(30px)',
          border: `1px solid ${cardTheme.border}`,
          borderRadius: 20,
          boxShadow: `0 0 60px ${cardTheme.border.replace('0.5', '0.2')}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: '24px 28px',
            background: 'rgba(21, 27, 46, 0.98)',
            borderBottom: `1px solid ${cardTheme.border.replace('0.5', '0.2')}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ fontSize: 22, fontFamily: 'Orbitron, sans-serif', color: cardTheme.header, fontWeight: 'bold', margin: 0 }}>
              🪨 {data.name}
            </h2>
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
          {data.description && (
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5, fontFamily: 'Exo 2, sans-serif' }}>
              {data.description}
            </p>
          )}
        </div>

        <div className="scrollbar-cosmic" style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Exo 2, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'Exo 2, sans-serif', background: statusStyle.bg, color: statusStyle.color }}>
              {statusStyle.text}
            </span>
            {renderStars(data.priority_stars ?? 1, cardTheme.header)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Exo 2, sans-serif' }}>Due:</span>
            <span style={{ color: dueStyle.color, fontWeight: 600, fontFamily: 'Exo 2, sans-serif' }}>
              {data.due_date ? new Date(data.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </span>
            <span style={{ color: dueStyle.color, fontSize: 13, fontFamily: 'Exo 2, sans-serif' }}>({dueStyle.text})</span>
          </div>

          {data.estimated_hours != null && (
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Exo 2, sans-serif' }}>
              Estimated: {data.estimated_hours}h
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Exo 2, sans-serif' }}>Progress: {progress}%</span>
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
            summary={`${subtasks.length} subtasks`}
            icon={<Layers size={16} />}
            expanded={expandedHierarchy}
            onToggle={() => setExpandedHierarchy(!expandedHierarchy)}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Exo 2, sans-serif' }}>
              {subtasks.map((st) => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <SubtaskTypeIcon satelliteType={st.satellite_type} size={10} />
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
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Exo 2, sans-serif' }}>
              {dependencies && dependencies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dependencies.map((dep) => {
                    const from = dep.dependent_subtask?.name || '?';
                    const to = dep.depends_on_subtask?.name || '?';
                    const typ = dep.dependency_type || 'depends_on';
                    const color = getDependencyTypeColor(typ);
                    return (
                      <div key={dep.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ color, fontSize: 11, fontWeight: 600, fontFamily: 'Exo 2, sans-serif' }}>{formatDependencyType(typ)}</span>
                        {dep.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontFamily: 'Exo 2, sans-serif' }}>{dep.note}</div>}
                        <div style={{ marginTop: 2, fontFamily: 'Exo 2, sans-serif' }}>{from} → {to}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Exo 2, sans-serif' }}>No dependencies.</div>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Sticky footer: Zoom In, Add progress — w jednej linii */}
        <div
          style={{
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            padding: '16px 28px',
            background: 'rgba(21, 27, 46, 0.98)',
            borderTop: `1px solid ${cardTheme.border.replace('0.5', '0.2')}`,
            display: 'flex',
            gap: 12,
            flexWrap: 'nowrap',
            alignItems: 'center',
            overflowX: 'auto',
          }}
        >
          {onZoomIn && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); onZoomIn(); }}
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
                fontFamily: 'Exo 2, sans-serif',
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
              fontFamily: 'Exo 2, sans-serif',
            }}
          >
            <Plus size={18} />
            Add progress
          </button>
        </div>
      </div>

      <AddProgressDialog
        open={showAddProgress}
        entityType="minitask"
        entityId={minitaskId}
        entityName={data.name}
        onClose={() => setShowAddProgress(false)}
        onSuccess={() => setShowAddProgress(false)}
      />
    </div>
  );
}
