'use client';

import { useState, useRef, useEffect } from 'react';
import { SATELLITE_TYPES } from './satellite-types';
import { SatelliteIcon, satelliteTypeToSpacecraft } from './SatelliteIcon';
import { formatDate, getStatusLabel } from '@/lib/utils';
import { ActivityLogPopover } from './ActivityLogPopover';
import type { ActivityEntry } from '@/lib/satellite/save-satellite-data';
import { User, Calendar, Link as LinkIcon, ChevronDown } from 'lucide-react';
import type { SatelliteType } from './satellite-types';

interface ProjectMember {
  user_id: string;
  user?: { id: string; full_name: string; avatar_url?: string | null };
}

interface SatelliteHeaderProps {
  name: string;
  satelliteType: string;
  status: string;
  assignedUser?: { id: string; full_name: string; avatar_url?: string | null } | null;
  assignedToId?: string | null;
  projectMembers?: ProjectMember[];
  estimatedHours?: number | null;
  dueDate?: string | null;
  dependencyCount?: number;
  activity?: ActivityEntry[];
  onNameChange?: (name: string) => void;
  onStatusChange?: (status: string) => void;
  onAssignedChange?: (userId: string | null) => void;
  onDueChange?: () => void;
  onDependenciesClick?: () => void;
  workLogsTotalHours?: number;
  hideHeaderAssign?: boolean;
}

export function SatelliteHeader({
  name,
  satelliteType,
  status,
  assignedUser,
  assignedToId,
  projectMembers = [],
  estimatedHours,
  dueDate,
  dependencyCount = 0,
  activity = [],
  onNameChange,
  onStatusChange,
  onAssignedChange,
  onDependenciesClick,
  workLogsTotalHours = 0,
  hideHeaderAssign = false,
}: SatelliteHeaderProps) {
  const typeInfo = SATELLITE_TYPES.find((s) => s.type === satelliteType) ?? SATELLITE_TYPES[0];
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    };
    if (assignOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assignOpen]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <ActivityLogPopover activity={activity} />
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SatelliteIcon type={satelliteTypeToSpacecraft(satelliteType)} size="sm" />
            {typeInfo.name}
          </span>
        </div>
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
        {!hideHeaderAssign && onAssignedChange && projectMembers.length > 0 ? (
          <div ref={assignRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setAssignOpen(!assignOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '6px',
                color: assignedUser?.full_name ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              <User size={12} />
              {assignedUser?.full_name || 'Unassigned'}
              <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>
            {assignOpen && (
              <div
                className="scrollbar-cosmic"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  minWidth: 160,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: '#0d1117',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '8px',
                  zIndex: 9999,
                  padding: '4px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                }}
              >
                <button
                  type="button"
                  onClick={() => { onAssignedChange(null); setAssignOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: !assignedToId ? 'rgba(0, 217, 255, 0.25)' : '#161b22',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Unassigned
                </button>
                {projectMembers.map((pm) => {
                  const u = pm.user ?? { id: pm.user_id, full_name: 'Unknown', avatar_url: null };
                  const isSelected = assignedToId === u.id;
                  return (
                    <button
                      key={pm.user_id}
                      type="button"
                      onClick={() => { onAssignedChange(u.id); setAssignOpen(false); }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: isSelected ? 'rgba(0, 217, 255, 0.25)' : '#161b22',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {u.full_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={12} />
            {assignedUser?.full_name || 'Unassigned'}
          </span>
        )}
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
