// CURSOR: Right-click context menu for galaxy editor

'use client';

import { useEffect } from 'react';
import type { CanvasObject } from '@/lib/galactic/types';

export type ContextMenuAction =
  | 'edit-project'
  | 'edit-module'
  | 'edit-task'
  | 'edit-subtask'
  | 'delete-module'
  | 'delete-task'
  | 'delete-subtask'
  | 'manage-dependencies';

interface GalaxyContextMenuProps {
  x: number;
  y: number;
  object: CanvasObject;
  viewType: 'solar-system' | 'module-zoom';
  objects?: CanvasObject[];
  isEditMode?: boolean;
  onAction: (action: ContextMenuAction, object: CanvasObject) => void;
  onClose: () => void;
  onRequestDeleteConfirm?: (object: CanvasObject, action: 'delete-module' | 'delete-task' | 'delete-subtask') => void;
}

export function GalaxyContextMenu({
  x,
  y,
  object,
  viewType,
  objects = [],
  isEditMode = false,
  onAction,
  onClose,
  onRequestDeleteConfirm,
}: GalaxyContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleDelete = (action: 'delete-module' | 'delete-task' | 'delete-subtask') => {
    if (onRequestDeleteConfirm) {
      onRequestDeleteConfirm(object, action);
    } else {
      onAction(action, object);
    }
    onClose();
  };

  const item = (
    label: string,
    action: ContextMenuAction,
    icon?: string,
    targetObject?: CanvasObject
  ) => (
    <button
      key={`${action}-${targetObject?.id ?? object.id}`}
      type="button"
      onClick={() => {
        onAction(action, targetObject ?? object);
        onClose();
      }}
      style={{
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.9)',
        fontSize: '13px',
        fontFamily: 'Exo 2, sans-serif',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );

  const deleteItem = (label: string, action: 'delete-module' | 'delete-task' | 'delete-subtask') => (
    <button
      key={action}
      type="button"
      onClick={() => handleDelete(action)}
      style={{
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        fontSize: '13px',
        fontFamily: 'Exo 2, sans-serif',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>🗑</span>
      {label}
    </button>
  );

  let items: React.ReactNode[] = [];

  switch (object.type) {
    case 'project':
      items = [item('Edit project', 'edit-project', '✏️')];
      break;
    case 'module':
      items = [item('Edit', 'edit-module', '✏️')];
      if (isEditMode) items.push(deleteItem('Delete', 'delete-module'));
      if (viewType === 'module-zoom') items.push(item('Manage Dependencies', 'manage-dependencies', '🔗'));
      break;
    case 'task':
      items = [item('Edit', 'edit-task', '✏️')];
      if (isEditMode) items.push(deleteItem('Delete', 'delete-task'));
      items.push(item('Manage Dependencies', 'manage-dependencies', '🔗'));
      break;
    case 'subtask':
      items = [item('Edit', 'edit-subtask', '✏️')];
      if (isEditMode) items.push(deleteItem('Delete', 'delete-subtask'));
      items.push(item('Manage Dependencies', 'manage-dependencies', '🔗'));
      break;
    case 'portal':
      items = [];
      break;
    default:
      break;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        minWidth: 180,
        background: 'rgba(21, 27, 46, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.15)',
        overflow: 'hidden',
        padding: '6px 0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {object.name}
      </div>
      {items}
    </div>
  );
}
