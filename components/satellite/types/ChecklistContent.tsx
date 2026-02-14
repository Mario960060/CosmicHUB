'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChecklistItem {
  id: string;
  text: string;
  status: 'todo' | 'doing' | 'done';
  assigned_to?: string | null;
  order: number;
  created_at?: string;
  completed_at?: string | null;
}

interface ChecklistContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

function getItems(data: Record<string, unknown>): ChecklistItem[] {
  const raw = data.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, i: number) => ({
    id: item.id || crypto.randomUUID(),
    text: item.text || '',
    status: item.status || 'todo',
    assigned_to: item.assigned_to,
    order: item.order ?? i,
    created_at: item.created_at,
    completed_at: item.completed_at,
  }));
}

export function ChecklistContent({ subtaskId, satelliteData }: ChecklistContentProps) {
  const [items, setItems] = useState<ChecklistItem[]>(() => getItems(satelliteData));
  const [newItemText, setNewItemText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(getItems(satelliteData));
  }, [subtaskId]);

  const saveItems = async (newItems: ChecklistItem[]) => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { items: newItems },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
  };

  const updateItemStatus = (id: string, status: ChecklistItem['status']) => {
    const next = items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      };
    });
    setItems(next);
    saveItems(next);
  };

  const cycleStatus = (item: ChecklistItem) => {
    const next: ChecklistItem['status'] =
      item.status === 'todo' ? 'doing' : item.status === 'doing' ? 'done' : 'todo';
    updateItemStatus(item.id, next);
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      status: 'todo',
      order: items.length,
      created_at: new Date().toISOString(),
    };
    const next = [...items, newItem];
    setItems(next);
    setNewItemText('');
    saveItems(next);
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const total = items.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '6px',
          }}
        >
          <span>Progress</span>
          <span>
            {doneCount}/{total} ({Math.round(progress)}%)
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#22c55e',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: item.status === 'doing' ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
              border: `1px solid ${item.status === 'doing' ? 'rgba(0, 217, 255, 0.3)' : 'rgba(0, 217, 255, 0.1)'}`,
              borderRadius: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => cycleStatus(item)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: `2px solid ${item.status === 'done' ? '#22c55e' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '6px',
                color: item.status === 'done' ? '#22c55e' : 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                fontSize: '14px',
              }}
            >
              {item.status === 'done' && '✓'}
            </button>
            <span
              style={{
                flex: 1,
                fontSize: '14px',
                color: item.status === 'done' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                textDecoration: item.status === 'done' ? 'line-through' : 'none',
              }}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add item..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={saving || !newItemText.trim()}
          style={{
            padding: '10px 20px',
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '8px',
            color: '#22c55e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving || !newItemText.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !newItemText.trim() ? 0.6 : 1,
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
