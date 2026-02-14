'use client';

import { SATELLITE_TYPES, type SatelliteType } from './satellite-types';
import { SatelliteIcon, satelliteTypeToSpacecraft } from './SatelliteIcon';

interface SatelliteTypePickerProps {
  onSelect: (type: SatelliteType) => void;
  selectedType?: SatelliteType | null;
}

export function SatelliteTypePicker({ onSelect, selectedType }: SatelliteTypePickerProps) {
  return (
    <div style={{ padding: '24px' }}>
      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          color: '#00d9ff',
          letterSpacing: '1px',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}
      >
        Choose Satellite Type
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}
      >
        {SATELLITE_TYPES.map((sat) => {
          const isSelected = selectedType === sat.type;
          const isComingSoon = sat.type === 'repo';
          return (
            <button
              key={sat.type}
              type="button"
              onClick={() => !isComingSoon && onSelect(sat.type)}
              disabled={isComingSoon}
              style={{
                padding: '16px',
                background: isSelected ? `${sat.color}22` : 'rgba(0, 0, 0, 0.3)',
                border: isSelected ? `2px solid ${sat.color}` : '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '12px',
                cursor: isComingSoon ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isComingSoon ? 0.6 : 1,
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isComingSoon) {
                  e.currentTarget.style.background = isSelected ? `${sat.color}22` : 'rgba(0, 217, 255, 0.08)';
                  e.currentTarget.style.borderColor = sat.color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isComingSoon) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.2)';
                }
              }}
            >
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                <SatelliteIcon type={satelliteTypeToSpacecraft(sat.type)} size="sm" />
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 600,
                  color: isSelected ? sat.color : 'rgba(255, 255, 255, 0.8)',
                  textTransform: 'uppercase',
                }}
              >
                {sat.name}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                  lineHeight: 1.2,
                }}
              >
                {sat.description}
              </div>
              {isComingSoon && (
                <div style={{ fontSize: '9px', color: sat.color, marginTop: '6px' }}>
                  Coming soon
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
