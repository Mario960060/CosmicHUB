'use client';

import { useState } from 'react';
import { useCreateDependency } from '@/lib/pm/mutations';
import type { DependencyType } from '@/lib/pm/queries';

interface AddDependencyPopupProps {
  sourceEntityId: string;
  sourceEntityType: 'module' | 'task' | 'subtask';
  targetEntityId: string;
  targetEntityType: 'module' | 'task' | 'subtask';
  targetEntityName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DEPENDENCY_OPTIONS: { value: DependencyType; label: string }[] = [
  { value: 'blocks', label: 'Blocks – B cannot start until A is done' },
  { value: 'depends_on', label: 'Depends on – A should follow B' },
  { value: 'related_to', label: 'Related to – informational link' },
];

export function AddDependencyPopup({
  sourceEntityId,
  sourceEntityType,
  targetEntityId,
  targetEntityType,
  targetEntityName,
  onClose,
  onSuccess,
}: AddDependencyPopupProps) {
  const [type, setType] = useState<DependencyType>('depends_on');
  const [note, setNote] = useState('');
  const createDependency = useCreateDependency();

  const handleSubmit = async () => {
    try {
      await createDependency.mutateAsync({
        sourceType: sourceEntityType,
        sourceId: sourceEntityId,
        targetType: targetEntityType,
        targetId: targetEntityId,
        dependencyType: type,
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
        onClick={onClose}
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
          width: 320,
        background: 'rgba(21, 27, 46, 0.98)',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
        Add dependency → <strong>{targetEntityName}</strong>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DependencyType)}
          className="glass-input"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 13,
          }}
        >
          {DEPENDENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
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
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
          disabled={createDependency.isPending}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 217, 255, 0.3)',
            border: '1px solid rgba(0, 217, 255, 0.5)',
            borderRadius: 8,
            color: '#00d9ff',
            fontSize: 13,
            fontWeight: 600,
            cursor: createDependency.isPending ? 'wait' : 'pointer',
          }}
        >
          {createDependency.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
    </>
  );
}
