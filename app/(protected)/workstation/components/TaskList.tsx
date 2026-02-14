'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSubtasks, useMyActiveTasks, useAvailableTasks } from '@/lib/workstation/queries';
import { TaskCard } from './TaskCard';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

type Filter = 'all' | 'my-tasks' | 'available';

interface TaskListProps {
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function TaskList({ selectedTaskId, onSelectTask }: TaskListProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allTasks, isLoading: loadingAll } = useSubtasks();
  const { data: myTasks, isLoading: loadingMy } = useMyActiveTasks(user?.id);
  const { data: availableTasks, isLoading: loadingAvailable } = useAvailableTasks();

  // Select correct dataset based on filter
  const tasks = useMemo(() => {
    switch (filter) {
      case 'my-tasks':
        return myTasks || [];
      case 'available':
        return availableTasks || [];
      default:
        return allTasks || [];
    }
  }, [filter, allTasks, myTasks, availableTasks]);

  // Search filter
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.parent_task?.module?.name.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const isLoading = loadingAll || loadingMy || loadingAvailable;

  return (
    <div className="h-full flex flex-col">
      {/* Header with glow */}
      <div className="p-4 border-b border-primary/30">
        <h2 className="text-xl font-display font-semibold neon-cyan mb-4">⚡ Tasks</h2>

        {/* Search with glass input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" size={16} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-10 pr-4 py-2 rounded-lg text-sm text-primary placeholder:text-primary/40"
          />
        </div>

        {/* Filter buttons with active glow */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                : 'glass-card text-primary/60 hover:text-primary hover:border-primary/30'
            }`}
            style={filter === 'all' ? {
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.95)',
              boxShadow: '0 0 30px rgba(0, 188, 212, 0.5)',
            } : {
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.7)',
            }}
            onMouseEnter={(e) => {
              if (filter !== 'all') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.color = '#00d9ff';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== 'all') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('my-tasks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'my-tasks'
                ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                : 'glass-card text-primary/60 hover:text-primary hover:border-primary/30'
            }`}
            style={filter === 'my-tasks' ? {
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.95)',
              boxShadow: '0 0 30px rgba(0, 188, 212, 0.5)',
            } : {
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.7)',
            }}
            onMouseEnter={(e) => {
              if (filter !== 'my-tasks') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.color = '#00d9ff';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== 'my-tasks') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
          >
            My Tasks ({myTasks?.length || 0})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'available'
                ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                : 'glass-card text-primary/60 hover:text-primary hover:border-primary/30'
            }`}
            style={filter === 'available' ? {
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.95)',
              boxShadow: '0 0 30px rgba(0, 188, 212, 0.5)',
            } : {
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              color: '#00d9ff',
              borderColor: 'rgba(0, 188, 212, 0.7)',
            }}
            onMouseEnter={(e) => {
              if (filter !== 'available') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.color = '#00d9ff';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== 'available') {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.7)';
              }
            }}
          >
            Available ({availableTasks?.length || 0})
          </button>
        </div>
      </div>

      {/* Task List with glass cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-primary/70 text-center py-8">
            <div className="inline-block w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-primary/70 text-center py-12 glass-card rounded-lg">
            {searchQuery ? '🔍 No tasks match your search' : '📋 No tasks found'}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onClick={() => onSelectTask(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
