'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { ensureAbsoluteUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, Link as LinkIcon, Plus, FolderOpen, GripVertical } from 'lucide-react';

interface DocLink {
  id: string;
  url: string;
  label: string;
  type?: string;
  added_by?: string;
  added_at?: string;
  order: number;
}

interface DocumentsContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  canReorder?: boolean;
}

function getLinks(data: Record<string, unknown>): DocLink[] {
  const raw = data.links;
  if (!Array.isArray(raw)) return [];
  return raw.map((l: any, idx: number) => ({
    id: l.id || crypto.randomUUID(),
    url: l.url || '',
    label: l.label || '',
    type: l.type,
    added_by: l.added_by,
    added_at: l.added_at || new Date().toISOString(),
    order: typeof l.order === 'number' ? l.order : idx,
  }));
}

function getLinkType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('figma')) return 'figma';
  if (u.includes('github')) return 'github';
  if (u.includes('docs.google') || u.includes('drive.google')) return 'docs';
  if (u.includes('api') || u.includes('swagger')) return 'api';
  return 'other';
}

export function DocumentsContent({ subtaskId, satelliteData, canReorder = false }: DocumentsContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const [tab, setTab] = useState<'files' | 'links'>('links');
  const [links, setLinks] = useState<DocLink[]>(() => getLinks(satelliteData));
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const reorderLinks = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const sorted = [...links].sort((a, b) => a.order - b.order);
    const reordered = [...sorted];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const next = reordered.map((l, idx) => ({ ...l, order: idx }));
    save(next, { user_id: user!.id, action: 'reordered_links', detail: '', actor_name: user!.full_name });
    setDraggedIndex(toIndex);
  };

  const handleLinkDragStart = (index: number) => setDraggedIndex(index);
  const handleLinkDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index) reorderLinks(draggedIndex, index);
  };
  const handleLinkDragEnd = () => setDraggedIndex(null);

  useEffect(() => {
    setLinks(getLinks(satelliteData));
  }, [subtaskId, satelliteData]);

  const getExistingData = () => {
    const files = Array.isArray(satelliteData.files) ? satelliteData.files : [];
    const folders = Array.isArray(satelliteData.folders) ? satelliteData.folders : [];
    return { files, folders };
  };

  const save = async (
    nextLinks: DocLink[],
    activityEntry?: { user_id: string; action: string; detail: string; actor_name?: string }
  ) => {
    setSaving(true);
    const { files, folders } = getExistingData();
    const { error } = await saveSatelliteData(
      subtaskId,
      { files, links: nextLinks, folders },
      { activityEntry, onSuccess: () => invalidate(subtaskId) }
    );
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    setLinks(nextLinks);
  };

  const addLink = () => {
    if (!newUrl.trim() || !user) return;
    const link: DocLink = {
      id: crypto.randomUUID(),
      url: newUrl.trim(),
      label: newLabel.trim() || newUrl.trim(),
      type: getLinkType(newUrl),
      added_by: user.id,
      added_at: new Date().toISOString(),
      order: 0,
    };
    const next = [link, ...links.map((l, idx) => ({ ...l, order: idx + 1 }))];
    save(next, { user_id: user.id, action: 'added_link', detail: link.label || link.url, actor_name: user.full_name });
    setNewUrl('');
    setNewLabel('');
    setShowAddLink(false);
  };

  const removeLink = (id: string) => {
    const link = links.find((l) => l.id === id);
    const next = links.filter((l) => l.id !== id);
    save(next, { user_id: user!.id, action: 'removed_link', detail: link?.label || link?.url || '', actor_name: user!.full_name });
  };

  const typeIcon = (t?: string) => {
    switch (t) {
      case 'figma':
        return '🎨';
      case 'github':
        return '📘';
      case 'docs':
        return '📄';
      case 'api':
        return '🔗';
      default:
        return '🔗';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setTab('files')}
          style={{
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '13px',
            background: tab === 'files' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${tab === 'files' ? '#14b8a6' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: tab === 'files' ? '#14b8a6' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FolderOpen size={16} />
          Files
        </button>
        <button
          type="button"
          onClick={() => setTab('links')}
          style={{
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '13px',
            background: tab === 'links' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${tab === 'links' ? '#14b8a6' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: tab === 'links' ? '#14b8a6' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <LinkIcon size={16} />
          Links
        </button>
      </div>

      {tab === 'files' && (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px dashed rgba(20, 184, 166, 0.3)',
            borderRadius: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>File upload with Supabase Storage — coming in next phase.</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
            Use Links tab for now.
          </p>
        </div>
      )}

      {tab === 'links' && (
        <>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAddLink(!showAddLink)}
              style={{
                padding: '10px 16px',
                background: 'rgba(20, 184, 166, 0.2)',
                border: '1px solid rgba(20, 184, 166, 0.5)',
                borderRadius: '8px',
                color: '#14b8a6',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              Add Link
            </button>
          </div>

          {showAddLink && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                borderRadius: '12px',
              }}
            >
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '10px',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (optional)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '10px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={addLink}
                  disabled={saving || !newUrl.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(20, 184, 166, 0.3)',
                    border: '1px solid rgba(20, 184, 166, 0.5)',
                    borderRadius: '8px',
                    color: '#14b8a6',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: saving || !newUrl.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLink(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...links].sort((a, b) => a.order - b.order).map((link, index) => (
              <div
                key={link.id}
                draggable={canReorder}
                onDragStart={() => canReorder && handleLinkDragStart(index)}
                onDragOver={(e) => canReorder && handleLinkDragOver(e, index)}
                onDragEnd={() => handleLinkDragEnd()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(20, 184, 166, 0.15)',
                  borderRadius: '8px',
                  cursor: canReorder ? 'grab' : 'default',
                  opacity: draggedIndex === index ? 0.5 : 1,
                }}
              >
                {canReorder && (
                  <div
                    style={{ cursor: 'grab', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={16} />
                  </div>
                )}
                <span style={{ fontSize: '20px' }}>{typeIcon(link.type)}</span>
                <a
                  href={ensureAbsoluteUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    color: '#14b8a6',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.label || link.url}
                </a>
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  disabled={saving}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    fontSize: '13px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {links.length === 0 && !showAddLink && (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '14px',
              }}
            >
              No links yet. Click &quot;Add Link&quot; to add resources.
            </div>
          )}
        </>
      )}
    </div>
  );
}
