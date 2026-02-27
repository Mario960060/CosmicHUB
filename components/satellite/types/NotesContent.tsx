'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
import { Trash2, FileText, Check, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';
import { formatRelativeTime } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface NoteItem {
  id: string;
  name: string;
  content: string;
  order: number;
  created_at?: string;
}

interface NotesContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  canReorder?: boolean;
}

/** Ensure content is HTML; wrap plain text in <p> for backward compatibility */
function ensureHtmlContent(content: string): string {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return `<p>${trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</p>`;
}

/** Extract plain text from HTML for word count */
function getWordCount(html: string): number {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return 0;
  div.innerHTML = html;
  const text = div.textContent || '';
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

function getNotes(data: Record<string, unknown>): NoteItem[] {
  const raw = data.notes;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((n: { id?: string; name?: string; content?: string; order?: number; created_at?: string }, i: number) => ({
      id: n.id || crypto.randomUUID(),
      name: typeof n.name === 'string' ? n.name : (typeof n.content === 'string' ? n.content.split('\n')[0]?.slice(0, 50) || 'Untitled' : 'Untitled'),
      content: typeof n.content === 'string' ? ensureHtmlContent(n.content) : '',
      order: n.order ?? i,
      created_at: n.created_at,
    }));
  }
  const legacyContent = typeof data.content === 'string' ? data.content : '';
  if (legacyContent.trim()) {
    const firstLine = legacyContent.split('\n')[0]?.slice(0, 50) || 'Untitled';
    return [{
      id: crypto.randomUUID(),
      name: firstLine,
      content: ensureHtmlContent(legacyContent),
      order: 0,
      created_at: new Date().toISOString(),
    }];
  }
  return [];
}

const FONT_OPTIONS = ['Exo 2', 'Rajdhani', 'Orbitron', 'JetBrains Mono', 'Inter', 'Georgia', 'Arial', 'Monaco', 'Courier New'];
const SIZE_OPTIONS = ['12', '14', '16', '18', '20', '22', '24', '28'];
const TEXT_COLORS = [
  { name: 'White', value: 'rgba(255,255,255,0.85)', title: 'White' },
  { name: 'Indigo', value: '#818cf8', title: 'Indigo' },
  { name: 'Cyan', value: '#00d9ff', title: 'Cyan' },
  { name: 'Rose', value: '#f43f5e', title: 'Rose' },
  { name: 'Amber', value: '#f59e0b', title: 'Amber' },
  { name: 'Green', value: '#22c55e', title: 'Green' },
];
const HIGHLIGHT_COLORS = [
  { name: 'None', value: 'transparent', title: 'None' },
  { name: 'Cyan', value: 'rgba(0,240,255,0.3)', title: 'Cyan' },
  { name: 'Rose', value: 'rgba(244,63,94,0.3)', title: 'Rose' },
  { name: 'Amber', value: 'rgba(245,158,11,0.3)', title: 'Amber' },
  { name: 'Green', value: 'rgba(34,197,94,0.3)', title: 'Green' },
  { name: 'Purple', value: 'rgba(168,85,247,0.3)', title: 'Purple' },
];

export function NotesContent({ subtaskId, satelliteData, canReorder = false }: NotesContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;
  const [notes, setNotes] = useState<NoteItem[]>(() => getNotes(satelliteData));
  const [newNoteName, setNewNoteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null);
  const [toolbarState, setToolbarState] = useState({ bold: false, italic: false, underline: false, strike: false, alignLeft: true, alignCenter: false });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [fullWindow, setFullWindow] = useState(false);

  const reorderNotes = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const sorted = [...notes].sort((a, b) => a.order - b.order);
    const reordered = [...sorted];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const next = reordered.map((n, idx) => ({ ...n, order: idx }));
    save(next, user ? { user_id: user.id, action: 'reordered_notes', detail: '', actor_name: user.full_name } : undefined);
    setDraggedIndex(toIndex);
  };

  const handleNoteDragStart = (index: number) => setDraggedIndex(index);
  const handleNoteDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index) reorderNotes(draggedIndex, index);
  };
  const handleNoteDragEnd = () => setDraggedIndex(null);

  const dataKey = `${subtaskId}:${JSON.stringify(satelliteData.notes)}:${String(satelliteData.content ?? '')}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loaded = getNotes(satelliteData);
    setNotes(loaded);
    const hasLegacy = typeof satelliteData.content === 'string' && (satelliteData.content as string).trim().length > 0;
    const hasNoNotes = !Array.isArray(satelliteData.notes) || (satelliteData.notes as unknown[]).length === 0;
    if (hasLegacy && hasNoNotes && loaded.length > 0) {
      saveSatelliteData(subtaskId, { notes: loaded }, { onSuccess: () => invalidateRef.current(subtaskId) });
    }
  }, [dataKey, subtaskId]);

  const updateToolbarState = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setToolbarState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!openNoteId || !contentRef.current) return;
    const el = contentRef.current;
    const handler = () => updateToolbarState();
    el.addEventListener('mouseup', handler);
    el.addEventListener('keyup', handler);
    document.addEventListener('selectionchange', handler);
    return () => {
      el.removeEventListener('mouseup', handler);
      el.removeEventListener('keyup', handler);
      document.removeEventListener('selectionchange', handler);
    };
  }, [openNoteId, updateToolbarState]);

  useEffect(() => {
    if (openNoteId && contentRef.current) {
      const note = notes.find((n) => n.id === openNoteId);
      if (note) {
        contentRef.current.innerHTML = note.content;
      }
    }
  }, [openNoteId]);

  const save = useCallback(
    async (nextNotes: NoteItem[], activityEntry?: { user_id: string; action: string; detail: string; actor_name?: string }): Promise<boolean> => {
      setSaving(true);
      const { error } = await saveSatelliteData(subtaskId, { notes: nextNotes }, {
        activityEntry,
        onSuccess: () => invalidate(subtaskId),
      });
      setSaving(false);
      if (error) {
        toast.error('Failed to save');
        return false;
      }
      setNotes(nextNotes);
      setLastSaved(new Date());
      return true;
    },
    [subtaskId, invalidate]
  );

  const addNote = async () => {
    if (!newNoteName.trim() || !user) return;
    const name = newNoteName.trim();
    const newItem: NoteItem = {
      id: crypto.randomUUID(),
      name,
      content: '',
      order: notes.length,
      created_at: new Date().toISOString(),
    };
    const next = [...notes.map((n, i) => ({ ...n, order: i })), newItem];
    setNewNoteName('');
    const ok = await save(next, { user_id: user.id, action: 'added_note', detail: name, actor_name: user.full_name });
    if (ok) openNote(newItem);
  };

  const deleteNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    const next = notes.filter((n) => n.id !== id).map((n, i) => ({ ...n, order: i }));
    save(next, user ? { user_id: user.id, action: 'deleted_note', detail: note?.name ?? '', actor_name: user.full_name } : undefined);
    if (openNoteId === id) setOpenNoteId(null);
    setPendingDeleteNoteId(null);
  };

  const scheduleSave = useCallback(
    (nextNotes: NoteItem[]) => {
      setNotes(nextNotes);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const note = openNoteId ? nextNotes.find((n) => n.id === openNoteId) : null;
        save(nextNotes, user && note
          ? { user_id: user.id, action: 'edited_note', detail: note.name || 'Untitled', actor_name: user.full_name }
          : undefined);
        saveTimeoutRef.current = null;
      }, 2000);
    },
    [save, openNoteId, user]
  );

  const openNote = (note: NoteItem) => {
    setOpenNoteId(note.id);
    setEditName(note.name);
    setEditContent(note.content);
  };

  const closeNotePopup = useCallback(() => {
    if (!openNoteId) return;
    const note = notes.find((n) => n.id === openNoteId);
    const currentContent = contentRef.current?.innerHTML ?? editContent;
    if (note && (editName !== note.name || currentContent !== note.content)) {
      const next = notes.map((n) =>
        n.id === openNoteId ? { ...n, name: editName.trim() || note.name, content: currentContent } : n
      );
      setNotes(next);
      save(next, user ? { user_id: user.id, action: 'updated_note', detail: editName || note.name, actor_name: user.full_name } : undefined);
    }
    setOpenNoteId(null);
    setPendingDeleteNoteId(null);
    setFullWindow(false);
  }, [openNoteId, notes, editName, editContent, save, user]);

  const handleContentChange = () => {
    if (!openNoteId || !contentRef.current) return;
    const html = contentRef.current.innerHTML;
    setEditContent(html);
    const note = notes.find((n) => n.id === openNoteId);
    if (note) {
      const next = notes.map((n) => (n.id === openNoteId ? { ...n, content: html } : n));
      scheduleSave(next);
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!contentRef.current) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand('outdent', false);
      } else {
        document.execCommand('indent', false);
      }
      handleContentChange();
      return;
    }

    if (e.key === ' ') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const text = node?.nodeType === Node.TEXT_NODE ? (node as Text).textContent ?? '' : (node?.textContent ?? '');
        const beforeCursor = text.slice(0, sel.anchorOffset).trim();
        let blockTag: string | null = null;
        if (beforeCursor === '#') blockTag = 'h1';
        else if (beforeCursor === '##') blockTag = 'h2';
        else if (beforeCursor === '###') blockTag = 'h3';
        else if (beforeCursor === '-' || beforeCursor === '*') blockTag = 'ul';
        else if (beforeCursor === '>') blockTag = 'blockquote';
        else if (/^\d+\.$/.test(beforeCursor)) blockTag = 'ol';
        if (blockTag && node) {
          e.preventDefault();
          const range = sel.getRangeAt(0);
          const startOffset = Math.max(0, sel.anchorOffset - beforeCursor.length);
          range.setStart(node, startOffset);
          range.setEnd(node, sel.anchorOffset);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('delete', false);
          if (blockTag === 'ul') document.execCommand('insertUnorderedList', false);
          else if (blockTag === 'ol') document.execCommand('insertOrderedList', false);
          else if (blockTag === 'blockquote') document.execCommand('formatBlock', false, '<blockquote>');
          else document.execCommand('formatBlock', false, `<${blockTag}>`);
          handleContentChange();
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let n: Node | null = sel.anchorNode;
        let block: HTMLElement | null = null;
        const blockTags = ['LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3'];
        while (n && n !== contentRef.current) {
          if (n.nodeType === Node.ELEMENT_NODE && blockTags.includes((n as HTMLElement).tagName)) {
            block = n as HTMLElement;
            break;
          }
          n = n.parentNode;
        }
        const isEmpty = block && (block.textContent?.trim() ?? '') === '';
        if (block?.tagName === 'LI' && isEmpty) {
          e.preventDefault();
          document.execCommand('outdent', false);
          document.execCommand('formatBlock', false, 'p');
          handleContentChange();
          return;
        }
        if (block?.tagName === 'BLOCKQUOTE' && isEmpty) {
          e.preventDefault();
          document.execCommand('outdent', false);
          document.execCommand('formatBlock', false, 'p');
          handleContentChange();
          return;
        }
        if (block && ['H1', 'H2', 'H3'].includes(block.tagName) && isEmpty) {
          e.preventDefault();
          document.execCommand('formatBlock', false, 'p');
          handleContentChange();
          return;
        }
      }
    }

    if (e.key !== 'Backspace' && e.key !== 'Enter') return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node: Node | null = sel.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let n: HTMLElement | null = node as HTMLElement;

    const BLOCK_TAGS = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'PRE', 'LI'];
    const LINE_TAGS = ['P', 'DIV', 'LI', ...BLOCK_TAGS];
    let specialBlock: HTMLElement | null = null;
    let lineBlock: HTMLElement | null = null;
    while (n && n !== contentRef.current) {
      const tag = n.tagName;
      if (LINE_TAGS.includes(tag) && !lineBlock) lineBlock = n;
      if (BLOCK_TAGS.includes(tag)) {
        specialBlock = n;
        break;
      }
      n = n.parentElement;
    }

    const isBlockEmpty = (el: HTMLElement): boolean => {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 0) return false;
      const inner = el.innerHTML;
      return inner === '' || inner === '<br>' || /^(\s|<br\s*\/?>|&nbsp;)*$/i.test(inner.replace(/<[^>]+>/g, ''));
    };

    const emptyLine = lineBlock && isBlockEmpty(lineBlock);
    const emptySpecial = specialBlock && isBlockEmpty(specialBlock);
    const shouldExit = (emptyLine && specialBlock) || emptySpecial;

    if (shouldExit) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (specialBlock?.tagName === 'BLOCKQUOTE' || specialBlock?.tagName === 'LI') {
          document.execCommand('outdent', false);
        } else {
          document.execCommand('formatBlock', false, 'p');
        }
        handleContentChange();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (specialBlock?.tagName === 'BLOCKQUOTE' || specialBlock?.tagName === 'LI') {
          document.execCommand('outdent', false);
        } else {
          document.execCommand('formatBlock', false, 'p');
        }
        document.execCommand('insertParagraph', false);
        handleContentChange();
      }
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    contentRef.current?.focus();
    document.execCommand(cmd, false, value ?? '');
    handleContentChange();
    updateToolbarState();
  };

  const handleTextColor = (color: string) => {
    if (color === 'transparent') return;
    execCmd('foreColor', color);
  };

  const handleHighlightColor = (color: string) => {
    contentRef.current?.focus();
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, '');
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    handleContentChange();
    updateToolbarState();
  };

  const openedNote = openNoteId ? notes.find((n) => n.id === openNoteId) : null;
  const sortedNotes = [...notes].sort((a, b) => a.order - b.order);
  const wordCount = getWordCount(editContent);
  const modalRoot = mounted && typeof document !== 'undefined' ? document.getElementById('modal-root') : null;

  const popupContent =
    openNoteId && openedNote && modalRoot ? (
      <div
        className="note-editor-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3,6,14,0.82)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          className="note-editor-popup"
          style={{
            width: fullWindow ? '100vw' : '100%',
            maxWidth: fullWindow ? 'none' : 880,
            height: fullWindow ? '100vh' : '90vh',
            maxHeight: fullWindow ? 'none' : 760,
            background: 'radial-gradient(ellipse at 12% 8%, rgba(129,140,248,0.04) 0%, transparent 40%), radial-gradient(ellipse at 88% 92%, rgba(129,140,248,0.02) 0%, transparent 40%), #0a1628',
            border: '1px solid rgba(129,140,248,0.2)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 0 80px rgba(129,140,248,0.06), 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(129,140,248,0.08)',
            animation: 'noteEditorPopIn 0.25s ease-out',
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'rgba(129,140,248,0.03)',
              borderBottom: '1px solid rgba(129,140,248,0.08)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  borderRadius: 5,
                  background: 'rgba(129,140,248,0.08)',
                  border: '1px solid rgba(129,140,248,0.2)',
                  color: '#818cf8',
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#818cf8',
                    boxShadow: '0 0 4px rgba(129,140,248,0.5)',
                  }}
                />
                NOTES
              </div>
              {lastSaved && !saving && (
                <div
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'rgba(34,197,94,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={11} strokeWidth={2.5} />
                  Saved
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFullWindow((v) => !v)}
              title={fullWindow ? 'Window mode' : 'Full window'}
              style={{
                padding: '6px 12px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {fullWindow ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {fullWindow ? 'Window' : 'Full'}
            </button>
            <button
              type="button"
              onClick={closeNotePopup}
              style={{
                padding: '6px 16px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)';
                e.currentTarget.style.color = '#f43f5e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '8px 20px',
              background: 'rgba(0,0,0,0.15)',
              borderBottom: '1px solid rgba(129,140,248,0.06)',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <select
              style={{
                height: 28,
                padding: '0 8px',
                paddingRight: 20,
                width: 110,
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 5,
                border: '1px solid rgba(129,140,248,0.12)',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23818cf8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
              }}
              onChange={(e) => execCmd('fontName', e.target.value)}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              style={{
                height: 28,
                padding: '0 8px',
                paddingRight: 20,
                width: 56,
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 5,
                border: '1px solid rgba(129,140,248,0.12)',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23818cf8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
              }}
              defaultValue="14"
              onChange={(e) => {
                const htmlSizes = ['1', '2', '3', '4', '5', '6', '7'];
                const idx = SIZE_OPTIONS.indexOf(e.target.value);
                execCmd('fontSize', htmlSizes[Math.min(Math.max(idx, 0), 6)] ?? '3');
              }}
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {[
                { cmd: 'bold', stateKey: 'bold', label: 'B', title: 'Bold (Ctrl+B)', style: { fontWeight: 800, fontFamily: 'Rajdhani, sans-serif' } },
                { cmd: 'italic', stateKey: 'italic', label: 'I', title: 'Italic (Ctrl+I)', style: { fontStyle: 'italic', fontFamily: 'Rajdhani, sans-serif' } },
                { cmd: 'underline', stateKey: 'underline', label: 'U', title: 'Underline (Ctrl+U)', style: { textDecoration: 'underline', fontFamily: 'Rajdhani, sans-serif' } },
                { cmd: 'strikeThrough', stateKey: 'strike', label: 'S', title: 'Strikethrough', style: { textDecoration: 'line-through', fontFamily: 'Rajdhani, sans-serif' } },
              ].map(({ cmd, stateKey, label, title, style }) => (
                <button
                  key={cmd}
                  type="button"
                  title={title}
                  onClick={() => execCmd(cmd)}
                  style={{
                    width: 30,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 5,
                    border: '1px solid transparent',
                    background: toolbarState[stateKey as keyof typeof toolbarState] ? 'rgba(129,140,248,0.1)' : 'transparent',
                    color: toolbarState[stateKey as keyof typeof toolbarState] ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    ...style,
                  }}
                  onMouseEnter={(e) => {
                    if (!toolbarState[stateKey as keyof typeof toolbarState]) {
                      e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!toolbarState[stateKey as keyof typeof toolbarState]) {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {[
                { cmd: 'formatBlock', value: '<h1>', label: 'H1', style: { fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 800 } },
                { cmd: 'formatBlock', value: '<h2>', label: 'H2', style: { fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700 } },
                { cmd: 'formatBlock', value: '<h3>', label: 'H3', style: { fontFamily: 'Rajdhani, sans-serif', fontSize: 10, fontWeight: 600 } },
              ].map(({ cmd, value, label, style }) => (
                <button
                  key={label}
                  type="button"
                  title={`Heading ${label}`}
                  onClick={() => execCmd(cmd, value)}
                  style={{
                    width: 30,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 5,
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    ...style,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                type="button"
                title="Bullet list"
                onClick={() => execCmd('insertUnorderedList')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <line x1={8} y1={6} x2={21} y2={6} />
                  <line x1={8} y1={12} x2={21} y2={12} />
                  <line x1={8} y1={18} x2={21} y2={18} />
                  <circle cx={4} cy={6} r={1.5} fill="currentColor" stroke="none" />
                  <circle cx={4} cy={12} r={1.5} fill="currentColor" stroke="none" />
                  <circle cx={4} cy={18} r={1.5} fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                type="button"
                title="Numbered list"
                onClick={() => execCmd('insertOrderedList')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <line x1={10} y1={6} x2={21} y2={6} />
                  <line x1={10} y1={12} x2={21} y2={12} />
                  <line x1={10} y1={18} x2={21} y2={18} />
                  <text x={2} y={8} fill="currentColor" stroke="none" fontSize={8} fontFamily="Rajdhani" fontWeight={700}>
                    1
                  </text>
                  <text x={2} y={14} fill="currentColor" stroke="none" fontSize={8} fontFamily="Rajdhani" fontWeight={700}>
                    2
                  </text>
                  <text x={2} y={20} fill="currentColor" stroke="none" fontSize={8} fontFamily="Rajdhani" fontWeight={700}>
                    3
                  </text>
                </svg>
              </button>
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                type="button"
                title="Quote"
                onClick={() => execCmd('formatBlock', '<blockquote>')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
              </button>
              <button
                type="button"
                title="Code"
                onClick={() => execCmd('formatBlock', '<pre>')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </button>
              <button
                type="button"
                title="Divider"
                onClick={() => execCmd('insertHorizontalRule')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <line x1={2} y1={12} x2={22} y2={12} />
                </svg>
              </button>
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                type="button"
                title="Align left"
                onClick={() => execCmd('justifyLeft')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: toolbarState.alignLeft ? 'rgba(129,140,248,0.1)' : 'transparent',
                  color: toolbarState.alignLeft ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!toolbarState.alignLeft) {
                    e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!toolbarState.alignLeft) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <line x1={3} y1={6} x2={21} y2={6} />
                  <line x1={3} y1={12} x2={15} y2={12} />
                  <line x1={3} y1={18} x2={18} y2={18} />
                </svg>
              </button>
              <button
                type="button"
                title="Align center"
                onClick={() => execCmd('justifyCenter')}
                style={{
                  width: 30,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 5,
                  border: '1px solid transparent',
                  background: toolbarState.alignCenter ? 'rgba(129,140,248,0.1)' : 'transparent',
                  color: toolbarState.alignCenter ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!toolbarState.alignCenter) {
                    e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.background = 'rgba(129,140,248,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!toolbarState.alignCenter) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={2}>
                  <line x1={3} y1={6} x2={21} y2={6} />
                  <line x1={6} y1={12} x2={18} y2={12} />
                  <line x1={4} y1={18} x2={20} y2={18} />
                </svg>
              </button>
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: 0.5,
                marginRight: 4,
              }}
            >
              TEXT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 5, border: '1px solid rgba(129,140,248,0.08)' }}>
              {TEXT_COLORS.map((c) => (
                <div
                  key={c.name}
                  role="button"
                  tabIndex={0}
                  title={c.title}
                  onClick={() => handleTextColor(c.value)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: '1.5px solid transparent',
                    background: c.value,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)', margin: '0 6px' }} />
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: 0.5,
                marginRight: 4,
              }}
            >
              MARK
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 5, border: '1px solid rgba(129,140,248,0.08)' }}>
              {HIGHLIGHT_COLORS.map((c) => (
                <div
                  key={c.name}
                  role="button"
                  tabIndex={0}
                  title={c.title}
                  onClick={() => handleHighlightColor(c.value)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: '1.5px solid transparent',
                    background: c.value,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          </div>

          {/* Editor body */}
          <div
            className="note-editor-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '30px 50px 40px',
            }}
          >
            <input
              className="note-title"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Note title..."
              style={{
                width: '100%',
                textAlign: 'center',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                color: '#a5b4fc',
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: '8px 0 20px',
                borderBottom: '1px solid rgba(129,140,248,0.08)',
                marginBottom: 28,
                letterSpacing: 0.5,
              }}
            />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleContentChange}
              onKeyDown={handleContentKeyDown}
              style={{
                minHeight: 400,
                fontFamily: 'Exo 2, sans-serif',
                fontSize: 14,
                lineHeight: 1.85,
                color: 'rgba(255,255,255,0.78)',
                outline: 'none',
                padding: 0,
                caretColor: '#818cf8',
              }}
              data-placeholder="Start writing..."
              className="note-content-editable"
            />
          </div>

          {/* Status bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 20px',
              background: 'rgba(0,0,0,0.15)',
              borderTop: '1px solid rgba(129,140,248,0.06)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: 0.3,
              }}
            >
              <span>{wordCount} words</span>
              <span>·</span>
              <span>{lastSaved ? `Updated ${formatRelativeTime(lastSaved)}` : '—'}</span>
              <span>·</span>
              <span>
                Created {openedNote?.created_at ? format(new Date(openedNote.created_at), 'MMM d') : '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openNoteId && setPendingDeleteNoteId(openNoteId)}
              style={{
                padding: '4px 10px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 4,
                border: '1px solid rgba(244,63,94,0.15)',
                background: 'transparent',
                color: 'rgba(244,63,94,0.4)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)';
                e.currentTarget.style.color = '#f43f5e';
                e.currentTarget.style.background = 'rgba(244,63,94,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.15)';
                e.currentTarget.style.color = 'rgba(244,63,94,0.4)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add new note */}
      <div
        style={{
          padding: '14px 16px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(129, 140, 248, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <input
          value={newNoteName}
          onChange={(e) => setNewNoteName(e.target.value)}
          placeholder="Note name"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addNote}
          disabled={saving || !newNoteName.trim()}
          style={{
            padding: '10px 20px',
            background: 'rgba(129, 140, 248, 0.2)',
            border: '1px solid rgba(129, 140, 248, 0.5)',
            borderRadius: '8px',
            color: '#818cf8',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving || !newNoteName.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !newNoteName.trim() ? 0.6 : 1,
            alignSelf: 'flex-start',
          }}
        >
          Add note
        </button>
      </div>

      {/* List of notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedNotes.map((note, index) => (
          <div
            key={note.id}
            role="button"
            tabIndex={0}
            draggable={canReorder}
            onDragStart={() => canReorder && handleNoteDragStart(index)}
            onDragOver={(e) => canReorder && handleNoteDragOver(e, index)}
            onDragEnd={() => handleNoteDragEnd()}
            onClick={() => openNote(note)}
            onKeyDown={(e) => e.key === 'Enter' && openNote(note)}
            style={{
              padding: '12px 14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(129, 140, 248, 0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: canReorder ? 'grab' : 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              opacity: draggedIndex === index ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.4)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.2)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
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
            <FileText size={16} style={{ color: 'rgba(129, 140, 248, 0.7)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
              {note.name || 'Untitled'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDeleteNoteId(note.id);
              }}
              disabled={saving}
              style={{
                padding: '4px',
                background: 'none',
                border: 'none',
                color: 'rgba(239, 68, 68, 0.8)',
                cursor: saving ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Note editor popup (portal) */}
      {modalRoot && popupContent && createPortal(popupContent, modalRoot)}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDeleteNoteId}
        onConfirm={() => pendingDeleteNoteId && deleteNote(pendingDeleteNoteId)}
        onCancel={() => setPendingDeleteNoteId(null)}
        title={pendingDeleteNoteId ? `Usunąć ${notes.find((n) => n.id === pendingDeleteNoteId)?.name || 'notatkę'}?` : 'Usunąć notatkę?'}
        message="Ta operacja jest nieodwracalna. Wszystkie notatki i dane zostaną trwale usunięte."
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        variant="danger"
      />

      {saving && <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Saving...</span>}
      {lastSaved && !saving && (
        <span style={{ fontSize: '12px', color: 'rgba(34, 197, 94, 0.8)' }}>Saved</span>
      )}
    </div>
  );
}
