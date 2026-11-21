import React, { useState, useMemo, useEffect } from 'react';
import { X, Bell } from 'lucide-react';

export default function NotificationsModal({
  notifications = [],
  readIds = [],
  groupInvites = [],
  friendRequests = { incoming: [], outgoing: [] },
  onAcceptInvite,
  onIgnoreInvite,
  onAcceptFriendRequest,
  onIgnoreFriendRequest,
  onCancelFriendRequest,
  onClose,
}) {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const formatMinsLeft = (expiresAt) => {
    const mins = Math.max(1, Math.ceil((Number(expiresAt || 0) - Date.now()) / 60000));
    return `${mins}m`;
  };

  const formatCountdown24h = (expiresAt) => {
    const diffMs = Math.max(0, Number(expiresAt || 0) - Date.now());
    const totalMins = Math.max(1, Math.ceil(diffMs / 60000));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const incomingReqs = friendRequests?.incoming || [];
  const outgoingReqs = friendRequests?.outgoing || [];

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return notifications;
    return notifications.filter((n) => n.category === categoryFilter);
  }, [notifications, categoryFilter]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={20} /> Sanctuary Notifications
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Official News &amp; Update announcements from Nevermore Garden
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close notifications">
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs" style={{ marginBottom: 12 }}>
          {[
            ['All', '🔔 All'],
            ['News', '📰 News'],
            ['Update', '✨ Update'],
          ].map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              className={`modal-tab ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}>
          {incomingReqs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="field-label" style={{ marginBottom: 0 }}>
                🤝 Friend Requests ({incomingReqs.length})
              </div>
              {incomingReqs.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: '1.5px solid #aeeac0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.8rem' }}>
                    <strong>🤝 {req.fromName} wants to add you as a friend</strong>
                    <span style={{ color: '#ffd57e', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      ⏱ {formatCountdown24h(req.expiresAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                      onClick={() => onAcceptFriendRequest && onAcceptFriendRequest(req.id)}
                    >
                      ✅ Accept
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                      onClick={() => onIgnoreFriendRequest && onIgnoreFriendRequest(req.id)}
                    >
                      ✖️ Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoingReqs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="field-label" style={{ marginBottom: 0 }}>
                ⏳ Sent Friend Requests ({outgoingReqs.length})
              </div>
              {outgoingReqs.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: '0.78rem',
                  }}
                >
                  <div>
                    <span>Waiting for <strong>{req.toName || req.toUsername}</strong></span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ⏱ Auto-cancels in {formatCountdown24h(req.expiresAt)}
                    </div>
                  </div>
                  {onCancelFriendRequest && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                      onClick={() => onCancelFriendRequest(req.id)}
                    >
                      ✖️ Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {groupInvites.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="field-label" style={{ marginBottom: 0 }}>
                🔒 Group Chat Invites ({groupInvites.length})
              </div>
              {groupInvites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: '1.5px solid #ffd57e',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.8rem' }}>
                    <strong>🔔 {inv.fromName} invited you to "{inv.groupName}"</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      Expires in {formatMinsLeft(inv.expiresAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                      onClick={() => {
                        if (onAcceptInvite) onAcceptInvite(inv.id);
                        onClose();
                      }}
                    >
                      ✅ Accept
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                      onClick={() => onIgnoreInvite && onIgnoreInvite(inv.id)}
                    >
                      ✖️ Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              No announcements in this category yet.
            </div>
          ) : (
            filtered.map((n) => {
              const isUnread = !readIds.includes(n.id);
              const dateText = n.time
                ? new Date(n.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '11px 13px',
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: isUnread ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: n.category === 'Update' ? 'rgba(92, 168, 224, 0.18)' : 'rgba(218, 170, 92, 0.2)',
                        color: n.category === 'Update' ? '#7bc4ff' : '#ffd57e',
                      }}
                    >
                      {n.category === 'Update' ? '✨ Update' : '📰 News'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isUnread ? '🆕 ' : ''}{dateText}
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: 3 }}>
                    {n.title}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {n.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
