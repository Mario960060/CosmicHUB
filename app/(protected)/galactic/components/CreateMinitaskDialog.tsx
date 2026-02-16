'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateMinitask } from '@/lib/pm/mutations';
import { DatePicker } from '@/components/ui/DatePicker';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const minitaskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

const ASTEROID_TYPES = [
  { type: 'rocky' as const, name: 'Rocky', icon: '🪨' },
];

interface CreateMinitaskDialogProps {
  open: boolean;
  onClose: () => void;
  taskId?: string;
  moduleId?: string;
  projectId?: string;
  initialAsteroidType?: string;
  onSuccess?: (minitask: { id: string }) => void;
}

export function CreateMinitaskDialog({
  open,
  onClose,
  taskId,
  moduleId,
  projectId,
  initialAsteroidType = 'rocky',
  onSuccess,
}: CreateMinitaskDialogProps) {
  const { confirm, ConfirmDialog: ConfirmDialogEl } = useConfirm();
  const { user } = useAuth();
  const createMinitask = useCreateMinitask();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [dueDate, setDueDate] = useState('');
  const [asteroidType, setAsteroidType] = useState<string>(initialAsteroidType);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredClose, setHoveredClose] = useState(false);

  useEffect(() => {
    if (open && initialAsteroidType) {
      setAsteroidType(initialAsteroidType);
    }
  }, [open, initialAsteroidType]);

  const hasUnsavedChanges = name.trim() || description.trim() || estimatedHours || dueDate;

  const handleClose = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Niezapisane zmiany',
        message: 'Czy na pewno chcesz wyjść? Niezapisane zmiany zostaną utracone.',
        confirmLabel: 'Wyjdź',
        cancelLabel: 'Zostań',
        variant: 'warning',
      });
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      minitaskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });

      const data = await createMinitask.mutateAsync({
        ...(taskId ? { taskId } : projectId ? { projectId } : { moduleId: moduleId! }),
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
        createdBy: user.id,
        asteroidType,
        dueDate: dueDate || undefined,
      });

      onSuccess?.(data as { id: string });
      setName('');
      setDescription('');
      setEstimatedHours('');
      setPriorityStars('1.0');
      setDueDate('');
      setAsteroidType('rocky');
      setErrors({});
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
      } else {
        toast.error('Nie udało się utworzyć minitaska', {
          description: err instanceof Error ? err.message : 'Nieznany błąd',
        });
      }
    }
  };

  if (!open) return null;

  const cardTheme = { border: 'rgba(139, 92, 46, 0.5)', header: '#a78b5a' };

  return (
    <div
      onClick={handleClose}
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
          maxWidth: 520,
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
            padding: '24px 28px',
            borderBottom: `1px solid ${cardTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: 20, fontFamily: 'Orbitron, sans-serif', color: cardTheme.header, fontWeight: 'bold', margin: 0 }}>
            🪨 Create Minitask (Asteroid)
          </h2>
          <button
            onClick={handleClose}
            onMouseEnter={() => setHoveredClose(true)}
            onMouseLeave={() => setHoveredClose(false)}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: hoveredClose ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
          <div style={{ marginBottom: 20 }}>
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

          <div style={{ marginBottom: 20 }}>
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: cardTheme.header, marginBottom: 8 }}>
              Asteroid Type
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ASTEROID_TYPES.map((a) => (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => setAsteroidType(a.type)}
                  style={{
                    padding: '10px 16px',
                    background: asteroidType === a.type ? 'rgba(139, 92, 46, 0.3)' : 'rgba(0,0,0,0.3)',
                    border: asteroidType === a.type ? `2px solid ${cardTheme.header}` : `1px solid ${cardTheme.border}`,
                    borderRadius: 10,
                    color: asteroidType === a.type ? cardTheme.header : 'rgba(255,255,255,0.8)',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{a.icon}</span>
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
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
              onClick={handleClose}
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
              disabled={createMinitask.isPending || (!taskId && !moduleId && !projectId)}
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
                cursor: createMinitask.isPending ? 'not-allowed' : 'pointer',
                opacity: createMinitask.isPending ? 0.6 : 1,
              }}
            >
              {createMinitask.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
      {ConfirmDialogEl}
    </div>
  );
}
