'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WhatsNewItem } from '@/types/dashboard';

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  task_assigned: UserPlus,
  status_changed: CheckCircle2,
  request_response: Bell,
  dependency_resolved: CheckCircle2,
  mention: MessageCircle,
  new_blocker: AlertTriangle,
  task_completed: CheckCircle2,
  module_completed: CheckCircle2,
};

function formatDay(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getEntityPath(item: WhatsNewItem): string {
  const { type, id } = item.relatedEntity;
  if (type === 'subtask' || type === 'task') return `/workstation?task=${id}`;
  if (type === 'module') return `/pm/projects?module=${id}`;
  if (type === 'project') return `/pm/projects/${id}`;
  return '/dashboard';
}

interface WhatsNewPanelProps {
  items: WhatsNewItem[];
  title?: string;
  isFirstLogin?: boolean;
}

export function WhatsNewPanel({ items, title = "What's New", isFirstLogin }: WhatsNewPanelProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(items.length > 5);

  const byDay = items.reduce<Record<string, WhatsNewItem[]>>((acc, it) => {
    const day = formatDay(it.timestamp);
    if (!acc[day]) acc[day] = [];
    acc[day].push(it);
    return acc;
  }, {});

  const days = Object.keys(byDay);
  const displayItems = collapsed ? items.slice(0, 5) : items;
  const displayDays = collapsed
    ? Object.fromEntries(Object.entries(byDay).slice(0, 1))
    : byDay;

  return (
    <div
      style={{
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontFamily: 'Orbitron, sans-serif',
            color: '#00d9ff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bell size={20} />
          {title}
          {items.length > 0 && (
            <span
              style={{
                background: 'rgba(0, 217, 255, 0.3)',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '12px',
                color: '#00d9ff',
              }}
            >
              {items.length}
            </span>
          )}
        </h2>
        {items.length > 5 && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#00d9ff',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        )}
      </div>

      <div style={{ padding: '16px', maxHeight: collapsed ? '320px' : 'none', overflow: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>
            {isFirstLogin ? "Welcome! Here's what's happening." : 'Nothing new since your last visit.'}
          </div>
        ) : (
          Object.entries(displayDays).map(([day, dayItems]) => (
            <div key={day} style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                {day}
              </div>
              {dayItems.map((item) => {
                const Icon = TYPE_ICONS[item.type] ?? Bell;
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(getEntityPath(item))}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 217, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(0, 217, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} style={{ color: '#00d9ff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {item.description}
                      </div>
                      {item.actor && (
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          {item.actor.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
