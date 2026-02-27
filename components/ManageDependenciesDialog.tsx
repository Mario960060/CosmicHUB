// CURSOR: Dialog for managing subtask dependencies – UI from reference HTML

'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { createPortal } from 'react-dom';
import { useCreateDependency, useDeleteDependency } from '@/lib/pm/mutations';
import { useDependenciesForEntity, type DependencyType, type DependencyWithTarget } from '@/lib/pm/queries';
import { DependencyTargetPicker, type SelectedTarget } from '@/components/DependencyTargetPicker';
import { AlertCircle } from 'lucide-react';
import './ManageDependenciesDialog.css';

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  blocks: 'Blocks',
  depends_on: 'Depends on',
  related_to: 'Related to',
};

function formatStatus(status: string): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'in_progress':
      return 'In Progress';
    case 'blocked':
      return 'Blocked';
    default:
      return 'To Do';
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'done':
      return 'done';
    case 'in_progress':
      return 'progress';
    default:
      return '';
  }
}

function formatSatelliteLabel(satelliteType: string | null | undefined): string {
  if (!satelliteType) return 'Notes satellite';
  const label = satelliteType.charAt(0).toUpperCase() + satelliteType.slice(1).replace(/_/g, ' ');
  return `${label} satellite`;
}

function DepCard({
  dep,
  depType,
  onRemove,
  isPending,
  DEPENDENCY_TYPE_LABELS,
}: {
  dep: DependencyWithTarget;
  depType: DependencyType;
  onRemove: () => void;
  isPending: boolean;
  DEPENDENCY_TYPE_LABELS: Record<DependencyType, string>;
}) {
  const status = dep.target_status || 'todo';
  const typeBarClass =
    depType === 'blocks' ? 'blocks' : depType === 'depends_on' ? 'depends' : 'related';
  return (
    <div className="manage-deps-dep-card">
      <div className={`manage-deps-dep-type-bar ${typeBarClass}`} />
      <div className="manage-deps-dep-info">
        <div className="manage-deps-dep-name">{dep.target_name}</div>
        <div className="manage-deps-dep-meta">
          <span className={`manage-deps-dep-type-badge ${typeBarClass}`}>
            {DEPENDENCY_TYPE_LABELS[depType]}
          </span>
          {dep.target_status && (
            <span className={`manage-deps-dep-status ${getStatusClass(status)}`}>
              {formatStatus(status)}
            </span>
          )}
          {dep.target_satellite_type && (
            <span>{formatSatelliteLabel(dep.target_satellite_type)}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="manage-deps-dep-remove"
        onClick={onRemove}
        disabled={isPending}
        title="Remove"
      >
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

interface ManageDependenciesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sourceType: 'subtask' | 'task' | 'minitask' | 'module' | 'project';
  sourceId: string;
  sourceName: string;
}

export function ManageDependenciesDialog({
  open,
  onClose,
  projectId,
  sourceType,
  sourceId,
  sourceName,
}: ManageDependenciesDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [selectedType, setSelectedType] = useState<DependencyType>('blocks');
  const [error, setError] = useState('');

  const { data: depResult, isLoading: loadingDeps } = useDependenciesForEntity(sourceType, sourceId);
  const dependencies = depResult?.all ?? [];
  const outgoing = depResult?.outgoing ?? [];
  const incoming = depResult?.incoming ?? [];
  const createDependency = useCreateDependency();
  const deleteDependency = useDeleteDependency();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddDependency = async () => {
    if (!selectedTarget) {
      setError('Wybierz cel zależności');
      return;
    }
    if (sourceType === selectedTarget.type && sourceId === selectedTarget.id) {
      setError('Nie można utworzyć zależności do samego siebie');
      return;
    }

    try {
      await createDependency.mutateAsync({
        sourceType,
        sourceId,
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        dependencyType: selectedType,
      });
      setSelectedTarget(null);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać zależności');
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    try {
      await deleteDependency.mutateAsync({ dependencyId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  };

  const selectType = (type: DependencyType) => setSelectedType(type);

  if (!mounted) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const dialogContent = (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="manage-deps-backdrop" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto" style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 9999 }}>
          <div className="flex min-h-full items-center justify-center p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel className="manage-deps-popup">
                {/* Header */}
                <div className="manage-deps-header">
                  <div className="manage-deps-header-left">
                    <div className="manage-deps-header-icon">
                      <svg viewBox="0 0 24 24">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </div>
                    <div className="manage-deps-title">Manage Dependencies</div>
                  </div>
                  <button type="button" onClick={onClose} className="manage-deps-close">
                    ✕ Close
                  </button>
                </div>

                {/* Context */}
                <div className="manage-deps-context">
                  <div className="manage-deps-context-name">{sourceName}</div>
                  <div className="manage-deps-context-desc">
                    Only <strong>Blocks</strong> type prevents starting.{' '}
                    <strong>Depends on</strong> and <strong>Related to</strong> are informational.
                  </div>
                </div>

                {/* Content */}
                <div className="manage-deps-content">
                  {/* Current dependencies – outgoing & incoming */}
                  <div>
                    <div className="manage-deps-section-label">
                      Zależności ({dependencies.length})
                    </div>
                    <div className="manage-deps-dep-list">
                      {loadingDeps ? (
                        <div className="manage-deps-dep-empty">Ładowanie...</div>
                      ) : dependencies.length > 0 ? (
                        <>
                          {outgoing.length > 0 && (
                            <>
                              <div className="manage-deps-subsection">Zależy od</div>
                              {outgoing.map((dep) => (
                                <DepCard
                                  key={dep.id}
                                  dep={dep}
                                  depType={dep.dependency_type as DependencyType}
                                  onRemove={() => handleDeleteDependency(dep.id)}
                                  isPending={deleteDependency.isPending}
                                  DEPENDENCY_TYPE_LABELS={DEPENDENCY_TYPE_LABELS}
                                />
                              ))}
                            </>
                          )}
                          {incoming.length > 0 && (
                            <>
                              <div className="manage-deps-subsection">Od tego zależy</div>
                              {incoming.map((dep) => (
                                <DepCard
                                  key={dep.id}
                                  dep={dep}
                                  depType={dep.dependency_type as DependencyType}
                                  onRemove={() => handleDeleteDependency(dep.id)}
                                  isPending={deleteDependency.isPending}
                                  DEPENDENCY_TYPE_LABELS={DEPENDENCY_TYPE_LABELS}
                                />
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="manage-deps-dep-empty">
                          Brak zależności. Możesz zacząć w dowolnym momencie.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add new dependency */}
                  <div>
                    <div className="manage-deps-section-label">Add Dependency</div>
                    <div className="manage-deps-add-form">
                      {/* Type selector */}
                      <div>
                        <div className="manage-deps-form-label">Type</div>
                        <div className="manage-deps-type-options">
                          <button
                            type="button"
                            className={`manage-deps-type-opt t-blocks ${selectedType === 'blocks' ? 'selected' : ''}`}
                            onClick={() => selectType('blocks')}
                          >
                            <div className="manage-deps-type-dot c-red" />
                            <div>
                              <div className="manage-deps-type-label">Blocks</div>
                              <div className="manage-deps-type-desc">Must complete first</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`manage-deps-type-opt t-depends ${selectedType === 'depends_on' ? 'selected' : ''}`}
                            onClick={() => selectType('depends_on')}
                          >
                            <div className="manage-deps-type-dot c-amber" />
                            <div>
                              <div className="manage-deps-type-label">Depends on</div>
                              <div className="manage-deps-type-desc">Should follow</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`manage-deps-type-opt t-related ${selectedType === 'related_to' ? 'selected' : ''}`}
                            onClick={() => selectType('related_to')}
                          >
                            <div className="manage-deps-type-dot c-indigo" />
                            <div>
                              <div className="manage-deps-type-label">Related to</div>
                              <div className="manage-deps-type-desc">Informational link</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Target picker (hierarchical) */}
                      <div className="manage-deps-form-field">
                        <div className="manage-deps-form-label">Cel zależności</div>
                        <DependencyTargetPicker
                          projectId={projectId}
                          excludeEntityId={sourceId}
                          selected={selectedTarget}
                          onSelect={setSelectedTarget}
                        />
                      </div>

                      {error && (
                        <div className="manage-deps-error">
                          <AlertCircle size={14} />
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        className="manage-deps-btn-add"
                        onClick={handleAddDependency}
                        disabled={!selectedTarget || createDependency.isPending}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {createDependency.isPending ? 'Adding...' : 'Add Dependency'}
                      </button>
                    </div>
                  </div>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );

  return createPortal(dialogContent, modalRoot);
}
