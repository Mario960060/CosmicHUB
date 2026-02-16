'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { CosmicDropdown } from '../CosmicDropdown';

interface Idea {
  id: string;
  name: string;
  description?: string;
  rating: number; // 0.5–3, stars (replaces legacy priority)
  tags: string[];
  status: 'parked' | 'exploring' | 'promoted' | 'discarded';
  assigned_to?: string | null;
  promoted_to?: string | null;
  promote_count?: number;
  promoted_by?: string[];
  created_by?: string;
  created_at?: string;
}

interface ProjectMember {
  user_id: string;
  user?: { id: string; full_name: string };
}

interface IdeasContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  moduleId?: string;
  projectId?: string;
  subtaskName?: string;
  projectMembers?: ProjectMember[];
}

function priorityToRating(p: string): number {
  if (p === 'high') return 3;
  if (p === 'low') return 1;
  return 2;
}

function getIdeas(data: Record<string, unknown>): Idea[] {
  const raw = data.ideas;
  if (!Array.isArray(raw)) return [];
  return raw.map((i: any) => {
    const hasRating = typeof i.rating === 'number' && i.rating >= 0.5 && i.rating <= 3;
    return {
      id: i.id || crypto.randomUUID(),
      name: i.name ?? i.text ?? '',
      description: i.description ?? '',
      rating: hasRating ? i.rating : priorityToRating(i.priority || 'medium'),
      tags: Array.isArray(i.tags) ? i.tags : [],
      status: i.status || 'parked',
      assigned_to: i.assigned_to,
      promoted_to: i.promoted_to,
      promote_count: i.promote_count ?? 0,
      promoted_by: Array.isArray(i.promoted_by) ? i.promoted_by : [],
      created_by: i.created_by,
      created_at: i.created_at || new Date().toISOString(),
    };
  });
}

export function IdeasContent({
  subtaskId,
  satelliteData,
  moduleId,
  projectId,
  subtaskName = '',
  projectMembers = [],
}: IdeasContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const [ideas, setIdeas] = useState<Idea[]>(() => getIdeas(satelliteData));
  const [filter, setFilter] = useState<'all' | 'parked' | 'exploring' | 'promoted' | 'discarded'>(
    'all'
  );
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRating, setNewRating] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [descriptionPopupId, setDescriptionPopupId] = useState<string | null>(null);

  useEffect(() => {
    setIdeas(getIdeas(satelliteData));
  }, [subtaskId, satelliteData]);

  // Close 3-dot menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const el = e.target as Element;
      if (el?.closest?.('[data-ideas-menu-trigger]') || el?.closest?.('[data-ideas-menu]')) return;
      setMenuOpen(null);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [menuOpen]);

  const save = async (
    nextIdeas: Idea[],
    activityEntry?: { user_id: string; action: string; detail: string; actor_name?: string }
  ) => {
    setSaving(true);
    const { error } = await saveSatelliteData(subtaskId, { ideas: nextIdeas }, {
      activityEntry,
      onSuccess: () => invalidate(subtaskId),
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    setIdeas(nextIdeas);
  };

  const addIdea = () => {
    if (!newName.trim() || !user) return;
    const idea: Idea = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      rating: newRating,
      tags: [],
      status: 'parked',
      promote_count: 0,
      promoted_by: [],
      created_by: user.id,
      created_at: new Date().toISOString(),
    };
    const next = [idea, ...ideas];
    save(next, { user_id: user.id, action: 'added_idea', detail: idea.name, actor_name: user.full_name });
    setNewName('');
    setNewDescription('');
  };

  const setIdeaRating = (id: string, rating: number) => {
    const idea = ideas.find((i) => i.id === id);
    const next = ideas.map((i) => (i.id === id ? { ...i, rating } : i));
    save(next, { user_id: user!.id, action: 'updated_idea_rating', detail: `${idea?.name ?? ''} → ${rating}★`, actor_name: user!.full_name });
  };

  const setIdeaStatus = (id: string, status: Idea['status']) => {
    const idea = ideas.find((i) => i.id === id);
    const next = ideas.map((i) =>
      i.id === id ? { ...i, status } : i
    );
    save(next, { user_id: user!.id, action: 'status_change_idea', detail: `${idea?.name ?? ''} → ${status}`, actor_name: user!.full_name });
  };

  const removeIdea = (id: string) => {
    const idea = ideas.find((i) => i.id === id);
    const next = ideas.filter((i) => i.id !== id);
    save(next, { user_id: user!.id, action: 'removed_idea', detail: idea?.name ?? '', actor_name: user!.full_name });
    setMenuOpen(null);
    setDescriptionPopupId(null);
  };

  const assignIdea = async (id: string, userId: string | null) => {
    const idea = ideas.find((i) => i.id === id);
    const next = ideas.map((i) =>
      i.id === id ? { ...i, assigned_to: userId } : i
    );
    await save(next, { user_id: user!.id, action: 'assigned_idea', detail: idea?.name ?? '', actor_name: user!.full_name });
    if (userId && idea) {
      const supabase = createClient();
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'idea_assigned',
        p_title: 'Idea assigned',
        p_message: `You were assigned to an idea: "${idea.name}"`,
        p_related_id: subtaskId,
        p_related_type: 'subtask',
        p_actor_id: user!.id,
      });
    }
  };

  const filtered = ideas
    .filter((i) => filter === 'all' || i.status === filter)
    .sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });

  const renderRatingStars = (rating: number, onClick?: (r: number) => void) => {
    const r = Math.min(3, Math.max(0.5, rating));
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    const stars = [];
    for (let i = 0; i < full; i++) stars.push('★');
    if (half) stars.push('½');
    const display = stars.join('') || '☆';
    if (onClick) {
      return (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          {[1, 2, 3].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onClick(v)}
              style={{
                padding: 2,
                background: 'none',
                border: 'none',
                color: r >= v ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ★
            </button>
          ))}
        </div>
      );
    }
    return (
      <span style={{ color: '#fbbf24', fontSize: 12 }}>
        {display}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '10px',
        }}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Idea name..."
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            <span>Rating:</span>
            <input
              type="number"
              value={newRating}
              onChange={(e) => setNewRating(Math.min(3, Math.max(0.5, parseFloat(e.target.value) || 1)))}
              min={0.5}
              max={3}
              step={0.5}
              style={{
                width: 56,
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>★</span>
          </div>
          <button
            type="button"
            onClick={addIdea}
            disabled={saving || !newName.trim()}
            style={{
              padding: '10px 14px',
              background: 'rgba(168, 85, 247, 0.3)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '8px',
              color: '#a855f7',
              cursor: saving || !newName.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
            }}
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(['all', 'parked', 'exploring', 'promoted', 'discarded'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              background: filter === f ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${filter === f ? '#a855f7' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '6px',
              color: filter === f ? '#a855f7' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((idea) => {
          const showDescriptionPopup = descriptionPopupId === idea.id;
          return (
            <div
              key={idea.id}
              onClick={() => setDescriptionPopupId(idea.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuOpen(menuOpen === idea.id ? null : idea.id);
              }}
              style={{
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.15)',
                borderRadius: '10px',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#fff', lineHeight: 1.4 }}>
                    {idea.name}
                  </p>
                  {idea.description && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {idea.description}
                    </p>
                  )}
                  {idea.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {idea.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            borderRadius: '4px',
                            color: '#a855f7',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {renderRatingStars(idea.rating, (r) => setIdeaRating(idea.id, r))}
                  {projectMembers.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <CosmicDropdown
                        value={idea.assigned_to ?? '__none__'}
                        options={[
                          { value: '__none__', label: 'Unassigned' },
                          ...projectMembers.map((pm) => ({
                            value: pm.user_id,
                            label: pm.user?.full_name ?? 'Unknown',
                          })),
                        ]}
                        onChange={(v) => assignIdea(idea.id, v === '__none__' ? null : v)}
                        style={{ minWidth: 100 }}
                      />
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      data-ideas-menu-trigger
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === idea.id ? null : idea.id); }}
                      style={{
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen === idea.id && (
                      <div
                        data-ideas-menu
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          padding: '8px',
                          background: 'rgba(0,0,0,0.95)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          zIndex: 10,
                          minWidth: 120,
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeIdea(idea.id); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '13px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {descriptionPopupId && (() => {
        const idea = ideas.find((i) => i.id === descriptionPopupId);
        if (!idea) return null;
        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setDescriptionPopupId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(0, 0, 0, 0.95)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: 400,
                width: '90%',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#a855f7' }}>{idea.name}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {idea.description || 'No description'}
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['parked', 'exploring', 'promoted', 'discarded'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIdeaStatus(idea.id, s); setDescriptionPopupId(null); }}
                    disabled={saving || idea.status === s}
                    style={{
                      padding: '6px 10px',
                      background: idea.status === s ? 'rgba(168, 85, 247, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${idea.status === s ? '#a855f7' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '6px',
                      color: idea.status === s ? '#a855f7' : 'rgba(255,255,255,0.8)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: saving || idea.status === s ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDescriptionPopupId(null)}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: 'rgba(168, 85, 247, 0.3)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  borderRadius: '8px',
                  color: '#a855f7',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {filtered.length === 0 && (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px',
          }}
        >
          No ideas in this status. Add one above or change filter.
        </div>
      )}
    </div>
  );
}
