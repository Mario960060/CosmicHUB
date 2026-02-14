'use client';

import { useState } from 'react';
import { useCreateModule } from '@/lib/pm/mutations';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';

const moduleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const PLANET_TYPES = [
  { type: 'ocean' as const, name: 'Ocean World', colors: ['#5eead4', '#14b8a6', '#0d9488', '#064e3b'], color: '#14b8a6' },
  { type: 'indigo' as const, name: 'Indigo Tech', colors: ['#c7d2fe', '#818cf8', '#6366f1', '#1e1b4b'], color: '#818cf8' },
  { type: 'rose' as const, name: 'Rose Fire', colors: ['#fecdd3', '#fb7185', '#f43f5e', '#4c0519'], color: '#fb7185' },
  { type: 'amber' as const, name: 'Amber Desert', colors: ['#fef3c7', '#fbbf24', '#f59e0b', '#451a03'], color: '#fbbf24' },
];

interface InlineModuleFormProps {
  projectId: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function InlineModuleForm({
  projectId,
  onSuccess,
  defaultExpanded = false,
}: InlineModuleFormProps) {
  const createModule = useCreateModule();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [planetType, setPlanetType] = useState<'ocean' | 'indigo' | 'rose' | 'amber'>('ocean');
  const [color, setColor] = useState(PLANET_TYPES[0].color);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      moduleSchema.parse({ name, description: description || undefined, color });
      await createModule.mutateAsync({
        projectId,
        name,
        description: description || undefined,
        color,
        planetType,
      });
      setName('');
      setDescription('');
      setPlanetType('ocean');
      setColor(PLANET_TYPES[0].color);
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
        background: 'rgba(21, 27, 46, 0.6)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(0, 217, 255, 0.8)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
            e.currentTarget.style.color = '#00d9ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(0, 217, 255, 0.8)';
          }}
        >
          <Plus size={20} />
          Add Module
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '18px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>🪐</span> New Module
            </h3>
            <button
              type="button"
              onClick={() => setExpanded(false)}
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
                transition: 'all 0.2s ease',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Module Name */}
          <div style={{ marginBottom: '20px' }}>
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
              placeholder="Describe the module..."
              style={{
                width: '100%',
                minHeight: '100px',
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

          {/* Planet Type Picker - full grid with icons */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {PLANET_TYPES.map((planet) => {
                const isSelected = planetType === planet.type;
                const isHovered = hoveredPlanet === planet.type;
                const rgbMap: Record<string, string> = {
                  ocean: '20, 184, 166',
                  indigo: '129, 140, 248',
                  rose: '251, 113, 133',
                  amber: '251, 191, 36',
                };
                const rgb = rgbMap[planet.type] || '20, 184, 166';
                return (
                  <button
                    key={planet.type}
                    type="button"
                    onClick={() => {
                      setPlanetType(planet.type);
                      setColor(planet.color);
                    }}
                    onMouseEnter={() => setHoveredPlanet(planet.type)}
                    onMouseLeave={() => setHoveredPlanet(null)}
                    style={{
                      padding: '16px',
                      background: isSelected ? `rgba(${rgb}, 0.15)` : 'rgba(0, 0, 0, 0.3)',
                      border: isSelected ? `2px solid ${planet.color}` : isHovered ? `2px solid rgba(${rgb}, 0.4)` : '2px solid transparent',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: isSelected || isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: isSelected ? `0 0 25px rgba(${rgb}, 0.4)` : 'none',
                    }}
                  >
                    {/* Planet Preview - glowing sphere */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, ${planet.colors[0]}, ${planet.colors[1]}, ${planet.colors[2]}, ${planet.colors[3]})`,
                      boxShadow: `inset -6px 6px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(${rgb}, 0.4)`,
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
                      <div style={{ textAlign: 'center', fontSize: '16px', marginTop: '4px' }}>✓</div>
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
              disabled={createModule.isPending}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 188, 212, 0.2))',
                border: '1px solid rgba(0, 217, 255, 0.5)',
                borderRadius: '10px',
                color: '#00d9ff',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'Orbitron, sans-serif',
                cursor: createModule.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'none',
                opacity: createModule.isPending ? 0.6 : 1,
              }}
            >
              {createModule.isPending ? 'Creating...' : 'Add Module'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
