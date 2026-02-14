'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateSubtask } from '@/lib/pm/mutations';
import { SatelliteTypePicker } from '@/components/satellite/SatelliteTypePicker';
import { SatelliteIcon, satelliteTypeToSpacecraft } from '@/components/satellite/SatelliteIcon';
import { SATELLITE_TYPES, type SatelliteType } from '@/components/satellite/satellite-types';
import { X } from 'lucide-react';
import { z } from 'zod';

const subtaskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

const SPACECRAFT_TO_SATELLITE: Record<string, SatelliteType> = {
  'sphere-drone': 'questions',
  'hex-drone': 'issues',
  'voyager-probe': 'notes',
  'space-station': 'documents',
  'pulse-beacon': 'checklist',
  'astro-gauge': 'metrics',
  'nebula-spark': 'ideas',
  'core-module': 'repo',
};

interface CreateSubtaskDialogProps {
  open: boolean;
  onClose: () => void;
  parentTaskId: string;
  parentTaskName: string;
  initialSatelliteType?: string;
  onSuccess?: (subtask: { id: string }) => void;
}

export function CreateSubtaskDialog({
  open,
  onClose,
  parentTaskId,
  parentTaskName,
  initialSatelliteType,
  onSuccess,
}: CreateSubtaskDialogProps) {
  const { user } = useAuth();
  const createSubtask = useCreateSubtask();
  const resolvedInitial = initialSatelliteType ? SPACECRAFT_TO_SATELLITE[initialSatelliteType] ?? 'notes' : 'notes';
  const [step, setStep] = useState<'type' | 'form'>(initialSatelliteType ? 'form' : 'type');
  const [satelliteType, setSatelliteType] = useState<SatelliteType>(resolvedInitial);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredClose, setHoveredClose] = useState(false);

  const selectedInfo = SATELLITE_TYPES.find((s) => s.type === satelliteType);

  const handleTypeSelect = (type: SatelliteType) => {
    setSatelliteType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('type');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      subtaskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });

      const data = await createSubtask.mutateAsync({
        parentId: parentTaskId,
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
        createdBy: user.id,
        satelliteType,
        satelliteData: getInitialSatelliteData(satelliteType),
      });

      onSuccess?.(data as { id: string });
      resetAndClose();
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

  const resetAndClose = () => {
    setStep('type');
    setSatelliteType('notes');
    setName('');
    setDescription('');
    setEstimatedHours('');
    setPriorityStars('1.0');
    setErrors({});
    onClose();
  };

  useEffect(() => {
    if (open && initialSatelliteType) {
      setStep('form');
      setSatelliteType(resolvedInitial);
    } else if (open && !initialSatelliteType) {
      setStep('type');
      setSatelliteType('notes');
    }
  }, [open, initialSatelliteType, resolvedInitial]);

  if (!open) return null;

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
          position: 'relative',
          width: '100%',
          maxWidth: step === 'type' ? '560px' : '600px',
          background: 'rgba(21, 27, 46, 0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 0 60px rgba(0, 217, 255, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
            {step === 'type' ? (
              <span style={{ fontSize: '24px' }}>🛸</span>
            ) : (
              selectedInfo && <SatelliteIcon type={satelliteTypeToSpacecraft(selectedInfo.type)} size="sm" />
            )}
            {step === 'type' ? 'Create Subtask' : `Add ${selectedInfo?.name} to ${parentTaskName}`}
          </h2>
          <button
            onClick={resetAndClose}
            onMouseEnter={() => setHoveredClose(true)}
            onMouseLeave={() => setHoveredClose(false)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: hoveredClose ? '#ef4444' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {step === 'type' ? (
          <>
            <SatelliteTypePicker onSelect={handleTypeSelect} selectedType={satelliteType} />
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#00d9ff',
                  marginBottom: '8px',
                }}
              >
                Subtask Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Review API endpoints"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: errors.name ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {errors.name && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#00d9ff',
                  marginBottom: '8px',
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#00d9ff',
                    marginBottom: '8px',
                  }}
                >
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
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#00d9ff',
                    marginBottom: '8px',
                  }}
                >
                  Priority Stars <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={priorityStars}
                  onChange={(e) => setPriorityStars(e.target.value)}
                  placeholder="1.0"
                  min="0.5"
                  max="3"
                  step="0.5"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: errors.priorityStars ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {errors.priorityStars && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                    {errors.priorityStars}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '8px',
                borderTop: '1px solid rgba(0, 217, 255, 0.1)',
              }}
            >
              <button
                type="button"
                onClick={handleBack}
                onMouseEnter={() => setHoveredButton('back')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: hoveredButton === 'back' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={createSubtask.isPending}
                onMouseEnter={() => setHoveredButton('submit')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background:
                    hoveredButton === 'submit'
                      ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 188, 212, 0.3))'
                      : 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                  border: '1px solid rgba(0, 217, 255, 0.5)',
                  borderRadius: '10px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: createSubtask.isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: hoveredButton === 'submit' ? '0 0 25px rgba(0, 217, 255, 0.4)' : 'none',
                  opacity: createSubtask.isPending ? 0.6 : 1,
                }}
              >
                {createSubtask.isPending ? 'Creating...' : 'Create Subtask'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function getInitialSatelliteData(type: SatelliteType): Record<string, unknown> {
  switch (type) {
    case 'questions':
      return { questions: [] };
    case 'issues':
      return { issues: [] };
    case 'notes':
      return { content: '', sections: [], links: [] };
    case 'documents':
      return { files: [], links: [], folders: [] };
    case 'checklist':
      return { items: [] };
    case 'metrics':
      return { metrics: [], primary_metric_id: null, chart_type: 'line' };
    case 'ideas':
      return { ideas: [] };
    case 'repo':
      return {};
    default:
      return {};
  }
}
