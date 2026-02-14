// CURSOR: Dialog for managing subtask dependencies

'use client';

import { useState } from 'react';
import { useCreateDependency, useDeleteDependency } from '@/lib/pm/mutations';
import { useDependencies, useAvailableSubtasksForDependency, type DependencyType } from '@/lib/pm/queries';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { AlertCircle, Link as LinkIcon, Trash2, CheckCircle2, Clock, Circle } from 'lucide-react';

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  blocks: 'Blocks (hard) – B cannot start until A is done',
  depends_on: 'Depends on – A should follow B, but can start earlier',
  related_to: 'Related to – informational link only',
};

interface ManageDependenciesDialogProps {
  open: boolean;
  onClose: () => void;
  subtaskId: string;
  subtaskName: string;
}

export function ManageDependenciesDialog({
  open,
  onClose,
  subtaskId,
  subtaskName,
}: ManageDependenciesDialogProps) {
  const [selectedSubtaskId, setSelectedSubtaskId] = useState('');
  const [selectedType, setSelectedType] = useState<DependencyType>('depends_on');
  const [error, setError] = useState('');

  const { data: dependencies, isLoading: loadingDeps } = useDependencies(subtaskId);
  const { data: availableSubtasks, isLoading: loadingAvailable } = useAvailableSubtasksForDependency(subtaskId);
  const createDependency = useCreateDependency();
  const deleteDependency = useDeleteDependency();

  const handleAddDependency = async () => {
    if (!selectedSubtaskId) {
      setError('Please select a subtask');
      return;
    }

    try {
      await createDependency.mutateAsync({
        sourceType: 'subtask',
        sourceId: subtaskId,
        targetType: 'subtask',
        targetId: selectedSubtaskId,
        dependencyType: selectedType,
      });
      setSelectedSubtaskId('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to add dependency');
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    try {
      await deleteDependency.mutateAsync({ dependencyId });
    } catch (err: any) {
      setError(err.message || 'Failed to remove dependency');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-primary/40" />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Manage Dependencies" maxWidth="lg">
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary/80">
            <strong>&quot;{subtaskName}&quot;</strong> – only <strong>Blocks</strong> type blocks the subtask. Depends on and Related to are soft/informational.
          </p>
        </div>

        {/* Current Dependencies */}
        <div>
          <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Current Dependencies ({dependencies?.length || 0})
          </h4>

          {loadingDeps ? (
            <p className="text-sm text-primary/60">Loading...</p>
          ) : dependencies && dependencies.length > 0 ? (
            <div className="space-y-2">
              {dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between bg-surface border border-primary/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(dep.depends_on_subtask?.status || 'todo')}
                    <div>
                      <p className="text-sm text-primary">
                        {dep.depends_on_subtask?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-primary/50 capitalize">
                        {dep.dependency_type || 'depends_on'} · Status: {dep.depends_on_subtask?.status || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDependency(dep.id)}
                    disabled={deleteDependency.isPending}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary/60 italic">
              No dependencies yet. This subtask can be started anytime.
            </p>
          )}
        </div>

        {/* Add New Dependency */}
        <div className="border-t border-primary/20 pt-4">
          <Label htmlFor="dependsOn">Add Dependency</Label>
          <p className="text-xs text-primary/60 mb-3">
            Select type and subtask
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="depType" className="text-xs">Type</Label>
              <select
                id="depType"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DependencyType)}
                className="w-full mt-1 px-4 py-2 rounded-lg text-sm glass-input focus:outline-none focus:ring-2 focus:ring-[rgba(0,188,212,0.5)]"
              >
                {(Object.keys(DEPENDENCY_TYPE_LABELS) as DependencyType[]).map((t) => (
                  <option key={t} value={t}>{DEPENDENCY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <select
              id="dependsOn"
              value={selectedSubtaskId}
              onChange={(e) => {
                setSelectedSubtaskId(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2 rounded-lg text-sm glass-input focus:outline-none focus:ring-2 focus:ring-[rgba(0,188,212,0.5)]"
              disabled={loadingAvailable}
            >
              <option value="">-- Select a subtask --</option>
              {availableSubtasks?.map((subtask: any) => {
                const mod = subtask.task?.module?.name || '';
                const task = subtask.task?.name;
                const parts = [mod, task, subtask.name].filter(Boolean);
                const label = parts.join(' → ').replace(/ → - → /, ' → ');
                return (
                  <option key={subtask.id} value={subtask.id}>
                    {label} ({subtask.status})
                  </option>
                );
              })}
            </select>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="button"
              onClick={handleAddDependency}
              disabled={!selectedSubtaskId || createDependency.isPending}
              className="w-full"
            >
              {createDependency.isPending ? 'Adding...' : 'Add Dependency'}
            </Button>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-primary/20">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
