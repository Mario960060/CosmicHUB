// REDESIGN: Create Task Modal - Cosmic Glassmorphism

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateTask } from '@/lib/pm/mutations';
import { X } from 'lucide-react';
import { z } from 'zod';

const taskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

// Tasks = Moons only. Satellites (Questions, Issues, Notes, etc.) are subtasks.
const MOON_TYPES = [
  { type: 'rocky-moon' as const, name: 'Rocky', icon: '🌑', description: 'Rocky Moon' },
  { type: 'europa-moon' as const, name: 'Europa', icon: '🌕', description: 'Europa Moon' },
  { type: 'dusty-moon' as const, name: 'Dusty', icon: '🌖', description: 'Dusty Moon' },
];

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  initialSpacecraftType?: string;
  onSuccess?: (task: { id: string }) => void;
}

export function CreateTaskDialog({ open, onClose, moduleId, initialSpacecraftType, onSuccess }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [dueDate, setDueDate] = useState('');
  const [spacecraftType, setSpacecraftType] = useState<string>('rocky-moon');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredClose, setHoveredClose] = useState(false);
  const [hoveredSpacecraft, setHoveredSpacecraft] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialSpacecraftType) {
      setSpacecraftType(initialSpacecraftType);
    }
  }, [open, initialSpacecraftType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      taskSchema.parse({
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
      });

      const data = await createTask.mutateAsync({
        moduleId,
        name,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priorityStars: parseFloat(priorityStars),
        createdBy: user.id,
        spacecraftType,
        dueDate: dueDate || undefined,
      });

      onSuccess?.(data as { id: string });
      // Reset and close
      setName('');
      setDescription('');
      setEstimatedHours('');
      setPriorityStars('1.0');
      setDueDate('');
      setSpacecraftType('rocky-moon');
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
      }
    }
  };

  if (!open) return null;

  const priorityValue = parseFloat(priorityStars) || 0;

  return (
    <>
      {/* Backdrop */}
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
        {/* Modal */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px',
            background: 'rgba(21, 27, 46, 0.95)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 0 60px rgba(0, 217, 255, 0.3)',
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {/* Header glow effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '200px',
            background: 'rgba(0, 217, 255, 0.15)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div style={{
            position: 'relative',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              textShadow: '0 0 20px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span>🛸</span> Create Task
            </h2>
            <button
              onClick={onClose}
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

          {/* Body */}
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            {/* Task Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
                Task Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                placeholder="e.g., Backend infrastructure"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: focusedInput === 'name' 
                    ? '1px solid #00d9ff' 
                    : errors.name 
                    ? '1px solid #ef4444'
                    : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'name' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                }}
              />
              {errors.name && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFocusedInput('description')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Describe the task..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: focusedInput === 'description' 
                    ? '1px solid #00d9ff' 
                    : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'description' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Due Date */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  colorScheme: 'dark',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Spacecraft Type Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '12px',
              }}>
                Galactic Object Type (Moons) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                {MOON_TYPES.map((craft) => {
                  const isSelected = spacecraftType === craft.type;
                  const isHovered = hoveredSpacecraft === craft.type;
                  
                  return (
                    <button
                      key={craft.type}
                      type="button"
                      onClick={() => setSpacecraftType(craft.type)}
                      onMouseEnter={() => setHoveredSpacecraft(craft.type)}
                      onMouseLeave={() => setHoveredSpacecraft(null)}
                      style={{
                        padding: '12px 8px',
                        background: isSelected
                          ? 'rgba(251, 191, 36, 0.15)'
                          : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected
                          ? '2px solid rgba(251, 191, 36, 0.6)'
                          : isHovered
                          ? '2px solid rgba(251, 191, 36, 0.4)'
                          : '2px solid transparent',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isSelected || isHovered ? 'translateY(-4px)' : 'translateY(0)',
                        boxShadow: isSelected
                          ? '0 0 20px rgba(251, 191, 36, 0.4)'
                          : 'none',
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                        {craft.icon}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: '600',
                        color: isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                      }}>
                        {craft.name}
                      </div>
                      {isSelected && (
                        <div style={{
                          fontSize: '12px',
                          marginTop: '4px',
                        }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '8px' }}>
                Tasks appear as moons in the galaxy view. Satellites (Questions, Issues, etc.) are added as subtasks.
              </p>
            </div>

            {/* Hours + Priority (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Estimated Hours */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#00d9ff',
                  marginBottom: '8px',
                }}>
                  Estimated Hours <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  onFocus={() => setFocusedInput('hours')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="10"
                  min="0.5"
                  step="0.5"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'hours' 
                      ? '1px solid #00d9ff' 
                      : errors.estimatedHours 
                      ? '1px solid #ef4444'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'hours' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                  }}
                />
                {errors.estimatedHours && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                    {errors.estimatedHours}
                  </p>
                )}
              </div>

              {/* Priority Stars */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#00d9ff',
                  marginBottom: '8px',
                }}>
                  Priority Stars <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={priorityStars}
                  onChange={(e) => setPriorityStars(e.target.value)}
                  onFocus={() => setFocusedInput('priority')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="1.0"
                  min="0"
                  max="3"
                  step="0.5"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: focusedInput === 'priority' 
                      ? '1px solid #00d9ff' 
                      : errors.priorityStars 
                      ? '1px solid #ef4444'
                      : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: focusedInput === 'priority' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                  }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(0, 217, 255, 0.5)', marginTop: '4px' }}>
                  0.5 to 3.0 stars
                </p>
                {errors.priorityStars && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                    {errors.priorityStars}
                  </p>
                )}
                
                {/* Stars Preview */}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px 12px', 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '4px',
                  justifyContent: 'center'
                }}>
                  {[1, 2, 3].map(star => (
                    <svg 
                      key={star} 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill={star <= priorityValue ? '#fbbf24' : 'rgba(251,191,36,0.2)'}
                      style={{ 
                        filter: star <= priorityValue ? 'drop-shadow(0 0 4px #fbbf24)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid rgba(0, 217, 255, 0.1)',
            }}>
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
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTask.isPending}
                onMouseEnter={() => setHoveredButton('submit')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 24px',
                  background: hoveredButton === 'submit' 
                    ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 188, 212, 0.3))' 
                    : 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                  border: '1px solid rgba(0, 217, 255, 0.5)',
                  borderRadius: '10px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: createTask.isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: hoveredButton === 'submit' ? '0 0 25px rgba(0, 217, 255, 0.4)' : 'none',
                  transform: hoveredButton === 'submit' ? 'translateY(-2px)' : 'translateY(0)',
                  opacity: createTask.isPending ? 0.6 : 1,
                }}
              >
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
}
