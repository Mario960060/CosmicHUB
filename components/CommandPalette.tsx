// CURSOR: Global command palette (Cmd+K)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);

  // Open on Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      const searchTerm = `%${query}%`;

      // Search subtasks
      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('id, name')
        .ilike('name', searchTerm)
        .limit(5);

      // Search projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', searchTerm)
        .limit(5);

      const combined = [
        ...(subtasks?.map((s) => ({ ...s, type: 'task' })) || []),
        ...(projects?.map((p) => ({ ...p, type: 'project' })) || []),
      ];

      setResults(combined);
      setSelected(0);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(results[selected]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selected]);

  const handleSelect = (result: any) => {
    if (!result) return;

    if (result.type === 'task') {
      router.push(`/workstation?task=${result.id}`);
    } else if (result.type === 'project') {
      router.push(`/pm/projects/${result.id}`);
    }

    setIsOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="">
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Search tasks, projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {query.length < 2 ? (
          <div className="text-sm text-primary/60 text-center py-4">
            Type to search...
          </div>
        ) : results.length === 0 ? (
          <div className="text-sm text-primary/60 text-center py-4">
            No results found
          </div>
        ) : (
          <div className="space-y-1">
            {results.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`p-3 rounded cursor-pointer transition ${
                  index === selected ? 'bg-primary/10 border border-primary/30' : 'border border-transparent'
                } hover:bg-primary/10`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary capitalize">
                    {result.type}
                  </span>
                  <span className="font-medium text-primary">{result.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-primary/50 text-center">
          ↑↓ Navigate • ↵ Select • Esc Close
        </div>
      </div>
    </Dialog>
  );
}
