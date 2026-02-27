'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateMinitask } from '@/lib/pm/mutations';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';

const minitaskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

interface InlineMinitaskFormProps {
  projectId: string;
  taskId?: string;
  moduleId?: string;
  taskName?: string;
  moduleName?: string;
  parentLabel?: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function InlineMinitaskForm({
  projectId,
  taskId,
  moduleId,
  taskName,
  moduleName,
  parentLabel,
  onSuccess,
  defaultExpanded = false,
}: InlineMinitaskFormProps) {
  const label = parentLabel ?? (taskName ? `tasku ${taskName}` : moduleName ? `modułu ${moduleName}` : 'projektu');
  const { user } = useAuth();
  const createMinitask = useCreateMinitask();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!taskId && !moduleId && !projectId)) return;
    try {
      minitaskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });
      await createMinitask.mutateAsync({
        ...(taskId ? { taskId } : moduleId ? { moduleId } : { projectId }),
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
        createdBy: user.id,
        asteroidType: 'rocky',
      });
      setName('');
      setDescription('');
      setEstimatedHours('');
      setPriorityStars('1.0');
      setErrors({});
      setExpanded(false);
      onSuccess?.();
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

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.4)',
        border: '1px solid rgba(0, 217, 255, 0.12)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginLeft: '12px',
        marginTop: '8px',
      }}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(0, 217, 255, 0.6)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
            e.currentTarget.style.color = '#00d9ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(0, 217, 255, 0.6)';
          }}
        >
          <Plus size={16} />
          Dodaj minitask do {label}
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{
              fontSize: '14px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>🪨</span> Nowy minitask
            </h4>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#00d9ff', marginBottom: '6px' }}>
              Nazwa *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              placeholder="np. Setup API"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: focusedInput === 'name' ? '1px solid #00d9ff' : errors.name ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            {errors.name && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#00d9ff', marginBottom: '6px' }}>
              Szacowane godziny (opcjonalnie)
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="np. 2"
              min="0"
              step="0.5"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={createMinitask.isPending}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                border: '1px solid rgba(0, 217, 255, 0.5)',
                borderRadius: '8px',
                color: '#00d9ff',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'Orbitron, sans-serif',
                cursor: createMinitask.isPending ? 'not-allowed' : 'pointer',
                opacity: createMinitask.isPending ? 0.6 : 1,
              }}
            >
              {createMinitask.isPending ? 'Dodawanie...' : 'Dodaj minitask'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
