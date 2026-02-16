// REDESIGN: Cosmic Project Hub - DOM-based Galactic View
// Uses pure CSS for rendering celestial objects

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CanvasObject, Dependency } from '@/lib/galactic/types';

const CANVAS_WIDTH = 4800;
const CANVAS_HEIGHT = 2700;

interface GalacticSceneProps {
  objects: CanvasObject[];
  dependencies: Dependency[];
  viewType: 'galaxy' | 'solar-system' | 'module-zoom' | 'task-zoom' | 'minitask-zoom';
  onObjectClick?: (object: CanvasObject) => void;
  onObjectContextMenu?: (object: CanvasObject, e: React.MouseEvent) => void;
  onDependencyContextMenu?: (dep: Dependency, e: React.MouseEvent) => void;
  onPortalClick?: (moduleId: string) => void;
  onTaskPortalClick?: (taskId: string) => void;
  onMinitaskPortalClick?: (minitaskId: string) => void;
  onCanvasBackgroundClick?: () => void;
  isEditMode?: boolean;
  selectedObjectId?: string | null;
  selectedObjectIds?: Set<string>;
  connectionModeForSubtaskId?: string | null;
  connectionModeSource?: { entityId: string; entityType: 'module' | 'task' | 'subtask' | 'minitask' } | null;
  positionOverrides?: Map<string, { x: number; y: number }>;
  onPositionChange?: (objectId: string, x: number, y: number) => void;
}

const SELECTED_RING = '0 0 0 3px rgba(0, 240, 255, 0.95), 0 0 20px rgba(0, 240, 255, 0.6)';

const SELECTION_OUTLINE: React.CSSProperties = {
  outline: '3px solid rgba(0, 240, 255, 0.95)',
  outlineOffset: '5px',
  boxShadow: '0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 0 0 transparent',
};

function formatDeadlineDays(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return `OVERDUE ${Math.abs(days)}d`;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

const GLOW_SIZE_FACTOR = 0.7;

function getDeadlineGlow(
  days: number | null | undefined,
  isComplete?: boolean
): { color: string; size: number; opacity: number; pulse: boolean } | null {
  if (days == null || isComplete) return null;
  if (days <= 0)
    return { color: '#ef4444', size: Math.round(250 * GLOW_SIZE_FACTOR), opacity: 0.9, pulse: true };
  if (days <= 3) {
    const t = 1 - days / 3;
    return {
      color: '#ef4444',
      size: Math.round((180 + t * 70) * GLOW_SIZE_FACTOR),
      opacity: 0.5 + t * 0.4,
      pulse: true,
    };
  }
  if (days <= 7) {
    const t = 1 - (days - 3) / 4;
    return {
      color: '#ffd700',
      size: Math.round((160 + t * 40) * GLOW_SIZE_FACTOR),
      opacity: 0.45 + t * 0.3,
      pulse: false,
    };
  }
  const t = Math.max(0, 1 - (days - 7) / 30);
  return {
    color: '#ffffff',
    size: Math.round((150 + t * 20) * GLOW_SIZE_FACTOR),
    opacity: 0.1 + t * 0.2,
    pulse: false,
  };
}

function getAuraGradient(color: string, sizePercent: number, parentSizePx: number = 90): string {
  // Object edge in gradient space: object is 100% of parent, aura is sizePercent% of parent
  // So object radius sits at (100 / sizePercent) * 50 percent of the gradient
  const auraRadiusPx = (parentSizePx * sizePercent / 100) / 2;
  const offsetPercent = (6 / auraRadiusPx) * 100; // 6px in gradient % space
  const edge = Math.round((100 / sizePercent) * 50 + offsetPercent);
  const e0 = Math.max(0, edge - 2);
  const e1 = edge;                   // glow starts at edge
  const e2 = Math.round(edge + (100 - edge) * 0.3);
  const e3 = Math.round(edge + (100 - edge) * 0.55);
  const e4 = Math.round(edge + (100 - edge) * 0.8);
  return `radial-gradient(circle, transparent 0%, transparent ${e0}%, ${color}aa ${e1}%, ${color}55 ${e2}%, ${color}28 ${e3}%, ${color}0a ${e4}%, transparent 100%)`;
}

function renderStarsCrown(stars: number, size: 'sm' | 'md' = 'md') {
  const clamped = Math.min(3, Math.max(0, stars));
  const fullStars = Math.floor(clamped);
  const hasHalf = clamped % 1 >= 0.5;
  const starSize = size === 'sm' ? 10 : 14;
  return (
    <div className="object-stars-crown" style={{ fontSize: starSize }}>
      {'★'.repeat(fullStars)}
      {hasHalf && (
        <span className="star-half" style={{ display: 'inline-block', width: '0.5em', overflow: 'hidden', verticalAlign: 'inherit' }}>
          ★
        </span>
      )}
    </div>
  );
}

export function GalacticScene({
  objects,
  dependencies,
  viewType,
  onObjectClick,
  onObjectContextMenu,
  onDependencyContextMenu,
  onPortalClick,
  onTaskPortalClick,
  onMinitaskPortalClick,
  onCanvasBackgroundClick,
  isEditMode = false,
  selectedObjectId = null,
  selectedObjectIds,
  connectionModeForSubtaskId = null,
  connectionModeSource = null,
  positionOverrides,
  onPositionChange,
}: GalacticSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggedIdRef = useRef<string | null>(null);
  const dragSessionRef = useRef<{
    objectId: string;
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
    groupStartPositions?: Map<string, { x: number; y: number }>;
    hasMoved: boolean;
  } | null>(null);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);

  const getPosition = (obj: CanvasObject) =>
    positionOverrides?.get(obj.id) ?? obj.position;

  // Center and scale canvas to fit viewport
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);
      setScale(s);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drag handlers (edit mode) - use pointer events + setPointerCapture for reliable release

  // Get sun variant based on project metadata
  const getSunVariant = (obj: CanvasObject): string => {
    // Use actual sun_type from database if available
    if (obj.metadata?.sunType) {
      return obj.metadata.sunType;
    }
    // Fallback logic
    if (obj.metadata?.status === 'active') return 'yellow-star';
    if (obj.metadata?.priority === 'high') return 'blue-giant';
    return 'red-dwarf';
  };

  // Get planet variant based on module metadata
  const getPlanetVariant = (obj: CanvasObject): string => {
    // Use actual planet_type from database if available
    if (obj.metadata?.planetType) {
      return obj.metadata.planetType;
    }
    // Fallback: map color to planet type
    const colorMap: Record<string, string> = {
      '#14b8a6': 'ocean',
      '#818cf8': 'indigo',
      '#fb7185': 'rose',
      '#fbbf24': 'amber',
    };
    return colorMap[obj.color] || 'ocean';
  };

  // Get spacecraft/moon type based on task metadata
  const getSpacecraftType = (obj: CanvasObject): string => {
    // Use actual spacecraft_type from database if available
    if (obj.metadata?.spacecraftType) {
      return obj.metadata.spacecraftType;
    }
    // Fallback only if no metadata
    return 'sphere-drone';
  };

  // Determine if task is moon or satellite
  const isMoonType = (type: string): boolean => {
    return type.includes('moon');
  };

  // Get moon variant for tasks (tasks = always moons)
  const getMoonVariant = (obj: CanvasObject): string => {
    const type = (getSpacecraftType(obj) || '').toLowerCase();
    if (isMoonType(type)) {
      const moonMap: Record<string, string> = {
        'rocky-moon': 'rocky',
        'europa-moon': 'europa',
        'dusty-moon': 'dusty',
      };
      return moonMap[type] || 'rocky';
    }
    return 'rocky'; // Tasks with satellite-type default to rocky moon
  };

  const pos = (o: CanvasObject) => getPosition(o);
  const isSelected = (id: string) => selectedObjectIds?.has(id) ?? false;

  const handleObjectPointerDown = (obj: CanvasObject, e: React.PointerEvent) => {
    if (!isEditMode || !onPositionChange || e.button !== 0) return;
    if (obj.metadata?.pinned) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // If this object is part of a multi-selection, store start positions for all
    let groupStartPositions: Map<string, { x: number; y: number }> | undefined;
    if (selectedObjectIds && selectedObjectIds.has(obj.id) && selectedObjectIds.size > 1) {
      groupStartPositions = new Map();
      for (const id of selectedObjectIds) {
        const o = objects.find((o) => o.id === id);
        if (o) groupStartPositions.set(id, { ...pos(o) });
      }
    }

    dragSessionRef.current = {
      objectId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      startPos: pos(obj),
      groupStartPositions,
      hasMoved: false,
    };
    setDragging(obj.id);
  };

  const handleObjectPointerMove = (obj: CanvasObject, e: React.PointerEvent) => {
    const session = dragSessionRef.current;
    if (!session || session.objectId !== obj.id || !onPositionChange || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const s = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
    const dx = (e.clientX - session.startX) / s;
    const dy = (e.clientY - session.startY) / s;
    session.hasMoved = true;

    if (session.groupStartPositions) {
      // Group drag: move all selected objects by the same delta
      for (const [id, startP] of session.groupStartPositions) {
        onPositionChange(id, startP.x + dx, startP.y + dy);
      }
    } else {
      onPositionChange(obj.id, session.startPos.x + dx, session.startPos.y + dy);
    }
  };

  const handleObjectPointerUp = (obj: CanvasObject, e: React.PointerEvent) => {
    const session = dragSessionRef.current;
    if (session?.objectId === obj.id) {
      if (session.hasMoved) draggedIdRef.current = obj.id;
      dragSessionRef.current = null;
      setDragging(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handleObjectClick = (obj: CanvasObject) => {
    if (draggedIdRef.current === obj.id) {
      draggedIdRef.current = null;
      return;
    }
    onObjectClick?.(obj);
  };

  // Render Sun (Project)
  const renderSun = (obj: CanvasObject) => {
    const variant = getSunVariant(obj);
    const position = pos(obj);
    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        className={`sun ${variant}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => handleObjectClick(obj)}
        onContextMenu={(e) => { e.preventDefault(); onObjectContextMenu?.(obj, e); }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <div className="sun-labels-inset">
          <div className="sun-name-label">{obj.name}</div>
          {obj.metadata?.dueDateDays !== undefined && obj.metadata?.dueDateDays !== null && (
            <div className="sun-deadline-label">
              {formatDeadlineDays(obj.metadata.dueDateDays)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Planet (Module)
  const renderPlanet = (obj: CanvasObject) => {
    const variant = getPlanetVariant(obj);
    const isSmall = viewType === 'solar-system';
    const position = pos(obj);
    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        className={`planet ${variant}${isSmall ? ' sm' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          width: isSmall ? '100px' : '180px',
          height: isSmall ? '100px' : '180px',
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => handleObjectClick(obj)}
        onContextMenu={(e) => { e.preventDefault(); onObjectContextMenu?.(obj, e); }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <div className="planet-atmosphere"></div>
        <div className="planet-cloud c1"></div>
        <div className="planet-cloud c2"></div>
        <div className="planet-cloud c3"></div>
        <div
          className="burnout-overlay"
          style={{ opacity: (obj.progress ?? 0) / 100 }}
        />
        {(() => {
          const glow = getDeadlineGlow(
            obj.metadata?.dueDateDays,
            (obj.progress ?? 0) >= 100
          );
          return glow ? (
            <div
              className={`deadline-aura${glow.pulse ? ' deadline-pulse' : ''}`}
              style={{
                background: getAuraGradient(glow.color, glow.size, isSmall ? 100 : 180),
                width: `${glow.size}%`,
                height: `${glow.size}%`,
                opacity: glow.opacity,
              }}
            />
          ) : null;
        })()}
        {renderStarsCrown(obj.metadata?.priorityStars ?? 1, isSmall ? 'sm' : 'md')}
        <div className="planet-labels-inset">
          <div className="planet-name-label" style={{ fontSize: isSmall ? '9px' : '11px' }}>
            {obj.name}
          </div>
          {obj.metadata?.dueDateDays !== undefined && obj.metadata?.dueDateDays !== null && (
            <div className="planet-deadline-label" style={{ fontSize: isSmall ? '8px' : '10px' }}>
              {formatDeadlineDays(obj.metadata.dueDateDays)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Satellite (Spacecraft Task)
  const renderSatellite = (obj: CanvasObject) => {
    const type = getSpacecraftType(obj);
    const isMini = obj.metadata?.isMiniature === true;
    
    const renderSatelliteContent = () => {
      switch (type) {
        case 'sphere-drone':
          return (
            <>
              <div className="sd-scan"></div>
              <div className="sd-tip"></div>
              <div className="sd-mast"></div>
              <div className="sd-ring"></div>
              <div className="sd-sphere"></div>
              <div className="sd-eye"></div>
              <div className="sd-nub-l"></div>
              <div className="sd-nub-r"></div>
              <div className="sd-thruster"></div>
            </>
          );

        case 'hex-drone':
          return (
            <>
              <div className="hd-spike"></div>
              <div className="hd-arm-l"></div>
              <div className="hd-arm-r"></div>
              <div className="hd-border"></div>
              <div className="hd-body"></div>
              <div className="hd-eye"></div>
              <div className="hd-alert"></div>
              <div className="hd-vent"><span></span><span></span><span></span></div>
            </>
          );

        case 'voyager-probe':
          return (
            <>
              <div className="vp-glow"></div>
              <div className="vp-dish"></div>
              <div className="vp-feed"></div>
              <div className="vp-wing-l"></div>
              <div className="vp-wing-r"></div>
              <div className="vp-bus"></div>
              <div className="vp-thruster"></div>
            </>
          );

        case 'space-station':
          return (
            <>
              <div className="ss-dock-t"></div>
              <div className="ss-truss"></div>
              <div className="ss-panel tl"></div>
              <div className="ss-panel bl"></div>
              <div className="ss-joint-l"></div>
              <div className="ss-hub"></div>
              <div className="ss-joint-r"></div>
              <div className="ss-panel tr"></div>
              <div className="ss-panel br"></div>
              <div className="ss-radiator"></div>
            </>
          );

        case 'pulse-beacon':
          return (
            <>
              <div className="pb-signal"></div>
              <div className="pb-signal"></div>
              <div className="pb-tip"></div>
              <div className="pb-mast"></div>
              <div className="pb-wing-l"></div>
              <div className="pb-strut-l"></div>
              <div className="pb-wing-r"></div>
              <div className="pb-strut-r"></div>
              <div className="pb-body"></div>
            </>
          );

        case 'astro-gauge':
          return (
            <>
              <div className="ag-dish"></div>
              <div className="ag-feed"></div>
              <div className="ag-body"></div>
              <div className="ag-lens"></div>
              <div className="ag-sweep"></div>
              <div className="ag-arm-l"></div>
              <div className="ag-arm-r"></div>
              <div className="ag-ant"></div>
            </>
          );

        case 'nebula-spark':
          return (
            <>
              <div className="ns-spark"></div>
              <div className="ns-spark"></div>
              <div className="ns-spark"></div>
              <div className="ns-emitter"></div>
              <div className="ns-mast"></div>
              <div className="ns-fin-l"></div>
              <div className="ns-fin-r"></div>
              <div className="ns-body"></div>
            </>
          );

        case 'core-module':
          return (
            <>
              <div className="cm-dock-t"></div>
              <div className="cm-panel-l"></div>
              <div className="cm-panel-r"></div>
              <div className="cm-body">
                <div className="cm-led1"></div>
                <div className="cm-led2"></div>
                <div className="cm-led3"></div>
              </div>
              <div className="cm-dock-b"></div>
            </>
          );

        case 'nexus-drone':
          return (
            <>
              <div className="nd-data"></div>
              <div className="nd-data"></div>
              <div className="nd-data"></div>
              <div className="nd-conn nd-conn-top"></div>
              <div className="nd-conn nd-conn-right"></div>
              <div className="nd-conn nd-conn-bottom"></div>
              <div className="nd-conn nd-conn-left"></div>
              <div className="nd-node nd-node-tr"></div>
              <div className="nd-node nd-node-tl"></div>
              <div className="nd-node nd-node-br"></div>
              <div className="nd-node nd-node-bl"></div>
              <div className="nd-arm nd-arm-tr"></div>
              <div className="nd-arm nd-arm-tl"></div>
              <div className="nd-arm nd-arm-br"></div>
              <div className="nd-arm nd-arm-bl"></div>
              <div className="nd-wing-t"></div>
              <div className="nd-wing-b"></div>
              <div className="nd-holo-ring2"></div>
              <div className="nd-holo-ring"></div>
              <div className="nd-core"></div>
              <div className="nd-lens"></div>
            </>
          );

        default:
          return null;
      }
    };

    const position = pos(obj);
    const isModuleZoom = viewType === 'module-zoom';
    const satelliteScale = isModuleZoom ? (isMini ? 0.16 : 0.275) : (isMini ? 0.55 : 1);
    const useScaleWrapper = isModuleZoom && satelliteScale !== 1;
    const transform = !useScaleWrapper && satelliteScale !== 1
      ? `translate(-50%, -50%) scale(${satelliteScale})`
      : 'translate(-50%, -50%)';
    const elementCount = typeof obj.metadata?.elementCount === 'number' ? obj.metadata.elementCount : 0;
    const renderSatelliteBadge = () => {
      if (elementCount > 0) {
        return <div className="object-stars-crown" style={{ fontSize: isMini ? 10 : 12 }}>{elementCount}</div>;
      }
      return null;
    };
    const satelliteContent = (
      <>
        {renderSatelliteContent()}
        {renderSatelliteBadge()}
        {obj.metadata?.isBlocked && <div className="blocked-badge">!</div>}
        {obj.metadata?.isComplete && <div className="complete-badge">✓</div>}
      </>
    );
    // When useScaleWrapper: inner div has position:absolute so outer collapses to 0×0 → outline draws around a point.
    // Give outer explicit size so selection outline renders correctly on all satellites.
    const wrapperSize = useScaleWrapper ? { width: 52, height: 58 } : undefined;
    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        className={!useScaleWrapper ? `${type}${isMini ? ' sm' : ''}` : undefined}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: useScaleWrapper ? `translate(-50%, -50%) scale(${satelliteScale})` : transform,
          transformOrigin: 'center center',
          ...wrapperSize,
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => handleObjectClick(obj)}
        onContextMenu={(e) => { e.preventDefault(); onObjectContextMenu?.(obj, e); }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        {useScaleWrapper ? (
          <div className={`${type}${isMini ? ' sm' : ''}`}>
            {satelliteContent}
          </div>
        ) : (
          satelliteContent
        )}
      </div>
    );
  };

  // Render Moon (Task - księżyc)
  const renderMoon = (obj: CanvasObject) => {
    const type = getMoonVariant(obj);
    const isMini = obj.metadata?.isMiniature === true;
    
    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        className={`moon ${type}${isMini ? ' sm' : ''}`}
        style={{
          left: `${pos(obj).x}px`,
          top: `${pos(obj).y}px`,
          transform: 'translate(-50%, -50%)',
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => handleObjectClick(obj)}
        onContextMenu={(e) => { e.preventDefault(); onObjectContextMenu?.(obj, e); }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        {type === 'rocky' && (
          <>
            <div className="moon-crater cr1"></div>
            <div className="moon-crater cr2"></div>
            <div className="moon-crater cr3"></div>
          </>
        )}
        <div
          className="burnout-overlay"
          style={{ opacity: (obj.progress ?? 0) / 100 }}
        />
        {(() => {
          const glow = getDeadlineGlow(
            obj.metadata?.dueDateDays,
            obj.metadata?.isComplete ?? (obj.progress ?? 0) >= 100
          );
          return glow ? (
            <div
              className={`deadline-aura${glow.pulse ? ' deadline-pulse' : ''}`}
              style={{
                background: getAuraGradient(glow.color, glow.size),
                width: `${glow.size}%`,
                height: `${glow.size}%`,
                opacity: glow.opacity,
              }}
            />
          ) : null;
        })()}
        {renderStarsCrown(obj.metadata?.priorityStars ?? 1, isMini ? 'sm' : 'md')}
        <div className="moon-labels-inset">
          {!isMini && (
            <div className="moon-name-label" style={{ fontSize: '12px' }}>
              {obj.name}
            </div>
          )}
          {obj.metadata?.dueDateDays !== undefined && obj.metadata?.dueDateDays !== null && (
            <div className="moon-deadline-label" style={{ fontSize: isMini ? '7px' : '10px' }}>
              {formatDeadlineDays(obj.metadata.dueDateDays)}
            </div>
          )}
        </div>
        
        {obj.metadata?.isBlocked && (
          <div className="blocked-badge">!</div>
        )}
        {obj.metadata?.isComplete && (
          <div className="complete-badge">✓</div>
        )}
      </div>
    );
  };

  // Render Asteroid (Minitask)
  const renderAsteroid = (obj: CanvasObject) => {
    const type = (obj.metadata?.asteroidType || 'rocky').toLowerCase();
    const isMini = obj.metadata?.isMiniature === true;
    const isSolarSystemMini = obj.metadata?.isSolarSystemMini === true;
    const isModuleZoom = viewType === 'module-zoom';
    const sizeClass = isSolarSystemMini ? ' xs' : isMini && isModuleZoom ? ' md' : isMini ? ' sm' : '';

    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        className={`asteroid ${type}${sizeClass}`}
        style={{
          left: `${pos(obj).x}px`,
          top: `${pos(obj).y}px`,
          transform: 'translate(-50%, -50%)',
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => handleObjectClick(obj)}
        onContextMenu={(e) => { e.preventDefault(); onObjectContextMenu?.(obj, e); }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        {type === 'rocky' && !isMini && (
          <>
            <div className="asteroid-crater cr1"></div>
            <div className="asteroid-crater cr2"></div>
            <div className="asteroid-crater cr3"></div>
          </>
        )}
        <div
          className="burnout-overlay"
          style={{ opacity: (obj.progress ?? 0) / 100 }}
        />
        {(() => {
          const glow = getDeadlineGlow(
            obj.metadata?.dueDateDays,
            obj.metadata?.isComplete ?? (obj.progress ?? 0) >= 100
          );
          return glow ? (
            <div
              className={`deadline-aura${glow.pulse ? ' deadline-pulse' : ''}`}
              style={{
                background: getAuraGradient(glow.color, glow.size),
                width: `${glow.size}%`,
                height: `${glow.size}%`,
                opacity: glow.opacity,
              }}
            />
          ) : null;
        })()}
        {renderStarsCrown(obj.metadata?.priorityStars ?? 1, isMini ? 'sm' : 'md')}
        <div className="asteroid-labels-inset">
          <div className="asteroid-name-label" style={{ fontSize: isMini ? '7px' : '10px' }}>
            {obj.name}
          </div>
          {obj.metadata?.dueDateDays !== undefined && obj.metadata?.dueDateDays !== null && (
            <div className="asteroid-deadline-label" style={{ fontSize: isMini ? '7px' : '10px' }}>
              {formatDeadlineDays(obj.metadata.dueDateDays)}
            </div>
          )}
        </div>
        {obj.metadata?.isBlocked && (
          <div className="blocked-badge">!</div>
        )}
        {obj.metadata?.isComplete && (
          <div className="complete-badge">✓</div>
        )}
      </div>
    );
  };

  // Render Portal (galaxy vortex - navigates to another module or task)
  const renderPortal = (obj: CanvasObject) => {
    const targetModuleId = obj.metadata?.portalTargetModuleId;
    const targetTaskId = obj.metadata?.portalTargetTaskId;
    const targetMinitaskId = obj.metadata?.portalTargetMinitaskId;
    const targetName = obj.metadata?.portalTargetMinitaskName ?? obj.metadata?.portalTargetTaskName ?? obj.metadata?.portalTargetModuleName ?? obj.name ?? 'Portal';
    const portalColor = obj.metadata?.portalTargetModuleColor ?? obj.color ?? '#a855f7';

    return (
      <div
        key={obj.id}
        data-galactic-object
        data-object-id={obj.id}
        data-portal-target={targetMinitaskId ?? targetModuleId ?? targetTaskId}
        className="portal"
        style={{
          left: `${pos(obj).x}px`,
          top: `${pos(obj).y}px`,
          transform: 'translate(-50%, -50%)',
          ['--portal-color' as string]: portalColor,
          ...(isSelected(obj.id) ? SELECTION_OUTLINE : {}),
        }}
        onClick={() => {
          if (draggedIdRef.current === obj.id) {
            draggedIdRef.current = null;
            return;
          }
          if (connectionModeSource) {
            onObjectClick?.(obj);
          } else if (targetMinitaskId && onMinitaskPortalClick) {
            onMinitaskPortalClick(targetMinitaskId);
          } else if (targetTaskId && onTaskPortalClick) {
            onTaskPortalClick(targetTaskId);
          } else if (targetModuleId && onPortalClick) {
            onPortalClick(targetModuleId);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (connectionModeSource) {
            onObjectContextMenu?.(obj, e);
          }
        }}
        onPointerDown={(e) => handleObjectPointerDown(obj, e)}
        onPointerMove={(e) => handleObjectPointerMove(obj, e)}
        onPointerUp={(e) => handleObjectPointerUp(obj, e)}
        onMouseEnter={() => setHoveredObject(obj.id)}
        onMouseLeave={() => setHoveredObject(null)}
      >
        <div className="portal-spiral-1" />
        <div className="portal-spiral-2" />
        <div className="portal-core" />
        <span className="portal-label">{targetName}</span>
      </div>
    );
  };

  // Render module-to-task and task-to-minitask hierarchy links (solar system only) - cienkie szare linie
  const renderModuleTaskLinks = () => {
    if (viewType !== 'solar-system') return null;
    const tasks = objects.filter((o) => o.type === 'task');
    const minitasks = objects.filter((o) => o.type === 'minitask' && o.metadata?.taskId);
    const hasLinks = tasks.length > 0 || minitasks.length > 0;
    if (!hasLinks) return null;

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {tasks.map((task) => {
          const moduleId = task.metadata?.moduleId;
          if (!moduleId) return null;
          const mod = objects.find((o) => o.type === 'module' && o.id === moduleId);
          if (!mod) return null;
          const from = pos(mod);
          const to = pos(task);
          return (
            <line
              key={`mod-task-${task.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(150, 150, 150, 0.35)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })}
        {minitasks.map((minitask) => {
          const taskId = minitask.metadata?.taskId;
          if (!taskId) return null;
          const task = objects.find((o) => o.type === 'task' && o.id === taskId);
          if (!task) return null;
          const from = pos(task);
          const to = pos(minitask);
          return (
            <line
              key={`task-minitask-${minitask.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(150, 150, 150, 0.25)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
          );
        })}
      </svg>
    );
  };

  // Render task-to-asteroid/satellite hierarchy links (module-zoom) - gray dashed lines
  // Minitasks: line from task (moon) to minitask (asteroid)
  // Subtasks with minitaskId: line from minitask (asteroid) to subtask (satellite) – created in asteroid system
  // Subtasks without minitaskId: line from task (moon) to subtask
  const renderTaskChildLinks = () => {
    if (viewType !== 'module-zoom') return null;
    const minitasks = objects.filter((o) => o.type === 'minitask');
    const subtasks = objects.filter((o) => o.type === 'subtask');
    const lines: { key: string; from: { x: number; y: number }; to: { x: number; y: number } }[] = [];

    minitasks.forEach((minitask) => {
      const taskId = minitask.metadata?.taskId;
      if (!taskId) return;
      const task = objects.find((o) => o.type === 'task' && o.id === taskId);
      if (!task) return;
      lines.push({ key: `task-minitask-${minitask.id}`, from: pos(task), to: pos(minitask) });
    });

    subtasks.forEach((subtask) => {
      const minitaskId = subtask.metadata?.minitaskId;
      if (minitaskId) {
        const asteroid = objects.find((o) => o.type === 'minitask' && o.id === minitaskId);
        if (asteroid) {
          lines.push({ key: `asteroid-sub-${subtask.id}`, from: pos(asteroid), to: pos(subtask) });
        }
      } else {
        const taskId = subtask.metadata?.taskId;
        if (!taskId) return;
        const task = objects.find((o) => o.type === 'task' && o.id === taskId);
        if (!task) return;
        lines.push({ key: `task-sub-${subtask.id}`, from: pos(task), to: pos(subtask) });
      }
    });

    if (lines.length === 0) return null;

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {lines.map(({ key, from, to }) => (
          <line
            key={key}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(150, 150, 150, 0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}
      </svg>
    );
  };

  // Render asteroid-to-subtask hierarchy links (task-zoom and minitask-zoom)
  const renderAsteroidSubtaskLinks = () => {
    if (viewType !== 'task-zoom' && viewType !== 'minitask-zoom') return null;
    const subtasks = objects.filter((o) => o.type === 'subtask' && o.metadata?.minitaskId);
    if (subtasks.length === 0) return null;

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {subtasks.map((subtask) => {
          const minitaskId = subtask.metadata?.minitaskId;
          if (!minitaskId) return null;
          const asteroid = objects.find((o) => o.type === 'minitask' && o.id === minitaskId);
          if (!asteroid) return null;
          const from = pos(asteroid);
          const to = pos(subtask);
          return (
            <line
              key={`asteroid-sub-${subtask.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(150, 150, 150, 0.35)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })}
      </svg>
    );
  };

  // Render Dependency Beams (SVG)
  const renderDependencies = () => {
    if (dependencies.length === 0) return null;

    // Find object positions for connection points (use pos to include positionOverrides)
    const getObjectPosition = (objectId: string) => {
      const obj = objects.find((o) => o.id === objectId);
      return obj ? pos(obj) : { x: 0, y: 0 };
    };

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 11,
        }}
      >
        <defs>
          {/* Blocks (red) - strongest glow for thickest line */}
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Depends on (amber) - medium glow */}
          <filter id="glow-amber">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Resolved (green) */}
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Related to (white) - subtle glow for thinnest line */}
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {dependencies.map((dep, index) => {
          const from = getObjectPosition(dep.from);
          const to = getObjectPosition(dep.to);
          
          // Determine line style: blocks=red(thick), depends_on=amber(medium), related_to=white(thin), resolved=green
          const depType = dep.dependencyType || 'depends_on';
          const isResolved = dep.isResolved && depType === 'blocks';
          let stroke = '#f59e0b';
          let filter = 'url(#glow-amber)';
          let sw = 2;
          let dashArray = '8 4';
          let opacity = 1;
          let className = 'dep-line';
          
          if (isResolved) {
            stroke = '#22c55e';
            filter = 'url(#glow-green)';
            sw = 2.5;
            opacity = 0.5;
            className += ' resolved';
          } else if (depType === 'blocks') {
            stroke = '#f43f5e';
            filter = 'url(#glow-red)';
            sw = 2.5;
            className += ' blocks';
          } else if (depType === 'related_to') {
            stroke = '#ffffff';
            filter = 'url(#glow-white)';
            sw = 2.5 * 0.2; // 20% of red
            dashArray = '4 4';
            className += ' related-to';
          } else {
            stroke = '#f59e0b';
            filter = 'url(#glow-amber)';
            sw = 2.5 * 0.5; // 50% of red
            className += ' depends-on';
          }
          
          return (
            <g
              key={`dep-${dep.id ?? index}`}
              style={{ cursor: onDependencyContextMenu ? 'context-menu' : undefined, pointerEvents: onDependencyContextMenu ? 'stroke' : 'none' }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDependencyContextMenu?.(dep, e);
              }}
            >
              {/* Invisible wide stroke for easier hit detection */}
              {onDependencyContextMenu && (
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="transparent"
                  strokeWidth={16}
                />
              )}
              <line
                className={className}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={stroke}
                strokeWidth={sw}
                strokeDasharray={dashArray}
                opacity={opacity}
                filter={filter}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  // Render objects based on type
  const renderObject = (obj: CanvasObject, index: number) => {
    switch (obj.type) {
      case 'project':
        return renderSun(obj);
      case 'module':
        return renderPlanet(obj);
      case 'task':
        // Tasks = always moons (księżyce) - orbit around planet
        return renderMoon(obj);
      case 'subtask':
        // Subtasks = satellites (satelity) - orbit around moon
        return renderSatellite(obj);
      case 'minitask':
        return renderAsteroid(obj);
      case 'portal':
        return renderPortal(obj);
      default:
        return null;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!onCanvasBackgroundClick) return;
    const target = e.target as HTMLElement;
    if (!target.closest('[data-galactic-object]')) {
      onCanvasBackgroundClick();
    }
  };

  return (
    <div
      ref={sceneRef}
      className="galactic-scene"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (connectionModeForSubtaskId || connectionModeSource) ? 'crosshair' : undefined,
      }}
    >
      <div
        ref={canvasRef}
        data-galaxy-canvas
        id="galaxy-canvas"
        className={viewType === 'task-zoom' ? 'task-zoom-view' : undefined}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          position: 'relative',
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        onClick={onCanvasBackgroundClick ? handleCanvasClick : undefined}
      >
        {/* Background Layers */}
        <div className="stars-layer s1"></div>
        <div className="stars-layer s2"></div>
        <div className="stars-layer s3"></div>
        
        <div className="nebula n1"></div>
        <div className="nebula n2"></div>
        <div className="nebula n3"></div>

        {/* Module-task hierarchy links (solar system) */}
        {renderModuleTaskLinks()}
        {/* Task-child hierarchy links (module-zoom) */}
        {renderTaskChildLinks()}
        {/* Asteroid-subtask hierarchy links (task-zoom) */}
        {renderAsteroidSubtaskLinks()}
        {/* Celestial Objects - render selected last so their outlines aren't hidden behind others */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {[...objects]
            .sort((a, b) => {
              const aSel = selectedObjectIds?.has(a.id) ?? false;
              const bSel = selectedObjectIds?.has(b.id) ?? false;
              return aSel === bSel ? 0 : aSel ? 1 : -1;
            })
            .map((obj, index) => renderObject(obj, index))}
        </div>

        {/* Dependencies (module-zoom and task-zoom) - rendered on top for right-click */}
        {(viewType === 'module-zoom' || viewType === 'task-zoom') && renderDependencies()}
      </div>
    </div>
  );
}
