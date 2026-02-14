// Edit Project Modal - in-place editing from galaxy view

'use client';

import { useState, useEffect } from 'react';
import { useUpdateProject } from '@/lib/pm/mutations';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority_stars: z.number().min(0.5).max(3).optional(),
  estimated_hours: z.number().min(0).optional(),
});

const SUN_TYPES = [
  { type: 'yellow-star' as const, name: 'Yellow Star', desc: 'Active' },
  { type: 'blue-giant' as const, name: 'Blue Giant', desc: 'Large' },
  { type: 'red-dwarf' as const, name: 'Red Dwarf', desc: 'Side project' },
];

interface EditProjectDialogProps {
  open: boolean;
  projectId: string;
  initialData?: {
    name: string;
    description?: string;
    sunType?: string;
    dueDate?: string | null;
    status?: string;
    priorityStars?: number | null;
    estimatedHours?: number | null;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProjectDialog({
  open,
  projectId,
  initialData,
  onClose,
  onSuccess,
}: EditProjectDialogProps) {
  const updateProject = useUpdateProject();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sunType, setSunType] = useState<'yellow-star' | 'blue-giant' | 'red-dwarf'>('yellow-star');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'active' | 'on_hold' | 'completed' | 'cancelled'>('active');
  const [priorityStars, setPriorityStars] = useState<number>(1);
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredSun, setHoveredSun] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    if (open && projectId) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setSunType((initialData.sunType as any) || 'yellow-star');
        setDueDate(initialData.dueDate ? initialData.dueDate.slice(0, 10) : '');
        setStatus((initialData.status as any) || 'active');
        setPriorityStars(initialData.priorityStars ?? 1);
        setEstimatedHours(initialData.estimatedHours != null ? String(initialData.estimatedHours) : '');
        setLoading(false);
      } else {
        setLoading(true);
        const supabase = createClient();
        supabase
          .from('projects')
          .select('id, name, description, sun_type, due_date, status, priority_stars, estimated_hours')
          .eq('id', projectId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setName(data.name);
              setDescription(data.description || '');
              setSunType((data.sun_type as any) || 'yellow-star');
              setDueDate(data.due_date ? String(data.due_date).slice(0, 10) : '');
              setStatus((data.status as any) || 'active');
              setPriorityStars(data.priority_stars ?? 1);
              setEstimatedHours(data.estimated_hours != null ? String(data.estimated_hours) : '');
            }
            setLoading(false);
          });
      }
    }
  }, [open, projectId, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = projectSchema.parse({
        name,
        description: description || undefined,
        due_date: dueDate || undefined,
        status,
        priority_stars: priorityStars,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      });
      await updateProject.mutateAsync({
        projectId,
        updates: {
          name: parsed.name,
          description: parsed.description,
          sun_type: sunType,
          due_date: parsed.due_date ? `${parsed.due_date}T12:00:00.000Z` : null,
          status: parsed.status,
          priority_stars: parsed.priority_stars ?? null,
          estimated_hours: parsed.estimated_hours ?? null,
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
            <span>☀️</span> Edit Project
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
                Project Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Project name"
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
                placeholder="Describe the project..."
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
                Deadline
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputBase, border: '1px solid rgba(0, 217, 255, 0.3)' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ ...inputBase, border: '1px solid rgba(0, 217, 255, 0.3)' }}
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                  Priority (stars)
                </label>
                <select
                  value={priorityStars}
                  onChange={(e) => setPriorityStars(parseFloat(e.target.value))}
                  style={{ ...inputBase, border: '1px solid rgba(0, 217, 255, 0.3)' }}
                >
                  <option value={0.5}>0.5</option>
                  <option value={1}>1</option>
                  <option value={1.5}>1.5</option>
                  <option value={2}>2</option>
                  <option value={2.5}>2.5</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '8px' }}>
                  Estimated hours
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="Optional"
                  style={{ ...inputBase, border: '1px solid rgba(0, 217, 255, 0.3)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#00d9ff', marginBottom: '12px' }}>
                Sun Type (Galactic view)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {SUN_TYPES.map((s) => {
                  const isSelected = sunType === s.type;
                  const isHovered = hoveredSun === s.type;
                  return (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => setSunType(s.type)}
                      onMouseEnter={() => setHoveredSun(s.type)}
                      onMouseLeave={() => setHoveredSun(null)}
                      style={{
                        padding: '12px',
                        background: isSelected ? 'rgba(255, 184, 0, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected ? '2px solid rgba(255, 184, 0, 0.6)' : '2px solid transparent',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{s.name}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{s.desc}</div>
                    </button>
                  );
                })}
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
                disabled={updateProject.isPending}
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
                  cursor: updateProject.isPending ? 'not-allowed' : 'pointer',
                  opacity: updateProject.isPending ? 0.6 : 1,
                }}
              >
                {updateProject.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
