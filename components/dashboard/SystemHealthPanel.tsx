'use client';

import { Users, FolderKanban, CheckSquare, Wifi, AlertTriangle } from 'lucide-react';
import type { SystemHealthStats } from '@/lib/dashboard/attention-queries';

interface SystemHealthPanelProps {
  stats: SystemHealthStats;
}

export function SystemHealthPanel({ stats }: SystemHealthPanelProps) {
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
          System Health
        </h2>
      </div>
      <div
        style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <Users size={24} style={{ color: '#00d9ff', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Users</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <FolderKanban size={24} style={{ color: '#00d9ff', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.totalProjects}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Projects</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <CheckSquare size={24} style={{ color: '#00d9ff', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.activeTasks}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Active Tasks</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <Wifi size={24} style={{ color: '#22c55e', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.onlineUsers}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Online</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <AlertTriangle size={24} style={{ color: stats.blockedRatio > 20 ? '#ef4444' : '#eab308', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.blockedRatio}%</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Blocked</div>
        </div>
      </div>
    </div>
  );
}
