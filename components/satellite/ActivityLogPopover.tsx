'use client';

import { useState, useRef, useEffect } from 'react';
import { formatActivityEntry, type ActivityEntry } from '@/lib/satellite/save-satellite-data';
import { History } from 'lucide-react';

interface ActivityLogPopoverProps {
  activity: ActivityEntry[];
  trigger?: React.ReactNode;
}

export function ActivityLogPopover({ activity, trigger = <History size={16} /> }: ActivityLogPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const displayActivity = activity.slice(0, 20);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          padding: '4px',
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Activity log"
      >
        {trigger}
      </button>
      {open && (
        <div
          className="scrollbar-cosmic"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '6px',
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#00d9ff', marginBottom: '10px' }}>
            Recent activity
          </div>
          {displayActivity.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', padding: '8px 0' }}>
              No activity yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayActivity.map((entry, i) => (
                <div
                  key={`${entry.at}-${i}`}
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    lineHeight: 1.4,
                    padding: '6px 8px',
                    background: 'rgba(0, 217, 255, 0.05)',
                    borderRadius: '6px',
                    borderLeft: '3px solid rgba(0, 217, 255, 0.4)',
                  }}
                >
                  {formatActivityEntry(entry)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
