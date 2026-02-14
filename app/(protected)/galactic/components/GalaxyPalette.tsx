// CURSOR: Side palette for galaxy editor
// Drag elements onto canvas to create modules (Solar System) or tasks (Module Zoom)

'use client';

import { SatelliteIcon } from '@/components/satellite/SatelliteIcon';

const PLANET_ITEMS = [
  { type: 'ocean' as const, name: 'Ocean', icon: '🌊', color: '#14b8a6' },
  { type: 'indigo' as const, name: 'Indigo', icon: '🔮', color: '#818cf8' },
  { type: 'rose' as const, name: 'Rose', icon: '🌹', color: '#fb7185' },
  { type: 'amber' as const, name: 'Amber', icon: '🟡', color: '#fbbf24' },
];

const SATELLITE_ITEMS = [
  { type: 'sphere-drone' as const, name: 'Questions', icon: '🔮' },
  { type: 'hex-drone' as const, name: 'Issues', icon: '⚠️' },
  { type: 'voyager-probe' as const, name: 'Notes', icon: '📡' },
  { type: 'space-station' as const, name: 'Documents', icon: '🏗️' },
  { type: 'pulse-beacon' as const, name: 'Checklist', icon: '✅' },
  { type: 'astro-gauge' as const, name: 'Metrics', icon: '📊' },
  { type: 'nebula-spark' as const, name: 'Ideas', icon: '💡' },
  { type: 'core-module' as const, name: 'Repo/Dev', icon: '🔧' },
];

const MOON_ITEMS = [
  { type: 'rocky-moon' as const, name: 'Rocky', icon: '🌑' },
  { type: 'europa-moon' as const, name: 'Europa', icon: '🌕' },
  { type: 'dusty-moon' as const, name: 'Dusty', icon: '🌖' },
];

export type PaletteItem =
  | { entityType: 'module'; planetType: 'ocean' | 'indigo' | 'rose' | 'amber' }
  | { entityType: 'task'; spacecraftType: string }
  | { entityType: 'subtask'; spacecraftType: string };

interface GalaxyPaletteProps {
  viewType: 'solar-system' | 'module-zoom';
  onDragStart?: (item: PaletteItem) => void;
}

export function GalaxyPalette({ viewType, onDragStart }: GalaxyPaletteProps) {
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setDragImage(e.currentTarget, 40, 40);
    onDragStart?.(item);
  };

  if (viewType === 'solar-system') {
    return (
      <div
        style={{
          width: 220,
          flexShrink: 0,
          background: 'rgba(21, 27, 46, 0.95)',
          borderRight: '1px solid rgba(0, 240, 255, 0.2)',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        <h3
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: '#00f0ff',
            letterSpacing: '1px',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}
        >
          🪐 Planets
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLANET_ITEMS.map((p) => (
            <div
              key={p.type}
              draggable
              onDragStart={(e) => handleDragStart(e, { entityType: 'module', planetType: p.type })}
              style={{
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: p.color,
                  opacity: 0.9,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: 'rgba(21, 27, 46, 0.95)',
        borderRight: '1px solid rgba(0, 240, 255, 0.2)',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: '#00f0ff',
          letterSpacing: '1px',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}
      >
        🛸 Satellites (subtasks)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {SATELLITE_ITEMS.map((s) => (
          <div
            key={s.type}
            draggable
            onDragStart={(e) =>
              handleDragStart(e, { entityType: 'subtask', spacecraftType: s.type })
            }
            style={{
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <SatelliteIcon type={s.type} size="sm" />
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{s.name}</span>
          </div>
        ))}
      </div>
      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: '#00f0ff',
          letterSpacing: '1px',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}
      >
        🌙 Moons (tasks)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MOON_ITEMS.map((m) => (
          <div
            key={m.type}
            draggable
            onDragStart={(e) =>
              handleDragStart(e, { entityType: 'task', spacecraftType: m.type })
            }
            style={{
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{m.icon}</span>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
