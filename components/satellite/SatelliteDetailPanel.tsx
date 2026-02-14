'use client';

import { SatelliteHeader } from './SatelliteHeader';
import { NotesContent } from './types/NotesContent';
import { ChecklistContent } from './types/ChecklistContent';
import { QuestionsContent } from './types/QuestionsContent';
import { IssuesContent } from './types/IssuesContent';
import { DocumentsContent } from './types/DocumentsContent';
import { MetricsContent } from './types/MetricsContent';
import { IdeasContent } from './types/IdeasContent';
import { useSubtask } from '@/lib/workstation/queries';
import { useUpdateTaskStatus } from '@/lib/workstation/mutations';
import { ManageDependenciesDialog } from '@/components/ManageDependenciesDialog';
import { useState } from 'react';
import type { SatelliteType } from './satellite-types';

import type { SubtaskWithDetails } from '@/lib/workstation/queries';

interface SatelliteDetailPanelProps {
  subtaskId: string | null;
  initialSubtask?: SubtaskWithDetails | null;
  onClose?: () => void;
  isModal?: boolean;
}

export function SatelliteDetailPanel({ subtaskId, initialSubtask, onClose, isModal = false }: SatelliteDetailPanelProps) {
  const { data: fetchedSubtask, isLoading } = useSubtask(subtaskId);
  // Use initialSubtask when available (from list) - avoids duplicate fetch and RLS issues
  const subtask = initialSubtask?.id === subtaskId ? initialSubtask : fetchedSubtask;
  const updateStatus = useUpdateTaskStatus();
  const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);

  const workLogsTotal = subtask?.work_logs?.reduce((s, w) => s + (w.hours_spent || 0), 0) ?? 0;

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
          />
        );
      case 'issues':
        return (
          <IssuesContent
            subtaskId={subtask.id}
            satelliteData={(subtask as { satellite_data?: Record<string, unknown> }).satellite_data ?? {}}
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
        estimatedHours={subtask.estimated_hours}
        dueDate={subtask.due_date}
        dependencyCount={0}
        onStatusChange={handleStatusChange}
        onDependenciesClick={() => setShowDependenciesDialog(true)}
        workLogsTotalHours={workLogsTotal}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>{renderContent()}</div>

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
