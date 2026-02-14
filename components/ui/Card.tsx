import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'glass' | 'glow' | 'holographic';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'rounded-lg border border-primary/20 bg-surface',
      glass: 'rounded-lg glass-card',
      glow: 'rounded-lg glass-panel',
      holographic: 'rounded-lg stat-holographic',
    };

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          'p-4',
          hoverable && 'cursor-pointer transition-all hover:border-primary/50 hover:glow-cyan',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
