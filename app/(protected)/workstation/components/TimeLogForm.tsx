'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLogWorkTime } from '@/lib/workstation/mutations';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { z } from 'zod';

const workLogSchema = z.object({
  hours: z.number().min(0.25).max(24),
  workDate: z.string().refine((date) => new Date(date) <= new Date(), {
    message: 'Work date cannot be in the future',
  }),
  description: z.string().max(500).optional(),
});

interface TimeLogFormProps {
  open: boolean;
  onClose: () => void;
  subtaskId: string;
  subtaskName: string;
}

export function TimeLogForm({ open, onClose, subtaskId, subtaskName }: TimeLogFormProps) {
  const { user } = useAuth();
  const logWorkTime = useLogWorkTime();

  const [hours, setHours] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validate
      const validated = workLogSchema.parse({
        hours: parseFloat(hours),
        workDate,
        description: description || undefined,
      });

      // Submit
      await logWorkTime.mutateAsync({
        subtaskId,
        userId: user.id,
        hours: validated.hours,
        workDate: validated.workDate,
        description: validated.description,
      });

      // Reset and close
      setHours('');
      setWorkDate(new Date().toISOString().split('T')[0]);
      setDescription('');
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

  return (
    <Dialog open={open} onClose={onClose} title="Log Work Time">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-primary/60 mb-1">Task</p>
          <p className="text-primary font-medium">{subtaskName}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Hours Spent *</label>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="2.5"
            error={errors.hours}
            required
          />
          <p className="text-xs text-primary/60 mt-1">Min: 0.25h (15min), Max: 24h</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Work Date *</label>
          <DatePicker
            value={workDate}
            onChange={setWorkDate}
            placeholder="Select date"
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.workDate && <p className="text-destructive text-sm mt-1">{errors.workDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
            error={errors.description}
          />
          <p className="text-xs text-primary/60 mt-1">
            {description.length}/500 characters
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="flex-1 transition-all"
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
            disabled={logWorkTime.isPending}
            className="flex-1 transition-all"
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
            {logWorkTime.isPending ? 'Logging...' : 'Log Time'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
