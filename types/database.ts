// This file will be auto-generated from Supabase
// For now, using manual types until database is set up
// Regenerate with: npx supabase gen types typescript --linked > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'project_manager' | 'worker' | 'client';
          avatar_url: string | null;
          bio: string | null;
          last_seen: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'project_manager' | 'worker' | 'client';
          avatar_url?: string | null;
          bio?: string | null;
          last_seen?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'project_manager' | 'worker' | 'client';
          avatar_url?: string | null;
          bio?: string | null;
          last_seen?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          client_id: string | null;
          status: 'active' | 'on_hold' | 'completed' | 'cancelled';
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          client_id?: string | null;
          status?: 'active' | 'on_hold' | 'completed' | 'cancelled';
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          client_id?: string | null;
          status?: 'active' | 'on_hold' | 'completed' | 'cancelled';
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          color: string;
          order_index: number;
          due_date: string | null;
          priority_stars: number;
          estimated_hours: number | null;
          status: 'todo' | 'in_progress' | 'done';
          progress_percent: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          color?: string;
          order_index?: number;
          due_date?: string | null;
          priority_stars?: number;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done';
          progress_percent?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          order_index?: number;
          due_date?: string | null;
          priority_stars?: number;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done';
          progress_percent?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          module_id: string;
          name: string;
          description: string | null;
          estimated_hours: number | null;
          status: 'todo' | 'in_progress' | 'done';
          priority_stars: number;
          due_date: string | null;
          progress_percent: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          name: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done';
          priority_stars?: number;
          due_date?: string | null;
          progress_percent?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          name?: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done';
          priority_stars?: number;
          due_date?: string | null;
          progress_percent?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      minitasks: {
        Row: {
          id: string;
          task_id: string | null;
          module_id: string | null;
          name: string;
          description: string | null;
          estimated_hours: number | null;
          status: 'todo' | 'in_progress' | 'done' | 'blocked';
          priority_stars: number;
          asteroid_type: string;
          assigned_to: string | null;
          due_date: string | null;
          progress_percent: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          module_id?: string | null;
          name: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done' | 'blocked';
          priority_stars?: number;
          asteroid_type?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          progress_percent?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          module_id?: string | null;
          name?: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done' | 'blocked';
          priority_stars?: number;
          asteroid_type?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          progress_percent?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          parent_id: string | null;
          module_id: string | null;
          project_id: string | null;
          minitask_id: string | null;
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
          satellite_data: Json;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          module_id?: string | null;
          project_id?: string | null;
          minitask_id?: string | null;
          name: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done' | 'blocked';
          priority_stars?: number;
          assigned_to?: string | null;
          due_date?: string | null;
          claimed_by?: string | null;
          claimed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          satellite_type?: string;
          satellite_data?: Json;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          module_id?: string | null;
          project_id?: string | null;
          minitask_id?: string | null;
          name?: string;
          description?: string | null;
          estimated_hours?: number | null;
          status?: 'todo' | 'in_progress' | 'done' | 'blocked';
          priority_stars?: number;
          assigned_to?: string | null;
          due_date?: string | null;
          claimed_by?: string | null;
          claimed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          satellite_type?: string;
          satellite_data?: Json;
        };
      };
      dependencies: {
        Row: {
          id: string;
          dependent_task_id: string | null;
          depends_on_task_id: string | null;
          dependency_type: 'blocks' | 'depends_on' | 'related_to';
          note: string | null;
          created_at: string;
          source_type: 'module' | 'task' | 'subtask';
          source_id: string;
          target_type: 'module' | 'task' | 'subtask';
          target_id: string;
        };
        Insert: {
          id?: string;
          dependent_task_id?: string | null;
          depends_on_task_id?: string | null;
          dependency_type?: 'blocks' | 'depends_on' | 'related_to';
          note?: string | null;
          created_at?: string;
          source_type: 'module' | 'task' | 'subtask';
          source_id: string;
          target_type: 'module' | 'task' | 'subtask';
          target_id: string;
        };
        Update: {
          id?: string;
          dependent_task_id?: string | null;
          depends_on_task_id?: string | null;
          dependency_type?: 'blocks' | 'depends_on' | 'related_to';
          note?: string | null;
          created_at?: string;
          source_type?: 'module' | 'task' | 'subtask';
          source_id?: string;
          target_type?: 'module' | 'task' | 'subtask';
          target_id?: string;
        };
      };
      work_logs: {
        Row: {
          id: string;
          subtask_id: string;
          user_id: string;
          hours_spent: number;
          work_date: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subtask_id: string;
          user_id: string;
          hours_spent: number;
          work_date: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subtask_id?: string;
          user_id?: string;
          hours_spent?: number;
          work_date?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      task_requests: {
        Row: {
          id: string;
          module_id: string;
          requested_by: string;
          task_name: string;
          description: string | null;
          estimated_hours: number | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          requested_by: string;
          task_name: string;
          description?: string | null;
          estimated_hours?: number | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          requested_by?: string;
          task_name?: string;
          description?: string | null;
          estimated_hours?: number | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: 'manager' | 'member';
          joined_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: 'manager' | 'member';
          joined_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          role?: 'manager' | 'member';
          joined_at?: string;
        };
      };
      task_members: {
        Row: {
          task_id: string;
          user_id: string;
          role: 'responsible' | 'member';
          joined_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          role?: 'responsible' | 'member';
          joined_at?: string;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          role?: 'responsible' | 'member';
          joined_at?: string;
        };
      };
      module_members: {
        Row: {
          module_id: string;
          user_id: string;
          role: 'lead' | 'member';
          joined_at: string;
        };
        Insert: {
          module_id: string;
          user_id: string;
          role?: 'lead' | 'member';
          joined_at?: string;
        };
        Update: {
          module_id?: string;
          user_id?: string;
          role?: 'lead' | 'member';
          joined_at?: string;
        };
      };
      invites: {
        Row: {
          id: string;
          token: string;
          email: string;
          role: 'admin' | 'project_manager' | 'worker' | 'client';
          expires_at: string | null;
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          created_by: string | null;
          accepted_by: string | null;
          accepted_at: string | null;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          role: 'admin' | 'project_manager' | 'worker' | 'client';
          expires_at?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          created_by?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string;
          role?: 'admin' | 'project_manager' | 'worker' | 'client';
          expires_at?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          created_by?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          read_at: string | null;
          related_id: string | null;
          related_type: 'task' | 'subtask' | 'module' | 'project' | 'request' | null;
          actor_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read?: boolean;
          read_at?: string | null;
          related_id?: string | null;
          related_type?: 'task' | 'subtask' | 'module' | 'project' | 'request' | null;
          actor_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          read?: boolean;
          read_at?: string | null;
          related_id?: string | null;
          related_type?: 'task' | 'subtask' | 'module' | 'project' | 'request' | null;
          actor_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          email_task_assigned: boolean;
          email_deadline_approaching: boolean;
          email_request_response: boolean;
          email_task_commented: boolean;
          email_task_blocked: boolean;
          email_daily_summary: boolean;
          email_weekly_report: boolean;
          inapp_task_assigned: boolean;
          inapp_status_changed: boolean;
          inapp_available_tasks: boolean;
          inapp_mentions: boolean;
          inapp_user_online: boolean;
          inapp_task_requests: boolean;
          inapp_blockers: boolean;
          inapp_work_logs: boolean;
          email_project_deadline: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_task_assigned?: boolean;
          email_deadline_approaching?: boolean;
          email_request_response?: boolean;
          email_task_commented?: boolean;
          email_task_blocked?: boolean;
          email_daily_summary?: boolean;
          email_weekly_report?: boolean;
          inapp_task_assigned?: boolean;
          inapp_status_changed?: boolean;
          inapp_available_tasks?: boolean;
          inapp_mentions?: boolean;
          inapp_user_online?: boolean;
          inapp_task_requests?: boolean;
          inapp_blockers?: boolean;
          inapp_work_logs?: boolean;
          email_project_deadline?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email_task_assigned?: boolean;
          email_deadline_approaching?: boolean;
          email_request_response?: boolean;
          email_task_commented?: boolean;
          email_task_blocked?: boolean;
          email_daily_summary?: boolean;
          email_weekly_report?: boolean;
          inapp_task_assigned?: boolean;
          inapp_status_changed?: boolean;
          inapp_available_tasks?: boolean;
          inapp_mentions?: boolean;
          inapp_user_online?: boolean;
          inapp_task_requests?: boolean;
          inapp_blockers?: boolean;
          inapp_work_logs?: boolean;
          email_project_deadline?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      privacy_settings: {
        Row: {
          user_id: string;
          profile_visibility: 'team' | 'organization' | 'managers';
          show_online_status: boolean;
          show_activity: boolean;
          in_team_directory: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          profile_visibility?: 'team' | 'organization' | 'managers';
          show_online_status?: boolean;
          show_activity?: boolean;
          in_team_directory?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          profile_visibility?: 'team' | 'organization' | 'managers';
          show_online_status?: boolean;
          show_activity?: boolean;
          in_team_directory?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          entity_name: string | null;
          project_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          project_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          project_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          location?: string | null;
          created_at?: string;
        };
      };
      recent_searches: {
        Row: {
          user_id: string;
          query: string;
          searched_at: string;
        };
        Insert: {
          user_id: string;
          query: string;
          searched_at?: string;
        };
        Update: {
          user_id?: string;
          query?: string;
          searched_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          project_id: string | null;
          name: string;
          type: 'channel' | 'tasks' | 'dm' | 'group';
          module_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          name: string;
          type?: 'channel' | 'tasks' | 'dm' | 'group';
          module_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          name?: string;
          type?: 'channel' | 'tasks' | 'dm' | 'group';
          module_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      channel_members: {
        Row: {
          channel_id: string;
          user_id: string;
          role: 'member' | 'admin' | null;
          last_read_at: string;
          created_at: string;
        };
        Insert: {
          channel_id: string;
          user_id: string;
          role?: 'member' | 'admin' | null;
          last_read_at?: string;
          created_at?: string;
        };
        Update: {
          channel_id?: string;
          user_id?: string;
          role?: 'member' | 'admin' | null;
          last_read_at?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string | null;
          content: string;
          type: 'user' | 'system';
          task_ref_id: string | null;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id?: string | null;
          content: string;
          type?: 'user' | 'system';
          task_ref_id?: string | null;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string | null;
          content?: string;
          type?: 'user' | 'system';
          task_ref_id?: string | null;
          created_at?: string;
          edited_at?: string | null;
        };
      };
      message_mentions: {
        Row: {
          message_id: string;
          user_id: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
