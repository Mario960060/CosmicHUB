'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotesContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

const initialData = {
  content: '',
  sections: [] as { id: string; title: string; content: string; order: number }[],
  links: [] as { id: string; url: string; label: string }[],
};

export function NotesContent({ subtaskId, satelliteData }: NotesContentProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [content, setContent] = useState(
    (satelliteData.content as string) ?? initialData.content
  );
  const [links, setLinks] = useState(initialData.links);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const c = typeof satelliteData.content === 'string' ? satelliteData.content : '';
    const l = Array.isArray(satelliteData.links) ? (satelliteData.links as typeof initialData.links) : [];
    setContent(c);
    setLinks(l);
  }, [subtaskId, satelliteData.content, satelliteData.links]);

  const save = useCallback(async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { content, links, sections: [] },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
    setLastSaved(new Date());
  }, [subtaskId, content, links]);

  useEffect(() => {
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [content, save]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setMode('edit')}
          style={{
            padding: '8px 16px',
            background: mode === 'edit' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${mode === 'edit' ? '#818cf8' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: mode === 'edit' ? '#818cf8' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMode('preview')}
          style={{
            padding: '8px 16px',
            background: mode === 'preview' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${mode === 'preview' ? '#818cf8' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: mode === 'preview' ? '#818cf8' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Preview
        </button>
        {saving && (
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', alignSelf: 'center' }}>
            Saving...
          </span>
        )}
        {lastSaved && !saving && (
          <span style={{ fontSize: '12px', color: 'rgba(34, 197, 94, 0.8)', alignSelf: 'center' }}>
            Saved
          </span>
        )}
      </div>

      {mode === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Markdown content here..."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            lineHeight: 1.6,
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      ) : (
        <div
          style={{
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(129, 140, 248, 0.2)',
            borderRadius: '12px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {content || 'No content yet. Switch to Edit to add notes.'}
        </div>
      )}

      {links.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
            📎 Links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#818cf8',
                  fontSize: '13px',
                  textDecoration: 'underline',
                }}
              >
                {link.label || link.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
