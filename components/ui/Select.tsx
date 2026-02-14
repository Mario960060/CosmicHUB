// CURSOR: Select dropdown component
// Used for: assigning users, selecting priority, etc.

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg glass-input cursor-pointer',
            'transition-all',
            error && 'border-destructive',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-destructive text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
