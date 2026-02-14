// Edit Task (Moon) Modal - in-place editing from galaxy view

'use client';

import { useState, useEffect } from 'react';
import { useUpdateTask } from '@/lib/pm/mutations';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { z } from 'zod';

const taskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

interface EditTaskDialogProps {
  open: boolean;
  taskId: string;
  initialData?: { name: string; description?: string; estimatedHours?: number; priorityStars?: number; spacecraftType?: string; dueDate?: string; status?: string };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditTaskDialog({
  open,
  taskId,
  initialData,
  onClose,
  onSuccess,
}: EditTaskDialogProps) {
  const updateTask = useUpdateTask();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      const supabase = createClient();
      supabase
        .from('tasks')
        .select('id, name, description, estimated_hours, priority_stars, due_date, status')
        .eq('id', taskId)
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
  }, [open, taskId, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });
      await updateTask.mutateAsync({
        taskId,
        updates: {
          name,
          description: description || undefined,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
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
    <div onClick={onClose} style={modalStyle}>
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
            <span>🛸</span> Edit Task
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
                Task Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Task name"
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
                placeholder="Describe the task..."
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'done')}
                style={{
                  ...inputBase,
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="10"
                  min="0"
                  step="0.5"
                  style={{
                    ...inputBase,
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                  Priority Stars (0.5–3)
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
                    ...inputBase,
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                  }}
                />
              </div>
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
                disabled={updateTask.isPending}
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
                  cursor: updateTask.isPending ? 'not-allowed' : 'pointer',
                  opacity: updateTask.isPending ? 0.6 : 1,
                }}
              >
                {updateTask.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
