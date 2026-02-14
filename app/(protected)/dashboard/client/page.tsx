'use client';

import { useAuth } from '@/hooks/use-auth';
import { useClientStats } from '@/lib/dashboard/queries';
import { useWhatsNew } from '@/lib/dashboard/whats-new-queries';
import { useClientMilestones, useClientProjectProgress } from '@/lib/dashboard/attention-queries';
import {
  WhatsNewPanel,
  ProjectProgressPanel,
  MilestonesPanel,
  StatsCard,
  QuickActionsBar,
} from '@/components/dashboard';
import { FolderKanban, TrendingUp, Eye, MessageCircle, Settings } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'client';
  const { data: stats } = useClientStats(user?.id);
  const { data: whatsNewData } = useWhatsNew(user?.id, role);
  const whatsNew = whatsNewData?.items ?? [];
  const isFirstLogin = whatsNewData?.isFirstLogin ?? false;
  const { data: milestones = [] } = useClientMilestones(user?.id);
  const { data: projectProgress = [] } = useClientProjectProgress(user?.id);

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
              }}
            >
              <Eye size={28} style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }} />
            </div>
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
              Client Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '56px' }}>
            Welcome back, <span style={{ color: '#00d9ff', fontWeight: '600' }}>{user?.full_name}</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WhatsNewPanel items={whatsNew} isFirstLogin={isFirstLogin} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <ProjectProgressPanel projects={projectProgress} />
            <MilestonesPanel milestones={milestones} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            <StatsCard
              value={stats?.projectCount ?? 0}
              label="My Projects"
              icon={FolderKanban}
              color="#00d9ff"
            />
            <StatsCard
              value={`${stats?.overallProgress ?? 0}%`}
              label="Overall Progress"
              icon={TrendingUp}
              color="#10b981"
            />
          </div>

          <QuickActionsBar
            actions={[
              { label: 'Galactic View', path: '/galactic', icon: Eye, color: '#00d9ff' },
              { label: 'Comms Beacon', path: '/comms', icon: MessageCircle, color: '#00d9ff' },
              { label: 'Settings', path: '/settings/profile', icon: Settings, color: '#00d9ff' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
