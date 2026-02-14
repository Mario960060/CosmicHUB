// CURSOR: Empty state component

import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-primary/60 mb-4">{description}</p>}
      {action && (
        <Button 
          onClick={action.onClick}
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
          {action.label}
        </Button>
      )}
    </div>
  );
}
