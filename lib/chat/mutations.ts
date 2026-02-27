// CURSOR: Comms Beacon chat mutations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

// Extract @mentions from content and return user IDs (mirrors findMentionMatch logic)
function extractMentionedUserIds(content: string, people: { id: string; name: string }[]): string[] {
  const ids: string[] = [];
  let i = 0;
  while (i < content.length) {
    const atIdx = content.indexOf('@', i);
    if (atIdx === -1) break;
    const segment = content.slice(atIdx + 1);
    const sorted = [...people].sort((a, b) => b.name.length - a.name.length);
    let advance = 1;
    for (const p of sorted) {
      const segLower = segment.toLowerCase();
      const nameLower = p.name.toLowerCase();
      if (segLower.startsWith(nameLower)) {
        advance = nameLower.length + (segment[nameLower.length] === ' ' ? 1 : 0);
        if (!ids.includes(p.id)) ids.push(p.id);
        break;
      }
      if (nameLower.startsWith(segLower)) {
        advance = segment.length;
        if (!ids.includes(p.id)) ids.push(p.id);
        break;
      }
    }
    if (advance === 1) {
      const nextAt = segment.indexOf('@');
      advance = nextAt === -1 ? segment.length + 1 : nextAt + 1;
    }
    i = atIdx + advance;
  }
  return ids;
}

// Send message with optimistic update; creates notifications for @mentions
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      content,
      userId,
      userFullName,
      mentionablePeople = [],
    }: {
      channelId: string;
      content: string;
      userId: string;
      userFullName?: string;
      mentionablePeople?: { id: string; name: string }[];
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: userId,
          content: content.trim(),
          type: 'user',
        })
        .select(`
          *,
          user:users!user_id(id, full_name, role)
        `)
        .single();

      if (error) throw error;

      const mentionedIds = extractMentionedUserIds(content.trim(), mentionablePeople);
      for (const mentionedUserId of mentionedIds) {
        if (mentionedUserId === userId) continue;
        await supabase.rpc('create_notification', {
          p_user_id: mentionedUserId,
          p_type: 'mention',
          p_title: 'You were mentioned in chat',
          p_message: (userFullName || 'Someone') + ' mentioned you in a message',
          p_related_id: channelId,
          p_related_type: 'channel',
          p_actor_id: userId,
        });
      }

      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', variables.channelId] });
      const prev = queryClient.getQueryData(['chat-messages', variables.channelId]) as any[] | undefined;
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        channel_id: variables.channelId,
        user_id: variables.userId,
        content: variables.content.trim(),
        type: 'user' as const,
        task_ref_id: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        user: { id: variables.userId, full_name: variables.userFullName || 'You', role: null },
      };
      queryClient.setQueryData(['chat-messages', variables.channelId], (old: any[] = []) => [...old, optimisticMsg]);
      return { prev };
    },
    onError: (_, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['chat-messages', variables.channelId], context.prev);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-total-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Mark channel as read
export function useMarkChannelRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      userId,
    }: {
      channelId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-total-unread'] });
    },
  });
}

// Create or get DM channel (uses RPC to bypass RLS)
export function useCreateOrGetDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otherUserId,
    }: {
      currentUserId: string;
      otherUserId: string;
    }) => {
      const { data: channelId, error } = await supabase.rpc('create_dm_channel', {
        other_user_id: otherUserId,
      });

      if (error) throw error;
      return { id: channelId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });
}

// Get or create task channel (lazy - tworzy przy pierwszej wiadomosci)
export function useGetOrCreateTaskChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const { data: channelId, error } = await supabase.rpc('get_or_create_task_channel', {
        p_task_id: taskId,
      });

      if (error) throw error;
      return { id: channelId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tasks-hierarchy'] });
    },
  });
}

// Get or create minitask channel (konwersacja o minitasku)
export function useGetOrCreateMinitaskChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ minitaskId }: { minitaskId: string }) => {
      const { data: channelId, error } = await supabase.rpc('get_or_create_minitask_channel', {
        p_minitask_id: minitaskId,
      });

      if (error) throw error;
      return { id: channelId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tasks-hierarchy'] });
    },
  });
}

// Get or create subtask channel (konwersacja o satelicie)
export function useGetOrCreateSubtaskChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string }) => {
      const { data: channelId, error } = await supabase.rpc('get_or_create_subtask_channel', {
        p_subtask_id: subtaskId,
      });

      if (error) throw error;
      return { id: channelId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-tasks-hierarchy'] });
    },
  });
}

// Create group channel
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      memberIds = [],
    }: {
      name: string;
      memberIds?: string[];
    }) => {
      const { data: channelId, error } = await supabase.rpc('create_group_channel', {
        p_name: name.trim() || 'New Group',
        p_member_ids: memberIds,
      });

      if (error) throw error;
      return { id: channelId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });
}

// Add member to group
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase.rpc('add_group_member', {
        p_channel_id: channelId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-group-members', channelId] });
    },
  });
}

// Leave group channel
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId }: { channelId: string }) => {
      const { error } = await supabase.rpc('leave_group_channel', {
        p_channel_id: channelId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-group-members', channelId] });
    },
  });
}

// Promote member to admin
export function usePromoteGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase.rpc('promote_group_member', {
        p_channel_id: channelId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-group-members', channelId] });
    },
  });
}

// Demote admin to member
export function useDemoteGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase.rpc('demote_group_member', {
        p_channel_id: channelId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-group-members', channelId] });
    },
  });
}

// Remove member from group (admin only)
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase.rpc('remove_group_member', {
        p_channel_id: channelId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat-group-members', channelId] });
    },
  });
}
