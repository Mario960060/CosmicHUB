'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | null;
  trendLabel?: string;
}

export function StatsCard({
  value,
  label,
  icon: Icon,
  color = '#00d9ff',
  trend,
  trendLabel,
}: StatsCardProps) {
  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `rgba(${color === '#00d9ff' ? '0, 217, 255' : '255,255,255'}, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${color}40`,
          }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: trend === 'up' ? '#22c55e' : '#ef4444',
              fontSize: '12px',
            }}
          >
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendLabel}
          </div>
        )}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', fontFamily: 'Orbitron, sans-serif' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
    </div>
  );
}
