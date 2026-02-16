'use client';

import { SATELLITE_TYPE_TO_CSS } from './satellite-types';

/** Spacecraft CSS class (sphere-drone, hex-drone, etc.) */
export type SpacecraftType =
  | 'sphere-drone'
  | 'hex-drone'
  | 'voyager-probe'
  | 'space-station'
  | 'pulse-beacon'
  | 'astro-gauge'
  | 'nebula-spark'
  | 'core-module'
  | 'nexus-drone';

interface SatelliteIconProps {
  /** Spacecraft type (CSS class) — use SATELLITE_TYPE_TO_CSS[satelliteType] for satellite_type */
  type: SpacecraftType;
  /** Icon size: sm for palette/picker/header, md for default */
  size?: 'sm' | 'md';
  className?: string;
}

const SATELLITE_STRUCTURES: Record<SpacecraftType, React.ReactNode> = {
  'sphere-drone': (
    <>
      <div className="sd-scan" />
      <div className="sd-tip" />
      <div className="sd-mast" />
      <div className="sd-ring" />
      <div className="sd-sphere" />
      <div className="sd-eye" />
      <div className="sd-nub-l" />
      <div className="sd-nub-r" />
      <div className="sd-thruster" />
    </>
  ),
  'hex-drone': (
    <>
      <div className="hd-spike" />
      <div className="hd-arm-l" />
      <div className="hd-arm-r" />
      <div className="hd-border" />
      <div className="hd-body" />
      <div className="hd-eye" />
      <div className="hd-alert" />
      <div className="hd-vent">
        <span />
        <span />
        <span />
      </div>
    </>
  ),
  'voyager-probe': (
    <>
      <div className="vp-glow" />
      <div className="vp-dish" />
      <div className="vp-feed" />
      <div className="vp-wing-l" />
      <div className="vp-wing-r" />
      <div className="vp-bus" />
      <div className="vp-thruster" />
    </>
  ),
  'space-station': (
    <>
      <div className="ss-dock-t" />
      <div className="ss-truss" />
      <div className="ss-panel tl" />
      <div className="ss-panel bl" />
      <div className="ss-joint-l" />
      <div className="ss-hub" />
      <div className="ss-joint-r" />
      <div className="ss-panel tr" />
      <div className="ss-panel br" />
      <div className="ss-radiator" />
    </>
  ),
  'pulse-beacon': (
    <>
      <div className="pb-signal" />
      <div className="pb-signal" />
      <div className="pb-tip" />
      <div className="pb-mast" />
      <div className="pb-wing-l" />
      <div className="pb-strut-l" />
      <div className="pb-wing-r" />
      <div className="pb-strut-r" />
      <div className="pb-body" />
    </>
  ),
  'astro-gauge': (
    <>
      <div className="ag-dish" />
      <div className="ag-feed" />
      <div className="ag-body" />
      <div className="ag-lens" />
      <div className="ag-sweep" />
      <div className="ag-arm-l" />
      <div className="ag-arm-r" />
      <div className="ag-ant" />
    </>
  ),
  'nebula-spark': (
    <>
      <div className="ns-spark" />
      <div className="ns-spark" />
      <div className="ns-spark" />
      <div className="ns-emitter" />
      <div className="ns-mast" />
      <div className="ns-fin-l" />
      <div className="ns-fin-r" />
      <div className="ns-body" />
    </>
  ),
  'core-module': (
    <>
      <div className="cm-dock-t" />
      <div className="cm-panel-l" />
      <div className="cm-panel-r" />
      <div className="cm-body">
        <div className="cm-led1" />
        <div className="cm-led2" />
        <div className="cm-led3" />
      </div>
      <div className="cm-dock-b" />
    </>
  ),
  'nexus-drone': (
    <>
      <div className="nd-data" />
      <div className="nd-data" />
      <div className="nd-data" />
      <div className="nd-conn nd-conn-top" />
      <div className="nd-conn nd-conn-right" />
      <div className="nd-conn nd-conn-bottom" />
      <div className="nd-conn nd-conn-left" />
      <div className="nd-node nd-node-tr" />
      <div className="nd-node nd-node-tl" />
      <div className="nd-node nd-node-br" />
      <div className="nd-node nd-node-bl" />
      <div className="nd-arm nd-arm-tr" />
      <div className="nd-arm nd-arm-tl" />
      <div className="nd-arm nd-arm-br" />
      <div className="nd-arm nd-arm-bl" />
      <div className="nd-wing-t" />
      <div className="nd-wing-b" />
      <div className="nd-holo-ring2" />
      <div className="nd-holo-ring" />
      <div className="nd-core" />
      <div className="nd-lens" />
    </>
  ),
};

export function SatelliteIcon({ type, size = 'md', className = '' }: SatelliteIconProps) {
  const isCompact = size === 'sm';
  const scale = isCompact ? 0.55 : 1;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isCompact ? 36 : undefined,
        height: isCompact ? 36 : undefined,
        flexShrink: 0,
      }}
    >
      <div
        className={type}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          animation: 'none', // Disable float in compact contexts
        }}
      >
        {SATELLITE_STRUCTURES[type]}
      </div>
    </div>
  );
}

/** Helper: get SpacecraftType from satellite_type string */
export function satelliteTypeToSpacecraft(satelliteType: string): SpacecraftType {
  return (SATELLITE_TYPE_TO_CSS[satelliteType as keyof typeof SATELLITE_TYPE_TO_CSS] ?? 'voyager-probe') as SpacecraftType;
}
