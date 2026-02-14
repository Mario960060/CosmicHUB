// REDESIGN: Tooltip - Cosmic Glassmorphism Inline Styles

'use client';

import type { CanvasObject } from '@/lib/galactic/types';

interface TooltipProps {
  x: number;
  y: number;
  object: CanvasObject;
}

export function Tooltip({ x, y, object }: TooltipProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: x + 15,
        top: y + 15,
        pointerEvents: 'none',
        zIndex: 10000,
        background: 'rgba(21, 27, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.2)',
      }}
    >
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#00d9ff',
        marginBottom: '4px',
      }}>
        {object.name}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'rgba(0, 217, 255, 0.6)',
        marginBottom: '8px',
        textTransform: 'capitalize',
      }}>
        {object.type}
      </div>
      {object.status && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '4px',
        }}>
          Status: <span style={{ textTransform: 'capitalize' }}>{object.status}</span>
        </div>
      )}
      {object.progress !== undefined && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '4px',
        }}>
          Progress: {object.progress.toFixed(0)}%
        </div>
      )}
      {object.metadata?.priorityStars && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
        }}>
          Priority: {'⭐'.repeat(Math.floor(object.metadata.priorityStars))}
        </div>
      )}
      {object.metadata?.taskCount !== undefined && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
        }}>
          Tasks: {object.metadata.taskCount}
        </div>
      )}
    </div>
  );
}
