'use client';

import { useState } from 'react';
import { useCreateDependency } from '@/lib/pm/mutations';
import type { DependencyType } from '@/lib/pm/queries';
import './AddDependencyPopup.css';

interface AddDependencyPopupProps {
  sourceEntityId: string;
  sourceEntityType: 'module' | 'task' | 'subtask' | 'minitask' | 'project';
  targetEntityId: string;
  targetEntityType: 'module' | 'task' | 'subtask' | 'minitask' | 'project';
  targetEntityName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_CONFIG: { value: DependencyType; selClass: string; dotClass: string; name: string; desc: string }[] = [
  { value: 'blocks', selClass: 'add-dep-sel-blocks', dotClass: 'add-dep-dot-red', name: 'Blocks', desc: 'Must complete first' },
  { value: 'depends_on', selClass: 'add-dep-sel-depends', dotClass: 'add-dep-dot-amber', name: 'Depends on', desc: 'Should follow' },
  { value: 'related_to', selClass: 'add-dep-sel-related', dotClass: 'add-dep-dot-indigo', name: 'Related to', desc: 'Informational' },
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
    <div className="add-dep-backdrop">
      <div
        className="add-dep-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-dep-title"
      >
        <div className="add-dep-header">
          <div className="add-dep-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <div id="add-dep-title" className="add-dep-title">
            Add dependency → <span>{targetEntityName}</span>
          </div>
        </div>

        <div className="add-dep-body">
          <div>
            <div className="add-dep-field-label">Type</div>
            <div className="add-dep-type-cards">
              {TYPE_CONFIG.map((cfg) => (
                <button
                  key={cfg.value}
                  type="button"
                  className={`add-dep-type-card ${type === cfg.value ? cfg.selClass : ''}`}
                  onClick={() => setType(cfg.value)}
                >
                  <div className={`add-dep-tc-dot ${cfg.dotClass}`} />
                  <div className="add-dep-tc-name">{cfg.name}</div>
                  <div className="add-dep-tc-desc">{cfg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="add-dep-field-label">
              Note <span style={{ opacity: 0.5, letterSpacing: 0 }}>(optional)</span>
            </div>
            <input
              type="text"
              className="add-dep-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Short note..."
              maxLength={200}
            />
          </div>
        </div>

        <div className="add-dep-footer">
          <button type="button" className="add-dep-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="add-dep-btn-add"
            onClick={handleSubmit}
            disabled={createDependency.isPending}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {createDependency.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
