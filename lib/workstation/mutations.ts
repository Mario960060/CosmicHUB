import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SubtaskStatus } from '@/types';

// Claim task (30-min reservation)
export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const supabase = createClient();
      
      // Check if already claimed
      const { data: existing } = await supabase
        .from('subtasks')
        .select('claimed_by, claimed_at')
        .eq('id', subtaskId)
        .single();

      if (existing?.claimed_by && existing.claimed_by !== userId) {
        const claimAge = Date.now() - new Date(existing.claimed_at).getTime();
        if (claimAge < 30 * 60 * 1000) {
          throw new Error('Task is already claimed by someone else');
        }
      }

      // Claim task
      const { error } = await supabase
        .from('subtasks')
        .update({
          claimed_by: userId,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Assign task to self
export function useAssignTaskToSelf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('subtasks')
        .update({
          assigned_to: userId,
          claimed_by: null, // Clear claim
          claimed_at: null,
        })
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Update task status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: SubtaskStatus }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('subtasks')
        .update({ status })
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtask', variables.subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['my-active-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Log work time
export function useLogWorkTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      userId,
      hours,
      workDate,
      description,
    }: {
      subtaskId: string;
      userId: string;
      hours: number;
      workDate: string;
      description?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('work_logs').insert({
        subtask_id: subtaskId,
        user_id: userId,
        hours_spent: hours,
        work_date: workDate,
        description,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-logs', variables.subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}

// Release claim
export function useReleaseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtaskId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('subtasks')
        .update({
          claimed_by: null,
          claimed_at: null,
        })
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workstation-tasks'] });
    },
  });
}
