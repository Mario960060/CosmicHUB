// CURSOR: Basic PM dashboard
// Shows: stats, pending requests, recent projects
// Full dashboard in Phase 5

'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePMStats, useProjects } from '@/lib/pm/queries';
import { StatCard } from './components/StatCard';
import { PendingRequestsWidget } from './components/PendingRequestsWidget';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function PMDashboard() {
  const { user } = useAuth();
  const { data: stats } = usePMStats(user?.id);
  const { data: projects } = useProjects();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/20 bg-surface">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-display text-primary">📊 Project Manager Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Projects" value={stats?.projectCount || 0} icon="📁" color="primary" />
          <StatCard label="Pending Requests" value={stats?.pendingRequests || 0} icon="⏳" color="accent" />
          <StatCard label="Active Tasks" value={stats?.activeTasksCount || 0} icon="✅" color="secondary" />
          <StatCard label="Team Members" value={stats?.teamMembersCount || 0} icon="👥" color="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Requests */}
          <PendingRequestsWidget />

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-medium mb-4 text-primary">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/pm/projects/new')}
                className="w-full"
              >
                + Create New Project
              </Button>
              <Button
                onClick={() => router.push('/pm/projects')}
                variant="secondary"
                className="w-full"
              >
                View All Projects
              </Button>
              <Button
                onClick={() => router.push('/pm/requests')}
                variant="ghost"
                className="w-full"
              >
                Review Task Requests
              </Button>
              <Button
                onClick={() => router.push('/workstation')}
                variant="ghost"
                className="w-full"
              >
                Go to Workstation
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-primary">Recent Projects</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/pm/projects')}
            >
              View All
            </Button>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-background rounded border border-primary/10 hover:border-primary/30 transition cursor-pointer"
                  onClick={() => router.push(`/pm/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-primary">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      project.status === 'active' ? 'bg-green-500/20 text-green-300' :
                      project.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                      project.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-gray-500/20 text-gray-300/70'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-primary/60 mb-2">
                      {project.description}
                    </p>
                  )}
                  {project.client && (
                    <p className="text-xs text-secondary/60">
                      Client: {project.client.full_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-primary/70 mb-4">No projects yet</p>
              <Button 
                onClick={() => router.push('/pm/projects/new')}
                className="transition-all"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  color: '#00d9ff',
                  borderColor: 'rgba(0, 188, 212, 0.7)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 188, 212, 0.5)';
                  e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.95)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
                }}
              >
                Create Your First Project
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
