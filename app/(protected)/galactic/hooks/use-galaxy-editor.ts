// CURSOR: Edit mode state for galaxy editor
// Selection, connection mode, entities created this session

'use client';

import { useState, useCallback } from 'react';

export type CreatedEntity = { type: 'module' | 'task' | 'subtask' | 'minitask'; id: string };

export type ConnectionSource = { entityId: string; entityType: 'module' | 'task' | 'subtask' | 'minitask' };

export type GalaxyEditorState = {
  isEditMode: boolean;
  selectedObjectId: string | null;
  connectionModeForSubtaskId: string | null; // legacy, use connectionModeSource
  connectionModeSource: ConnectionSource | null;
  entitiesCreatedThisSession: CreatedEntity[];
};

export function useGalaxyEditor() {
  const [state, setState] = useState<GalaxyEditorState>({
    isEditMode: false,
    selectedObjectId: null,
    connectionModeForSubtaskId: null,
    connectionModeSource: null,
    entitiesCreatedThisSession: [],
  });

  const enterEditMode = useCallback(() => {
    setState((prev) => ({ ...prev, isEditMode: true }));
  }, []);

  const exitEditMode = useCallback(() => {
    setState({
      isEditMode: false,
      selectedObjectId: null,
      connectionModeForSubtaskId: null,
      connectionModeSource: null,
      entitiesCreatedThisSession: [],
    });
  }, []);

  const selectObject = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedObjectId: id }));
  }, []);

  const startConnectionMode = useCallback((entityId: string, entityType: 'module' | 'task' | 'subtask' | 'minitask') => {
    setState((prev) => ({
      ...prev,
      connectionModeForSubtaskId: entityType === 'subtask' ? entityId : null,
      connectionModeSource: { entityId, entityType },
    }));
  }, []);

  const cancelConnectionMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      connectionModeForSubtaskId: null,
      connectionModeSource: null,
    }));
  }, []);

  const trackEntityCreated = useCallback((entity: CreatedEntity) => {
    setState((prev) => ({
      ...prev,
      entitiesCreatedThisSession: [...prev.entitiesCreatedThisSession, entity],
    }));
  }, []);

  const clearCreatedEntities = useCallback(() => {
    setState((prev) => ({ ...prev, entitiesCreatedThisSession: [] }));
  }, []);

  return {
    ...state,
    enterEditMode,
    exitEditMode,
    selectObject,
    startConnectionMode,
    cancelConnectionMode,
    trackEntityCreated,
    clearCreatedEntities,
  };
}
