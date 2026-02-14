// CURSOR: Global error page

'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <AlertTriangle className="mx-auto mb-4 text-accent" size={48} />
        <h2 className="text-xl font-display text-primary mb-2">
          Application Error
        </h2>
        <p className="text-sm text-red-400/70 mb-4">
          {error.message || 'An error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-red-400/50 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={reset} 
            variant="secondary"
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
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
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
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
