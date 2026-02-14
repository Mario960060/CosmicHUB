// CURSOR: Global loading page

import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-primary/70 mt-4">Loading...</p>
      </div>
    </div>
  );
}
