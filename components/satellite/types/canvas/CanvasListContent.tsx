'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Trash2, ChevronDown } from 'lucide-react';
import type { CanvasItem } from './canvas-types';
import { createEmptyCanvas } from './canvas-types';

interface AssignablePerson {
  user_id: string;
  user?: { id: string; full_name: string; avatar_url?: string | null };
}

interface CanvasListContentProps {
  canvases: CanvasItem[];
  assignablePeople?: AssignablePerson[];
  onCanvasesChange: (canvases: CanvasItem[]) => void;
  onOpenCanvas: (canvas: CanvasItem) => void;
  onDeleteCanvas?: (canvas: CanvasItem) => void;
  canDeleteCanvas?: (canvas: CanvasItem) => boolean;
  createCanvas?: (name: string, description?: string, assigned_to?: string | null) => CanvasItem;
}

export function CanvasListContent({
  canvases,
  assignablePeople = [],
  onCanvasesChange,
  onOpenCanvas,
  onDeleteCanvas,
  canDeleteCanvas,
  createCanvas: createCanvasFn,
}: CanvasListContentProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignOpen(false);
    };
    if (assignOpen) document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [assignOpen]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const canvas = createCanvasFn
      ? createCanvasFn(name, newDesc.trim() || undefined, newAssigned)
      : createEmptyCanvas(name, newDesc.trim() || undefined, newAssigned);
    onCanvasesChange([canvas, ...canvases]);
    setNewName('');
    setNewDesc('');
    setNewAssigned(null);
    setShowAddForm(false);
  };

  const getAssignedName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const m = assignablePeople.find((p) => p.user_id === userId || p.user?.id === userId);
    return m?.user?.full_name ?? null;
  };

  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          Canvases ({canvases.length})
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            borderRadius: 6,
            border: '1px solid rgba(249,115,22,0.25)',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))',
            color: '#f97316',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f97316';
            e.currentTarget.style.background = 'rgba(249,115,22,0.15)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          + New Canvas
        </button>
      </div>

      {showAddForm && (
        <div
          style={{
            padding: '14px 16px',
            background: 'rgba(249,115,22,0.04)',
            border: '1px dashed rgba(249,115,22,0.2)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Canvas name..."
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.88)',
              fontFamily: 'Exo 2, sans-serif',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)..."
              style={{
                flex: 1,
                minWidth: 120,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(249,115,22,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.88)',
                fontFamily: 'Exo 2, sans-serif',
                fontSize: 12,
                outline: 'none',
                resize: 'none',
                height: 36,
              }}
            />
            <div ref={assignRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAssignOpen(!assignOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(249,115,22,0.3)',
                  borderRadius: 6,
                  color: newAssigned ? '#f97316' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'Exo 2, sans-serif',
                  fontSize: 12,
                  minWidth: 140,
                  cursor: 'pointer',
                }}
              >
                <User size={12} />
                {newAssigned ? (assignablePeople.find((p) => p.user_id === newAssigned)?.user?.full_name ?? 'Assigned') : 'Unassigned'}
                <ChevronDown size={12} style={{ opacity: 0.7, marginLeft: 'auto' }} />
              </button>
              {assignOpen && (
                <div
                  className="scrollbar-cosmic"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    minWidth: 160,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: '#0d1117',
                    border: '1px solid rgba(249,115,22,0.3)',
                    borderRadius: 8,
                    zIndex: 9999,
                    padding: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setNewAssigned(null); setAssignOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      background: !newAssigned ? 'rgba(249,115,22,0.25)' : '#161b22',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Unassigned
                  </button>
                  {assignablePeople.map((m) => {
                    const isSelected = newAssigned === m.user_id;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => { setNewAssigned(m.user_id); setAssignOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          textAlign: 'left',
                          background: isSelected ? 'rgba(249,115,22,0.25)' : '#161b22',
                          border: 'none',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {m.user?.full_name ?? m.user_id}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              style={{
                padding: '8px 16px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid #f97316',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.08))',
                color: '#f97316',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewDesc('');
                setNewAssigned(null);
              }}
              style={{
                padding: '8px 12px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid rgba(0,217,255,0.15)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {canvases.map((canvas) => (
        <div
          key={canvas.id}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.canvas-card-delete')) return;
            onOpenCanvas(canvas);
          }}
          onKeyDown={(e) => e.key === 'Enter' && onOpenCanvas(canvas)}
          style={{
            padding: '14px 16px',
            background: 'rgba(249,115,22,0.03)',
            border: '1px solid rgba(249,115,22,0.12)',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.5)';
            e.currentTarget.style.background = 'rgba(249,115,22,0.06)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(249,115,22,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.12)';
            e.currentTarget.style.background = 'rgba(249,115,22,0.03)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 8,
              background: 'rgba(249,115,22,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                background: `linear-gradient(0deg, rgba(249,115,22,0.2) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(249,115,22,0.2) 1px, transparent 1px)`,
                backgroundSize: '4px 4px',
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 5,
                left: 5,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 4px rgba(249,115,22,0.4)',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: 3,
              }}
            >
              {canvas.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {canvas.description || 'No description'}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 4,
              flexShrink: 0,
            }}
          >
            {canvas.assigned_to && (
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <User size={10} />
                {getAssignedName(canvas.assigned_to) ?? 'Assigned'}
              </div>
            )}
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: '#f97316',
                letterSpacing: 0.5,
              }}
            >
              {canvas.blocks.length} blocks
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              Open →
            </div>
            {onDeleteCanvas && (!canDeleteCanvas || canDeleteCanvas(canvas)) && (
              <button
                type="button"
                className="canvas-card-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCanvas(canvas);
                }}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  border: 'none',
                  background: 'rgba(239,68,68,0.15)',
                  color: 'rgba(239,68,68,0.9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Delete canvas"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      ))}

      {canvases.length === 0 && !showAddForm && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
          }}
        >
          No canvases yet. Click &quot;+ New Canvas&quot; to create one.
        </div>
      )}
    </div>
  );
}
