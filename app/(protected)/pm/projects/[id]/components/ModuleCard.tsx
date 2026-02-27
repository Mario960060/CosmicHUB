// CURSOR: Module card showing tasks count and progress

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreateTaskDialog } from './CreateTaskDialog';
import { Plus } from 'lucide-react';
import type { ModuleWithTasks } from '@/lib/pm/queries';

interface ModuleCardProps {
  module: ModuleWithTasks;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);

  const tasksCount = module.tasks?.length || 0;

  return (
    <>
      <Card className="border-l-4" style={{ borderLeftColor: module.color }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-lg mb-1">{module.name}</h3>
            {module.description && (
              <p className="text-sm text-secondary/60">{module.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCreateTask(true)}
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
            <Plus size={16} />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-primary/60">
          <span>{tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}</span>
        </div>

        {/* Task List */}
        {module.tasks && module.tasks.length > 0 && (
          <div className="mt-3 space-y-2">
            {module.tasks.map((task) => (
              <div
                key={task.id}
                className="p-2 bg-background rounded text-sm border border-primary/10"
              >
                {task.name}
              </div>
            ))}
          </div>
        )}
      </Card>

      <CreateTaskDialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={module.project_id}
        moduleId={module.id}
      />
    </>
  );
}
