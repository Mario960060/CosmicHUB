// CURSOR: Task request card with approve/reject buttons

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import { ApprovalDialog } from './ApprovalDialog';
import type { TaskRequestWithDetails } from '@/lib/pm/queries';

interface RequestCardProps {
  request: TaskRequestWithDetails;
}

export function RequestCard({ request }: RequestCardProps) {
  const [showApproval, setShowApproval] = useState(false);

  return (
    <>
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-lg text-primary">{request.task_name}</h3>
            <p className="text-sm text-primary/60">
              {request.module?.project?.name} &gt; {request.module?.name}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            request.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
            request.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
            request.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-gray-500/20 text-gray-300/70'
          }`}>
            {request.priority}
          </span>
        </div>

        {request.description && (
          <p className="text-sm text-primary mb-3">{request.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-primary/60 mb-3">
          {request.estimated_hours && (
            <span>Est: {request.estimated_hours}h</span>
          )}
          <span>By {request.requester?.full_name}</span>
          <span>{formatRelativeTime(request.created_at)}</span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowApproval(true)}
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
            Review
          </Button>
        </div>
      </Card>

      <ApprovalDialog
        open={showApproval}
        onClose={() => setShowApproval(false)}
        request={request}
      />
    </>
  );
}
