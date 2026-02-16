// Edit Module Modal - in-place editing from galaxy view

'use client';

import { useState, useEffect } from 'react';
import { useUpdateModule } from '@/lib/pm/mutations';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { z } from 'zod';

const moduleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
  estimatedHours: z.number().min(0).max(10000).optional(),
});

interface EditModuleDialogProps {
  open: boolean;
  moduleId: string;
  initialData?: { name: string; description?: string; planetType?: string; dueDate?: string; priorityStars?: number; estimatedHours?: number; status?: string };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditModuleDialog({
  open,
  moduleId,
  initialData,
  onClose,
  onSuccess,
}: EditModuleDialogProps) {
  const updateModule = useUpdateModule();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedHoursFromTasks, setEstimatedHoursFromTasks] = useState(true);
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  useEffect(() => {
    if (open && moduleId) {
      setLoading(true);
      const supabase = createClient();
      supabase
        .from('modules')
        .select('id, name, description, due_date, priority_stars, estimated_hours, status')
        .eq('id', moduleId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setName(data.name);
            setDescription(data.description || '');
            setDueDate(data.due_date ? data.due_date.split('T')[0] : '');
            setPriorityStars(String((data as any).priority_stars ?? 1));
            const eh = (data as any).estimated_hours;
            setEstimatedHours(eh != null ? String(eh) : '');
            setEstimatedHoursFromTasks(eh == null);
            setStatus(((data as any).status as 'todo' | 'in_progress' | 'done') || 'todo');
          } else if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : '');
            setPriorityStars(initialData.priorityStars?.toString() ?? '1.0');
            const eh = initialData.estimatedHours;
            setEstimatedHours(eh != null ? String(eh) : '');
            setEstimatedHoursFromTasks(eh == null);
            setStatus((initialData.status as 'todo' | 'in_progress' | 'done') || 'todo');
          }
          setLoading(false);
        });
    }
  }, [open, moduleId, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      moduleSchema.parse({
        name,
        description: description || undefined,
        priorityStars: parseFloat(priorityStars),
        estimatedHours: !estimatedHoursFromTasks && estimatedHours ? parseFloat(estimatedHours) : undefined,
      });
      await updateModule.mutateAsync({
        moduleId,
        updates: {
          name,
          description: description || undefined,
          due_date: dueDate || null,
          priority_stars: parseFloat(priorityStars),
          estimated_hours: estimatedHoursFromTasks ? null : (estimatedHours ? parseFloat(estimatedHours) : undefined),
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

  const modalStyle = {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px',
  };

  const contentStyle = {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '560px',
    background: 'rgba(21, 27, 46, 0.95)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(0, 217, 255, 0.3)',
    borderRadius: '20px',
    boxShadow: '0 0 60px rgba(0, 217, 255, 0.3)',
    overflow: 'hidden' as const,
  };

  const inputBase = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  };

  return (
    <div style={modalStyle}>
      <div onClick={(e) => e.stopPropagation()} style={contentStyle}>
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>🪐</span> Edit Module
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Module Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Module name"
                required
                style={{
                  ...inputBase,
                  border:
                    focusedInput === 'name'
                      ? '1px solid #00d9ff'
                      : errors.name
                      ? '1px solid #ef4444'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                }}
              />
              {errors.name && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</p>}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the module..."
                style={{
                  ...inputBase,
                  minHeight: '80px',
                  resize: 'vertical',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Due Date
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Wybierz datę"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '12px' }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                        minWidth: '100px',
                        padding: '12px 16px',
                        background: isSelected ? `${c}22` : isHovered ? `${c}11` : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected ? `2px solid ${c}` : isHovered ? `1px solid ${c}88` : '1px solid rgba(0, 217, 255, 0.2)',
                        borderRadius: '12px',
                        color: isSelected || isHovered ? c : 'rgba(255, 255, 255, 0.8)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontFamily: 'inherit',
                        boxShadow: isSelected ? `0 0 12px ${c}40` : 'none',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Priority Stars (1–3)
              </label>
              <input
                type="number"
                min="0.5"
                max="3"
                step="0.5"
                value={priorityStars}
                onChange={(e) => setPriorityStars(e.target.value)}
                placeholder="1.0"
                style={{
                  ...inputBase,
                  border: errors.priorityStars ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                }}
              />
              {errors.priorityStars && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.priorityStars}</p>}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Estimated Hours
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <input
                  type="checkbox"
                  checked={estimatedHoursFromTasks}
                  onChange={(e) => {
                    setEstimatedHoursFromTasks(e.target.checked);
                    if (e.target.checked) setEstimatedHours('');
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#00d9ff',
                    cursor: 'pointer',
                  }}
                />
                <span>Oblicz na podstawie szacowanych godzin zadań (suma księżyców)</span>
              </label>
              {!estimatedHoursFromTasks && (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 40"
                  style={{
                    ...inputBase,
                    border: errors.estimatedHours ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                  }}
                />
              )}
              {!estimatedHoursFromTasks && errors.estimatedHours && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.estimatedHours}</p>}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(0, 217, 255, 0.1)' }}>
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setHoveredButton('cancel')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: hoveredButton === 'cancel' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateModule.isPending}
                onMouseEnter={() => setHoveredButton('submit')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                  border: '1px solid rgba(0, 217, 255, 0.5)',
                  borderRadius: '10px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: updateModule.isPending ? 'not-allowed' : 'pointer',
                  opacity: updateModule.isPending ? 0.6 : 1,
                }}
              >
                {updateModule.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
