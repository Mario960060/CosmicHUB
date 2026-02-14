'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePMStats } from '@/lib/dashboard/queries';
import { useWhatsNew } from '@/lib/dashboard/whats-new-queries';
import { usePMAttentionItems, usePMProjectOverviews } from '@/lib/dashboard/attention-queries';
import {
  WhatsNewPanel,
  AttentionPanel,
  ProjectOverviewGrid,
  StatsCard,
  QuickActionsBar,
} from '@/components/dashboard';
import { FolderKanban, Clock, Ban, TrendingUp, Plus, Users } from 'lucide-react';

export default function PMDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'project_manager';
  const { data: stats } = usePMStats(user?.id);
  const { data: whatsNewData } = useWhatsNew(user?.id, role);
  const whatsNew = whatsNewData?.items ?? [];
  const isFirstLogin = whatsNewData?.isFirstLogin ?? false;
  const { data: attentionItems } = usePMAttentionItems(user?.id);
  const { data: projects = [] } = usePMProjectOverviews(user?.id);

  const defaultAttention: Parameters<typeof AttentionPanel>[0]['items'] = {
    pendingApprovals: [],
    overdueTasks: [],
    blockedTasks: [],
    unassignedHighPriority: [],
    workloadAlerts: [],
  };

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '40px' }}>📊</span>
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
              Project Manager Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '56px' }}>
            Welcome back, <span style={{ color: '#00d9ff', fontWeight: '600' }}>{user?.full_name}</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WhatsNewPanel items={whatsNew} isFirstLogin={isFirstLogin} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <AttentionPanel items={attentionItems ?? defaultAttention} />
            <ProjectOverviewGrid projects={projects} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            <StatsCard
              value={stats?.activeProjects ?? 0}
              label="Active Projects"
              icon={FolderKanban}
              color="#00d9ff"
            />
            <StatsCard
              value={stats?.pendingRequests ?? 0}
              label="Pending Requests"
              icon={Clock}
              color="#f97316"
            />
            <StatsCard
              value={stats?.blockers ?? 0}
              label="Blockers"
              icon={Ban}
              color="#ef4444"
            />
            <StatsCard
              value={stats?.teamVelocity ?? 0}
              label="Team Velocity (tasks/week)"
              icon={TrendingUp}
              color="#10b981"
            />
          </div>

          <QuickActionsBar
            actions={[
              { label: 'New Project', path: '/pm/projects/new', icon: Plus, color: '#00d9ff' },
              { label: 'All Projects', path: '/pm/projects', icon: FolderKanban, color: '#00d9ff' },
              { label: 'Review Requests', path: '/pm/requests', icon: Clock, color: '#00d9ff' },
              { label: 'Galactic View', path: '/galactic', icon: TrendingUp, color: '#00d9ff' },
              { label: 'Team Directory', path: '/team', icon: Users, color: '#00d9ff' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
