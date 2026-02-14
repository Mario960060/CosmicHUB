'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { FileText, Link as LinkIcon, Plus, FolderOpen } from 'lucide-react';

interface DocLink {
  id: string;
  url: string;
  label: string;
  type?: string;
  added_by?: string;
  added_at?: string;
}

interface DocumentsContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

function getLinks(data: Record<string, unknown>): DocLink[] {
  const raw = data.links;
  if (!Array.isArray(raw)) return [];
  return raw.map((l: any) => ({
    id: l.id || crypto.randomUUID(),
    url: l.url || '',
    label: l.label || '',
    type: l.type,
    added_by: l.added_by,
    added_at: l.added_at || new Date().toISOString(),
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

export function DocumentsContent({ subtaskId, satelliteData }: DocumentsContentProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'files' | 'links'>('links');
  const [links, setLinks] = useState<DocLink[]>(() => getLinks(satelliteData));
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLinks(getLinks(satelliteData));
  }, [subtaskId]);

  const getExistingData = () => {
    const files = Array.isArray(satelliteData.files) ? satelliteData.files : [];
    const folders = Array.isArray(satelliteData.folders) ? satelliteData.folders : [];
    return { files, folders };
  };

  const save = async (nextLinks: DocLink[]) => {
    setSaving(true);
    const supabase = createClient();
    const { files, folders } = getExistingData();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { files, links: nextLinks, folders },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
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
    };
    const next = [...links, link];
    save(next);
    setNewUrl('');
    setNewLabel('');
    setShowAddLink(false);
  };

  const removeLink = (id: string) => {
    const next = links.filter((l) => l.id !== id);
    save(next);
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
          <p style={{ margin: 0, fontSize: '14px' }}>File upload coming soon</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
            Drag & drop and Supabase Storage integration in next phase
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
            {links.map((link) => (
              <div
                key={link.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(20, 184, 166, 0.15)',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{typeIcon(link.type)}</span>
                <a
                  href={link.url}
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
