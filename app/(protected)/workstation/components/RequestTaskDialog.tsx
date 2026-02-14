// CURSOR: Worker can submit task request to PM

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { useProjects, useModules } from '@/lib/pm/queries';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const requestSchema = z.object({
  taskName: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  moduleId: z.string().min(1, 'Please select a module'),
});

interface RequestTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RequestTaskDialog({ open, onClose }: RequestTaskDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { data: modules } = useModules(selectedProjectId || null);

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priority, setPriority] = useState('medium');
  const [moduleId, setModuleId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      requestSchema.parse({
        taskName,
        description: description || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        priority,
        moduleId,
      });

      setSubmitting(true);

      const { error } = await supabase.from('task_requests').insert({
        module_id: moduleId,
        requested_by: user.id,
        task_name: taskName,
        description: description || null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        priority,
      });

      if (error) throw error;

      // Invalidate PM requests query
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });

      // Reset and close
      setTaskName('');
      setDescription('');
      setEstimatedHours('');
      setPriority('medium');
      setModuleId('');
      setSelectedProjectId('');
      setErrors({});
      onClose();

      alert('Task request submitted successfully!');
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
        alert('Failed to submit request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Request New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="project" required>Project</Label>
          <Select
            id="project"
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setModuleId(''); // Reset module
            }}
            required
          >
            <option value="">-- Select Project --</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="module" required>Module</Label>
          <Select
            id="module"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            error={errors.moduleId}
            disabled={!selectedProjectId}
            required
          >
            <option value="">-- Select Module --</option>
            {modules?.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="taskName" required>Task Name</Label>
          <Input
            id="taskName"
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Create webhook endpoint"
            error={errors.taskName}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to be done?"
            rows={3}
            error={errors.description}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              step="0.5"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="4"
              error={errors.estimatedHours}
            />
          </div>

          <div>
            <Label htmlFor="priority" required>Priority</Label>
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              error={errors.priority}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
            className="transition-all"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.7)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 188, 212, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitting}
            className="transition-all"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.7)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 188, 212, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
