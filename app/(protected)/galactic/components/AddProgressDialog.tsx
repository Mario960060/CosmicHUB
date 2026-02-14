// Add Progress modal - hours spent + progress %
// Used from EditTaskDialog (moon) and EditModuleDialog (planet)

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useLogWorkTime } from '@/lib/workstation/mutations';
import { useAuth } from '@/hooks/use-auth';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddProgressDialogProps {
  open: boolean;
  entityType: 'task' | 'module';
  entityId: string;
  entityName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddProgressDialog({
  open,
  entityType,
  entityId,
  entityName,
  onClose,
  onSuccess,
}: AddProgressDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logWorkTime = useLogWorkTime();
  const [hours, setHours] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetSubtaskId, setTargetSubtaskId] = useState<string | null>(null);
  const [subtasksForProgress, setSubtasksForProgress] = useState<{ id: string }[]>([]);
  const [tasksForProgress, setTasksForProgress] = useState<{ id: string; subtasks: { id: string }[] }[]>([]);

  useEffect(() => {
    if (open && entityId) {
      setLoading(true);
      const supabase = createClient();
      if (entityType === 'task') {
        supabase
          .from('subtasks')
          .select('id')
          .eq('parent_id', entityId)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            const list = (data || []) as { id: string }[];
            setSubtasksForProgress(list);
            setTargetSubtaskId(list[0]?.id ?? null);
            setLoading(false);
          });
      } else {
        supabase
          .from('tasks')
          .select('id, subtasks(id)')
          .eq('module_id', entityId)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            const tasks = (data || []) as { id: string; subtasks: { id: string }[] }[];
            setTasksForProgress(tasks);
            const firstSubtask = tasks.find((t) => t.subtasks?.length)?.subtasks?.[0]?.id ?? null;
            setTargetSubtaskId(firstSubtask);
            setLoading(false);
          });
      }
    }
  }, [open, entityId, entityType]);

  const resetForm = () => {
    setHours('');
    setProgressPercent('');
  };

  const ensureSubtaskForWorkLog = async (): Promise<string | null> => {
    const supabase = createClient();
    let subtaskId = targetSubtaskId;

    if (!subtaskId && entityType === 'task') {
      const { data: newSubtask, error } = await supabase
        .from('subtasks')
        .insert({
          parent_id: entityId,
          name: 'Postęp',
          status: 'in_progress',
          created_by: user!.id,
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Nie udało się utworzyć subtaska');
        return null;
      }
      subtaskId = newSubtask.id;
      setTargetSubtaskId(subtaskId);
      setSubtasksForProgress((prev) => [...prev, { id: subtaskId! }]);
      return subtaskId;
    }

    if (!subtaskId && entityType === 'module') {
      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          module_id: entityId,
          name: 'Postęp modułu',
          created_by: user!.id,
        })
        .select('id')
        .single();
      if (taskErr) {
        toast.error('Nie udało się utworzyć zadania');
        return null;
      }
      const { data: newSubtask, error: subErr } = await supabase
        .from('subtasks')
        .insert({
          parent_id: newTask.id,
          name: 'Postęp',
          status: 'in_progress',
          created_by: user!.id,
        })
        .select('id')
        .single();
      if (subErr) {
        toast.error('Nie udało się utworzyć subtaska');
        return null;
      }
      subtaskId = newSubtask.id;
      setTargetSubtaskId(subtaskId);
      setTasksForProgress((prev) => [...prev, { id: newTask.id, subtasks: [{ id: subtaskId! }] }]);
      return subtaskId;
    }

    return subtaskId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      toast.error('Wpisz godziny (0.1–24)');
      return;
    }
    if (!user?.id) {
      toast.error('Zaloguj się');
      return;
    }

    const subtaskId = await ensureSubtaskForWorkLog();
    if (!subtaskId) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await logWorkTime.mutateAsync({
        subtaskId,
        userId: user.id,
        hours: hoursNum,
        workDate: today,
      });
    } catch (err) {
      toast.error('Nie udało się dodać logu');
      return;
    }

    const percent = progressPercent.trim() ? parseInt(progressPercent, 10) : null;
    if (percent != null && !isNaN(percent) && percent >= 0 && percent <= 100) {
      const supabase = createClient();
      if (entityType === 'task') {
        await supabase.from('tasks').update({ progress_percent: percent }).eq('id', entityId);
      } else {
        await supabase.from('modules').update({ progress_percent: percent }).eq('id', entityId);
      }
    }

    resetForm();
    toast.success('Dodano postęp');
    queryClient.invalidateQueries({ queryKey: ['galactic-data'] });
    if (entityType === 'module') {
      queryClient.invalidateQueries({ queryKey: ['planet-details', entityId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['moon-details', entityId] });
    }
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  const modalStyle = {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '24px',
  };

  const inputBase = {
    width: '100%' as const,
    padding: '14px 24px 14px 18px',
    background: 'rgba(0, 0, 0, 0.35)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.25s ease',
    fontFamily: "'Exo 2', sans-serif",
    border: '1px solid rgba(0, 217, 255, 0.35)',
  };

  const content = (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .add-progress-input::-webkit-inner-spin-button,
        .add-progress-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .add-progress-input { -moz-appearance: textfield; }
      `}} />
      <div onClick={handleClose} style={modalStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        minWidth: '400px',
        background: 'rgba(21, 27, 46, 0.98)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        borderRadius: '24px',
        boxShadow: '0 0 80px rgba(0, 217, 255, 0.25), 0 4px 24px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{
            fontSize: '22px',
            fontFamily: "'Orbitron', sans-serif",
            color: '#00d9ff',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '0.5px',
          }}>
            Add progress
          </h3>
          <button
            onClick={handleClose}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '17px' }}>
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px', overflowY: 'auto' }}>
            <div style={{ marginBottom: '22px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#00d9ff',
                marginBottom: '10px',
                fontFamily: "'Exo 2', sans-serif",
              }}>
                Godziny <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="np. 2.5"
                required
                className="add-progress-input"
                style={inputBase}
              />
            </div>
            <div style={{ marginBottom: '26px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#00d9ff',
                marginBottom: '10px',
                fontFamily: "'Exo 2', sans-serif",
              }}>
                Postęp %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={progressPercent}
                onChange={(e) => setProgressPercent(e.target.value)}
                placeholder="np. 50"
                className="add-progress-input"
                style={inputBase}
              />
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.55)',
                marginTop: '6px',
                fontFamily: "'Exo 2', sans-serif",
              }}>
                Opcjonalnie – ustaw procent zakończenia
              </p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '14px 26px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: "'Exo 2', sans-serif",
                  cursor: 'pointer',
                }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={logWorkTime.isPending}
                style={{
                  padding: '14px 26px',
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.25), rgba(0, 188, 212, 0.25))',
                  border: '1px solid rgba(0, 217, 255, 0.6)',
                  borderRadius: '12px',
                  color: '#00d9ff',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: "'Orbitron', sans-serif",
                  cursor: logWorkTime.isPending ? 'not-allowed' : 'pointer',
                  opacity: logWorkTime.isPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Plus size={18} />
                {logWorkTime.isPending ? 'Zapisywanie...' : 'Dodaj'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
