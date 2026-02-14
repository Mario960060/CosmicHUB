/**
 * What's New queries - DASHBOARD_IMPLEMENTATION_PLAN.md Faza 2.1
 * Aggregates notifications, activity_log, new assignments since last_seen.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
import type { WhatsNewItem, WhatsNewItemType } from '@/types/dashboard';

const supabase = createClient();

async function fetchProjectScope(
  userId: string,
  role: UserRole
): Promise<string[] | null> {
  if (role === 'admin') return null;
  if (role === 'worker') {
    const { data } = await supabase
      .from('subtasks')
      .select('parent_task:tasks(module:modules(project_id))')
      .eq('assigned_to', userId);
    const ids = new Set<string>();
    for (const row of data ?? []) {
      const pid = (row as { parent_task?: { module?: { project_id?: string } } })
        .parent_task?.module?.project_id;
      if (pid) ids.add(pid);
    }
    return Array.from(ids);
  }
  if (role === 'project_manager') {
    const { data } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .eq('role', 'manager');
    return (data ?? []).map((r) => r.project_id);
  }
  if (role === 'client') {
    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', userId);
    return (data ?? []).map((r) => r.id);
  }
  return null;
}

function mapNotificationToItem(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
  actor?: { id: string; full_name: string; avatar_url: string | null } | null;
}): WhatsNewItem {
  return {
    id: `notif-${n.id}`,
    type: (n.type as WhatsNewItemType) ?? 'status_changed',
    title: n.title,
    description: n.message,
    relatedEntity: {
      type: n.related_type ?? 'subtask',
      id: n.related_id ?? n.id,
      name: n.title,
    },
    actor: n.actor
      ? {
          id: n.actor.id,
          name: n.actor.full_name,
          avatarUrl: n.actor.avatar_url,
        }
      : undefined,
    timestamp: n.created_at,
  };
}

function mapActivityToItem(a: {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  created_at: string;
}): WhatsNewItem {
  return {
    id: `activity-${a.id}`,
    type: 'status_changed',
    title: a.entity_name ?? a.action,
    description: a.action,
    relatedEntity: {
      type: a.entity_type ?? 'subtask',
      id: a.entity_id ?? a.id,
      name: a.entity_name ?? a.action,
    },
    timestamp: a.created_at,
  };
}

function mapSubtaskAssignmentToItem(s: {
  id: string;
  name: string;
  updated_at: string;
  parent_task?: {
    name: string;
    module?: { name: string };
    project?: { name: string };
  };
}): WhatsNewItem {
  return {
    id: `assign-${s.id}`,
    type: 'task_assigned',
    title: s.name,
    description: `Assigned to you: ${s.parent_task?.name ?? s.name}`,
    relatedEntity: { type: 'subtask', id: s.id, name: s.name },
    timestamp: s.updated_at,
  };
}

export interface WhatsNewResult {
  items: WhatsNewItem[];
  isFirstLogin: boolean;
}

export function useWhatsNew(userId: string | undefined, role: UserRole) {
  return useQuery({
    queryKey: ['whats-new', userId, role],
    queryFn: async (): Promise<WhatsNewResult> => {
      if (!userId) return { items: [], isFirstLogin: false };

      const { data: user } = await supabase
        .from('users')
        .select('last_seen')
        .eq('id', userId)
        .single();

      const isFirstLogin = user?.last_seen == null;
      const lastSeen =
        user?.last_seen ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const projectIds = await fetchProjectScope(userId, role);

      const [notifRes, activityRes, assignRes] = await Promise.all([
        supabase
          .from('notifications')
          .select(
            '*, actor:users!notifications_actor_id_fkey(id, full_name, avatar_url)'
          )
          .eq('user_id', userId)
          .gte('created_at', lastSeen)
          .order('created_at', { ascending: false })
          .limit(20),

        (async () => {
          let query = supabase
            .from('activity_log')
            .select('*')
            .in('entity_type', ['subtask', 'task', 'module'])
            .gte('created_at', lastSeen)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
          if (projectIds != null && projectIds.length > 0) {
            query = query.in('project_id', projectIds);
          }
          return query;
        })(),

        role === 'worker'
          ? supabase
              .from('subtasks')
              .select(
                'id, name, updated_at, parent_task:tasks(name, module:modules(name, project:projects(name)))'
              )
              .eq('assigned_to', userId)
              .gte('updated_at', lastSeen)
              .order('updated_at', { ascending: false })
          : Promise.resolve({ data: [] as unknown[], error: null }),
      ]);

      if (notifRes.error) throw notifRes.error;
      if (activityRes.error) throw activityRes.error;
      if (assignRes.error) throw assignRes.error;

      const items: WhatsNewItem[] = [
        ...(notifRes.data ?? []).map(mapNotificationToItem),
        ...(activityRes.data ?? []).map(mapActivityToItem),
        ...(assignRes.data ?? []).map((s) =>
          mapSubtaskAssignmentToItem(s as { id: string; name: string; updated_at: string; parent_task?: { name: string; module?: { name: string }; project?: { name: string } } })
        ),
      ];

      items.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const seen = new Set<string>();
      const deduped = items.filter((it) => {
        const key = `${it.relatedEntity.type}-${it.relatedEntity.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return { items: deduped, isFirstLogin };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
