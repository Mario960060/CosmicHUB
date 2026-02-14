// CURSOR: Dialog for approving/rejecting task requests

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useApproveRequest, useRejectRequest } from '@/lib/pm/mutations';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import type { TaskRequestWithDetails } from '@/lib/pm/queries';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  request: TaskRequestWithDetails;
}

export function ApprovalDialog({ open, onClose, request }: ApprovalDialogProps) {
  const { user } = useAuth();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [createTask, setCreateTask] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (!user) return;

    await approveRequest.mutateAsync({
      requestId: request.id,
      reviewedBy: user.id,
      createTask,
    });

    onClose();
  };

  const handleReject = async () => {
    if (!user || !rejectionReason.trim()) return;

    await rejectRequest.mutateAsync({
      requestId: request.id,
      reviewedBy: user.id,
      reason: rejectionReason,
    });

    setRejectionReason('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Review Task Request">
      <div className="space-y-4">
        {/* Request Details */}
        <div className="p-3 bg-background rounded border border-primary/10">
          <h3 className="font-medium mb-1 text-primary">{request.task_name}</h3>
          <p className="text-sm text-primary/60 mb-2">
            {request.module?.project?.name} &gt; {request.module?.name}
          </p>
          {request.description && (
            <p className="text-sm text-primary mb-2">{request.description}</p>
          )}
          <div className="flex gap-4 text-xs text-primary/60">
            {request.estimated_hours && <span>Est: {request.estimated_hours}h</span>}
            <span className={`px-2 py-0.5 rounded ${
              request.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
              request.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {request.priority}
            </span>
          </div>
        </div>

        {/* Action Selection */}
        {!action && (
          <div className="flex gap-2">
            <Button
              onClick={() => setAction('approve')}
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
              Approve
            </Button>
            <Button
              onClick={() => setAction('reject')}
              variant="destructive"
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
              Reject
            </Button>
          </div>
        )}

        {/* Approve Flow */}
        {action === 'approve' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createTask"
                checked={createTask}
                onChange={(e) => setCreateTask(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="createTask" className="text-sm">
                Create task and assign to requester
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setAction(null)}
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
                Back
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveRequest.isPending}
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
                {approveRequest.isPending ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        )}

        {/* Reject Flow */}
        {action === 'reject' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" required>Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setAction(null)}
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
                Back
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectRequest.isPending || !rejectionReason.trim()}
                variant="destructive"
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
                {rejectRequest.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
