// CURSOR: Task requests list page

'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePendingRequests } from '@/lib/pm/queries';
import { RequestCard } from './components/RequestCard';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function RequestsPage() {
  const { user } = useAuth();
  const { data: requests, isLoading } = usePendingRequests(user?.id);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/20 bg-surface">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/pm')}
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
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-2xl font-display text-primary">Task Requests</h1>
          {requests && requests.length > 0 && (
            <span className="text-sm bg-accent/20 text-accent px-2 py-0.5 rounded">
              {requests.length} pending
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center text-primary/70 py-12">Loading requests...</div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-4 max-w-3xl">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-primary/70">No pending requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
