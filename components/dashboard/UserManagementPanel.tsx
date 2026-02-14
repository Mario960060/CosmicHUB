'use client';

import { useRouter } from 'next/navigation';
import { Users, Mail } from 'lucide-react';

interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  role: string;
  last_seen?: string | null;
}

interface InviteSummary {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface UserManagementPanelProps {
  users: UserSummary[];
  invites: InviteSummary[];
}

export function UserManagementPanel({ users, invites }: UserManagementPanelProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 217, 255, 0.15)' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'Orbitron, sans-serif', color: '#00d9ff', margin: 0 }}>
          User Management
        </h2>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#00d9ff', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} />
            Recent Users ({users.length})
          </div>
          {users.slice(0, 5).map((u) => (
            <div
              key={u.id}
              onClick={() => router.push('/admin/users')}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)',
                marginBottom: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#fff',
              }}
            >
              {u.full_name} • {u.role}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#f97316', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} />
            Pending Invites ({invites.length})
          </div>
          {invites.slice(0, 5).map((i) => (
            <div
              key={i.id}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#fff',
              }}
            >
              {i.email} • {i.role}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
