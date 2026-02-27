'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCreateTask } from '@/lib/pm/mutations';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';

const taskSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  priorityStars: z.number().min(0.5).max(3.0),
});

// Tasks = Moons only. Satellites are subtasks.
const MOON_TYPES = [
  { type: 'rocky-moon', name: 'Rocky', icon: '🌑' },
  { type: 'europa-moon', name: 'Europa', icon: '🌕' },
  { type: 'dusty-moon', name: 'Dusty', icon: '🌖' },
];

interface InlineTaskFormProps {
  moduleId: string;
  moduleName: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function InlineTaskForm({
  moduleId,
  moduleName,
  onSuccess,
  defaultExpanded = false,
}: InlineTaskFormProps) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priorityStars, setPriorityStars] = useState('1.0');
  const [spacecraftType, setSpacecraftType] = useState('rocky-moon');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredSpacecraft, setHoveredSpacecraft] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      taskSchema.parse({
        name,
        description: description || undefined,
        priorityStars: parseFloat(priorityStars),
      });
      await createTask.mutateAsync({
        moduleId,
        name,
        description: description || undefined,
        estimatedHours: null, // calculate based on minitasks
        priorityStars: parseFloat(priorityStars),
        createdBy: user.id,
        spacecraftType,
      });
      setName('');
      setDescription('');
      setPriorityStars('1.0');
      setSpacecraftType('rocky-moon');
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

  const priorityValue = parseFloat(priorityStars) || 0;

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.5)',
        border: '1px solid rgba(0, 217, 255, 0.15)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginLeft: '16px',
      }}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(0, 217, 255, 0.7)',
            fontSize: '13px',
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
            e.currentTarget.style.color = 'rgba(0, 217, 255, 0.7)';
          }}
        >
          <Plus size={18} />
          Add Task to {moduleName}
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '16px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>🛸</span> New Task
            </h3>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                width: '28px',
                height: '28px',
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
              <X size={16} />
            </button>
          </div>

          {/* Task Name */}
          <div style={{ marginBottom: '20px' }}>
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
                border: focusedInput === 'name' ? '1px solid #00d9ff' : errors.name ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: focusedInput === 'name' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
              }}
            />
            {errors.name && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
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
                minHeight: '80px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: focusedInput === 'description' ? '1px solid #00d9ff' : '1px solid rgba(0, 217, 255, 0.3)',
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

          {/* Galactic Object Type - moons only (tasks) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#00d9ff',
              marginBottom: '12px',
            }}>
              Galactic Object Type (Moons) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
                      background: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                      border: isSelected ? '2px solid rgba(251, 191, 36, 0.6)' : isHovered ? '2px solid rgba(251, 191, 36, 0.4)' : '2px solid transparent',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: isSelected || isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: isSelected ? '0 0 20px rgba(251, 191, 36, 0.4)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{craft.icon}</div>
                    <div style={{
                      fontSize: '10px',
                      fontFamily: 'Orbitron, sans-serif',
                      fontWeight: '600',
                      color: isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'uppercase',
                    }}>
                      {craft.name}
                    </div>
                    {isSelected && <div style={{ fontSize: '12px', marginTop: '4px' }}>✓</div>}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '8px' }}>
              Tasks appear as moons. Minitasks (asteroids) can be added to tasks.
            </p>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>
            Szacowane godziny będą obliczane na podstawie minitasków.
          </p>

          {/* Priority */}
          <div style={{ marginBottom: '20px' }}>
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
                min="0.5"
                max="3"
                step="0.5"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: focusedInput === 'priority' ? '1px solid #00d9ff' : errors.priorityStars ? '1px solid #ef4444' : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'priority' ? '0 0 20px rgba(0, 217, 255, 0.3)' : 'none',
                }}
              />
              <p style={{ fontSize: '11px', color: 'rgba(0, 217, 255, 0.5)', marginTop: '4px' }}>0.5 to 3.0 stars</p>
              {errors.priorityStars && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.priorityStars}</p>}
              {/* Stars Preview */}
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                gap: '4px',
                justifyContent: 'center',
              }}>
                {[1, 2, 3].map((star) => (
                  <svg
                    key={star}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={star <= priorityValue ? '#fbbf24' : 'rgba(251,191,36,0.2)'}
                    style={{
                      filter: star <= priorityValue ? 'drop-shadow(0 0 4px #fbbf24)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
              onClick={() => setExpanded(false)}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.05)',
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
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                border: '1px solid rgba(0, 217, 255, 0.5)',
                borderRadius: '10px',
                color: '#00d9ff',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'Orbitron, sans-serif',
                cursor: createTask.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: createTask.isPending ? 0.6 : 1,
              }}
            >
              {createTask.isPending ? 'Creating...' : 'Add Task'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
