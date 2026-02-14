import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'todo' | 'in_progress' | 'done' | 'blocked' | 'default';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          {
            'bg-gray-500/20 text-primary': variant === 'todo',
            'bg-yellow-500/20 text-yellow-300': variant === 'in_progress',
            'bg-green-500/20 text-green-300': variant === 'done',
            'bg-red-500/20 text-red-300': variant === 'blocked',
            'bg-primary/20 text-primary': variant === 'default',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
