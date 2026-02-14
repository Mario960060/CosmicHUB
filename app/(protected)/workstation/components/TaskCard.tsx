import { Card } from '@/components/ui/Card';
import { TaskStatusBadge } from './TaskStatusBadge';
import { PriorityStars } from './PriorityStars';
import { DependencyBadge } from '@/components/DependencyStatus';
import type { SubtaskWithDetails } from '@/lib/workstation/queries';

interface TaskCardProps {
  task: SubtaskWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  const moduleName = task.parent_task?.module?.name || 'Unknown Module';
  const projectName = task.parent_task?.module?.project?.name || 'Unknown Project';
  const moduleColor = task.parent_task?.module?.color || '#a855f7';

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-lg p-4 cursor-pointer transition-all relative overflow-hidden group ${
        isSelected ? 'border-primary/60 shadow-[0_0_30px_rgba(0,217,255,0.4)] bg-primary/10' : ''
      }`}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10">
        {/* Project/Module Context with colored dot */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: moduleColor, color: moduleColor }}
          />
          <span className="text-xs text-primary/60 truncate">
            {projectName} <span className="text-primary/50">›</span> {moduleName}
          </span>
        </div>

        {/* Task Name */}
        <h3 className="font-medium text-primary mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {task.name}
        </h3>

        {/* Footer: Status + Priority + Dependencies */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <DependencyBadge subtaskId={task.id} />
          </div>
          <PriorityStars priority={task.priority_stars} />
        </div>

        {/* Assigned User (if any) */}
        {task.assigned_user && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/20">
            {task.assigned_user.avatar_url ? (
              <img
                src={task.assigned_user.avatar_url}
                alt={task.assigned_user.full_name}
                className="w-6 h-6 rounded-full border border-primary/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs text-primary">
                {task.assigned_user.full_name.charAt(0)}
              </div>
            )}
            <span className="text-xs text-primary/60 truncate">{task.assigned_user.full_name}</span>
          </div>
        )}
      </div>
      
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary to-transparent" />
      )}
    </div>
  );
}
