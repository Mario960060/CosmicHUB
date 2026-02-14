import { Badge } from '@/components/ui/Badge';
import { Circle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SubtaskStatus } from '@/types';

interface TaskStatusBadgeProps {
  status: SubtaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = {
    todo: {
      label: 'To Do',
      icon: Circle,
      variant: 'todo' as const,
    },
    in_progress: {
      label: 'In Progress',
      icon: Loader2,
      variant: 'in_progress' as const,
    },
    done: {
      label: 'Done',
      icon: CheckCircle2,
      variant: 'done' as const,
    },
    blocked: {
      label: 'Blocked',
      icon: AlertCircle,
      variant: 'blocked' as const,
    },
  };

  const { label, icon: Icon, variant } = config[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon size={12} />
      {label}
    </Badge>
  );
}
