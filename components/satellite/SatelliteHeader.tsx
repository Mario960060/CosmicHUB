'use client';

import { SATELLITE_TYPES } from './satellite-types';
import { SatelliteIcon, satelliteTypeToSpacecraft } from './SatelliteIcon';
import { formatDate, getStatusLabel } from '@/lib/utils';
import { User, Clock, Calendar, Link as LinkIcon } from 'lucide-react';
import type { SatelliteType } from './satellite-types';

interface SatelliteHeaderProps {
  name: string;
  satelliteType: string;
  status: string;
  assignedUser?: { full_name: string; avatar_url?: string | null } | null;
  estimatedHours?: number | null;
  dueDate?: string | null;
  dependencyCount?: number;
  onNameChange?: (name: string) => void;
  onStatusChange?: (status: string) => void;
  onAssignedChange?: () => void;
  onDueChange?: () => void;
  onDependenciesClick?: () => void;
  workLogsTotalHours?: number;
}

export function SatelliteHeader({
  name,
  satelliteType,
  status,
  assignedUser,
  estimatedHours,
  dueDate,
  dependencyCount = 0,
  onNameChange,
  onStatusChange,
  onDependenciesClick,
  workLogsTotalHours = 0,
}: SatelliteHeaderProps) {
  const typeInfo = SATELLITE_TYPES.find((s) => s.type === satelliteType) ?? SATELLITE_TYPES[0];
  const timeDisplay = `${workLogsTotalHours.toFixed(1)}h / ${estimatedHours ?? 0}h`;

  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'rgba(0, 217, 255, 0.05)',
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
        maxHeight: 100,
      }}
    >
      {/* Row 1: Name + Type badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <span
          contentEditable={!!onNameChange}
          suppressContentEditableWarning
          onBlur={(e) => onNameChange?.(e.currentTarget.textContent || '')}
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            color: '#00d9ff',
            flex: 1,
            outline: 'none',
            minWidth: 0,
          }}
        >
          {name}
        </span>
        <span
          style={{
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: `${typeInfo.color}22`,
            border: `1px solid ${typeInfo.color}66`,
            borderRadius: '8px',
            color: typeInfo.color,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <SatelliteIcon type={satelliteTypeToSpacecraft(satelliteType)} size="sm" />
          {typeInfo.name}
        </span>
      </div>

      {/* Row 2: Status, Assigned, Time, Priority, Due, Dependencies */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 20px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          alignItems: 'center',
        }}
      >
        {onStatusChange && (
          <button
            type="button"
            onClick={() => onStatusChange(status)}
            style={{
              padding: '2px 8px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '6px',
              color: '#00d9ff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ● {getStatusLabel(status)}
          </button>
        )}
        {!onStatusChange && (
          <span>● {getStatusLabel(status)}</span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <User size={12} />
          {assignedUser?.full_name || 'Unassigned'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {timeDisplay}
        </span>
        {dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} />
            {formatDate(dueDate)}
          </span>
        )}
        {dependencyCount > 0 && (
          <button
            type="button"
            onClick={onDependenciesClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              color: '#f59e0b',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <LinkIcon size={12} />
            Depends ({dependencyCount})
          </button>
        )}
      </div>

      {/* Glow divider */}
      <div
        style={{
          marginTop: '12px',
          height: 1,
          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.5), transparent)',
          borderRadius: 1,
        }}
      />
    </div>
  );
}
