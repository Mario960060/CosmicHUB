'use client';

import { useAuth } from '@/hooks/use-auth';
import { useWhatsNew } from '@/lib/dashboard/whats-new-queries';
import { useRedFlags, useDeadlineTimeline } from '@/lib/dashboard/red-flags-queries';
import { useSystemHealth } from '@/lib/dashboard/attention-queries';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  WhatsNewPanel,
  RedFlagsPanel,
  SystemHealthPanel,
  UserManagementPanel,
  QuickActionsBar,
} from '@/components/dashboard';
import { Users, Mail, Activity, FolderKanban } from 'lucide-react';

const supabase = createClient();

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'admin';
  const { data: whatsNewData } = useWhatsNew(user?.id, role);
  const whatsNew = whatsNewData?.items ?? [];
  const isFirstLogin = whatsNewData?.isFirstLogin ?? false;
  const { data: redFlags = [] } = useRedFlags('admin', user?.id);
  const { data: timeline = [] } = useDeadlineTimeline('admin', user?.id);
  const { data: systemHealth } = useSystemHealth();

  const { data: recentUsers = [] } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role, last_seen')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['admin-pending-invites'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invites')
        .select('id, email, role, status')
        .eq('status', 'pending');
      return data ?? [];
    },
  });

  const defaultHealth = {
    totalUsers: 0,
    totalProjects: 0,
    activeTasks: 0,
    onlineUsers: 0,
    blockedCount: 0,
    blockedRatio: 0,
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '40px' }}>⚙️</span>
            <h1
              style={{
                fontSize: '48px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#00d9ff',
                textShadow: '0 0 30px rgba(0,217,255,0.5)',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Admin Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '56px' }}>
            Welcome back, <span style={{ color: '#00d9ff', fontWeight: '600' }}>{user?.full_name}</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WhatsNewPanel items={whatsNew} isFirstLogin={isFirstLogin} />

          <RedFlagsPanel flags={redFlags} timeline={timeline} />

          <SystemHealthPanel stats={systemHealth ?? defaultHealth} />

          <UserManagementPanel users={recentUsers} invites={pendingInvites} />

          <QuickActionsBar
            actions={[
              { label: 'Manage Users', path: '/admin/users', icon: Users, color: '#00d9ff' },
              { label: 'Manage Invites', path: '/admin/invites', icon: Mail, color: '#00d9ff' },
              { label: 'Activity Log', path: '/admin/activity', icon: Activity, color: '#00d9ff' },
              { label: 'All Projects', path: '/pm/projects', icon: FolderKanban, color: '#00d9ff' },
              { label: 'Team Directory', path: '/team', icon: Users, color: '#00d9ff' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
