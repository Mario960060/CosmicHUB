// CURSOR: Type definitions for canvas objects

export type ZoomLevel = 'galaxy' | 'project' | 'module';

export type ObjectType = 'project' | 'module' | 'task' | 'subtask' | 'portal';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasObject {
  id: string;
  type: ObjectType;
  name: string;
  position: Point;
  radius: number;
  color: string;
  status?: string;
  progress?: number; // 0-100
  metadata?: {
    projectId?: string;
    moduleId?: string;
    taskId?: string;
    priorityStars?: number;
    estimatedHours?: number;
    due_date?: string | null;
    dueDateDays?: number | null;
    portalTargetModuleId?: string;
    portalTargetModuleName?: string;
    portalTargetModuleColor?: string;
    [key: string]: any;
  };
}

export interface Dependency {
  id: string;
  from: string; // source entity id (or portal id for cross-module endpoint)
  to: string;  // target entity id (or portal id for cross-module endpoint)
  fromPos?: Point;
  toPos?: Point;
  dependencyType?: 'blocks' | 'depends_on' | 'related_to';
  sourceType?: 'module' | 'task' | 'subtask';
  targetType?: 'module' | 'task' | 'subtask';
  isResolved?: boolean; // target entity done (for blocks)
}

export interface ViewState {
  zoom: ZoomLevel;
  focusedProjectId?: string;
  focusedModuleId?: string;
  offset: Point;
  scale: number;
}

export interface CanvasState {
  objects: CanvasObject[];
  dependencies: Dependency[];
  viewState: ViewState;
  hoveredObject?: CanvasObject;
  selectedObject?: CanvasObject;
}
