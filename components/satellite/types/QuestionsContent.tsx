'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { saveSatelliteData, useInvalidateSatelliteQueries } from '@/lib/satellite/save-satellite-data';
import { toast } from 'sonner';
import { CosmicDropdown } from '../CosmicDropdown';
import { MessageCircle, Plus, Trash2, GripVertical } from 'lucide-react';

interface QuestionAnswer {
  id: string;
  text: string;
  answered_by: string;
  answered_at: string;
  order: number;
}

interface Question {
  id: string;
  text: string;
  status: 'open' | 'answered' | 'dismissed';
  /** @deprecated Use answers array. Kept for legacy migration. */
  answer?: string | null;
  /** @deprecated Use last answer. Kept for legacy migration. */
  answered_by?: string | null;
  /** @deprecated Use last answer. Kept for legacy migration. */
  answered_at?: string | null;
  answers: QuestionAnswer[];
  asked_by?: string;
  assigned_to?: string | null;
  created_at: string;
  context_link?: string | null;
  comments: { id: string; user_id: string; text: string; created_at: string }[];
  order: number;
}

interface ProjectMember {
  user_id: string;
  user?: { id: string; full_name: string };
}

interface QuestionsContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
  subtaskName?: string;
  projectMembers?: ProjectMember[];
  canDelete?: boolean;
  canReorder?: boolean;
}

function parseAnswers(q: any): QuestionAnswer[] {
  if (Array.isArray(q.answers) && q.answers.length > 0) {
    return q.answers.map((a: any, i: number) => ({
      id: a.id || crypto.randomUUID(),
      text: a.text || '',
      answered_by: a.answered_by || '',
      answered_at: a.answered_at || new Date().toISOString(),
      order: typeof a.order === 'number' ? a.order : i,
    }));
  }
  if (q.answer && typeof q.answer === 'string') {
    return [{
      id: crypto.randomUUID(),
      text: q.answer,
      answered_by: q.answered_by || '',
      answered_at: q.answered_at || new Date().toISOString(),
      order: 0,
    }];
  }
  return [];
}

function getQuestions(data: Record<string, unknown>): Question[] {
  const raw = data.questions;
  if (!Array.isArray(raw)) return [];
  return raw.map((q: any, idx: number) => {
    const answers = parseAnswers(q);
    const status = answers.length > 0 ? (q.status === 'dismissed' ? 'dismissed' : 'answered') : (q.status || 'open');
    return {
      id: q.id || crypto.randomUUID(),
      text: q.text || '',
      status,
      answer: q.answer,
      answered_by: q.answered_by,
      answered_at: q.answered_at,
      answers,
      asked_by: q.asked_by,
      assigned_to: q.assigned_to,
      created_at: q.created_at || new Date().toISOString(),
      context_link: q.context_link,
      comments: Array.isArray(q.comments) ? q.comments : [],
      order: typeof q.order === 'number' ? q.order : idx,
    };
  });
}

export function QuestionsContent({ subtaskId, satelliteData, subtaskName = '', projectMembers = [], canDelete = false, canReorder = false }: QuestionsContentProps) {
  const { user } = useAuth();
  const invalidate = useInvalidateSatelliteQueries();
  const [questions, setQuestions] = useState<Question[]>(() => getQuestions(satelliteData));
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all');
  const [newText, setNewText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    const reordered = [...sorted];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const next = reordered.map((q, idx) => ({ ...q, order: idx }));
    save(next, { user_id: user!.id, action: 'reordered_questions', detail: '', actor_name: user!.full_name });
    setDraggedIndex(toIndex);
  };

  const handleQuestionDragStart = (index: number) => setDraggedIndex(index);
  const handleQuestionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index) reorderQuestions(draggedIndex, index);
  };
  const handleQuestionDragEnd = () => setDraggedIndex(null);

  useEffect(() => {
    setQuestions(getQuestions(satelliteData));
  }, [subtaskId, satelliteData]);

  const save = async (
    next: Question[],
    activityEntry?: { user_id: string; action: string; detail: string; actor_name?: string }
  ) => {
    setSaving(true);
    const { error } = await saveSatelliteData(subtaskId, { questions: next }, {
      activityEntry,
      onSuccess: () => invalidate(subtaskId),
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    setQuestions(next);
  };

  const addQuestion = () => {
    if (!newText.trim() || !user) return;
    const text = newText.trim();
    const q: Question = {
      id: crypto.randomUUID(),
      text,
      status: 'open',
      asked_by: user.id,
      created_at: new Date().toISOString(),
      answers: [],
      comments: [],
      order: 0,
    };
    const next = [q, ...questions.map((x, idx) => ({ ...x, order: idx + 1 }))];
    save(next, { user_id: user.id, action: 'added_question', detail: text, actor_name: user.full_name });
    setNewText('');
  };

  const answerQuestion = (id: string) => {
    const text = answerText[id]?.trim();
    if (!text || !user) return;
    const q = questions.find((x) => x.id === id);
    const newAnswer: QuestionAnswer = {
      id: crypto.randomUUID(),
      text,
      answered_by: user.id,
      answered_at: new Date().toISOString(),
      order: (q?.answers?.length ?? 0),
    };
    const next = questions.map((p) =>
      p.id === id
        ? {
            ...p,
            status: 'answered' as const,
            answers: [...(p.answers || []), newAnswer],
          }
        : p
    );
    const isFirst = !q?.answers?.length;
    save(next, { user_id: user.id, action: isFirst ? 'answered_question' : 'added_answer', detail: q?.text ?? '' });
    setAnswerText((prev) => ({ ...prev, [id]: '' }));
    if (isFirst) setExpandedId(null);
  };

  const reopenQuestion = (id: string) => {
    const q = questions.find((x) => x.id === id);
    const next = questions.map((p) =>
      p.id === id ? { ...p, status: 'open' as const, answers: [] } : p
    );
    save(next, { user_id: user!.id, action: 'reopened_question', detail: q?.text ?? '', actor_name: user!.full_name });
  };

  const dismissQuestion = (id: string) => {
    if (!user) return;
    const q = questions.find((x) => x.id === id);
    const next = questions.map((p) =>
      p.id === id ? { ...p, status: 'dismissed' as const } : p
    );
    save(next, { user_id: user.id, action: 'dismissed_question', detail: q?.text ?? '', actor_name: user.full_name });
    setExpandedId(null);
  };

  const deleteQuestion = (id: string) => {
    if (!user || !canDelete) return;
    const q = questions.find((x) => x.id === id);
    const next = questions.filter((p) => p.id !== id);
    save(next, { user_id: user.id, action: 'deleted_question', detail: q?.text ?? '', actor_name: user.full_name });
    setExpandedId(null);
  };

  const assignQuestion = async (id: string, userId: string | null) => {
    const q = questions.find((x) => x.id === id);
    const next = questions.map((p) =>
      p.id === id ? { ...p, assigned_to: userId } : p
    );
    await save(next, { user_id: user!.id, action: 'assigned_question', detail: q?.text ?? '', actor_name: user!.full_name });
    if (userId && q) {
      const supabase = createClient();
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'question_assigned',
        p_title: 'Question assigned',
        p_message: `You were assigned to answer a question: "${q.text}"`,
        p_related_id: subtaskId,
        p_related_type: 'subtask',
        p_actor_id: user!.id,
      });
    }
  };

  const sortedByOrder = [...questions].sort((a, b) => a.order - b.order);
  const filtered = sortedByOrder.filter((q) => {
    if (filter === 'open') return q.status === 'open';
    if (filter === 'answered') return q.status === 'answered';
    return true;
  });
  const showDragHandle = canReorder && filter === 'all';

  const openCount = questions.filter((q) => q.status === 'open').length;
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const dismissedCount = questions.filter((q) => q.status === 'dismissed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 12px',
            fontWeight: 600,
            fontSize: '12px',
            background: filter === 'all' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'all' ? '#00f0ff' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: filter === 'all' ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('open')}
          style={{
            padding: '6px 12px',
            fontWeight: 600,
            fontSize: '12px',
            background: filter === 'open' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'open' ? '#00f0ff' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: filter === 'open' ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setFilter('answered')}
          style={{
            padding: '6px 12px',
            fontWeight: 600,
            fontSize: '12px',
            background: filter === 'answered' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${filter === 'answered' ? '#22c55e' : 'rgba(0, 217, 255, 0.2)'}`,
            borderRadius: '8px',
            color: filter === 'answered' ? '#22c55e' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
        >
          Answered
        </button>
        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', alignSelf: 'center' }}>
          {openCount} open · {answeredCount} answered · {dismissedCount} dismissed
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
          placeholder="Add question..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addQuestion}
          disabled={saving || !newText.trim()}
          style={{
            padding: '10px 16px',
            background: 'rgba(0, 240, 255, 0.2)',
            border: '1px solid rgba(0, 240, 255, 0.5)',
            borderRadius: '8px',
            color: '#00f0ff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving || !newText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((q, index) => {
          const isExpanded = expandedId === q.id;
          const isAnswered = q.status === 'answered';
          return (
            <div
              key={q.id}
              draggable={showDragHandle}
              onDragStart={() => showDragHandle && handleQuestionDragStart(index)}
              onDragOver={(e) => showDragHandle && handleQuestionDragOver(e, index)}
              onDragEnd={() => handleQuestionDragEnd()}
              onClick={() => setExpandedId(isExpanded ? null : q.id)}
              style={{
                padding: '12px 14px',
                background: isAnswered ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                borderLeft: `4px solid ${isAnswered ? '#22c55e' : '#00f0ff'}`,
                borderRadius: '8px',
                cursor: showDragHandle ? 'grab' : 'pointer',
                transition: 'all 0.2s',
                opacity: draggedIndex === index ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                {showDragHandle && (
                  <div
                    style={{ cursor: 'grab', color: 'rgba(255,255,255,0.4)', flexShrink: 0, marginTop: '2px' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={16} />
                  </div>
                )}
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  {isAnswered ? '●' : '○'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{q.text}</span>
                    {projectMembers.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <CosmicDropdown
                          value={q.assigned_to ?? '__none__'}
                          options={[
                            { value: '__none__', label: 'Unassigned' },
                            ...projectMembers.map((pm) => ({
                              value: pm.user_id,
                              label: pm.user?.full_name ?? 'Unknown',
                            })),
                          ]}
                          onChange={(v) => assignQuestion(q.id, v === '__none__' ? null : v)}
                          style={{ minWidth: 120 }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                    {formatRelativeTime(q.created_at)}
                    {isAnswered && q.answers?.length && (
                      <> · {q.answers.length} answer{q.answers.length > 1 ? 's' : ''} · Last {formatRelativeTime(q.answers[q.answers.length - 1]?.answered_at ?? '')}</>
                    )}
                  </div>
                  {isAnswered && q.answers?.length && !isExpanded && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {q.answers.length === 1
                        ? `"${q.answers[0].text}"`
                        : `${q.answers.length} answers (click to view)`}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 217, 255, 0.15)' }}
                >
                  {isAnswered && q.answers?.length ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {[...q.answers].sort((a, b) => a.order - b.order).map((ans, i) => (
                          <div
                            key={ans.id}
                            style={{
                              padding: '10px 12px',
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: '6px',
                              fontSize: '13px',
                              color: 'rgba(255,255,255,0.9)',
                              borderLeft: '3px solid #22c55e',
                            }}
                          >
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ans.text}</p>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                              {formatRelativeTime(ans.answered_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(0,240,255,0.8)', marginBottom: '8px' }}>
                        + Add another answer
                      </div>
                    </>
                  ) : null}
                  <textarea
                    value={answerText[q.id] ?? ''}
                    onChange={(e) => setAnswerText((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder={isAnswered ? 'Type another answer...' : 'Type your answer...'}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 217, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => answerQuestion(q.id)}
                      disabled={saving || !answerText[q.id]?.trim()}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.5)',
                        borderRadius: '6px',
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: saving || !answerText[q.id]?.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isAnswered ? 'Add answer' : 'Answer'}
                    </button>
                    {!isAnswered && (
                      <button
                        type="button"
                        onClick={() => dismissQuestion(q.id)}
                        disabled={saving}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(107, 114, 128, 0.2)',
                          border: '1px solid rgba(107, 114, 128, 0.4)',
                          borderRadius: '6px',
                          color: '#9ca3af',
                          fontSize: '13px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Dismiss
                      </button>
                    )}
                    {isAnswered && (
                      <button
                        type="button"
                        onClick={() => reopenQuestion(q.id)}
                        disabled={saving}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          color: '#f59e0b',
                          fontSize: '12px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Reopen
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteQuestion(q.id)}
                        disabled={saving}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '13px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px',
          }}
        >
          <MessageCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          No questions yet. Add one above to get started.
        </div>
      )}
    </div>
  );
}
