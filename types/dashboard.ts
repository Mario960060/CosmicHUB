// Dashboard-specific types - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 1.1

export type DeadlineRiskLevel =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'none';

export interface DeadlineRisk {
  level: DeadlineRiskLevel;
  reason: string;
  daysLeft: number | null;
  hoursRemaining: number | null;
  hoursLogged: number;
  estimatedHours: number | null;
  effortPercent: number;
  taskCompletionPercent: number;
  isOverrun: boolean;
  projectedTotal: number | null;
}

export type RedFlagType =
  | 'deadline'
  | 'anomaly'
  | 'blocked'
  | 'stale'
  | 'unassigned'
  | 'pending_approval';

export type RedFlagSeverity = 'critical' | 'high' | 'medium';

export interface RedFlag {
  id: string;
  type: RedFlagType;
  severity: RedFlagSeverity;
  title: string;
  description: string;
  relatedEntity: {
    type: 'subtask' | 'task' | 'project' | 'module';
    id: string;
    name: string;
  };
  projectName: string;
  assignedTo?: { id: string; name: string };
  metrics?: {
    estimated: number;
    logged: number;
    percent: number;
    daysLeft: number;
  };
  createdAt: string;
}

export type FocusTaskCategory =
  | 'overdue'
  | 'due_today'
  | 'due_this_week'
  | 'in_progress'
  | 'high_priority'
  | 'normal';

export interface FocusTaskParentTask {
  id: string;
  name: string;
  module: {
    id: string;
    name: string;
    color: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export interface FocusTask {
  id: string;
  parent_id: string;
  name: string;
  description: string | null;
  estimated_hours: number | null;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority_stars: number;
  assigned_to: string | null;
  due_date: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  satellite_type: string;
  satellite_data: unknown;
  parent_task: FocusTaskParentTask;
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  work_logs?: { hours_spent: number }[];
  urgencyScore: number;
  urgencyReason: string;
  deadlineRisk: DeadlineRisk;
  hoursLogged: number;
  category: FocusTaskCategory;
}

export type WhatsNewItemType =
  | 'task_assigned'
  | 'status_changed'
  | 'request_response'
  | 'dependency_resolved'
  | 'mention'
  | 'new_blocker'
  | 'task_completed'
  | 'module_completed';

export interface WhatsNewItem {
  id: string;
  type: WhatsNewItemType;
  title: string;
  description: string;
  relatedEntity: { type: string; id: string; name: string };
  actor?: { id: string; name: string; avatarUrl: string | null };
  timestamp: string;
}

export type DashboardDeadlineEntityType = 'subtask' | 'project';

export type DashboardDeadlineBucket =
  | 'overdue'
  | 'today'
  | 'this_week'
  | 'this_month';

export interface DashboardDeadline {
  id: string;
  name: string;
  entityType: DashboardDeadlineEntityType;
  dueDate: string;
  risk: DeadlineRisk;
  projectName: string;
  assignedTo?: { id: string; name: string };
  bucket: DashboardDeadlineBucket;
}
