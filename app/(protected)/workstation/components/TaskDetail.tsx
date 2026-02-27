'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSubtask } from '@/lib/workstation/queries';
import {
  useClaimTask,
  useAssignTaskToSelf,
  useUpdateTaskStatus,
  useReleaseClaim,
} from '@/lib/workstation/mutations';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TaskStatusBadge } from './TaskStatusBadge';
import { PriorityStars } from './PriorityStars';
import { TimeLogForm } from './TimeLogForm';
import { WorkLogsList } from './WorkLogsList';
import { DependencyStatus } from '@/components/DependencyStatus';
import { ManageDependenciesDialog } from '@/components/ManageDependenciesDialog';
import { Clock, Calendar, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { SubtaskStatus } from '@/types';

interface TaskDetailProps {
  taskId: string | null;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const { user } = useAuth();
  const { data: task, isLoading } = useSubtask(taskId);
  const [showTimeLogForm, setShowTimeLogForm] = useState(false);
  const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);

  const claimTask = useClaimTask();
  const assignToSelf = useAssignTaskToSelf();
  const updateStatus = useUpdateTaskStatus();
  const releaseClaim = useReleaseClaim();

  if (!taskId) {
    return (
      <div className="flex items-center justify-center h-full text-primary/70">
        Select a task to view details
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-primary/70">
        Loading task details...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-primary/70">
        Task not found
      </div>
    );
  }

  const isAssignedToMe = task.assigned_to === user?.id;
  const isClaimedByMe = task.claimed_by === user?.id;
  const isClaimedByOther = task.claimed_by && task.claimed_by !== user?.id;
  const canClaim = !task.assigned_to && !isClaimedByOther;

  const handleClaim = async () => {
    if (!user) return;
    try {
      await claimTask.mutateAsync({ subtaskId: task.id, userId: user.id });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to claim task');
    }
  };

  const handleAssignToSelf = async () => {
    if (!user) return;
    await assignToSelf.mutateAsync({ subtaskId: task.id, userId: user.id });
  };

  const handleReleaseClaim = async () => {
    await releaseClaim.mutateAsync(task.id);
  };

  const handleStatusChange = async (newStatus: SubtaskStatus) => {
    await updateStatus.mutateAsync({ subtaskId: task.id, status: newStatus });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-primary/20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-primary/60 mb-3">
          <span>{task.parent_task?.module?.project?.name}</span>
          <ArrowRight size={14} />
          <span>{task.parent_task?.module?.name}</span>
          <ArrowRight size={14} />
          <span>{task.parent_task?.name}</span>
        </div>

        {/* Task Title */}
        <h1 className="text-2xl font-display text-primary mb-3">{task.name}</h1>

        {/* Meta Info */}
        <div className="flex items-center gap-4 flex-wrap">
          <TaskStatusBadge status={task.status} />
          <div className="flex items-center gap-1">
            <span className="text-sm text-primary/60">Priority:</span>
            <PriorityStars priority={task.priority_stars} size={14} />
          </div>
          {task.estimated_hours && (
            <div className="flex items-center gap-1 text-sm text-primary/60">
              <Clock size={14} />
              <span>{task.estimated_hours}h estimated</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1 text-sm text-accent/70">
              <Calendar size={14} />
              <span>Due: {formatDate(task.due_date)}</span>
            </div>
          )}
        </div>

        {/* Dependencies Status */}
        <div className="mt-3">
          <DependencyStatus subtaskId={task.id} />
        </div>

        {/* Assigned User */}
        {task.assigned_user && (
          <div className="flex items-center gap-2 mt-3">
            {task.assigned_user.avatar_url ? (
              <img
                src={task.assigned_user.avatar_url}
                alt={task.assigned_user.full_name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                {task.assigned_user.full_name.charAt(0)}
              </div>
            )}
            <span className="text-sm text-primary">
              Assigned to: <strong className="text-primary">{task.assigned_user.full_name}</strong>
            </span>
          </div>
        )}

        {/* Claimed Status */}
        {isClaimedByMe && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-300">
            🔒 You claimed this task. It's reserved for you for 30 minutes.
          </div>
        )}
      </div>

      {/* Content */}
      <div className="scrollbar-cosmic flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        {task.description && (
          <Card>
            <h3 className="font-medium mb-2 text-primary">Description</h3>
            <p className="text-primary whitespace-pre-wrap">{task.description}</p>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <h3 className="font-medium mb-3 text-primary">Actions</h3>
          <div className="space-y-2">
            {/* Manage Dependencies (always visible) */}
            <Button
              onClick={() => setShowDependenciesDialog(true)}
              className="w-full transition-all"
              variant="ghost"
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
              <LinkIcon size={16} className="mr-2" />
              Manage Dependencies
            </Button>

            {/* Claim Task */}
            {canClaim && !isClaimedByMe && (
              <Button
                onClick={handleClaim}
                disabled={claimTask.isPending}
                className="w-full transition-all"
                variant="secondary"
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
                {claimTask.isPending ? 'Claiming...' : '🔒 Claim Task (30 min)'}
              </Button>
            )}

            {/* Release Claim */}
            {isClaimedByMe && (
              <Button
                onClick={handleReleaseClaim}
                disabled={releaseClaim.isPending}
                className="w-full transition-all"
                variant="ghost"
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
                {releaseClaim.isPending ? 'Releasing...' : 'Release Claim'}
              </Button>
            )}

            {/* Assign to Self */}
            {(isClaimedByMe || canClaim) && !task.assigned_to && (
              <Button
                onClick={handleAssignToSelf}
                disabled={assignToSelf.isPending}
                className="w-full transition-all"
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
                {assignToSelf.isPending ? 'Assigning...' : '👤 Assign to Me'}
              </Button>
            )}

            {/* Update Status (only if assigned to me) */}
            {isAssignedToMe && (
              <div className="space-y-2">
                <p className="text-sm text-primary/60">Update Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {task.status !== 'in_progress' && (
                    <Button
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={updateStatus.isPending}
                      variant="secondary"
                      size="sm"
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
                      Start Work
                    </Button>
                  )}
                  {task.status !== 'done' && task.status !== 'todo' && (
                    <Button
                      onClick={() => handleStatusChange('done')}
                      disabled={updateStatus.isPending}
                      variant="primary"
                      size="sm"
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
                      Mark Done
                    </Button>
                  )}
                  {task.status !== 'blocked' && (
                    <Button
                      onClick={() => handleStatusChange('blocked')}
                      disabled={updateStatus.isPending}
                      variant="destructive"
                      size="sm"
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
                      Mark Blocked
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Log Time */}
            {isAssignedToMe && (
              <Button
                onClick={() => setShowTimeLogForm(true)}
                className="w-full transition-all"
                variant="primary"
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
                ⏱️ Log Work Time
              </Button>
            )}
          </div>
        </Card>

        {/* Work Logs */}
        <Card>
          <h3 className="font-medium mb-3 text-primary">Time Logged</h3>
          <WorkLogsList subtaskId={task.id} />
        </Card>

        {/* Metadata */}
        <Card>
          <h3 className="font-medium mb-3 text-primary">Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-primary/60">Created:</span>
              <span className="text-primary">{formatRelativeTime(task.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary/60">Last Updated:</span>
              <span className="text-primary">{formatRelativeTime(task.updated_at)}</span>
            </div>
            {task.due_date && (
              <div className="flex justify-between">
                <span className="text-primary/60">Due Date:</span>
                <span className="text-primary">{formatDate(task.due_date)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Time Log Modal */}
      {showTimeLogForm && (
        <TimeLogForm
          open={showTimeLogForm}
          onClose={() => setShowTimeLogForm(false)}
          subtaskId={task.id}
          subtaskName={task.name}
        />
      )}

      {/* Dependencies Dialog */}
      {showDependenciesDialog && (
        <ManageDependenciesDialog
          open={showDependenciesDialog}
          onClose={() => setShowDependenciesDialog(false)}
          projectId={(task as { parent_task?: { module?: { project?: { id?: string } } } })?.parent_task?.module?.project?.id ?? ''}
          sourceType="subtask"
          sourceId={task.id}
          sourceName={task.name}
        />
      )}
    </div>
  );
}
