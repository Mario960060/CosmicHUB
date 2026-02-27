'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectHierarchyForDependency } from '@/lib/pm/queries';
import './DependencyTargetPicker.css';

export type DependencyTargetType = 'project' | 'module' | 'task' | 'minitask' | 'subtask';

export interface SelectedTarget {
  id: string;
  name: string;
  type: DependencyTargetType;
}

interface DependencyTargetPickerProps {
  projectId: string | null;
  excludeEntityId?: string;
  /** Single selection (Manage Dependencies) */
  selected?: SelectedTarget | null;
  onSelect?: (target: SelectedTarget) => void;
  /** Multi selection (Create dialogs) */
  selectedTargets?: SelectedTarget[];
  onToggleTarget?: (target: SelectedTarget) => void;
  disabled?: boolean;
}

interface FlatItem {
  id: string;
  name: string;
  type: DependencyTargetType;
  context?: string;
}

export function DependencyTargetPicker({
  projectId,
  excludeEntityId,
  selected = null,
  onSelect,
  selectedTargets = [],
  onToggleTarget,
}: DependencyTargetPickerProps) {
  const isMulti = !!onToggleTarget;
  const isSelected = (item: FlatItem) =>
    isMulti
      ? selectedTargets.some((t) => t.type === item.type && t.id === item.id)
      : selected?.type === item.type && selected.id === item.id;
  const { data: hierarchy, isLoading } = useProjectHierarchyForDependency(projectId, excludeEntityId);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    projects: false,
    modules: false,
    tasks: false,
    minitasks: false,
    satellites: false,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((p) => ({ ...p, [key]: !p[key] }));
  };

  if (!projectId) {
    return <div className="dep-picker-empty">Brak projektu</div>;
  }
  if (isLoading) {
    return <div className="dep-picker-empty">Ładowanie...</div>;
  }
  if (!hierarchy) {
    return <div className="dep-picker-empty">Brak hierarchii</div>;
  }

  const exclude = new Set(excludeEntityId ? [excludeEntityId] : []);

  // Płaskie listy – jak w czacie: PROJECTS, MODULES, TASKS, MINI TASKS, SATELLITES
  const flatProjects: FlatItem[] = [];
  if (!exclude.has(hierarchy.id)) {
    flatProjects.push({ id: hierarchy.id, name: hierarchy.name, type: 'project' });
  }

  const flatModules: FlatItem[] = hierarchy.modules
    .filter((m) => !exclude.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, type: 'module' as const, context: hierarchy.name }));

  const flatTasks: FlatItem[] = hierarchy.modules.flatMap((m) =>
    m.tasks
      .filter((t) => !exclude.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, type: 'task' as const, context: m.name }))
  );

  const flatMinitasks: FlatItem[] = [
    ...hierarchy.projectMinitasks
      .filter((m) => !exclude.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, type: 'minitask' as const, context: hierarchy.name })),
    ...hierarchy.modules.flatMap((m) =>
      m.moduleMinitasks
        .filter((mt) => !exclude.has(mt.id))
        .map((mt) => ({ id: mt.id, name: mt.name, type: 'minitask' as const, context: m.name }))
    ),
    ...hierarchy.modules.flatMap((m) =>
      m.tasks.flatMap((t) =>
        t.minitasks
          .filter((mt) => !exclude.has(mt.id))
          .map((mt) => ({ id: mt.id, name: mt.name, type: 'minitask' as const, context: t.name }))
      )
    ),
  ];

  const flatSatellites: FlatItem[] = [
    ...hierarchy.modules.flatMap((m) =>
      m.tasks.flatMap((t) =>
        t.subtasks
          .filter((s) => !exclude.has(s.id))
          .map((s) => ({ id: s.id, name: s.name, type: 'subtask' as const, context: t.name }))
      )
    ),
    ...hierarchy.modules.flatMap((m) =>
      m.tasks.flatMap((t) =>
        t.minitasks.flatMap((mt) =>
          mt.subtasks
            .filter((s) => !exclude.has(s.id))
            .map((s) => ({ id: s.id, name: s.name, type: 'subtask' as const, context: mt.name }))
        )
      )
    ),
  ];

  const groups: { key: string; label: string; items: FlatItem[] }[] = [
    { key: 'projects', label: 'PROJECTS', items: flatProjects },
    { key: 'modules', label: 'MODULES', items: flatModules },
    { key: 'tasks', label: 'TASKS', items: flatTasks },
    { key: 'minitasks', label: 'MINI TASKS', items: flatMinitasks },
    { key: 'satellites', label: 'SATELLITES', items: flatSatellites },
  ];

  return (
    <div className="dep-picker-root">
      {groups.map(({ key, label, items }) => {
        const isExpanded = expandedGroups[key] ?? true;
        return (
          <div key={key} className="dep-picker-group">
            <button
              type="button"
              className="dep-picker-group-btn"
              onClick={() => toggleGroup(key)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{label}</span>
              <span className="dep-picker-count">({items.length})</span>
            </button>
            {isExpanded && (
              <div className="dep-picker-children">
                {items.length === 0 ? (
                  <div className="dep-picker-empty-inline">Brak</div>
                ) : (
                  items.map((item) => {
                    const target: SelectedTarget = { id: item.id, name: item.name, type: item.type };
                    const sel = isSelected(item);
                    return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      className={`dep-picker-item ${sel ? 'selected' : ''}`}
                      onClick={() =>
                        isMulti && onToggleTarget
                          ? onToggleTarget(target)
                          : onSelect?.(target)
                      }
                    >
                      <span className="dep-picker-item-name">{item.name}</span>
                      {item.context && (
                        <span className="dep-picker-item-context">{item.context}</span>
                      )}
                    </button>
                  );})
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
