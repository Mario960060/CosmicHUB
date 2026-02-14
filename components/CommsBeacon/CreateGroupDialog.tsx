'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useTeamUsers } from '@/lib/chat/queries';
import { useCreateGroup } from '@/lib/chat/mutations';
import { COMMS_STYLES, getInitials } from './comms-styles';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (channel: { id: string; name: string; type: 'group' }) => void;
  currentUserId?: string;
  userRole?: string;
}

export function CreateGroupDialog({ open, onClose, onCreated, currentUserId, userRole }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: teamUsers } = useTeamUsers(currentUserId, userRole);
  const createGroup = useCreateGroup();

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    const n = name.trim();
    if (!n) return;
    createGroup.mutate(
      { name: n, memberIds: Array.from(selectedIds) },
      {
        onSuccess: (data) => {
          onCreated({
            id: data.id,
            name: n,
            type: 'group',
          });
          setName('');
          setSelectedIds(new Set());
          onClose();
        },
        onError: (err) => {
          toast.error('Could not create group', { description: err.message });
        },
      }
    );
  };

  const handleClose = () => {
    setName('');
    setSelectedIds(new Set());
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 360,
          maxHeight: '80vh',
          background: COMMS_STYLES.bg,
          border: `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
          borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: COMMS_STYLES.accent }}>New Group</span>
          <button
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: COMMS_STYLES.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="scrollbar-cosmic" style={{ padding: 16, flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: COMMS_STYLES.muted, fontFamily: 'Rajdhani', display: 'block', marginBottom: 6 }}>
              Group name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                background: COMMS_STYLES.accentRgba(0.03),
                border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
                color: COMMS_STYLES.text,
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COMMS_STYLES.muted, fontFamily: 'Rajdhani', display: 'block', marginBottom: 6 }}>
              Add members
            </label>
            <div className="scrollbar-cosmic" style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(teamUsers || []).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleToggle(u.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: selectedIds.has(u.id) ? COMMS_STYLES.accentRgba(0.15) : 'transparent',
                    border: `1px solid ${selectedIds.has(u.id) ? COMMS_STYLES.accentRgba(0.3) : 'transparent'}`,
                    color: COMMS_STYLES.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    minWidth: 0,
                    fontSize: 12,
                  }}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: COMMS_STYLES.accentRgba(0.2),
                        color: COMMS_STYLES.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(u.full_name || '?')}
                    </span>
                  )}
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'Unknown'}</span>
                  {selectedIds.has(u.id) && <span style={{ color: COMMS_STYLES.accent, fontSize: 12 }}>✓</span>}
                </button>
              ))}
              {(!teamUsers || teamUsers.length === 0) && (
                <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>No other users in the team.</p>
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: 12,
            borderTop: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${COMMS_STYLES.accentRgba(0.2)}`,
              background: 'transparent',
              color: COMMS_STYLES.text,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || createGroup.isPending}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${COMMS_STYLES.accent}`,
              background: COMMS_STYLES.accentRgba(0.15),
              color: COMMS_STYLES.accent,
              fontSize: 12,
              cursor: name.trim() && !createGroup.isPending ? 'pointer' : 'not-allowed',
              opacity: name.trim() && !createGroup.isPending ? 1 : 0.5,
            }}
          >
            {createGroup.isPending ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
