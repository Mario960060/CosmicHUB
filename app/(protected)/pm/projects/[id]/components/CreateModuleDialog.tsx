// REDESIGN: Create Module Modal - Cosmic Glassmorphism

'use client';

import { useState, useEffect } from 'react';
import { useCreateModule } from '@/lib/pm/mutations';
import { DatePicker } from '@/components/ui/DatePicker';
import { X } from 'lucide-react';
import { z } from 'zod';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const moduleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  priorityStars: z.number().min(0.5).max(3.0),
  estimatedHours: z.number().min(0).max(10000).optional(),
});

const PLANET_TYPES = [
  { 
    type: 'ocean', 
    name: 'Ocean World', 
    colors: ['#5eead4', '#14b8a6', '#0d9488', '#064e3b'],
    color: '#14b8a6' // for backwards compatibility
  },
  { 
    type: 'indigo', 
    name: 'Indigo Tech', 
    colors: ['#c7d2fe', '#818cf8', '#6366f1', '#1e1b4b'],
    color: '#818cf8'
  },
  { 
    type: 'rose', 
    name: 'Rose Fire', 
    colors: ['#fecdd3', '#fb7185', '#f43f5e', '#4c0519'],
    color: '#fb7185'
  },
  { 
    type: 'amber', 
    name: 'Amber Desert', 
    colors: ['#fef3c7', '#fbbf24', '#f59e0b', '#451a03'],
    color: '#fbbf24'
  },
];

interface CreateModuleDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  initialPlanetType?: 'ocean' | 'indigo' | 'rose' | 'amber';
  onSuccess?: (module: { id: string }) => void;
}

export function CreateModuleDialog({ open, onClose, projectId, initialPlanetType, onSuccess }: CreateModuleDialogProps) {
  const { confirm, ConfirmDialog: ConfirmDialogEl } = useConfirm();
  const createModule = useCreateModule();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedHoursFromTasks, setEstimatedHoursFromTasks] = useState(true);
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [planetType, setPlanetType] = useState<'ocean' | 'indigo' | 'rose' | 'amber'>(initialPlanetType ?? 'ocean');
  const [color, setColor] = useState(PLANET_TYPES[0].color); // Keep for backwards compat
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredClose, setHoveredClose] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialPlanetType) {
      setPlanetType(initialPlanetType);
      const planet = PLANET_TYPES.find((p) => p.type === initialPlanetType);
      if (planet) setColor(planet.color);
    }
  }, [open, initialPlanetType]);

  const hasUnsavedChanges = name.trim() || description.trim() || dueDate || (!estimatedHoursFromTasks && estimatedHours);

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

    try {
      moduleSchema.parse({
        name,
        description: description || undefined,
        color,
        priorityStars: parseFloat(priorityStars),
        estimatedHours: !estimatedHoursFromTasks && estimatedHours ? parseFloat(estimatedHours) : undefined,
      });

      const data = await createModule.mutateAsync({
        projectId,
        name,
        description: description || undefined,
        color, // Keep for backwards compat
        planetType,
        dueDate: dueDate || undefined,
        priorityStars: parseFloat(priorityStars),
        estimatedHours: estimatedHoursFromTasks ? undefined : (estimatedHours ? parseFloat(estimatedHours) : undefined),
        status,
      });

      onSuccess?.(data as { id: string });
      // Reset and close
      setName('');
      setDescription('');
      setDueDate('');
      setPriorityStars('1.0');
      setEstimatedHours('');
      setStatus('todo');
      setPlanetType('ocean');
      setColor(PLANET_TYPES[0].color);
      setEstimatedHoursFromTasks(true);
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

  return (
    <>
      {/* Backdrop */}
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
        {/* Modal */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
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
            background: 'rgba(168, 85, 247, 0.15)',
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
              <span>🪐</span> Create Module
            </h2>
            <button
              onClick={handleClose}
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
          <form onSubmit={handleSubmit} className="scrollbar-cosmic" style={{ padding: '32px', overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
            {/* Module Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
                Module Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                placeholder="e.g., Payment Processing"
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
                placeholder="Describe the module..."
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
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select date"
                usePortal
              />
            </div>

            {/* Priority Stars */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
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
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: errors.priorityStars ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              {errors.priorityStars && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.priorityStars}</p>
              )}
            </div>

            {/* Estimated Hours */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '8px',
              }}>
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
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: errors.estimatedHours ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              )}
              {!estimatedHoursFromTasks && errors.estimatedHours && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.estimatedHours}</p>
              )}
            </div>

            {/* Status */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '12px',
              }}>
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

            {/* Planet Type Picker */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#00d9ff',
                marginBottom: '12px',
              }}>
                Planet Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}>
                {PLANET_TYPES.map((planet) => {
                  const isSelected = planetType === planet.type;
                  const isHovered = hoveredPlanet === planet.type;
                  
                  return (
                    <button
                      key={planet.type}
                      type="button"
                      onClick={() => {
                        setPlanetType(planet.type as any);
                        setColor(planet.color); // Update color too
                      }}
                      onMouseEnter={() => setHoveredPlanet(planet.type)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                      style={{
                        padding: '16px',
                        background: isSelected
                          ? `rgba(${planet.type === 'ocean' ? '20, 184, 166' : planet.type === 'indigo' ? '129, 140, 248' : planet.type === 'rose' ? '251, 113, 133' : '251, 191, 36'}, 0.15)`
                          : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected
                          ? `2px solid ${planet.color}`
                          : isHovered
                          ? `2px solid rgba(${planet.type === 'ocean' ? '20, 184, 166' : planet.type === 'indigo' ? '129, 140, 248' : planet.type === 'rose' ? '251, 113, 133' : '251, 191, 36'}, 0.4)`
                          : '2px solid transparent',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isSelected || isHovered ? 'translateY(-4px)' : 'translateY(0)',
                        boxShadow: isSelected
                          ? `0 0 25px rgba(${planet.type === 'ocean' ? '20, 184, 166' : planet.type === 'indigo' ? '129, 140, 248' : planet.type === 'rose' ? '251, 113, 133' : '251, 191, 36'}, 0.4)`
                          : 'none',
                      }}
                    >
                      {/* Planet Preview */}
                      <div style={{
                        width: '60px',
                        height: '60px',
                        margin: '0 auto 12px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 30% 30%, ${planet.colors[0]}, ${planet.colors[1]}, ${planet.colors[2]}, ${planet.colors[3]})`,
                        boxShadow: `inset -6px 6px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(${planet.type === 'ocean' ? '20, 184, 166' : planet.type === 'indigo' ? '129, 140, 248' : planet.type === 'rose' ? '251, 113, 133' : '251, 191, 36'}, 0.4)`,
                      }} />
                      <div style={{
                        textAlign: 'center',
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: planet.color,
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                      }}>
                        {planet.name}
                      </div>
                      {isSelected && (
                        <div style={{
                          textAlign: 'center',
                          fontSize: '16px',
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
                Choose a planet type for galactic visualization
              </p>
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
                disabled={createModule.isPending}
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
                  cursor: createModule.isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: hoveredButton === 'submit' ? '0 0 25px rgba(0, 217, 255, 0.4)' : 'none',
                  transform: hoveredButton === 'submit' ? 'translateY(-2px)' : 'translateY(0)',
                  opacity: createModule.isPending ? 0.6 : 1,
                }}
              >
                {createModule.isPending ? 'Creating...' : 'Create Module'}
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
      {ConfirmDialogEl}
    </>
  );
}
