'use client';

import { useAuth } from '@/hooks/use-auth';
import { useWorkerStats } from '@/lib/dashboard/queries';
import { useWhatsNew } from '@/lib/dashboard/whats-new-queries';
import { useFocusQueue } from '@/lib/dashboard/focus-queue-queries';
import { useMyBlockers, useMyDependencyWaits } from '@/lib/dashboard/attention-queries';
import {
  WhatsNewPanel,
  FocusQueuePanel,
  BlockersPanel,
  StatsCard,
  QuickActionsBar,
} from '@/components/dashboard';
import { Clock, CheckCircle2, Zap, Eye, Users, Settings } from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'worker';
  const { data: stats } = useWorkerStats(user?.id);
  const { data: whatsNewData } = useWhatsNew(user?.id, role);
  const whatsNew = whatsNewData?.items ?? [];
  const isFirstLogin = whatsNewData?.isFirstLogin ?? false;
  const { data: focusQueue = [] } = useFocusQueue(user?.id);
  const { data: blockers = [] } = useMyBlockers(user?.id);
  const { data: dependencyWaits = [] } = useMyDependencyWaits(user?.id);

  return (
    <div style={{ minHeight: '100vh', padding: '96px 48px 48px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '40px' }}>🛠️</span>
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
              Worker Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '56px' }}>
            Welcome back, <span style={{ color: '#00d9ff', fontWeight: '600' }}>{user?.full_name}</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WhatsNewPanel items={whatsNew} isFirstLogin={isFirstLogin} />

          <FocusQueuePanel tasks={focusQueue} />

          <BlockersPanel myBlockers={blockers} dependencyWaits={dependencyWaits} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <StatsCard
              value={stats?.activeTasks ?? 0}
              label="Active Tasks"
              icon={Clock}
              color="#00d9ff"
            />
            <StatsCard
              value={stats?.doneToday ?? 0}
              label="Done Today"
              icon={CheckCircle2}
              color="#10b981"
            />
            <StatsCard
              value={`${stats?.hoursThisWeek ?? 0}h`}
              label="Hours This Week"
              icon={Zap}
              color="#ff6b35"
            />
          </div>

          <QuickActionsBar
            actions={[
              { label: 'Go to Workstation', path: '/workstation', icon: Zap, color: '#00d9ff' },
              { label: 'Galactic View', path: '/galactic', icon: Eye, color: '#00d9ff' },
              { label: 'Team Directory', path: '/team', icon: Users, color: '#00d9ff' },
              { label: 'Settings', path: '/settings/profile', icon: Settings, color: '#00d9ff' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
