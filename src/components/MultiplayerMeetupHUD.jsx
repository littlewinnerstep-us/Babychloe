import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  X,
  Send,
  Copy,
  Check,
  Navigation,
  UserPlus,
  UserCheck,
  Wifi,
  WifiOff,
  Lock,
  LogOut,
  MessageSquare,
  MessageSquareOff,
} from 'lucide-react';

export default function MultiplayerMeetupHUD({
  isApk = false,
  showDrawer,
  onCloseDrawer,
  mpPeers = [],
  mpStatus = 'connecting',
  mpOnline = true,
  mpRoomCode = 'PUBLIC',
  mpNickname = 'Visitor',
  mpChatLog = [],
  activeGroup = null,
  groupChatLog = [],
  showOutsideChat = true,
  favorites = [],
  friends = [],
  groupInvites = [],
  accountsList = [],
  currentUser = null,
  currentRoom = 'tombstone',
  activeSpecies = 'Dog',
  speciesEmoji = '🐕',
  hideBottomChatBar = false,
  onToggleMpOnline,
  onToggleOutsideChat,
  showOnlyFavorites = false,
  onToggleShowFavorites,
  onToggleFriend,
  onInviteFriendToGroup,
  onAcceptInvite,
  onIgnoreInvite,
  isMuted = false,
  muteLabel = '',
  onCreateGroup,
  onJoinGroup,
  onExitGroup,
  onSendGroupChat,
  onSendChat,
  onSendEmote,
  onWalkToPeer,
}) {
  const [drawerTab, setDrawerTab] = useState('meetup'); // 'meetup' | 'friends' | 'group'
  const [chatInput, setChatInput] = useState('');
  const [groupChatInput, setGroupChatInput] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGroupCode, setCopiedGroupCode] = useState(false);
  const chatEndRef = useRef(null);
  const groupChatEndRef = useRef(null);

  const showInviteFeedback = (msg) => {
    setInviteFeedback(msg);
    setTimeout(() => setInviteFeedback(''), 3200);
  };

  const formatMinsLeft = (expiresAt) => {
    const mins = Math.max(1, Math.ceil((Number(expiresAt || 0) - Date.now()) / 60000));
    return `${mins}m`;
  };

  const combinedFeed = useMemo(() => {
    const outside = showOutsideChat
      ? mpChatLog.map((m) => ({ ...m, _isGroup: false }))
      : [];
    const group = activeGroup
      ? groupChatLog.map((m) => ({ ...m, _isGroup: true }))
      : [];
    return [...outside, ...group].sort((a, b) => (a.time || 0) - (b.time || 0));
  }, [mpChatLog, groupChatLog, activeGroup, showOutsideChat]);

  useEffect(() => {
    if (showDrawer && drawerTab === 'meetup' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combinedFeed, showDrawer, drawerTab]);

  useEffect(() => {
    if (showDrawer && drawerTab === 'group' && groupChatEndRef.current) {
      groupChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupChatLog, showDrawer, drawerTab]);

  const groupMembers = useMemo(() => {
    if (!activeGroup?.id) return [];
    return mpPeers.filter((p) => p.groupId === activeGroup.id);
  }, [mpPeers, activeGroup]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (activeGroup && onSendGroupChat) {
      onSendGroupChat(text);
    } else if (onSendChat) {
      onSendChat(text);
    }
    setChatInput('');
  };

  const handleGroupChatSubmit = (e) => {
    e.preventDefault();
    const text = groupChatInput.trim();
    if (!text || !activeGroup || !onSendGroupChat) return;
    onSendGroupChat(text);
    setGroupChatInput('');
  };

  const latestThreeChat = useMemo(() => combinedFeed.slice(-3), [combinedFeed]);

  const handleCopyInvite = () => {
    const base =
      typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://littlewinnerstep-us.github.io/Babychloe/';
    const inviteUrl = `${base}?meetup=${encodeURIComponent(mpRoomCode)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyGroupCode = () => {
    if (!activeGroup?.id) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(activeGroup.id).catch(() => {});
    }
    setCopiedGroupCode(true);
    setTimeout(() => setCopiedGroupCode(false), 2000);
  };

  const formatTime = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* On-screen Outside Group Chat Toggle Icon Button */}
      {onToggleOutsideChat && (
        <button
          type="button"
          className={`world-outside-chat-btn ${showOutsideChat ? 'is-on' : 'is-off'}`}
          onClick={onToggleOutsideChat}
          title={
            showOutsideChat
              ? 'Outside-group chat visible (tap to mute/hide outside chat)'
              : 'Outside-group chat hidden (tap to read outside chat)'
          }
          aria-label={showOutsideChat ? 'Outside chat ON' : 'Outside chat OFF'}
        >
          {showOutsideChat ? (
            <MessageSquare size={isApk ? 16 : 14} />
          ) : (
            <MessageSquareOff size={isApk ? 16 : 14} />
          )}
          {!isApk && <span>{showOutsideChat ? 'Outside: ON' : 'Outside: OFF'}</span>}
        </button>
      )}

      {/* Favorite Menu Button Below Outside: ON */}
      {onToggleShowFavorites && (
        <button
          type="button"
          className={`world-favorites-btn ${showOnlyFavorites ? 'active' : ''}`}
          onClick={onToggleShowFavorites}
          title={`Favorite Pet Memorials (${favorites.length})`}
          aria-label={`Favorite pet memorials (${favorites.length})`}
        >
          <span>💖</span>
          {!isApk && <span>Favorites ({favorites.length})</span>}
        </button>
      )}

      {/* Read-Only Current Species Gates Indicator (Blocks canvas tap-through; zero action) */}
      <div
        className="world-gate-readonly-pill"
        title={`${activeSpecies} Gates`}
        aria-label={`Current sanctuary: ${activeSpecies} Gates`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span>{speciesEmoji}</span>
        {!isApk && <span>{activeSpecies} Gates</span>}
      </div>

      {/* Left-Screen Blinking Group Chat Invite Banner (Accept / Ignore, 30m auto-cancel) */}
      {groupInvites.length > 0 && (
        <div className="world-group-invite-banner" role="alert" aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: '0.76rem' }}>
            <strong>🔔 Group Chat Invite</strong>
            <span style={{ fontSize: '0.68rem', color: '#ffd57e' }}>
              ⏱ {formatMinsLeft(groupInvites[0].expiresAt)} left
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#ece7db', lineHeight: 1.3 }}>
            <strong>{groupInvites[0].fromName}</strong> invited you to{' '}
            <strong>“{groupInvites[0].groupName}”</strong>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={() => onAcceptInvite && onAcceptInvite(groupInvites[0].id)}
            >
              ✅ Accept
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ flex: 1, justifyContent: 'center', padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={() => onIgnoreInvite && onIgnoreInvite(groupInvites[0].id)}
            >
              ✖️ Ignore
            </button>
          </div>
        </div>
      )}

      {/* Latest 3 Chat Rows in Main View (Public & Group Chat) */}
      {!hideBottomChatBar && latestThreeChat.length > 0 && (
        <div className="world-chat-preview-3rows" aria-label="Recent chat messages">
          {latestThreeChat.map((m) => (
            <div key={m.id || `${m.time}-${m.senderName}`} className="world-chat-preview-row">
              <strong style={{ color: m._isGroup ? '#9fe8ff' : m.isLocal ? '#ffd57e' : '#aeeac0' }}>
                {m._isGroup ? '🔒 ' : ''}
                {m.senderName || 'Visitor'}:
              </strong>{' '}
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Live Bottom Chat Bar inside Canvas Viewport */}
      {!hideBottomChatBar && (
        <form className="world-chat-bar" onSubmit={handleChatSubmit}>
          <input
            type="text"
            maxLength={140}
            value={chatInput}
            disabled={isMuted}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              isMuted
                ? `🔇 Muted by Admin (${muteLabel || 'Active'})`
                : activeGroup
                  ? `🔒 Group "${activeGroup.name}" chat (${groupMembers.length + 1} members)...`
                  : `💬 Chat in ${mpRoomCode} (${mpPeers.length + 1} online)...`
            }
            aria-label="Park meetup chat message"
          />
          <button type="submit" className="world-chat-send" aria-label="Send message">
            <Send size={13} />
          </button>
        </form>
      )}

      {/* Meetup & Group Chat Drawer */}
      {showDrawer && (
        <div className="mp-drawer">
          <div className="modal-header" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Users size={15} />
              <strong style={{ fontSize: '0.92rem' }}>Park Meetup</strong>
              <span className={`mp-status-badge ${mpOnline && mpStatus === 'connected' ? 'is-live' : ''}`}>
                {!mpOnline ? '⚪ Offline' : mpStatus === 'connected' ? '🟢 Live Sync' : '🟡 Connecting'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {onToggleMpOnline && (
                <button
                  type="button"
                  className={mpOnline ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                  onClick={onToggleMpOnline}
                  title={mpOnline ? 'Go Offline' : 'Go Online'}
                >
                  {mpOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {mpOnline ? 'Online' : 'Offline'}
                </button>
              )}
              <button
                type="button"
                className="modal-close"
                style={{ width: 28, height: 28 }}
                onClick={onCloseDrawer}
                aria-label="Close meetup drawer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="modal-tabs" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={`modal-tab ${drawerTab === 'meetup' ? 'active' : ''}`}
              onClick={() => setDrawerTab('meetup')}
            >
              🌐 Room
            </button>
            <button
              type="button"
              className={`modal-tab ${drawerTab === 'friends' ? 'active' : ''}`}
              onClick={() => setDrawerTab('friends')}
            >
              🤝 Friends ({friends.length})
            </button>
            <button
              type="button"
              className={`modal-tab ${drawerTab === 'group' ? 'active' : ''}`}
              onClick={() => setDrawerTab('group')}
            >
              🔒 Group {activeGroup ? `(${groupMembers.length + 1})` : ''}
            </button>
          </div>

          {inviteFeedback && (
            <div className="armtip-notif" style={{ fontSize: '0.72rem', padding: '5px 8px', marginBottom: 6 }}>
              {inviteFeedback}
            </div>
          )}

          {drawerTab === 'meetup' ? (
            <div className="form-grid" style={{ gap: 8 }}>
              {/* Fixed Public Room Info + Invite Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                  fontSize: '0.76rem',
                }}
              >
                <span>
                  <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Room: <strong>{mpRoomCode}</strong> (All Online)
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleCopyInvite}
                  title="Copy direct meetup invite link"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                >
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  {copiedLink ? 'Copied' : 'Invite'}
                </button>
              </div>

              {/* Online Visitors List */}
              <div>
                <div className="field-label" style={{ marginBottom: 4 }}>
                  Visitors Here ({mpPeers.length + 1})
                </div>
                <div className="mp-visitors-list">
                  <div className="mp-visitor-row is-self">
                    <span>
                      🟢 <strong>{mpNickname || 'Visitor'}</strong> (You)
                    </span>
                    <span className="mp-room-tag">
                      {currentRoom === 'ash-room' ? '🏛️ Ash Room' : '🌿 Garden'}
                    </span>
                  </div>

                  {mpPeers.map((peer) => {
                    const isFriend = friends.some(
                      (f) => f.toLowerCase() === (peer.name || '').toLowerCase()
                    );
                    const inSameGroup = activeGroup && peer.groupId === activeGroup.id;
                    return (
                      <div key={peer.peerId} className="mp-visitor-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span
                            className="mp-cloak-dot"
                            style={{ background: peer.avatar?.cloakColor || '#4a7c59' }}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {peer.avatar?.gender === 'boy' ? '👦' : '👩'} {peer.name}
                            {inSameGroup ? ' 🔒' : ''}
                          </span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <span className="mp-room-tag">
                            {peer.room === 'ash-room' ? '🏛️' : '🌿'}
                          </span>
                          {onToggleFriend && (
                            <button
                              type="button"
                              className={isFriend ? 'btn-primary' : 'btn-ghost'}
                              style={{ padding: '3px 6px', fontSize: '0.68rem' }}
                              onClick={() => onToggleFriend(peer.name)}
                              title={isFriend ? 'Friend added (tap to remove)' : 'Add Friend'}
                            >
                              {isFriend ? <UserCheck size={10} /> : <UserPlus size={10} />}
                            </button>
                          )}
                          {onInviteFriendToGroup && (
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: '3px 6px', fontSize: '0.68rem' }}
                              onClick={() => {
                                onInviteFriendToGroup(peer.name, peer);
                                showInviteFeedback(`📨 Invited ${peer.name} to Group Chat (30m)`);
                              }}
                              title={`Invite ${peer.name} to Group Chat`}
                            >
                              🔒+
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            onClick={() => onWalkToPeer && onWalkToPeer(peer)}
                            title={`Walk to ${peer.name}`}
                          >
                            <Navigation size={10} /> Meet
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {mpPeers.length === 0 && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', padding: '4px 2px' }}>
                      Open in another tab or share your link with friends in room <strong>{mpRoomCode}</strong> to meet up!
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Emotes */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  ['👋', 'Waved hello'],
                  ['🙏', 'Sent prayers'],
                  ['🌸', 'Shared blossoms'],
                  ['🕯️', 'Lit a vigil'],
                  ['❤️', 'Sent love'],
                ].map(([em, label]) => (
                  <button
                    key={em}
                    type="button"
                    className="btn-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.76rem' }}
                    onClick={() => onSendEmote && onSendEmote(em, label)}
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Combined Park & Group Chat Feed */}
              <div className="mp-chat-feed">
                {combinedFeed.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {showOutsideChat
                      ? 'No chat messages yet — say hello below!'
                      : 'Outside chat is muted. Switch Outside: ON or join a Group Chat.'}
                  </div>
                ) : (
                  combinedFeed.map((m) => (
                    <div key={m.id} className="mp-chat-line">
                      {m._isGroup && (
                        <span style={{ color: '#ffd57e', fontWeight: 700, fontSize: '0.68rem', marginRight: 4 }}>
                          [Group]
                        </span>
                      )}
                      <strong style={{ color: m.isLocal ? 'var(--accent-warm)' : 'var(--accent)' }}>
                        {m.senderName}:
                      </strong>{' '}
                      <span>{m.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="mp-inline-form">
                <input
                  type="text"
                  className="input-control"
                  maxLength={140}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={activeGroup ? 'Send to group members...' : 'Type public park chat...'}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 11px', fontSize: '0.75rem' }}>
                  <Send size={12} />
                </button>
              </form>
            </div>
          ) : drawerTab === 'friends' ? (
            <div className="form-grid" style={{ gap: 8 }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = friendInput.trim();
                  if (!clean) return;
                  if (onToggleFriend) {
                    const exists = friends.some((f) => f.toLowerCase() === clean.toLowerCase());
                    if (!exists) onToggleFriend(clean);
                    showInviteFeedback(exists ? `${clean} is already your friend.` : `🤝 Added ${clean} as Friend!`);
                  }
                  setFriendInput('');
                }}
                className="mp-inline-form"
              >
                <input
                  type="text"
                  className="input-control"
                  maxLength={32}
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder="Friend name or @username..."
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                  <UserPlus size={12} /> Add
                </button>
              </form>

              <div className="field-label" style={{ marginBottom: 0 }}>
                Your Friends ({friends.length})
              </div>
              <div className="mp-visitors-list" style={{ maxHeight: 155 }}>
                {friends.length === 0 ? (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', padding: '4px 2px' }}>
                    No friends added yet. Add someone above or tap a visitor in Room / Memorials.
                  </div>
                ) : (
                  friends.map((fr) => (
                    <div key={fr} className="mp-visitor-row">
                      <span>🤝 <strong>{fr}</strong></span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {onInviteFriendToGroup && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                            onClick={() => {
                              onInviteFriendToGroup(fr);
                              showInviteFeedback(`📨 Group Chat invite sent to ${fr} (expires 30m)`);
                            }}
                            title="Invite friend to Group Chat without group code"
                          >
                            🔒 Invite Group
                          </button>
                        )}
                        {onToggleFriend && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '3px 6px', fontSize: '0.68rem' }}
                            onClick={() => onToggleFriend(fr)}
                            title="Remove Friend"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {accountsList.length > 0 && (
                <>
                  <div className="field-label" style={{ marginBottom: 0 }}>
                    Community Visitors
                  </div>
                  <div className="mp-visitors-list" style={{ maxHeight: 110 }}>
                    {accountsList
                      .filter((a) => {
                        const myLower = (currentUser?.username || '').toLowerCase();
                        return a && a.usernameLower !== 'admin' && a.usernameLower !== myLower;
                      })
                      .slice(0, 12)
                      .map((acc) => {
                        const label = acc.name || acc.username;
                        const isFr = friends.some(
                          (f) => f.toLowerCase() === label.toLowerCase() || f.toLowerCase() === (acc.username || '').toLowerCase()
                        );
                        return (
                          <div key={acc.usernameLower || label} className="mp-visitor-row">
                            <span>
                              {acc.gender === 'boy' ? '👦' : '👩'} {label}{' '}
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>@{acc.username}</span>
                            </span>
                            {onToggleFriend && (
                              <button
                                type="button"
                                className={isFr ? 'btn-primary' : 'btn-ghost'}
                                style={{ padding: '3px 7px', fontSize: '0.68rem' }}
                                onClick={() => onToggleFriend(label)}
                              >
                                {isFr ? '🤝 Friend' : '+ Add'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="form-grid" style={{ gap: 8 }}>
              {!activeGroup ? (
                <>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Create or join a private group chat (unlimited members). Only group members can read group messages.
                    Oldest messages auto-delete after 23 minutes.
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (onCreateGroup) onCreateGroup(newGroupName);
                      setNewGroupName('');
                    }}
                    className="mp-inline-form"
                  >
                    <input
                      type="text"
                      className="input-control"
                      maxLength={28}
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="New group name (e.g. Memory Circle)"
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                      Create
                    </button>
                  </form>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (joinGroupCode.trim() && onJoinGroup) {
                        onJoinGroup(joinGroupCode.trim());
                        setJoinGroupCode('');
                      }
                    }}
                    className="mp-inline-form"
                  >
                    <input
                      type="text"
                      className="input-control"
                      maxLength={24}
                      value={joinGroupCode}
                      onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())}
                      placeholder="Join by Group Code (e.g. GRP-MEMORY-A1B2)"
                      style={{ padding: '6px 10px', fontSize: '0.78rem', textTransform: 'uppercase' }}
                    />
                    <button type="submit" className="btn-ghost" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                      Join
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'var(--bg-elevated)',
                      border: '1px solid rgba(255, 213, 126, 0.38)',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <strong>🔒 {activeGroup.name}</strong>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '3px 7px', fontSize: '0.7rem', color: '#f38b8b' }}
                        onClick={onExitGroup}
                        title="Exit group chat anytime"
                      >
                        <LogOut size={11} /> Exit Group
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span>Code: <strong>{activeGroup.id}</strong></span>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                        onClick={handleCopyGroupCode}
                      >
                        {copiedGroupCode ? <Check size={11} /> : <Copy size={11} />}
                        {copiedGroupCode ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 3 }}>
                      Members online: {groupMembers.length + 1} (Unlimited capacity) &bull; Messages auto-delete after 23m
                    </div>
                    {friends.length > 0 && onInviteFriendToGroup && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {friends.map((fr) => (
                          <button
                            key={fr}
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                            onClick={() => {
                              onInviteFriendToGroup(fr);
                              showInviteFeedback(`📨 Invited ${fr} to "${activeGroup.name}" (30m)`);
                            }}
                          >
                            📨 Invite {fr.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group Members List */}
                  <div className="mp-visitors-list" style={{ maxHeight: 82 }}>
                    <div className="mp-visitor-row is-self">
                      <span>🟢 <strong>{mpNickname || 'Visitor'}</strong> (You)</span>
                      <span className="mp-room-tag">{currentRoom === 'ash-room' ? '🏛️' : '🌿'}</span>
                    </div>
                    {groupMembers.map((gm) => (
                      <div key={gm.peerId} className="mp-visitor-row">
                        <span>{gm.avatar?.gender === 'boy' ? '👦' : '👩'} {gm.name}</span>
                        <span className="mp-room-tag">{gm.room === 'ash-room' ? '🏛️' : '🌿'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Full Group Chat History (auto-deleted oldest after 23 min) */}
                  <div className="field-label" style={{ marginBottom: 0 }}>
                    Group Chat History (Auto-clears after 23 min)
                  </div>
                  <div className="mp-chat-feed" style={{ maxHeight: 150 }}>
                    {groupChatLog.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Private group history is empty — only members of {activeGroup.name} can read this chat.
                      </div>
                    ) : (
                      groupChatLog.map((m) => (
                        <div key={m.id} className="mp-chat-line">
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginRight: 4 }}>
                            {formatTime(m.time)}
                          </span>
                          <strong style={{ color: m.isLocal ? 'var(--accent-warm)' : 'var(--accent)' }}>
                            {m.senderName}:
                          </strong>{' '}
                          <span>{m.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={groupChatEndRef} />
                  </div>

                  <form onSubmit={handleGroupChatSubmit} className="mp-inline-form">
                    <input
                      type="text"
                      className="input-control"
                      maxLength={240}
                      disabled={isMuted}
                      value={groupChatInput}
                      onChange={(e) => setGroupChatInput(e.target.value)}
                      placeholder={
                        isMuted
                          ? `🔇 Muted by Admin (${muteLabel || 'Active'})`
                          : `Message ${activeGroup.name} members...`
                      }
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '6px 11px', fontSize: '0.75rem' }}>
                      <Send size={12} />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
