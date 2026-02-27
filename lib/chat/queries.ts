// CURSOR: Comms Beacon chat queries

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Channel, Message, User } from '@/types';

export interface ChannelWithDetails extends Channel {
  project?: { id: string; name: string };
  module?: { id: string; name: string };
  unread_count?: number;
  last_message?: MessageWithUser | null;
  other_user?: { id: string; full_name: string; avatar_url?: string | null; last_seen?: string | null } | null;
}

export interface MessageWithUser extends Message {
  user?: User | null;
  task?: { id: string; name: string; status: string } | null;
}

// Fetch all channels for current user (groups + DMs)
export function useChannels(userId: string | undefined) {
  return useQuery({
    queryKey: ['chat-channels', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get channel memberships
      const { data: memberships, error: memErr } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', userId);

      if (memErr || !memberships?.length) return [];

      const channelIds = memberships.map((m) => m.channel_id);

      const { data: channels, error } = await supabase
        .from('channels')
        .select(`
          *,
          project:projects(id, name),
          module:modules(id, name)
        `)
        .in('id', channelIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For DM channels, fetch the other participant
      const withDetails = await Promise.all(
        (channels || []).map(async (ch) => {
          if (ch.type === 'dm') {
            const { data: members } = await supabase
              .from('channel_members')
              .select('user_id')
              .eq('channel_id', ch.id);
            const otherUserId = (members || []).find((m) => m.user_id !== userId)?.user_id;
            if (otherUserId) {
              const { data: otherUser } = await supabase
                .from('users')
                .select('id, full_name, avatar_url, last_seen')
                .eq('id', otherUserId)
                .single();
              return { ...ch, other_user: otherUser };
            }
          }
          return ch;
        })
      );

      // Fetch unread counts for each channel
      const withUnread = await Promise.all(
        withDetails.map(async (ch) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
            .gt('created_at', (await getLastRead(ch.id, userId)) || '1970-01-01')
            .neq('user_id', userId);

          const { data: lastMsg } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              user_id,
              type,
              created_at,
              user:users!user_id(id, full_name)
            `)
            .eq('channel_id', ch.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const chWithMsg = { ...ch, unread_count: count || 0, last_message: lastMsg };
          if (ch.type === 'dm' && !ch.other_user) {
            let otherUser = await getOtherUserFromMessages(ch.id, userId);
            if (!otherUser) {
              const { data: members } = await supabase.from('channel_members').select('user_id').eq('channel_id', ch.id);
              const otherId = (members || []).find((m) => m.user_id !== userId)?.user_id;
              if (otherId) {
                const { data: ou } = await supabase.from('users').select('id, full_name, avatar_url, last_seen').eq('id', otherId).single();
                if (ou) otherUser = ou;
              }
            }
            if (otherUser) chWithMsg.other_user = otherUser;
          }
          return chWithMsg;
        })
      );

      return withUnread as ChannelWithDetails[];
    },
    enabled: !!userId,
  });
}

async function getLastRead(channelId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('channel_members')
    .select('last_read_at')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();
  return data?.last_read_at || null;
}

async function getOtherUserFromMessages(
  channelId: string,
  currentUserId: string
): Promise<{ id: string; full_name: string; avatar_url?: string | null; last_seen?: string | null } | null> {
  const { data: msg } = await supabase
    .from('messages')
    .select(`
      user_id,
      user:users!user_id(id, full_name, avatar_url, last_seen)
    `)
    .eq('channel_id', channelId)
    .neq('user_id', currentUserId)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!msg?.user) return null;
  const u = Array.isArray(msg.user) ? msg.user[0] : msg.user;
  return { id: msg.user_id!, full_name: u.full_name || '', avatar_url: u.avatar_url, last_seen: u.last_seen };
}

// Group channels by: DM, Groups (tylko user-created), Project/Module/Task channels
export function useChannelGroups(userId: string | undefined) {
  const { data: channels, ...rest } = useChannels(userId);

  const dms = (channels || []).filter((c) => c.type === 'dm');
  const groups = (channels || []).filter((c) => c.type === 'group');
  const projectModuleTaskChannels = (channels || []).filter(
    (c) => c.type === 'channel'
  );
  const tasksReadOnly = (channels || []).filter((c) => c.type === 'tasks');

  // Chat: tylko kanaly z wiadomosciami (last_message !== null)
  const allWithMessages = [...dms, ...groups, ...projectModuleTaskChannels].filter(
    (c) => c.last_message != null
  );
  const chat = allWithMessages.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at || '';
    const bTime = b.last_message?.created_at || b.created_at || '';
    return bTime.localeCompare(aTime);
  });

  return {
    data: {
      chat,
      dms,
      groups,
      tasks: tasksReadOnly,
      all: channels || [],
    },
    ...rest,
  };
}

// Hierarchia dla Tasks tab: Projekt > Task (moduł) > Subtask (task)
// Pobiera projekty uzytkownika (project_members) z modulami i taskami
export interface TasksHierarchyProject {
  id: string;
  name: string;
  channel_id: string | null;
  modules: TasksHierarchyModule[];
}

export interface TasksHierarchyModule {
  id: string;
  name: string;
  channel_id: string | null;
  tasks: TasksHierarchyTask[];
}

export interface TasksHierarchyTask {
  id: string;
  name: string;
  minitasks: { id: string; name: string }[];
  subtasks: { id: string; name: string }[];
}

export function useTasksHierarchy(userId: string | undefined) {
  return useQuery({
    queryKey: ['chat-tasks-hierarchy', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
      if (memErr || !memberships?.length) return [];

      const projectIds = [...new Set(memberships.map((m) => m.project_id))];

      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      if (projErr || !projects?.length) return [];

      const { data: channels, error: chErr } = await supabase
        .from('channels')
        .select('id, project_id, module_id')
        .in('project_id', projectIds)
        .eq('name', 'general')
        .is('module_id', null);
      if (chErr) throw chErr;
      const projectChannelMap = new Map<string, string>();
      (channels || []).forEach((c) => projectChannelMap.set(c.project_id, c.id));

      const { data: modules, error: modErr } = await supabase
        .from('modules')
        .select('id, name, project_id')
        .in('project_id', projectIds)
        .order('order_index', { ascending: true });
      if (modErr) throw modErr;

      const moduleIds = (modules || []).map((m) => m.id);
      const { data: moduleChannels } = await supabase
        .from('channels')
        .select('id, module_id')
        .in('module_id', moduleIds);
      const moduleChannelMap = new Map<string, string>();
      (moduleChannels || []).forEach((c) => moduleChannelMap.set(c.module_id, c.id));

      const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('id, name, module_id')
        .in('module_id', moduleIds)
        .order('created_at', { ascending: false });
      if (taskErr) throw taskErr;

      const taskIds = (tasks || []).map((t) => t.id);

      const { data: minitasks } = await supabase
        .from('minitasks')
        .select('id, name, task_id')
        .in('task_id', taskIds);
      const minitasksByTask = new Map<string, { id: string; name: string }[]>();
      (minitasks || []).forEach((m) => {
        const list = minitasksByTask.get(m.task_id) || [];
        list.push({ id: m.id, name: m.name });
        minitasksByTask.set(m.task_id, list);
      });

      const minitaskIdsAll = (minitasks || []).map((m) => m.id);
      let allSubtaskRows: { id: string; name: string; parent_id: string | null; minitask_id: string | null }[] = [];
      if (taskIds.length > 0) {
        const { data: stByTask } = await supabase
          .from('subtasks')
          .select('id, name, parent_id, minitask_id')
          .in('parent_id', taskIds);
        allSubtaskRows = [...allSubtaskRows, ...(stByTask || [])];
      }
      if (minitaskIdsAll.length > 0) {
        const { data: stByMinitask } = await supabase
          .from('subtasks')
          .select('id, name, parent_id, minitask_id')
          .in('minitask_id', minitaskIdsAll);
        allSubtaskRows = [...allSubtaskRows, ...(stByMinitask || [])];
      }
      const subtasksByTask = new Map<string, Map<string, { id: string; name: string }>>();
      const minitaskToTask = new Map<string, string>();
      (minitasks || []).forEach((m) => minitaskToTask.set(m.id, m.task_id));
      allSubtaskRows.forEach((s) => {
        const taskId = s.parent_id || (s.minitask_id ? minitaskToTask.get(s.minitask_id) : undefined);
        if (taskId) {
          const map = subtasksByTask.get(taskId) || new Map();
          map.set(s.id, { id: s.id, name: s.name });
          subtasksByTask.set(taskId, map);
        }
      });

      const tasksByModule = new Map<string, { id: string; name: string; minitasks: { id: string; name: string }[]; subtasks: { id: string; name: string }[] }[]>();
      (tasks || []).forEach((t) => {
        const list = tasksByModule.get(t.module_id) || [];
        const stMap = subtasksByTask.get(t.id);
        list.push({
          id: t.id,
          name: t.name,
          minitasks: minitasksByTask.get(t.id) || [],
          subtasks: stMap ? Array.from(stMap.values()) : [],
        });
        tasksByModule.set(t.module_id, list);
      });

      const modulesByProject = new Map<string, typeof modules>();
      (modules || []).forEach((m) => {
        const list = modulesByProject.get(m.project_id) || [];
        list.push(m);
        modulesByProject.set(m.project_id, list);
      });

      const result: TasksHierarchyProject[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        channel_id: projectChannelMap.get(p.id) || null,
        modules: (modulesByProject.get(p.id) || []).map((m) => ({
          id: m.id,
          name: m.name,
          channel_id: moduleChannelMap.get(m.id) || null,
          tasks: tasksByModule.get(m.id) || [],
        })),
      }));

      return result;
    },
    enabled: !!userId,
  });
}

// Fetch messages for a channel
export function useChannelMessages(channelId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users!user_id(id, full_name, role),
          task:tasks(id, name, status)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as MessageWithUser[];
    },
    enabled: !!channelId && enabled,
  });
}

// Total unread count (for trigger badge)
export function useTotalUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['chat-total-unread', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', userId);

      if (!memberships?.length) return 0;

      let total = 0;
      for (const m of memberships) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', m.channel_id)
          .gt('created_at', m.last_read_at || '1970-01-01')
          .neq('user_id', userId);
        total += count || 0;
      }
      return total;
    },
    enabled: !!userId,
  });
}

export interface TeamUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  last_seen?: string | null;
}

// Team users for DM creation - grouped by role
// Admin: sees Admins, PMs, Workers, Clients
// Client: sees only Admins
// PM/Worker: sees Admins, PMs, Workers (no Clients)
export function useTeamUsersGrouped(userId: string | undefined, userRole: string | undefined) {
  return useQuery({
    queryKey: ['chat-team-users', userId, userRole],
    queryFn: async () => {
      if (!userId) return { admins: [], project_managers: [], workers: [], clients: [] };

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role, last_seen')
        .neq('id', userId)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;

      const users = (data || []) as TeamUser[];
      const admins = users.filter((u) => u.role === 'admin').sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      const project_managers = users.filter((u) => u.role === 'project_manager').sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      const workers = users.filter((u) => u.role === 'worker').sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      const clients = users.filter((u) => u.role === 'client').sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      // Client sees only Admins
      if (userRole === 'client') {
        return { admins, project_managers: [], workers: [], clients: [] };
      }
      // Admin sees everyone
      if (userRole === 'admin') {
        return { admins, project_managers, workers, clients };
      }
      // PM/Worker: no Clients
      return { admins, project_managers, workers, clients: [] };
    },
    enabled: !!userId,
  });
}

// Legacy flat list (for backwards compat)
export function useTeamUsers(userId: string | undefined, userRole?: string) {
  const { data, ...rest } = useTeamUsersGrouped(userId, userRole);
  const flat = data
    ? [...data.admins, ...data.project_managers, ...data.workers, ...data.clients]
    : [];
  return { data: flat, ...rest };
}

// Group channel members (for settings panel)
export function useGroupMembers(channelId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['chat-group-members', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data: members, error } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          role,
          user:users!user_id(id, full_name, avatar_url, last_seen, role)
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return (members || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role || 'member',
        user: Array.isArray(m.user) ? m.user[0] : m.user,
      }));
    },
    enabled: !!channelId && enabled,
  });
}
