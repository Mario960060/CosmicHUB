'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUpdateTask, useUpdateMinitask } from '@/lib/pm/mutations';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export type MoveTarget =
  | { type: 'module'; id: string; name: string; moduleId: string }
  | { type: 'task'; id: string; name: string; moduleId: string }
  | { type: 'project'; id: string; name: string };

interface MoveToGalaxyDialogProps {
  open: boolean;
  mode: 'task' | 'minitask';
  entityId: string;
  entityName: string;
  projectId: string;
  projectName?: string;
  currentModuleId?: string;
  currentTaskId?: string;
  onSuccess: (target: MoveTarget) => void;
  onClose: () => void;
}

function CollapsibleGroup({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '10px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '14px',
          fontFamily: 'Exo 2, sans-serif',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        {title}
      </button>
      {expanded && (
        <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid rgba(0, 240, 255, 0.3)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MoveToGalaxyDialog({
  open,
  mode,
  entityId,
  entityName,
  projectId,
  projectName = 'Projekt',
  currentModuleId,
  currentTaskId,
  onSuccess,
  onClose,
}: MoveToGalaxyDialogProps) {
  const { confirm, ConfirmDialog: ConfirmDialogEl } = useConfirm();
  const [expandedSun, setExpandedSun] = useState(false);
  const [expandedModules, setExpandedModules] = useState(mode === 'task');
  const [expandedTasks, setExpandedTasks] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MoveTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateTask = useUpdateTask();
  const updateMinitask = useUpdateMinitask();

  const { data: modulesData } = useQuery({
    queryKey: ['modules-for-move', projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('modules')
        .select('id, name')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-for-move', projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('id, name, module_id')
        .in('module_id', (modulesData || []).map((m: { id: string }) => m.id));
      if (tasksErr) throw tasksErr;
      const moduleMap = new Map((modulesData || []).map((m: { id: string; name: string }) => [m.id, m.name]));
      return (tasks || []).map((t: { id: string; name: string; module_id: string }) => ({
        id: t.id,
        name: t.name,
        moduleId: t.module_id,
        moduleName: moduleMap.get(t.module_id) || '?',
      }));
    },
    enabled: open && !!projectId && mode === 'minitask' && (modulesData?.length ?? 0) > 0,
  });

  const modules = useMemo(() => {
    const list = modulesData || [];
    if (mode === 'task' && currentModuleId) {
      return list.filter((m: { id: string }) => m.id !== currentModuleId);
    }
    return list;
  }, [modulesData, mode, currentModuleId]);

  const tasks = useMemo(() => {
    const list = tasksData || [];
    if (mode === 'minitask' && currentTaskId) {
      return list.filter((t: { id: string }) => t.id !== currentTaskId);
    }
    return list;
  }, [tasksData, mode, currentTaskId]);

  const handleMove = async () => {
    if (!selectedTarget || isSubmitting) return;
    const targetName = selectedTarget.name;
    const confirmed = await confirm({
      title: 'Przenoszenie elementu',
      message: mode === 'task'
        ? `Czy na pewno chcesz przenieść ten task ze wszystkimi przynależnymi mu elementami do "${targetName}"?`
        : `Czy na pewno chcesz przenieść ten minitask ze wszystkimi satelitami do "${targetName}"?`,
      confirmLabel: 'Przenieś',
      cancelLabel: 'Anuluj',
      variant: 'warning',
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      if (mode === 'task') {
        if (selectedTarget.type !== 'module') return;
        await updateTask.mutateAsync({
          taskId: entityId,
          updates: { module_id: selectedTarget.id },
        });
        await onSuccess(selectedTarget);
      } else {
        if (selectedTarget.type === 'module') {
          await updateMinitask.mutateAsync({
            minitaskId: entityId,
            updates: { module_id: selectedTarget.id, task_id: null, project_id: null },
          });
        } else if (selectedTarget.type === 'task') {
          await updateMinitask.mutateAsync({
            minitaskId: entityId,
            updates: { task_id: selectedTarget.id, module_id: null, project_id: null },
          });
        } else if (selectedTarget.type === 'project') {
          await updateMinitask.mutateAsync({
            minitaskId: entityId,
            updates: { project_id: selectedTarget.id, task_id: null, module_id: null },
          });
        }
        await onSuccess(selectedTarget);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      toast.error('Nie udało się przenieść', { description: msg || 'Nieznany błąd' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px',
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    background: 'rgba(21, 27, 46, 0.95)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(0, 217, 255, 0.3)',
    borderRadius: '20px',
    boxShadow: '0 0 60px rgba(0, 217, 255, 0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const isSelected = (t: MoveTarget) =>
    selectedTarget?.type === t.type && selectedTarget?.id === t.id;

  return (
    <div onClick={onClose} style={modalStyle}>
      <div onClick={(e) => e.stopPropagation()} style={contentStyle}>
        <div
          style={{
            flexShrink: 0,
            padding: '20px 24px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d9ff',
              fontWeight: 'bold',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🌌</span> Przenieś do innej galaktyki
          </h2>
          <button
            onClick={onClose}
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="scrollbar-cosmic"
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontSize: '14px' }}>
            {entityName}
          </p>

          {mode === 'minitask' && (
            <CollapsibleGroup
              title="Słońce (projekt)"
              expanded={expandedSun}
              onToggle={() => {
                setExpandedSun(!expandedSun);
                setExpandedModules(false);
                setExpandedTasks(false);
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedTarget({ type: 'project', id: projectId, name: projectName })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: isSelected({ type: 'project', id: projectId, name: projectName })
                    ? 'rgba(0, 240, 255, 0.2)'
                    : 'transparent',
                  border: isSelected({ type: 'project', id: projectId, name: projectName })
                    ? '1px solid rgba(0, 240, 255, 0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '13px',
                  fontFamily: 'Exo 2, sans-serif',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ☀️ {projectName}
              </button>
            </CollapsibleGroup>
          )}

          <CollapsibleGroup
            title="Moduły"
            expanded={expandedModules}
            onToggle={() => {
              setExpandedModules(!expandedModules);
              if (!expandedModules) setExpandedTasks(false);
            }}
          >
            {modules.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '8px 0' }}>
                Brak innych modułów
              </p>
            ) : (
              modules.map((m: { id: string; name: string }) => {
                const t: MoveTarget = { type: 'module', id: m.id, name: m.name, moduleId: m.id };
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedTarget(t)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      marginBottom: '6px',
                      background: isSelected(t) ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                      border: isSelected(t) ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '13px',
                      fontFamily: 'Exo 2, sans-serif',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🪐 {m.name}
                  </button>
                );
              })
            )}
          </CollapsibleGroup>

          {mode === 'minitask' && (
            <CollapsibleGroup
              title="Taski (księżyce)"
              expanded={expandedTasks}
              onToggle={() => {
                setExpandedTasks(!expandedTasks);
                if (!expandedTasks) setExpandedModules(false);
              }}
            >
              {tasks.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '8px 0' }}>
                  Brak innych tasków
                </p>
              ) : (
                tasks.map((t: { id: string; name: string; moduleId: string; moduleName: string }) => {
                  const target: MoveTarget = { type: 'task', id: t.id, name: t.name, moduleId: t.moduleId };
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTarget(target)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        marginBottom: '6px',
                        background: isSelected(target) ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                        border: isSelected(target) ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '13px',
                        fontFamily: 'Exo 2, sans-serif',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🌙 {t.name} — {t.moduleName}
                    </button>
                  );
                })
              )}
            </CollapsibleGroup>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderTop: '1px solid rgba(0, 217, 255, 0.2)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              fontFamily: 'Exo 2, sans-serif',
              cursor: 'pointer',
            }}
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={!selectedTarget || isSubmitting}
            style={{
              padding: '10px 20px',
              background: selectedTarget && !isSubmitting ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'Exo 2, sans-serif',
              cursor: selectedTarget && !isSubmitting ? 'pointer' : 'not-allowed',
              opacity: selectedTarget && !isSubmitting ? 1 : 0.6,
            }}
          >
            {isSubmitting ? 'Przenoszenie...' : 'Przenieś'}
          </button>
        </div>
      </div>
      {ConfirmDialogEl}
    </div>
  );
}
