import { useWorkLogs } from '@/lib/workstation/queries';
import { Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface WorkLogsListProps {
  subtaskId: string;
}

export function WorkLogsList({ subtaskId }: WorkLogsListProps) {
  const { data: workLogs, isLoading } = useWorkLogs(subtaskId);

  if (isLoading) {
    return <div className="text-primary/70 text-sm">Loading work logs...</div>;
  }

  if (!workLogs || workLogs.length === 0) {
    return (
      <div className="text-primary/70 text-sm text-center py-4">
        No time logged yet
      </div>
    );
  }

  const totalHours = workLogs.reduce((sum, log) => sum + log.hours_spent, 0);

  return (
    <div className="space-y-3">
      {/* Total */}
      <div className="flex items-center gap-2 text-primary font-medium">
        <Clock size={16} />
        Total: {totalHours.toFixed(2)}h
      </div>

      {/* Logs */}
      {workLogs.map((log) => (
        <div key={log.id} className="border-l-2 border-primary/30 pl-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {log.user?.avatar_url ? (
                <img
                  src={log.user.avatar_url}
                  alt={log.user.full_name}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                  {log.user?.full_name.charAt(0)}
                </div>
              )}
              <span className="text-sm text-primary">{log.user?.full_name}</span>
            </div>
            <span className="text-sm font-medium text-primary">
              {log.hours_spent}h
            </span>
          </div>

          <div className="text-xs text-primary/60 mb-1">
            {formatDate(log.work_date)}
          </div>

          {log.description && (
            <p className="text-sm text-primary mt-2">
              {log.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
