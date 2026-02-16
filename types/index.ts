import type { Database } from './database';

// Extract table types
export type User = Database['public']['Tables']['users']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Module = Database['public']['Tables']['modules']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Minitask = Database['public']['Tables']['minitasks']['Row'];
export type Subtask = Database['public']['Tables']['subtasks']['Row'];
export type Dependency = Database['public']['Tables']['dependencies']['Row'];
export type WorkLog = Database['public']['Tables']['work_logs']['Row'];
export type TaskRequest = Database['public']['Tables']['task_requests']['Row'];
export type ProjectMember = Database['public']['Tables']['project_members']['Row'];
export type Invite = Database['public']['Tables']['invites']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
export type Channel = Database['public']['Tables']['channels']['Row'];
export type ChannelMember = Database['public']['Tables']['channel_members']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageMention = Database['public']['Tables']['message_mentions']['Row'];
export type PrivacySettings = Database['public']['Tables']['privacy_settings']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_log']['Row'];
export type RecentSearch = Database['public']['Tables']['recent_searches']['Row'];

// Enums
export type UserRole = 'admin' | 'project_manager' | 'worker' | 'client';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type SubtaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// Extended types with relations
export interface UserWithProjects extends User {
  projects?: Project[];
}

export interface SubtaskWithDetails extends Subtask {
  assigned_user?: User;
  parent_task?: Task;
}

export interface ProjectWithMembers extends Project {
  members?: User[];
  modules?: Module[];
}

export interface TaskWithSubtasks extends Task {
  subtasks?: Subtask[];
  module?: Module;
}

export interface ModuleWithTasks extends Module {
  tasks?: Task[];
  project?: Project;
}

// Form types (for zod validation)
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  full_name: string;
}

export interface CreateProjectForm {
  name: string;
  description?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateTaskForm {
  name: string;
  description?: string;
  estimated_hours?: number;
  priority_stars?: number;
}

export interface LogWorkForm {
  hours_spent: number;
  work_date: string;
  description?: string;
}

// Dashboard types (DASHBOARD_IMPLEMENTATION_PLAN.md)
export type {
  DeadlineRisk,
  DeadlineRiskLevel,
  RedFlag,
  RedFlagType,
  RedFlagSeverity,
  FocusTask,
  FocusTaskCategory,
  WhatsNewItem,
  WhatsNewItemType,
  DashboardDeadline,
  DashboardDeadlineEntityType,
  DashboardDeadlineBucket,
} from './dashboard';
