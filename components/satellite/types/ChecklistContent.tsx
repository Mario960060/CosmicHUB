'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

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
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const [items, setItems] = useState<ChecklistItem[]>(() => getItems(satelliteData));
  const [newItemText, setNewItemText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(getItems(satelliteData));
  }, [subtaskId, satelliteData]);

  const saveItems = async (
    newItems: ChecklistItem[],
    activityEntry?: { user_id: string; action: string; detail: string }
  ) => {
    setSaving(true);
    const { error } = await saveSatelliteData(subtaskId, { items: newItems }, {
      activityEntry,
      onSuccess: () => invalidate(subtaskId),
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    setItems(newItems);
  };

  const updateItemStatus = (id: string, status: ChecklistItem['status']) => {
    const item = items.find((i) => i.id === id);
    const next = items.map((i) => {
      if (i.id !== id) return i;
      return {
        ...i,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      };
    });
    const action = status === 'done' ? 'toggled_item' : 'toggled_item';
    saveItems(next, user ? { user_id: user.id, action, detail: item?.text ?? '', actor_name: user.full_name } : undefined);
  };

  const deleteItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    const next = items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx }));
    saveItems(next, user ? { user_id: user.id, action: 'deleted_item', detail: item?.text ?? '', actor_name: user.full_name } : undefined);
  };

  const cycleStatus = (item: ChecklistItem) => {
    const next: ChecklistItem['status'] =
      item.status === 'todo' ? 'doing' : item.status === 'doing' ? 'done' : 'todo';
    updateItemStatus(item.id, next);
  };

  const addItem = () => {
    if (!newItemText.trim() || !user) return;
    const text = newItemText.trim();
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      status: 'todo',
      order: 0,
      created_at: new Date().toISOString(),
    };
    const next = [newItem, ...items.map((i, idx) => ({ ...i, order: idx + 1 }))];
    setNewItemText('');
    saveItems(next, { user_id: user.id, action: 'added_item', detail: text, actor_name: user.full_name });
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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
              disabled={saving}
              style={{
                padding: '4px',
                background: 'none',
                border: 'none',
                color: 'rgba(239, 68, 68, 0.8)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
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
