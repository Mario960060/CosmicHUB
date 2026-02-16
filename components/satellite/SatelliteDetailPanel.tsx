'use client';

import { SatelliteHeader } from './SatelliteHeader';
import { NotesContent } from './types/NotesContent';
import { ChecklistContent } from './types/ChecklistContent';
import { QuestionsContent } from './types/QuestionsContent';
import { IssuesContent } from './types/IssuesContent';
import { DocumentsContent } from './types/DocumentsContent';
import { MetricsContent } from './types/MetricsContent';
import { IdeasContent } from './types/IdeasContent';
import { CanvasContent } from './types/CanvasContent';
import { useSubtask } from '@/lib/workstation/queries';
import { useUpdateTaskStatus } from '@/lib/workstation/mutations';
import { useDependencies } from '@/lib/pm/queries';
import { useProjectMembers, useModuleMembers, useTaskMembers } from '@/lib/pm/queries';
import { useUpdateSubtask } from '@/lib/pm/mutations';
import { ManageDependenciesDialog } from '@/components/ManageDependenciesDialog';
import type { ActivityEntry } from '@/lib/satellite/save-satellite-data';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { SatelliteType } from './satellite-types';

import type { SubtaskWithDetails } from '@/lib/workstation/queries';

interface SatelliteDetailPanelProps {
  subtaskId: string | null;
  initialSubtask?: SubtaskWithDetails | null;
  onClose?: () => void;
  isModal?: boolean;
}

export function SatelliteDetailPanel({ subtaskId, initialSubtask, onClose, isModal = false }: SatelliteDetailPanelProps) {
  const { user } = useAuth();
  const { data: fetchedSubtask, isLoading } = useSubtask(subtaskId);
  // Use initialSubtask when available (from list) - avoids duplicate fetch and RLS issues
  const subtask = initialSubtask?.id === subtaskId ? initialSubtask : fetchedSubtask;
  const updateStatus = useUpdateTaskStatus();
  const updateSubtask = useUpdateSubtask();
  const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);

  const projectId =
    (subtask as { project_id?: string })?.project_id ??
    (subtask as { parent_task?: { module?: { project?: { id?: string } } } })?.parent_task?.module?.project?.id ??
    null;
  const taskId = (subtask as { parent_id?: string })?.parent_id ?? null;
  const moduleId =
    (subtask as { module_id?: string })?.module_id ??
    (subtask as { parent_task?: { module?: { id?: string } } })?.parent_task?.module?.id ??
    null;
  const { data: dependencies } = useDependencies(subtaskId);
  const { data: projectMembers } = useProjectMembers(projectId);
  const { data: moduleMembers } = useModuleMembers(moduleId);
  const { data: taskMembers } = useTaskMembers(taskId);
  const workLogsTotal = subtask?.work_logs?.reduce((s, w) => s + (w.hours_spent || 0), 0) ?? 0;
  const canDeleteContent = !!user && (
    user.role === 'admin' ||
    !!projectMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'manager') ||
    !!(taskId && taskMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'responsible')) ||
    (subtask as { created_by?: string })?.created_by === user?.id
  );

  if (!subtaskId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '14px',
        }}
      >
        Select a subtask to view details
      </div>
    );
  }

  if (isLoading && !subtask) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!subtask) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        Subtask not found
      </div>
    );
  }

  const satelliteType = (subtask as { satellite_type?: string }).satellite_type ?? 'notes';

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus.mutateAsync({ subtaskId: subtask.id, status: newStatus as any });
  };

  const handleAssignedChange = async (userId: string | null) => {
    await updateSubtask.mutateAsync({
      subtaskId: subtask.id,
      updates: { assigned_to: userId },
    });
  };

  const handleNameChange = async (newName: string) => {
    if (newName.trim() === subtask.name) return;
    await updateSubtask.mutateAsync({
      subtaskId: subtask.id,
      updates: { name: newName.trim() },
    });
  };

  const renderContent = () => {
    switch (satelliteType as SatelliteType) {
      case 'notes':
        return (
          <NotesContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
          />
        );
      case 'checklist':
        return (
          <ChecklistContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
          />
        );
      case 'questions':
        return (
          <QuestionsContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
            subtaskName={subtask.name}
            projectMembers={projectMembers ?? []}
            canDelete={canDeleteContent}
          />
        );
      case 'issues':
        return (
          <IssuesContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
            subtaskName={subtask.name}
            assignablePeople={
              taskId ? (taskMembers ?? []) : moduleId ? (moduleMembers ?? []) : (projectMembers ?? [])
            }
            createdBy={(subtask as { created_by?: string })?.created_by}
            isAdmin={user?.role === 'admin'}
            isProjectManager={!!projectMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'manager')}
            isTaskResponsible={!!(taskId && taskMembers?.some((m: { user_id: string; role: string }) => m.user_id === user?.id && m.role === 'responsible'))}
          />
        );
      case 'documents':
        return (
          <DocumentsContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
          />
        );
      case 'metrics':
        return (
          <MetricsContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
          />
        );
      case 'ideas':
        return (
          <IdeasContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
            moduleId={(subtask as { parent_task?: { module?: { id?: string } } }).parent_task?.module?.id}
            projectId={(subtask as { parent_task?: { module?: { project?: { id?: string } } } }).parent_task?.module?.project?.id}
            subtaskName={subtask.name}
            projectMembers={projectMembers ?? []}
          />
        );
      case 'canvas':
        return (
          <CanvasContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
            assignablePeople={
              taskId ? (taskMembers ?? []) : moduleId ? (moduleMembers ?? []) : (projectMembers ?? [])
            }
            canDeleteContent={canDeleteContent}
          />
        );
      case 'repo':
      default:
        return (
          <div
            style={{
              padding: '32px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {satelliteType === 'repo'
              ? '🔧 Repo/Dev — Coming soon'
              : `Content for ${satelliteType} — Coming in next phase`}
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isModal && onClose && (
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Close
          </button>
        </div>
      )}
      <SatelliteHeader
        name={subtask.name}
        satelliteType={satelliteType}
        status={subtask.status}
        assignedUser={subtask.assigned_user}
        assignedToId={subtask.assigned_to}
        projectMembers={projectMembers ?? []}
        dueDate={subtask.due_date}
        dependencyCount={dependencies?.length ?? 0}
        hideHeaderAssign={satelliteType === 'issues' || satelliteType === 'canvas'}
        activity={((subtask as { satellite_data?: { activity?: ActivityEntry[] } }).satellite_data?.activity as ActivityEntry[]) ?? []}
        onNameChange={handleNameChange}
        onStatusChange={handleStatusChange}
        onAssignedChange={handleAssignedChange}
        onDependenciesClick={() => setShowDependenciesDialog(true)}
      />
      <div
        className={satelliteType === 'canvas' ? undefined : 'scrollbar-cosmic'}
        style={{
          flex: 1,
          overflow: satelliteType === 'canvas' ? 'hidden' : 'auto',
          padding: satelliteType === 'canvas' ? 0 : 16,
        }}
      >
        {renderContent()}
      </div>

      {showDependenciesDialog && (
        <ManageDependenciesDialog
          open={showDependenciesDialog}
          onClose={() => setShowDependenciesDialog(false)}
          subtaskId={subtask.id}
          subtaskName={subtask.name}
        />
      )}
    </div>
  );
}
