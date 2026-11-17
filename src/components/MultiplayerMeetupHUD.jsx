import React, { useEffect, useRef, useState } from 'react';
import { Users, X, Send, Copy, Check, Navigation, UserPlus, UserCheck, Wifi, WifiOff } from 'lucide-react';

export default function MultiplayerMeetupHUD({
  showDrawer,
  onCloseDrawer,
  mpPeers = [],
  mpStatus = 'connecting',
  mpOnline = true,
  mpRoomCode = 'PUBLIC',
  mpNickname = 'Visitor',
  mpChatLog = [],
  friends = [],
  currentRoom = 'tombstone',
  hideBottomChatBar = false,
  onToggleMpOnline,
  onToggleFriend,
  onChangeMpRoom,
  onChangeMpNickname,
  onSendChat,
  onSendEmote,
  onWalkToPeer,
}) {
  const [chatInput, setChatInput] = useState('');
  const [roomInput, setRoomInput] = useState(mpRoomCode);
  const [nickInput, setNickInput] = useState(mpNickname);
  const [copiedLink, setCopiedLink] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setRoomInput(mpRoomCode);
  }, [mpRoomCode]);

  useEffect(() => {
    setNickInput(mpNickname);
  }, [mpNickname]);

  useEffect(() => {
    if (showDrawer && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mpChatLog, showDrawer]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    if (onSendChat) onSendChat(text);
    setChatInput('');
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (onChangeMpRoom) onChangeMpRoom(roomInput);
  };

  const handleNickSubmit = (e) => {
    e.preventDefault();
    if (onChangeMpNickname) onChangeMpNickname(nickInput);
  };

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

  return (
    <>
      {/* Live Bottom Chat Bar inside Canvas Viewport */}
      {!hideBottomChatBar && (
        <form className="world-chat-bar" onSubmit={handleChatSubmit}>
          <input
            type="text"
            maxLength={140}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`💬 Chat in ${mpRoomCode} (${mpPeers.length + 1} online)...`}
            aria-label="Park meetup chat message"
          />
          <button type="submit" className="world-chat-send" aria-label="Send message">
            <Send size={13} />
          </button>
        </form>
      )}

      {/* Meetup & Visitors Drawer */}
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

          <div className="form-grid" style={{ gap: 8 }}>
            {/* Display Name */}
            <form onSubmit={handleNickSubmit} className="mp-inline-form">
              <input
                type="text"
                className="input-control"
                maxLength={20}
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                placeholder="Your visitor name"
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              />
              <button type="submit" className="btn-ghost" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                Name
              </button>
            </form>

            {/* Meetup Room Code + Invite Link */}
            <form onSubmit={handleRoomSubmit} className="mp-inline-form">
              <input
                type="text"
                className="input-control"
                maxLength={24}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Room code (e.g. PUBLIC)"
                style={{ padding: '6px 10px', fontSize: '0.78rem', textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                Join
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyInvite}
                title="Copy direct meetup invite link"
                style={{ padding: '5px 9px', fontSize: '0.74rem' }}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </form>

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
                  return (
                    <div key={peer.peerId} className="mp-visitor-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span
                          className="mp-cloak-dot"
                          style={{ background: peer.avatar?.cloakColor || '#4a7c59' }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {peer.avatar?.gender === 'boy' ? '👦' : '👩'} {peer.name}
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

            {/* Chat Log */}
            <div className="mp-chat-feed">
              {mpChatLog.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  No chat messages yet — say hello below!
                </div>
              ) : (
                mpChatLog.map((m) => (
                  <div key={m.id} className="mp-chat-line">
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
                placeholder="Type chat message..."
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '6px 11px', fontSize: '0.75rem' }}>
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
