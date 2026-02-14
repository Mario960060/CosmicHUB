'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateTask } from '@/lib/pm/mutations';
import { createClient } from '@/lib/supabase/client';
import { Plus, ArrowRight, MoreVertical } from 'lucide-react';

interface Idea {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  status: 'parked' | 'exploring' | 'promoted' | 'discarded';
  promoted_to?: string | null;
  created_by?: string;
  created_at?: string;
}

interface IdeasContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  moduleId?: string;
  projectId?: string;
}

function getIdeas(data: Record<string, unknown>): Idea[] {
  const raw = data.ideas;
  if (!Array.isArray(raw)) return [];
  return raw.map((i: any) => ({
    id: i.id || crypto.randomUUID(),
    text: i.text || '',
    priority: i.priority || 'medium',
    tags: Array.isArray(i.tags) ? i.tags : [],
    status: i.status || 'parked',
    promoted_to: i.promoted_to,
    created_by: i.created_by,
    created_at: i.created_at || new Date().toISOString(),
  }));
}

export function IdeasContent({
  subtaskId,
  satelliteData,
  moduleId,
  projectId,
}: IdeasContentProps) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>(() => getIdeas(satelliteData));
  const [filter, setFilter] = useState<'all' | 'parked' | 'exploring' | 'promoted' | 'discarded'>(
    'parked'
  );
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState<Idea | null>(null);

  useEffect(() => {
    setIdeas(getIdeas(satelliteData));
  }, [subtaskId]);

  const save = async (nextIdeas: Idea[]) => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { ideas: nextIdeas },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
    setIdeas(nextIdeas);
  };

  const addIdea = () => {
    if (!newText.trim() || !user) return;
    const idea: Idea = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      priority: 'medium',
      tags: [],
      status: 'parked',
      created_by: user.id,
      created_at: new Date().toISOString(),
    };
    const next = [...ideas, idea];
    save(next);
    setNewText('');
  };

  const discardIdea = (id: string) => {
    const next = ideas.map((i) =>
      i.id === id ? { ...i, status: 'discarded' as const } : i
    );
    save(next);
    setMenuOpen(null);
  };

  const markPromoted = (id: string, taskId: string) => {
    const next = ideas.map((i) =>
      i.id === id ? { ...i, status: 'promoted' as const, promoted_to: taskId } : i
    );
    save(next);
    setShowPromoteDialog(null);
  };

  const filtered = ideas.filter((i) => filter === 'all' || i.status === filter);

  const priorityColor = (p: Idea['priority']) => {
    switch (p) {
      case 'high':
        return '#ef4444';
      case 'low':
        return 'rgba(255,255,255,0.4)';
      default:
        return '#fbbf24';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '10px',
        }}
      >
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addIdea()}
          placeholder="Quick add idea..."
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addIdea}
          disabled={saving || !newText.trim()}
          style={{
            padding: '10px 14px',
            background: 'rgba(168, 85, 247, 0.3)',
            border: '1px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '8px',
            color: '#a855f7',
            cursor: saving || !newText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(['parked', 'exploring', 'promoted', 'discarded', 'all'] as const).map((f) => (
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
        {filtered.map((idea) => (
          <div
            key={idea.id}
            style={{
              padding: '14px 16px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
              borderRadius: '10px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#fff', lineHeight: 1.4 }}>
                  {idea.text}
                </p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: `${priorityColor(idea.priority)}22`,
                    color: priorityColor(idea.priority),
                    borderRadius: '8px',
                  }}
                >
                  {idea.priority}
                </span>
                {idea.status === 'parked' && moduleId && (
                  <button
                    type="button"
                    onClick={() => setShowPromoteDialog(idea)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: '6px',
                      color: '#a855f7',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Promote <ArrowRight size={14} />
                  </button>
                )}
                {idea.status === 'parked' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === idea.id ? null : idea.id)}
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
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          padding: '8px',
                          background: 'rgba(0,0,0,0.9)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          zIndex: 10,
                          minWidth: 120,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => discardIdea(idea.id)}
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
                          }}
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

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

      {showPromoteDialog && moduleId && (
        <PromoteToTaskDialog
          idea={showPromoteDialog}
          moduleId={moduleId}
          projectId={projectId}
          onClose={() => setShowPromoteDialog(null)}
          onSuccess={(taskId) => markPromoted(showPromoteDialog.id, taskId)}
        />
      )}
    </div>
  );
}

interface PromoteToTaskDialogProps {
  idea: Idea;
  moduleId: string;
  projectId?: string;
  onClose: () => void;
  onSuccess: (taskId: string) => void;
}

function PromoteToTaskDialog({
  idea,
  moduleId,
  onClose,
  onSuccess,
}: PromoteToTaskDialogProps) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const [name, setName] = useState(idea.text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(idea.text);
  }, [idea]);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = await createTask.mutateAsync({
        moduleId,
        name,
        createdBy: user.id,
        priorityStars: 1.5,
      });
      onSuccess((data as { id: string }).id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          minWidth: 360,
          maxWidth: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#fff' }}>
          Promote to Task
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Task name"
          style={{
            width: '100%',
            padding: '12px 14px',
            marginBottom: '16px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 16px',
              background: 'rgba(168, 85, 247, 0.3)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '8px',
              color: '#a855f7',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
