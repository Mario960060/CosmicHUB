'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { MessageCircle, Plus } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  status: 'open' | 'answered' | 'dismissed';
  answer?: string | null;
  asked_by?: string;
  answered_by?: string | null;
  assigned_to?: string | null;
  created_at: string;
  answered_at?: string | null;
  context_link?: string | null;
  comments: { id: string; user_id: string; text: string; created_at: string }[];
}

interface QuestionsContentProps {
  subtaskId: string;
  satelliteData: Record<string, unknown>;
}

function getQuestions(data: Record<string, unknown>): Question[] {
  const raw = data.questions;
  if (!Array.isArray(raw)) return [];
  return raw.map((q: any) => ({
    id: q.id || crypto.randomUUID(),
    text: q.text || '',
    status: q.status || 'open',
    answer: q.answer,
    asked_by: q.asked_by,
    answered_by: q.answered_by,
    assigned_to: q.assigned_to,
    created_at: q.created_at || new Date().toISOString(),
    answered_at: q.answered_at,
    context_link: q.context_link,
    comments: Array.isArray(q.comments) ? q.comments : [],
  }));
}

export function QuestionsContent({ subtaskId, satelliteData }: QuestionsContentProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(() => getQuestions(satelliteData));
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all');
  const [newText, setNewText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuestions(getQuestions(satelliteData));
  }, [subtaskId]);

  const save = async (next: Question[]) => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('subtasks')
      .update({
        satellite_data: { questions: next },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subtaskId);
    setSaving(false);
    setQuestions(next);
  };

  const addQuestion = () => {
    if (!newText.trim() || !user) return;
    const q: Question = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      status: 'open',
      asked_by: user.id,
      created_at: new Date().toISOString(),
      comments: [],
    };
    const next = [...questions, q];
    save(next);
    setNewText('');
  };

  const answerQuestion = (id: string) => {
    const answer = answerText[id]?.trim();
    if (!answer || !user) return;
    const next = questions.map((q) =>
      q.id === id
        ? {
            ...q,
            status: 'answered' as const,
            answer,
            answered_by: user.id,
            answered_at: new Date().toISOString(),
          }
        : q
    );
    save(next);
    setAnswerText((prev) => ({ ...prev, [id]: '' }));
    setExpandedId(null);
  };

  const reopenQuestion = (id: string) => {
    const next = questions.map((q) =>
      q.id === id
        ? { ...q, status: 'open' as const, answer: null, answered_by: null, answered_at: null }
        : q
    );
    save(next);
  };

  const filtered = questions.filter((q) => {
    if (filter === 'open') return q.status === 'open';
    if (filter === 'answered') return q.status === 'answered';
    return true;
  });

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
        {filtered.map((q) => {
          const isExpanded = expandedId === q.id;
          const isAnswered = q.status === 'answered';
          return (
            <div
              key={q.id}
              onClick={() => setExpandedId(isExpanded ? null : q.id)}
              style={{
                padding: '12px 14px',
                background: isAnswered ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                borderLeft: `4px solid ${isAnswered ? '#22c55e' : '#00f0ff'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  {isAnswered ? '●' : '○'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{q.text}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                    {formatRelativeTime(q.created_at)}
                    {q.status === 'answered' && q.answered_at && (
                      <> · Answered {formatRelativeTime(q.answered_at)}</>
                    )}
                  </div>
                  {isAnswered && q.answer && (
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
                      &quot;{q.answer}&quot;
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && !isAnswered && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 217, 255, 0.15)' }}
                >
                  <textarea
                    value={answerText[q.id] ?? ''}
                    onChange={(e) => setAnswerText((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Type your answer..."
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
                      Answer
                    </button>
                  </div>
                </div>
              )}

              {isExpanded && isAnswered && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0, 217, 255, 0.15)' }}
                >
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
