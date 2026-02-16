'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCreateDependency } from '@/lib/pm/mutations';
import type { DependencyType } from '@/lib/pm/queries';

export type PortalTargetEntity = {
  id: string;
  type: 'module' | 'task' | 'subtask';
  name: string;
  parentTaskId?: string;
};

const DEPENDENCY_OPTIONS: { value: DependencyType; label: string }[] = [
  { value: 'blocks', label: 'Blocks – B cannot start until A is done' },
  { value: 'depends_on', label: 'Depends on – A should follow B' },
  { value: 'related_to', label: 'Related to – informational link' },
];

interface PortalTargetPickerProps {
  sourceEntityId: string;
  sourceEntityType: 'module' | 'task' | 'subtask' | 'minitask';
  targetModuleId: string;
  targetModuleName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PortalTargetPicker({
  sourceEntityId,
  sourceEntityType,
  targetModuleId,
  targetModuleName,
  onClose,
  onSuccess,
}: PortalTargetPickerProps) {
  const [entities, setEntities] = useState<PortalTargetEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PortalTargetEntity | null>(null);
  const [dependencyType, setDependencyType] = useState<DependencyType>('depends_on');
  const [note, setNote] = useState('');
  const createDependency = useCreateDependency();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const result: PortalTargetEntity[] = [];

      const { data: moduleData } = await supabase.from('modules').select('id, name').eq('id', targetModuleId).single();
      if (moduleData) {
        result.push({ id: moduleData.id, type: 'module', name: moduleData.name });
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, name')
        .eq('module_id', targetModuleId)
        .order('created_at', { ascending: true });

      for (const task of tasks || []) {
        result.push({ id: task.id, type: 'task', name: task.name });
        const { data: subtasks } = await supabase
          .from('subtasks')
          .select('id, name')
          .eq('parent_id', task.id);

        for (const sub of subtasks || []) {
          result.push({ id: sub.id, type: 'subtask', name: sub.name, parentTaskId: task.id });
        }
      }

      const { data: moduleSubtasks } = await supabase
        .from('subtasks')
        .select('id, name')
        .eq('module_id', targetModuleId);

      for (const sub of moduleSubtasks || []) {
        result.push({ id: sub.id, type: 'subtask', name: sub.name });
      }

      setEntities(result);
      setLoading(false);
    })();
  }, [targetModuleId]);

  const handleSubmit = async () => {
    if (!selected) return;
    try {
      await createDependency.mutateAsync({
        sourceType: sourceEntityType,
        sourceId: sourceEntityId,
        targetType: selected.type,
        targetId: selected.id,
        dependencyType,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 59,
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 60,
          width: 360,
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'rgba(21, 27, 46, 0.98)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 12, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
          Add dependency to module <strong>{targetModuleName}</strong>
        </div>
        <div style={{ marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Select target entity:
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Loading...</div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {entities.map((e) => {
              const isModule = e.type === 'module';
              const isTask = e.type === 'task';
              const isSubtask = e.type === 'subtask';
              const pad = isModule ? 0 : isTask ? 12 : 24;
              const icon = isModule ? '🪐' : isTask ? '🌙' : '📡';
              return (
                <button
                  key={`${e.type}-${e.id}`}
                  type="button"
                  onClick={() => setSelected(e)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    marginBottom: 4,
                    paddingLeft: 12 + pad,
                    background: selected?.id === e.id ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: selected?.id === e.id ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid transparent',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 13,
                    fontFamily: 'Exo 2, sans-serif',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {icon} {e.name}
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <>
            <div style={{ marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Dependency type:</div>
            <select
              value={dependencyType}
              onChange={(e) => setDependencyType(e.target.value as DependencyType)}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginBottom: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
              }}
            >
              {DEPENDENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Short note..."
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.8)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || createDependency.isPending}
            style={{
              padding: '8px 16px',
              background: selected ? 'rgba(0, 217, 255, 0.3)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(0, 217, 255, 0.5)',
              borderRadius: 8,
              color: '#00d9ff',
              fontSize: 13,
              fontWeight: 600,
              cursor: selected && !createDependency.isPending ? 'pointer' : 'not-allowed',
            }}
          >
            {createDependency.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </>
  );
}
