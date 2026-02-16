'use client';

import { useState, useEffect } from 'react';
import { useUpdateMinitask } from '@/lib/pm/mutations';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { z } from 'zod';

const minitaskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

interface EditMinitaskDialogProps {
  open: boolean;
  minitaskId: string;
  initialData?: { name: string; description?: string; estimatedHours?: number; priorityStars?: number; asteroidType?: string; dueDate?: string; status?: string };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditMinitaskDialog({
  open,
  minitaskId,
  initialData,
  onClose,
  onSuccess,
}: EditMinitaskDialogProps) {
  const updateMinitask = useUpdateMinitask();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && minitaskId) {
      setLoading(true);
      const supabase = createClient();
      supabase
        .from('minitasks')
        .select('id, name, description, estimated_hours, priority_stars, due_date, status')
        .eq('id', minitaskId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setName(data.name);
            setDescription(data.description || '');
            setEstimatedHours(data.estimated_hours?.toString() ?? '');
            setPriorityStars(data.priority_stars?.toString() ?? '1.0');
            setDueDate(data.due_date ? data.due_date.split('T')[0] : '');
            setStatus((data.status as 'todo' | 'in_progress' | 'done') || 'todo');
          } else if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setEstimatedHours(initialData.estimatedHours?.toString() ?? '');
            setPriorityStars(initialData.priorityStars?.toString() ?? '1.0');
            setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : '');
            setStatus((initialData.status as 'todo' | 'in_progress' | 'done') || 'todo');
          }
          setLoading(false);
        });
    }
  }, [open, minitaskId, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      minitaskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });
      await updateMinitask.mutateAsync({
        minitaskId,
        updates: {
          name,
          description: description || undefined,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          priority_stars: parseFloat(priorityStars),
          due_date: dueDate || null,
          status,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  if (!open) return null;

  const cardTheme = { border: 'rgba(139, 92, 46, 0.5)', header: '#a78b5a' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'rgba(21, 27, 46, 0.95)',
          backdropFilter: 'blur(30px)',
          border: `1px solid ${cardTheme.border}`,
          borderRadius: 20,
          boxShadow: '0 0 60px rgba(139, 92, 46, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '24px 32px',
            borderBottom: `1px solid ${cardTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: 20, fontFamily: 'Orbitron, sans-serif', color: cardTheme.header, fontWeight: 'bold', margin: 0 }}>
            🪨 Edit Minitask
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Minitask name"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  border: errors.name ? '1px solid #ef4444' : `1px solid ${cardTheme.border}`,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              {errors.name && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{errors.name}</p>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the minitask..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  minHeight: 80,
                  resize: 'vertical',
                  border: `1px solid ${cardTheme.border}`,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 12 }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(['todo', 'in_progress', 'done'] as const).map((s) => {
                  const isSelected = status === s;
                  const isHovered = hoveredStatus === s;
                  const colors = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#22c55e' };
                  const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
                  const c = colors[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      onMouseEnter={() => setHoveredStatus(s)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '12px 16px',
                        background: isSelected ? `${c}22` : isHovered ? `${c}11` : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected ? `2px solid ${c}` : isHovered ? `1px solid ${c}88` : `1px solid ${cardTheme.border}`,
                        borderRadius: 12,
                        color: isSelected || isHovered ? c : 'rgba(255, 255, 255, 0.8)',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
                Due Date
              </label>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select date" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 14,
                    border: `1px solid ${cardTheme.border}`,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
                  Priority (0.5–3)
                </label>
                <input
                  type="number"
                  value={priorityStars}
                  onChange={(e) => setPriorityStars(e.target.value)}
                  placeholder="1.0"
                  min="0.5"
                  max="3"
                  step="0.5"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 14,
                    border: `1px solid ${cardTheme.border}`,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setHoveredButton('cancel')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: hoveredButton === 'cancel' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMinitask.isPending}
                onMouseEnter={() => setHoveredButton('submit')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 46, 0.3), rgba(139, 92, 46, 0.2))',
                  border: `1px solid ${cardTheme.header}`,
                  borderRadius: 10,
                  color: cardTheme.header,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: updateMinitask.isPending ? 'not-allowed' : 'pointer',
                  opacity: updateMinitask.isPending ? 0.6 : 1,
                }}
              >
                {updateMinitask.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
