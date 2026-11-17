import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Music,
  Upload,
  Bell,
  Trash2,
  Eye,
  EyeOff,
  Send,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import {
  verifyAdminCredentials,
  publishAdminConfig,
  publishAdminNotification,
  deleteAdminNotification,
} from '../utils/multiplayerEngine';

export default function AdminBackendModal({
  adminAuthenticated,
  onSetAdminAuthenticated,
  adminConfig,
  notifications = [],
  totalMemorials = 0,
  totalAccounts = 0,
  onClose,
}) {
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [musicInput, setMusicInput] = useState(
    adminConfig?.globalMusicUrl?.startsWith('data:') ? '' : adminConfig?.globalMusicUrl || ''
  );
  const [notifCategory, setNotifCategory] = useState('News');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [feedback, setFeedback] = useState('');

  const showNotice = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2600);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    const res = verifyAdminCredentials(adminUser, adminPass);
    if (!res.ok) {
      setAuthError(res.error);
      return;
    }
    onSetAdminAuthenticated(true);
    setAdminPass('');
  };

  const handleSaveGlobalMusic = (e) => {
    e.preventDefault();
    const url = musicInput.trim();
    publishAdminConfig({ globalMusicUrl: url });
    showNotice(url ? 'Global world music track updated for all visitors.' : 'Reset global track to Sanctuary Harp.');
  };

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMusicInput('Uploaded audio track');
        publishAdminConfig({ globalMusicUrl: reader.result });
        showNotice('Uploaded audio set as world global music track.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePushNotif = (e) => {
    e.preventDefault();
    const res = publishAdminNotification({
      category: notifCategory,
      title: notifTitle,
      message: notifMessage,
    });
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    setNotifTitle('');
    setNotifMessage('');
    showNotice(`Pushed "${res.notification.category}" notification to all visitors!`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} /> Sanctuary Admin Backend
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Manage world global music, Demo login visibility, and push News / Update announcements
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close admin backend">
            <X size={18} />
          </button>
        </div>

        {!adminAuthenticated ? (
          <form onSubmit={handleAdminLogin} className="form-grid" style={{ gap: 10 }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Sign in with your Administrator credentials to unlock backend controls.
            </div>
            {authError && (
              <div className="armtip-notif" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} />
                <span>{authError}</span>
              </div>
            )}
            <div>
              <label className="field-label">Admin Username</label>
              <input
                type="text"
                required
                className="input-control"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="field-label">Admin Password</label>
              <input
                type="password"
                required
                className="input-control"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              <ShieldCheck size={15} /> Unlock Admin Backend
            </button>
          </form>
        ) : (
          <div className="form-grid" style={{ gap: 14 }}>
            {feedback && (
              <div className="armtip-notif" style={{ fontWeight: 600 }}>
                {feedback}
              </div>
            )}

            {/* Quick Admin Overview & Session */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                fontSize: '0.8rem',
              }}
            >
              <span>
                📊 <strong>{totalMemorials}</strong> Memorials &bull; <strong>{totalAccounts}</strong> Registered Accounts
              </span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                onClick={() => onSetAdminAuthenticated(false)}
              >
                <LogOut size={12} /> Lock Admin
              </button>
            </div>

            {/* 1. Demo Feature Visibility Control */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Demo Login &amp; Demo Controls</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Show or hide the Instant Demo Login &amp; Reset Demo Data controls for visitors
                </div>
              </div>
              <button
                type="button"
                className={adminConfig?.showDemoLogin ? 'btn-primary' : 'btn-ghost'}
                onClick={() => {
                  const nextVal = !adminConfig?.showDemoLogin;
                  publishAdminConfig({ showDemoLogin: nextVal });
                  showNotice(nextVal ? 'Demo Login feature is now VISIBLE.' : 'Demo Login feature is now HIDDEN.');
                }}
              >
                {adminConfig?.showDemoLogin ? <Eye size={14} /> : <EyeOff size={14} />}
                {adminConfig?.showDemoLogin ? 'Demo Shown' : 'Demo Hidden'}
              </button>
            </div>

            {/* 2. World Global Music Track (Admin Only) */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Music size={15} /> World Global Music Track (Admin Only)
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Set the sanctuary background soundtrack played globally across the park for all users.
              </p>

              <form onSubmit={handleSaveGlobalMusic} className="form-grid" style={{ gap: 8 }}>
                <input
                  type="url"
                  className="input-control"
                  placeholder="https://example.com/sanctuary-piano.mp3"
                  value={musicInput}
                  onChange={(e) => setMusicInput(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    <Music size={14} /> Set Global Track
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setMusicInput('');
                      publishAdminConfig({ globalMusicUrl: '' });
                      showNotice('Global track reset to Built-in Sanctuary Harp Melody.');
                    }}
                  >
                    Use Built-in Harp
                  </button>
                </div>
              </form>

              <label
                className="btn-ghost"
                style={{ cursor: 'pointer', justifyContent: 'center', width: '100%', marginTop: 8 }}
              >
                <Upload size={14} /> Upload Audio File (.mp3, .wav, .m4a, .ogg)
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={handleAudioFileUpload}
                />
              </label>
            </div>

            {/* 3. Push Notification to All Users */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={15} /> Push Notification to All Users
              </div>

              <form onSubmit={handlePushNotif} className="form-grid" style={{ gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`chip ${notifCategory === 'News' ? 'active' : ''}`}
                    onClick={() => setNotifCategory('News')}
                  >
                    📰 News
                  </button>
                  <button
                    type="button"
                    className={`chip ${notifCategory === 'Update' ? 'active' : ''}`}
                    onClick={() => setNotifCategory('Update')}
                  >
                    ✨ Update
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={80}
                  className="input-control"
                  placeholder="Notification title (e.g., Spring Lantern Gathering)"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                />
                <textarea
                  rows={2}
                  required
                  maxLength={320}
                  className="input-control"
                  placeholder="Write announcement for all visitors..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                  <Send size={14} /> Push {notifCategory} Notification
                </button>
              </form>

              {notifications.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  <div className="field-label">Active Announcements ({notifications.length})</div>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '6px 9px',
                        borderRadius: 9,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-soft)',
                        fontSize: '0.76rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ marginRight: 6 }}>
                          {n.category === 'Update' ? '✨ [Update]' : '📰 [News]'}
                        </strong>
                        <span>{n.title}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '3px 7px' }}
                        onClick={() => deleteAdminNotification(n.id)}
                        title="Delete announcement"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
