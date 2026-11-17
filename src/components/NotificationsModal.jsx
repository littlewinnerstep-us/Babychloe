import React, { useState, useMemo } from 'react';
import { X, Bell } from 'lucide-react';

export default function NotificationsModal({
  notifications = [],
  readIds = [],
  onClose,
}) {
  const [categoryFilter, setCategoryFilter] = useState('All');

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
              Official News &amp; Update announcements from Evergreen Paws
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
