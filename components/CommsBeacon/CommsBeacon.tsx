'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useChannelGroups, useTotalUnreadCount, useTeamUsersGrouped, useTasksHierarchy } from '@/lib/chat/queries';
import { useCreateOrGetDM, useGetOrCreateTaskChannel } from '@/lib/chat/mutations';
import { X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { MiniConversationIcons, type OpenChat } from './MiniConversationIcons';
import { MiniChatWindow } from './MiniChatWindow';
import { CreateGroupDialog } from './CreateGroupDialog';
import { COMMS_STYLES, getInitials, getChannelDisplayName, getChannelInitials } from './comms-styles';
import { isUserOnline, isUserAway } from '@/lib/utils';

type MainTab = 'chat' | 'crew' | 'groups' | 'tasks';

const CREW_GROUPS = [
  { key: 'admins', label: 'COMMAND', usersKey: 'admins' as const },
  { key: 'project_managers', label: 'PROJECT MANAGERS', usersKey: 'project_managers' as const },
  { key: 'workers', label: 'CO-WORKERS', usersKey: 'workers' as const },
  { key: 'clients', label: 'CLIENTS', usersKey: 'clients' as const },
];

export function CommsBeacon() {
  const { user } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('chat');
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [activeMiniChatId, setActiveMiniChatId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    admins: false,
    project_managers: false,
    workers: false,
    clients: false,
    task_projects: false,
    task_tasks: false,
    task_subtasks: false,
  });
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: channelData } = useChannelGroups(user?.id);
  const { data: tasksHierarchy, isLoading: hierarchyLoading } = useTasksHierarchy(user?.id);
  const getOrCreateTaskChannel = useGetOrCreateTaskChannel();
  const { data: teamUsersGrouped, isLoading: crewLoading } = useTeamUsersGrouped(user?.id, user?.role);
  const { chat, groups } = channelData || { chat: [], groups: [], tasks: [] };
  const createDM = useCreateOrGetDM();
  const { data: totalUnread } = useTotalUnreadCount(user?.id);

  const openConversation = useCallback(
    (ch: any) => {
      if (!ch?.id) return;
      const existing = openChats.find((c) => c.channel?.id === ch.id);
      if (existing) {
        setActiveMiniChatId(existing.id);
        setOpenChats((prev) => {
          const without = prev.filter((c) => c.id !== existing.id);
          return [...without, { ...existing, isMinimized: false }];
        });
      } else {
        const id = `minichat-${ch.id}-${Date.now()}`;
        const newChat: OpenChat = { id, channel: ch, isMinimized: false };
        setOpenChats((prev) => [newChat, ...prev]);
        setActiveMiniChatId(id);
      }
      setIsPanelOpen(false);
    },
    [openChats]
  );

  const toggleMiniChat = useCallback((chatId: string) => {
    setOpenChats((prev) => {
      const chat = prev.find((c) => c.id === chatId);
      if (!chat) return prev;
      const isMinimized = chat.isMinimized;
      const currentlyActiveId = prev.find((c) => !c.isMinimized)?.id;
      if (isMinimized) {
        setActiveMiniChatId(chatId);
        return prev.map((c) => (c.id === chatId ? { ...c, isMinimized: false } : { ...c, isMinimized: true }));
      }
      if (currentlyActiveId === chatId) {
        setActiveMiniChatId(null);
        return prev.map((c) => (c.id === chatId ? { ...c, isMinimized: true } : c));
      }
      setActiveMiniChatId(chatId);
      return prev.map((c) => (c.id === chatId ? { ...c, isMinimized: false } : { ...c, isMinimized: true }));
    });
  }, []);

  const closeMiniChat = useCallback((channelId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== channelId));
    setActiveMiniChatId((curr) => (curr === channelId ? null : curr));
  }, []);

  const handleTriggerClick = () => {
    if (isPanelOpen) {
      setIsPanelOpen(false);
      setOpenChats([]);
      setActiveMiniChatId(null);
    } else {
      setIsPanelOpen(true);
    }
  };

  const handleTabClick = (tab: MainTab) => {
    setMainTab(tab);
    setSearchQuery('');
  };

  const openProjectChannel = useCallback(
    (channelId: string, projectName: string) => {
      const existingCh = (channelData?.all || []).find((c) => c.id === channelId);
      const ch = existingCh || { id: channelId, name: 'general', type: 'channel' as const, project: { id: '', name: projectName } };
      openConversation(ch);
    },
    [channelData?.all, openConversation]
  );

  const openModuleChannel = useCallback(
    (channelId: string, moduleName: string, projectName: string) => {
      const existingCh = (channelData?.all || []).find((c) => c.id === channelId);
      const ch =
        existingCh ||
        ({
          id: channelId,
          name: moduleName,
          type: 'channel' as const,
          project: { id: '', name: projectName },
          module: { id: '', name: moduleName },
        } as any);
      openConversation(ch);
    },
    [channelData?.all, openConversation]
  );

  const openTaskChannel = useCallback(
    (taskId: string, taskName: string, projectName: string, moduleName: string) => {
      getOrCreateTaskChannel.mutate(
        { taskId },
        {
          onSuccess: (data) => {
            const existingCh = (channelData?.all || []).find((c) => c.id === data.id);
            const ch =
              existingCh ||
              ({
                id: data.id,
                name: taskName,
                type: 'channel' as const,
                project: { id: '', name: projectName },
                module: { id: '', name: moduleName },
              } as any);
            openConversation(ch);
          },
          onError: (err) => {
            toast.error('Nie można otworzyć czatu', { description: err.message });
          },
        }
      );
    },
    [channelData?.all, getOrCreateTaskChannel, openConversation]
  );

  const handleStartDM = (otherUser: any) => {
    if (!user?.id) return;
    createDM.mutate(
      { currentUserId: user.id, otherUserId: otherUser.id },
      {
        onSuccess: (ch) => {
          const chWithDetails = {
            id: ch.id,
            name: `dm-${user.id}-${otherUser.id}`,
            type: 'dm' as const,
            unread_count: 0,
            project: undefined,
            module: undefined,
            other_user: { id: otherUser.id, full_name: otherUser.full_name, avatar_url: otherUser.avatar_url, last_seen: otherUser.last_seen },
          };
          openConversation(chWithDetails);
        },
        onError: (err) => {
          toast.error('Could not start conversation', { description: err.message });
        },
      }
    );
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  if (!user) return null;

  const currentChannels = mainTab === 'chat' ? chat : mainTab === 'groups' ? groups : [];
  const activeChat = openChats.find((c) => c.id === activeMiniChatId);
  const q = searchQuery.trim().toLowerCase();

  const SearchInput = (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: COMMS_STYLES.accentRgba(0.04),
          border: `1px solid ${COMMS_STYLES.accentRgba(0.1)}`,
          borderRadius: 8,
        }}
      >
        <Search size={14} color={COMMS_STYLES.accentRgba(0.5)} />
        <input
          type="text"
          placeholder="Wyszukaj..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: COMMS_STYLES.text,
            fontSize: 12,
            fontFamily: 'Exo 2',
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Mini Conversation Icons */}
      {openChats.length > 0 && (
        <MiniConversationIcons
          openChats={openChats}
          activeId={activeMiniChatId}
          currentUserId={user?.id}
          onToggle={toggleMiniChat}
          onClose={closeMiniChat}
          onOverflowClick={() => {
            setIsPanelOpen(true);
            setMainTab('chat');
          }}
        />
      )}

      {/* Mini Chat Window - only one visible at a time */}
      {activeChat && (
        <MiniChatWindow
          key={activeChat.id}
          channel={activeChat.channel}
          isActive={true}
          onMinimize={() => {
            setOpenChats((prev) => prev.map((c) => (c.id === activeChat.id ? { ...c, isMinimized: true } : c)));
            setActiveMiniChatId(null);
          }}
          onClose={() => closeMiniChat(activeChat.id)}
          onLeave={() => closeMiniChat(activeChat.id)}
        />
      )}

      {/* Trigger Button */}
      <button
        onClick={handleTriggerClick}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(6, 14, 30, 0.92)',
          border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}
      >
        <div
          className="animate-comms-pulse"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: COMMS_STYLES.accent,
            boxShadow: `0 0 10px ${COMMS_STYLES.accent}88`,
          }}
        />
        {totalUnread !== undefined && totalUnread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              background: COMMS_STYLES.unread,
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 8px ${COMMS_STYLES.unread}66`,
              border: '2px solid #050510',
            }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Main Panel */}
      {isPanelOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            right: 20,
            width: 320,
            minWidth: 320,
            maxWidth: 320,
            height: 430,
            minHeight: 430,
            maxHeight: 430,
            borderRadius: 16,
            background: `linear-gradient(175deg, ${COMMS_STYLES.bg}, rgba(3,8,18,0.99))`,
            border: `1px solid ${COMMS_STYLES.accentRgba(0.15)}`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,240,255,0.04)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            fontFamily: '"Exo 2", sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
              background: COMMS_STYLES.accentRgba(0.015),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: COMMS_STYLES.accent,
                    boxShadow: `0 0 8px ${COMMS_STYLES.accent}88`,
                  }}
                />
              </div>
              <div>
                <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#e2e8f0' }}>COMMS</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: COMMS_STYLES.accentRgba(0.4) }}>FREQ 42.7 · ENCRYPTED</div>
              </div>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: `1px solid ${COMMS_STYLES.accentRgba(0.08)}`,
                color: '#475569',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tabs: Chat | Crew | Groups | Tasks */}
          <div style={{ display: 'flex', gap: 2, padding: '8px 12px', borderBottom: `1px solid ${COMMS_STYLES.accentRgba(0.04)}` }}>
            {(['chat', 'crew', 'groups', 'tasks'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontFamily: 'Exo 2',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1,
                  color: mainTab === tab ? COMMS_STYLES.accent : '#94a3b8',
                  background: mainTab === tab ? COMMS_STYLES.accentRgba(0.06) : 'transparent',
                  border: mainTab === tab ? `1px solid ${COMMS_STYLES.accentRgba(0.15)}` : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {tab === 'chat' ? 'Chat' : tab === 'crew' ? 'Crew' : tab === 'groups' ? 'Groups' : 'Tasks'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="scrollbar-cosmic" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            {SearchInput}
            {mainTab === 'crew' ? (
              crewLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <div
                    className="animate-comms-pulse"
                    style={{ width: 20, height: 20, borderRadius: '50%', background: COMMS_STYLES.accentRgba(0.3) }}
                  />
                </div>
              ) : teamUsersGrouped ? (
                (() => {
                  const groupsToShow = CREW_GROUPS.filter((g) => {
                    const users = teamUsersGrouped[g.usersKey] || [];
                    return users.length > 0 && (g.usersKey !== 'clients' || user?.role === 'admin');
                  });
                  if (groupsToShow.length === 0) {
                    return <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>No other users in the team.</p>;
                  }
                  const crewItems = groupsToShow.map(({ key, label, usersKey }) => {
                    const users = (teamUsersGrouped[usersKey] || []) as { id: string; full_name: string; avatar_url?: string | null; last_seen?: string | null }[];
                    const sorted = [...users]
                      .sort((a, b) => {
                        const rank = (u: typeof a) => (isUserOnline(u.last_seen ?? null) ? 2 : isUserAway(u.last_seen ?? null) ? 1 : 0);
                        if (rank(a) !== rank(b)) return rank(b) - rank(a);
                        return (a.full_name || '').localeCompare(b.full_name || '');
                      })
                      .filter((u) => !q || (u.full_name || '').toLowerCase().includes(q));
                    if (sorted.length === 0) return null;
                    return (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <button
                          onClick={() => toggleGroup(key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            width: '100%',
                            padding: '8px 12px',
                            background: COMMS_STYLES.accentRgba(0.03),
                            border: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
                            borderRadius: 6,
                            color: COMMS_STYLES.accent,
                            fontFamily: 'Orbitron',
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: 2.5,
                            cursor: 'pointer',
                            textAlign: 'left',
                            textTransform: 'uppercase',
                          }}
                        >
                          {expandedGroups[key] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {label} {sorted.length}
                        </button>
                        {expandedGroups[key] && (
                          <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: `1px solid ${COMMS_STYLES.accentRgba(0.08)}` }}>
                            {sorted.map((u) => {
                              const online = isUserOnline(u.last_seen ?? null);
                              const away = isUserAway(u.last_seen ?? null);
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => handleStartDM(u)}
                                  disabled={createDM.isPending}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    background: 'transparent',
                                    border: '1px solid transparent',
                                    color: online ? COMMS_STYLES.accent : away ? COMMS_STYLES.away : COMMS_STYLES.text,
                                    cursor: createDM.isPending ? 'wait' : 'pointer',
                                    textAlign: 'left',
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ position: 'relative', marginRight: 10 }}>
                                    {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                      <span
                                        style={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: '50%',
                                          background: COMMS_STYLES.accentRgba(0.2),
                                          color: COMMS_STYLES.accent,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 11,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {getInitials(u.full_name || '?')}
                                      </span>
                                    )}
                                    {(online || away) && (
                                      <span
                                        style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          right: 0,
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          background: online ? COMMS_STYLES.online : COMMS_STYLES.away,
                                          border: '2px solid rgba(8,16,32,0.9)',
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                                    <div style={{ fontSize: 10, color: COMMS_STYLES.muted }}>{label}</div>
                                  </div>
                                  {(online || away) && (
                                    <span style={{ fontSize: 10, color: online ? COMMS_STYLES.online : COMMS_STYLES.away }}>
                                      {online ? 'online' : 'away'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                  const hasAny = crewItems.some((x) => x !== null);
                  if (!hasAny && q) {
                    return <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>Brak wyników</p>;
                  }
                  return <>{crewItems}</>;
                })()
              ) : (
                <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>No other users in the team.</p>
              )
            ) : mainTab === 'groups' ? (
              <>
                <button
                  onClick={() => setCreateGroupOpen(true)}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: `1px dashed ${COMMS_STYLES.accentRgba(0.3)}`,
                    borderRadius: 8,
                    background: 'transparent',
                    color: COMMS_STYLES.accent,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  + New Group
                </button>
                {groups.length === 0 ? (
                  <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>No group channels. Create one above or join a project.</p>
                ) : (() => {
                  const filteredGroups = groups.filter((ch) => !q || (ch.name || '').toLowerCase().includes(q));
                  if (filteredGroups.length === 0) {
                    return <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>{q ? 'Brak wyników' : 'No group channels. Create one above or join a project.'}</p>;
                  }
                  return filteredGroups.map((ch) => (
                      <button
                      key={ch.id}
                      onClick={() => openConversation(ch)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: COMMS_STYLES.text,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: COMMS_STYLES.accentRgba(0.15),
                          color: COMMS_STYLES.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 600,
                          marginRight: 10,
                        }}
                      >
                        {getChannelInitials(ch, user?.id)}
                      </span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{ch.type === 'group' ? ch.name : `#${ch.name}`}</div>
                        <div style={{ fontSize: 10, color: COMMS_STYLES.textPreview }}>
                          {ch.type === 'group' ? 'Group' : ch.project?.name || 'Project'} · members
                        </div>
                      </div>
                    </button>
                  ));
                })()}
              </>
            ) : mainTab === 'tasks' ? (
              hierarchyLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <div className="animate-comms-pulse" style={{ width: 20, height: 20, borderRadius: '50%', background: COMMS_STYLES.accentRgba(0.3) }} />
                </div>
              ) : !tasksHierarchy?.length ? (
                <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>Brak projektów. Dołącz do projektu, aby zobaczyć listę.</p>
              ) : (() => {
                const flatProjects = tasksHierarchy.filter((p) => !q || p.name.toLowerCase().includes(q));
                const flatModules = tasksHierarchy.flatMap((p) =>
                  p.modules
                    .filter((m) => !q || m.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
                    .map((m) => ({ ...m, projectName: p.name }))
                );
                const flatTasks = tasksHierarchy.flatMap((p) =>
                  p.modules.flatMap((m) =>
                    m.tasks
                      .filter((t) => !q || t.name.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
                      .map((t) => ({ ...t, moduleName: m.name, projectName: p.name }))
                  )
                );

                const taskGroups = [
                  { key: 'task_projects', label: 'PROJECTS', items: flatProjects, empty: 'Brak projektów' },
                  { key: 'task_tasks', label: 'TASKS', items: flatModules, empty: 'Brak tasków' },
                  { key: 'task_subtasks', label: 'SUBTASKS', items: flatTasks, empty: 'Brak subtasków' },
                ];

                return taskGroups.map(({ key, label, items, empty }) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => toggleGroup(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                        padding: '8px 12px',
                        background: COMMS_STYLES.accentRgba(0.03),
                        border: `1px solid ${COMMS_STYLES.accentRgba(0.06)}`,
                        borderRadius: 6,
                        color: COMMS_STYLES.accent,
                        fontFamily: 'Orbitron',
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: 2.5,
                        cursor: 'pointer',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                      }}
                    >
                      {expandedGroups[key] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {label} {items.length}
                    </button>
                    {expandedGroups[key] && (
                      <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: `1px solid ${COMMS_STYLES.accentRgba(0.08)}` }}>
                        {items.length === 0 ? (
                          <p style={{ color: COMMS_STYLES.muted, fontSize: 11, padding: '8px 12px' }}>{empty}</p>
                        ) : key === 'task_projects' ? (
                          flatProjects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => project.channel_id && openProjectChannel(project.channel_id, project.name)}
                              disabled={!project.channel_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 6,
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: COMMS_STYLES.text,
                                cursor: project.channel_id ? 'pointer' : 'default',
                                textAlign: 'left',
                                fontSize: 12,
                              }}
                            >
                              {project.name}
                            </button>
                          ))
                        ) : key === 'task_tasks' ? (
                          flatModules.map((module) => (
                            <button
                              key={module.id}
                              onClick={() => module.channel_id && openModuleChannel(module.channel_id, module.name, module.projectName)}
                              disabled={!module.channel_id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 6,
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: COMMS_STYLES.text,
                                cursor: module.channel_id ? 'pointer' : 'default',
                                textAlign: 'left',
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{module.name}</span>
                              <span style={{ fontSize: 10, color: COMMS_STYLES.muted }}>{module.projectName}</span>
                            </button>
                          ))
                        ) : (
                          flatTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => openTaskChannel(task.id, task.name, task.projectName, task.moduleName)}
                              disabled={getOrCreateTaskChannel.isPending}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 6,
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: COMMS_STYLES.text,
                                cursor: getOrCreateTaskChannel.isPending ? 'wait' : 'pointer',
                                textAlign: 'left',
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{task.name}</span>
                              <span style={{ fontSize: 10, color: COMMS_STYLES.muted }}>{task.moduleName}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ));
              })()
            ) : (() => {
              const filteredChat = q ? currentChannels.filter((ch) => {
                const name = ch.type === 'dm' && ch.other_user ? ch.other_user.full_name : getChannelDisplayName(ch, user?.id);
                const preview = ch.last_message?.content || '';
                return (name || '').toLowerCase().includes(q) || preview.toLowerCase().includes(q);
              }) : currentChannels;
              if (filteredChat.length === 0) {
                return <p style={{ color: COMMS_STYLES.muted, fontSize: 12 }}>{q ? 'Brak wyników' : 'No conversations yet. Start a DM from Crew or join a project.'}</p>;
              }
              return filteredChat.map((ch) => {
                const unread = (ch.unread_count || 0) > 0;
                const lastMsg = ch.last_message;
                const preview = lastMsg?.content || '';
                const time = lastMsg?.created_at
                  ? new Date(lastMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <button
                    key={ch.id}
                    onClick={() => openConversation(ch)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: unread ? COMMS_STYLES.accentRgba(0.04) : 'transparent',
                      border: '1px solid transparent',
                      color: unread ? COMMS_STYLES.accent : COMMS_STYLES.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      {ch.type === 'dm' && ch.other_user ? (
                        <>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {ch.other_user.avatar_url ? (
                              <img src={ch.other_user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  background: COMMS_STYLES.accentRgba(0.2),
                                  color: COMMS_STYLES.accent,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {getChannelInitials(ch, user?.id)}
                              </span>
                            )}
                            {isUserOnline(ch.other_user?.last_seen ?? null) && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: COMMS_STYLES.online,
                                  border: '2px solid rgba(8,16,32,0.9)',
                                }}
                              />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: unread ? 700 : 500, color: COMMS_STYLES.accent }}>{getChannelDisplayName(ch, user?.id)}</div>
                            <div style={{ fontSize: 11, color: COMMS_STYLES.textPreview, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {preview || 'No messages'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: COMMS_STYLES.accentRgba(0.15),
                              color: COMMS_STYLES.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {getChannelInitials(ch, user?.id)}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: unread ? 700 : 500, color: COMMS_STYLES.accent }}>
                                {ch.type === 'tasks' && '📌 '}
                                {ch.type === 'channel' && '# '}
                                {getChannelDisplayName(ch, user?.id)}
                              </span>
                              {ch.type === 'channel' && (
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COMMS_STYLES.groupTag + '33', color: COMMS_STYLES.groupTag }}>
                                  GRP
                                </span>
                              )}
                              {ch.type === 'tasks' && (
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COMMS_STYLES.taskTag + '33', color: COMMS_STYLES.taskTag }}>
                                  TASK
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: COMMS_STYLES.textPreview, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {preview || 'No messages'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'Rajdhani', fontSize: 10, color: unread ? COMMS_STYLES.accent : COMMS_STYLES.muted }}>{time}</span>
                      {unread && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: COMMS_STYLES.accent,
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={(ch) => {
          openConversation({ ...ch, project: undefined, module: undefined, unread_count: 0 });
        }}
        currentUserId={user?.id}
        userRole={user?.role}
      />
    </>
  );
}
