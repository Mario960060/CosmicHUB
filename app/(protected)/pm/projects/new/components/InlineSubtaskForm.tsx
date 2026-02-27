'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateSubtask } from '@/lib/pm/mutations';
import { SATELLITE_TYPES, type SatelliteType } from '@/components/satellite/satellite-types';
import { getInitialSatelliteData } from '@/lib/satellite/initial-data';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';

const subtaskSchema = z.object({
  name: z.string().min(2).max(200),
});

interface InlineSubtaskFormProps {
  taskId: string;
  taskName: string;
  projectId: string;
  moduleId: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function InlineSubtaskForm({
  taskId,
  taskName,
  projectId,
  moduleId,
  onSuccess,
  defaultExpanded = false,
}: InlineSubtaskFormProps) {
  const { user } = useAuth();
  const createSubtask = useCreateSubtask();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [name, setName] = useState('');
  const [satelliteType, setSatelliteType] = useState<SatelliteType>('notes');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      subtaskSchema.parse({ name });
      await createSubtask.mutateAsync({
        parentId: taskId,
        name,
        createdBy: user.id,
        satelliteType,
        satelliteData: getInitialSatelliteData(satelliteType),
      });
      setName('');
      setSatelliteType('notes');
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
          Dodaj satelitę (Questions, Issues, Notes…)
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
              <span>📡</span> Nowy satelita
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
              Typ satelity
            </label>
            <select
              value={satelliteType}
              onChange={(e) => setSatelliteType(e.target.value as SatelliteType)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '10px',
                color: '#00d9ff',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {SATELLITE_TYPES.map((s) => (
                <option key={s.type} value={s.type} style={{ background: 'rgba(21, 27, 46, 1)', color: '#00d9ff' }}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
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
              placeholder="np. Kluczowe pytania"
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
              disabled={createSubtask.isPending}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                border: '1px solid rgba(0, 217, 255, 0.5)',
                borderRadius: '8px',
                color: '#00d9ff',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'Orbitron, sans-serif',
                cursor: createSubtask.isPending ? 'not-allowed' : 'pointer',
                opacity: createSubtask.isPending ? 0.6 : 1,
              }}
            >
              {createSubtask.isPending ? 'Dodawanie...' : 'Dodaj satelitę'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
