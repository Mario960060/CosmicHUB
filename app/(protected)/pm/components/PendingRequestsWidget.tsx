// CURSOR: Widget showing pending task requests
// Click to navigate to requests page

'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePendingRequests } from '@/lib/pm/queries';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';

export function PendingRequestsWidget() {
  const { user } = useAuth();
  const { data: requests, isLoading } = usePendingRequests(user?.id);
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-medium mb-4 text-primary">Pending Requests</h3>
        <p className="text-primary/70 text-sm">Loading...</p>
      </Card>
    );
  }

  const recentRequests = requests?.slice(0, 3) || [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-primary">Pending Requests</h3>
        {requests && requests.length > 0 && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
            {requests.length}
          </span>
        )}
      </div>

      {recentRequests.length === 0 ? (
        <p className="text-primary/70 text-sm">No pending requests</p>
      ) : (
        <div className="space-y-3">
          {recentRequests.map((request) => (
            <div
              key={request.id}
              className="p-3 bg-background rounded border border-primary/10 hover:border-primary/30 transition cursor-pointer"
              onClick={() => router.push('/pm/requests')}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm text-primary">{request.task_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  request.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                  request.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                  request.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300/70'
                }`}>
                  {request.priority}
                </span>
              </div>
              <p className="text-xs text-primary/60 mb-1">
                {request.module?.project?.name} &gt; {request.module?.name}
              </p>
              <p className="text-xs text-primary/50">
                By {request.requester?.full_name} • {formatRelativeTime(request.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {requests && requests.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/pm/requests')}
          className="w-full mt-3 transition-all"
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
          View All ({requests.length})
        </Button>
      )}
    </Card>
  );
}
