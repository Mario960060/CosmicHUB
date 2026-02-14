import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass' | 'neon' | 'holographic';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variants
          {
            'bg-primary text-background hover:bg-primary/90 glow-cyan':
              variant === 'primary',
            'bg-secondary text-background hover:bg-secondary/90 glow-purple':
              variant === 'secondary',
            'hover:bg-surface hover:text-primary': variant === 'ghost',
            'bg-destructive text-background hover:bg-destructive/90':
              variant === 'destructive',
            'btn-glow text-primary': variant === 'glass',
            'bg-slate-900/40 text-primary border border-primary/50 glow-cyan hover:glow-cyan-lg hover:bg-slate-900/60':
              variant === 'neon',
            'btn-holographic text-primary': variant === 'holographic',
          },
          
          // Sizes
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
