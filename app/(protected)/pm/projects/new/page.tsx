// REDESIGN: Create New Project - Cosmic Glassmorphism

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useCreateProject } from '@/lib/pm/mutations';
import { useUsers, useModules } from '@/lib/pm/queries';
import { DatePicker } from '@/components/ui/DatePicker';
import { InlineModuleForm } from './components/InlineModuleForm';
import { InlineTaskForm } from './components/InlineTaskForm';
import { InlineMinitaskForm } from './components/InlineMinitaskForm';
import { FolderPlus, User, Calendar, FileText, ArrowLeft, Satellite, CheckCircle, Rocket, LayoutGrid, Globe } from 'lucide-react';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: users } = useUsers();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sunType, setSunType] = useState<'yellow-star' | 'blue-giant' | 'red-dwarf'>('yellow-star');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [hoveredSun, setHoveredSun] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workstation' | 'galactic'>('workstation');

  const clients = users?.filter((u) => u.role === 'client') || [];
  const { data: modules } = useModules(createdProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || createdProjectId) return;

    try {
      // Validate
      projectSchema.parse({
        name,
        description: description || undefined,
        clientId: clientId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setErrors({});

      // Create
      const project = await createProject.mutateAsync({
        name,
        description: description || undefined,
        clientId: clientId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        createdBy: user.id,
        sunType,
      });

      if (activeTab === 'galactic') {
        router.push(`/galactic?project=${project.id}`);
        return;
      }

      // Stay on page - show add modules/tasks section (Workstation tab)
      setCreatedProjectId(project.id);
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
        console.error('Error creating project:', err);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          onMouseEnter={() => setHoveredButton('back')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'rgba(21, 27, 46, 0.6)',
            backdropFilter: 'blur(20px)',
            border: hoveredButton === 'back'
              ? '1px solid rgba(0, 217, 255, 0.5)'
              : '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '12px',
            color: '#00d9ff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '32px',
            transform: hoveredButton === 'back' ? 'translateX(-4px)' : 'translateX(0)',
            boxShadow: hoveredButton === 'back'
              ? '0 0 20px rgba(0, 217, 255, 0.3)'
              : 'none',
          }}
        >
          <ArrowLeft size={18} />
          Back to Projects
        </button>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>☀️</span>
            <h1 style={{
              fontSize: '48px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              textShadow: '0 0 30px rgba(0,217,255,0.5)',
              fontWeight: 'bold',
              margin: 0,
            }}>
              Create New Project
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginLeft: '64px',
          }}>
            Start a new cosmic mission for your team
          </p>
        </div>

        {/* Tabs: Workstation / Galactic */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '6px',
          borderRadius: '12px',
          width: 'fit-content',
          border: '1px solid rgba(0, 217, 255, 0.2)',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('workstation')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: activeTab === 'workstation'
                ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.25), rgba(0, 217, 255, 0.15))'
                : 'transparent',
              border: activeTab === 'workstation'
                ? '1px solid rgba(0, 217, 255, 0.5)'
                : '1px solid transparent',
              borderRadius: '10px',
              color: activeTab === 'workstation' ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            <LayoutGrid size={18} />
            Workstation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('galactic')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: activeTab === 'galactic'
                ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.25), rgba(0, 217, 255, 0.15))'
                : 'transparent',
              border: activeTab === 'galactic'
                ? '1px solid rgba(0, 217, 255, 0.5)'
                : '1px solid transparent',
              borderRadius: '10px',
              color: activeTab === 'galactic' ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            <Globe size={18} />
            Galactic
          </button>
        </div>
        {activeTab === 'galactic' && (
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '16px',
            marginTop: '-8px',
          }}>
            Create project and go straight to galaxy view. Add modules & tasks from galaxy edit mode.
          </p>
        )}

        {/* Form Card */}
        <div
          className="scrollbar-cosmic"
          style={{
            position: 'relative',
            background: 'rgba(21, 27, 46, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '400px',
            height: '400px',
            background: 'rgba(0, 217, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }} />

          <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
            {/* Project Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(0, 217, 255, 0.8)',
                fontWeight: 'bold',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <FolderPlus size={14} />
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E-commerce Automation"
                required
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: errors.name
                    ? '1px solid #ef4444'
                    : focusedInput === 'name'
                    ? '1px solid #00d9ff'
                    : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'name'
                    ? '0 0 20px rgba(0, 217, 255, 0.3)'
                    : 'none',
                }}
              />
              {errors.name && (
                <p style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  marginTop: '6px',
                }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Sun Type Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(0, 217, 255, 0.8)',
                fontWeight: 'bold',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                ☀️ Solar System Type *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                {/* Yellow Star */}
                <div
                  onClick={() => setSunType('yellow-star')}
                  onMouseEnter={() => setHoveredSun('yellow-star')}
                  onMouseLeave={() => setHoveredSun(null)}
                  style={{
                    padding: '16px',
                    background: sunType === 'yellow-star'
                      ? 'rgba(255, 184, 0, 0.15)'
                      : 'rgba(0, 0, 0, 0.3)',
                    border: sunType === 'yellow-star'
                      ? '2px solid rgba(255, 184, 0, 0.6)'
                      : hoveredSun === 'yellow-star'
                      ? '2px solid rgba(255, 184, 0, 0.4)'
                      : '2px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredSun === 'yellow-star' || sunType === 'yellow-star'
                      ? 'translateY(-4px)'
                      : 'translateY(0)',
                    boxShadow: sunType === 'yellow-star'
                      ? '0 0 25px rgba(255, 184, 0, 0.4)'
                      : 'none',
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 12px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #fffbe6, #ffb800, #ff6a00, #cc3300)',
                    boxShadow: '0 0 20px rgba(255, 184, 0, 0.8), 0 0 40px rgba(255, 106, 0, 0.6)',
                  }} />
                  <div style={{
                    textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#ffb800',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Yellow Star
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}>
                    Active Projects
                  </div>
                </div>

                {/* Blue Giant */}
                <div
                  onClick={() => setSunType('blue-giant')}
                  onMouseEnter={() => setHoveredSun('blue-giant')}
                  onMouseLeave={() => setHoveredSun(null)}
                  style={{
                    padding: '16px',
                    background: sunType === 'blue-giant'
                      ? 'rgba(74, 158, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.3)',
                    border: sunType === 'blue-giant'
                      ? '2px solid rgba(74, 158, 255, 0.6)'
                      : hoveredSun === 'blue-giant'
                      ? '2px solid rgba(74, 158, 255, 0.4)'
                      : '2px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredSun === 'blue-giant' || sunType === 'blue-giant'
                      ? 'translateY(-4px)'
                      : 'translateY(0)',
                    boxShadow: sunType === 'blue-giant'
                      ? '0 0 25px rgba(74, 158, 255, 0.4)'
                      : 'none',
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 12px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #e8f4ff, #4a9eff, #1a5fff, #0a2266)',
                    boxShadow: '0 0 20px rgba(74, 158, 255, 0.8), 0 0 40px rgba(26, 95, 255, 0.6)',
                  }} />
                  <div style={{
                    textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#4a9eff',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Blue Giant
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}>
                    Large/Important
                  </div>
                </div>

                {/* Red Dwarf */}
                <div
                  onClick={() => setSunType('red-dwarf')}
                  onMouseEnter={() => setHoveredSun('red-dwarf')}
                  onMouseLeave={() => setHoveredSun(null)}
                  style={{
                    padding: '16px',
                    background: sunType === 'red-dwarf'
                      ? 'rgba(204, 51, 51, 0.15)'
                      : 'rgba(0, 0, 0, 0.3)',
                    border: sunType === 'red-dwarf'
                      ? '2px solid rgba(204, 51, 51, 0.6)'
                      : hoveredSun === 'red-dwarf'
                      ? '2px solid rgba(204, 51, 51, 0.4)'
                      : '2px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredSun === 'red-dwarf' || sunType === 'red-dwarf'
                      ? 'translateY(-4px)'
                      : 'translateY(0)',
                    boxShadow: sunType === 'red-dwarf'
                      ? '0 0 25px rgba(204, 51, 51, 0.4)'
                      : 'none',
                  }}
                >
                  <div style={{
                    width: '50px',
                    height: '50px',
                    margin: '5px auto 17px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #ffd4d4, #cc3333, #881111, #440808)',
                    boxShadow: '0 0 15px rgba(204, 51, 51, 0.8), 0 0 30px rgba(136, 17, 17, 0.6)',
                  }} />
                  <div style={{
                    textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#cc3333',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Red Dwarf
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}>
                    Side Projects
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}>
              {/* Start Date */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <Calendar size={14} />
                  Start Date
                </label>
                <div style={{
                  borderRadius: '12px',
                  border: errors.startDate ? '1px solid #ef4444' : 'transparent',
                  padding: errors.startDate ? '1px' : 0,
                }}>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="dd/mm/yyyy"
                    max={endDate || undefined}
                  />
                </div>
                {errors.startDate && (
                  <p style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    marginTop: '6px',
                  }}>
                    {errors.startDate}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'rgba(0, 217, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <Calendar size={14} />
                  End Date
                </label>
                <div style={{
                  borderRadius: '12px',
                  border: errors.endDate ? '1px solid #ef4444' : 'transparent',
                  padding: errors.endDate ? '1px' : 0,
                }}>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="dd/mm/yyyy"
                    min={startDate || undefined}
                  />
                </div>
                {errors.endDate && (
                  <p style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    marginTop: '6px',
                  }}>
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '36px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(0, 217, 255, 0.8)',
                fontWeight: 'bold',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <FileText size={14} />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Automate product listings and inventory management"
                rows={4}
                onFocus={() => setFocusedInput('description')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingRight: '20px',
                  boxSizing: 'border-box',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: errors.description
                    ? '1px solid #ef4444'
                    : focusedInput === 'description'
                    ? '1px solid #00d9ff'
                    : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'description'
                    ? '0 0 20px rgba(0, 217, 255, 0.3)'
                    : 'none',
                  fontFamily: 'inherit',
                }}
              />
              <p style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: '6px',
                textAlign: 'right',
              }}>
                {description.length} characters
              </p>
              {errors.description && (
                <p style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  marginTop: '6px',
                }}>
                  {errors.description}
                </p>
              )}
            </div>

            {/* Client */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(0, 217, 255, 0.8)',
                fontWeight: 'bold',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <User size={14} />
                Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onFocus={() => setFocusedInput('client')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: focusedInput === 'client'
                    ? '1px solid #00d9ff'
                    : '1px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedInput === 'client'
                    ? '0 0 20px rgba(0, 217, 255, 0.3)'
                    : 'none',
                }}
              >
                <option value="">-- Select Client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} ({client.email})
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  marginTop: '6px',
                }}>
                  {errors.clientId}
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '24px',
              borderTop: '1px solid rgba(0, 217, 255, 0.2)',
            }}>
              {createdProjectId ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '12px',
                  color: '#10b981',
                  fontSize: '14px',
                  fontWeight: 600,
                  width: '100%',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={20} />
                    {activeTab === 'galactic'
                      ? 'Project created! Open in Galaxy View.'
                      : 'Project created! Add modules & tasks below.'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        activeTab === 'galactic'
                          ? `/galactic?project=${createdProjectId}`
                          : `/pm/projects/${createdProjectId}`
                      )
                    }
                    onMouseEnter={() => setHoveredButton('goto')}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                      padding: '8px 20px',
                      background: 'rgba(0, 217, 255, 0.2)',
                      border: '1px solid rgba(0, 217, 255, 0.5)',
                      borderRadius: '8px',
                      color: '#00d9ff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Rocket size={16} />
                    {activeTab === 'galactic' ? 'Open Galaxy View' : 'Go to Project'}
                  </button>
                </div>
              ) : (
                <>
              <button
                type="button"
                onClick={() => router.back()}
                onMouseEnter={() => setHoveredButton('cancel')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '14px 32px',
                  background: 'rgba(100, 116, 139, 0.2)',
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: hoveredButton === 'cancel' ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hoveredButton === 'cancel'
                    ? '0 4px 15px rgba(100, 116, 139, 0.3)'
                    : 'none',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProject.isPending}
                onMouseEnter={() => setHoveredButton('submit')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                  border: '1px solid #00d9ff',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: createProject.isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transform: hoveredButton === 'submit' && !createProject.isPending
                    ? 'translateY(-2px)'
                    : 'translateY(0)',
                  boxShadow: hoveredButton === 'submit' && !createProject.isPending
                    ? '0 8px 25px rgba(0, 217, 255, 0.4)'
                    : 'none',
                  opacity: createProject.isPending ? 0.7 : 1,
                }}
              >
                {createProject.isPending ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0, 217, 255, 0.3)',
                      borderTop: '2px solid #00d9ff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus size={18} />
                    {activeTab === 'galactic' ? 'Create & Open Galaxy' : 'Create Project'}
                  </>
                )}
              </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Phase 2: Add Modules & Tasks (when project created) — Workstation tab only */}
        {createdProjectId && activeTab === 'workstation' && (
          <div style={{
            marginTop: '32px',
            background: 'rgba(21, 27, 46, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.3)',
              }}>
                <Satellite size={22} style={{ color: '#00d9ff' }} />
              </div>
              <h2 style={{
                fontSize: '24px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                fontWeight: 'bold',
                margin: 0,
              }}>
                Add Modules & Tasks
              </h2>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '20px',
            }}>
              Add modules, tasks and minitasks now, or add them later from the project page.
            </p>

            {/* Inline Add Module + Add Minitask (project level) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <InlineModuleForm projectId={createdProjectId} />
              <InlineMinitaskForm
                projectId={createdProjectId}
                parentLabel="projektu"
                onSuccess={() => {}}
              />
            </div>

            {/* List of modules with add task */}
            {modules && modules.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {modules.map((module) => (
                  <div
                    key={module.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(0, 217, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: module.color || '#a855f7',
                        boxShadow: `0 0 10px ${module.color || '#a855f7'}`,
                      }} />
                      <h3 style={{
                        fontSize: '16px',
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#00d9ff',
                        fontWeight: 600,
                        margin: 0,
                      }}>
                        {module.name}
                      </h3>
                      {module.tasks && module.tasks.length > 0 && (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                          {module.tasks.length} task{module.tasks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {module.tasks && module.tasks.length > 0 && (
                      <div style={{ marginBottom: '12px', marginLeft: '16px' }}>
                        {module.tasks.map((task) => {
                          const minitasks = (task as { minitasks?: { id: string; name: string }[] }).minitasks ?? [];
                          return (
                            <div
                              key={task.id}
                              style={{
                                padding: '12px 14px',
                                background: 'rgba(0, 0, 0, 0.25)',
                                borderRadius: '10px',
                                marginBottom: '10px',
                                border: '1px solid rgba(0, 217, 255, 0.1)',
                              }}
                            >
                              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '8px' }}>
                                {task.name}
                              </div>
                              {minitasks.length > 0 && (
                                <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
                                  {minitasks.map((m) => (
                                    <div key={m.id} style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', padding: '4px 0' }}>
                                      🪨 {m.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <InlineMinitaskForm
                                projectId={createdProjectId}
                                taskId={task.id}
                                taskName={task.name}
                                onSuccess={() => {}}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <InlineTaskForm
                        moduleId={module.id}
                        moduleName={module.name}
                      />
                      <InlineMinitaskForm
                        projectId={createdProjectId}
                        moduleId={module.id}
                        moduleName={module.name}
                        onSuccess={() => {}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(0, 217, 255, 0.1)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => router.push(`/pm/projects/${createdProjectId}`)}
                onMouseEnter={() => setHoveredButton('finish')}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.2))',
                  border: '1px solid #00d9ff',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: hoveredButton === 'finish' ? '0 0 20px rgba(0, 217, 255, 0.4)' : 'none',
                }}
              >
                <Rocket size={18} />
                Go to Project
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        select option {
          background: rgba(21, 27, 46, 1);
          color: #00d9ff;
        }
      `}</style>
    </div>
  );
}
