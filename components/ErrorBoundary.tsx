// CURSOR: Reusable error boundary component

'use client';

import { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-xl font-display text-primary mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-red-400/70 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => this.setState({ hasError: false })}
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
                onClick={() => window.location.href = '/dashboard'}
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
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
