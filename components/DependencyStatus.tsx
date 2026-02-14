// CURSOR: Display dependency status for a subtask

'use client';

import { useDependencies, useIsSubtaskBlocked } from '@/lib/pm/queries';
import { AlertCircle, Link as LinkIcon, CheckCircle2, Clock, Circle } from 'lucide-react';

interface DependencyStatusProps {
  subtaskId: string;
  className?: string;
}

export function DependencyStatus({ subtaskId, className = '' }: DependencyStatusProps) {
  const { data: dependencies, isLoading } = useDependencies(subtaskId);
  const { data: isBlocked } = useIsSubtaskBlocked(subtaskId);

  if (isLoading) return null;
  if (!dependencies || dependencies.length === 0) return null;

  const completedCount = dependencies.filter(
    (dep) => dep.depends_on_subtask?.status === 'done'
  ).length;
  const totalCount = dependencies.length;
  const allCompleted = completedCount === totalCount;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isBlocked ? (
        <>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400">
            Blocked ({completedCount}/{totalCount} dependencies completed)
          </span>
        </>
      ) : allCompleted ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400">
            All dependencies completed
          </span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400">
            {completedCount}/{totalCount} dependencies completed
          </span>
        </>
      )}
    </div>
  );
}

interface DependencyBadgeProps {
  subtaskId: string;
  onClick?: () => void;
}

export function DependencyBadge({ subtaskId, onClick }: DependencyBadgeProps) {
  const { data: dependencies, isLoading } = useDependencies(subtaskId);
  const { data: isBlocked } = useIsSubtaskBlocked(subtaskId);

  if (isLoading) return null;
  if (!dependencies || dependencies.length === 0) return null;

  const completedCount = dependencies.filter(
    (dep) => dep.depends_on_subtask?.status === 'done'
  ).length;
  const totalCount = dependencies.length;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        isBlocked
          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
          : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
      }`}
      title={`${completedCount}/${totalCount} dependencies completed`}
    >
      <LinkIcon className="w-3 h-3" />
      {completedCount}/{totalCount}
    </button>
  );
}
