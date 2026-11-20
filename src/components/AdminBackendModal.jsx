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
import AdminAssetStudio from './AdminAssetStudio';
import AdminPlotManager from './AdminPlotManager';
import { SPECIES_LIST } from '../data/memorialData';
import {
  verifyAdminCredentials,
  publishAdminConfig,
  publishAdminNotification,
  deleteAdminNotification,
  updateUserModeration,
  isModerationActive,
  formatModerationRemaining,
} from '../utils/multiplayerEngine';

export default function AdminBackendModal({
  adminAuthenticated,
  onSetAdminAuthenticated,
  adminConfig,
  notifications = [],
  accountsList = [],
  allMemorials = [],
  adminAssets = [],
  activeSpecies = 'Dog',
  activeRoom = 'tombstone',
  onPublishAsset,
  onDeleteAsset,
  onSaveAdminMemorial,
  onDeleteAdminMemorial,
  onRestoreAdminMemorial,
  onBulkCreateBlankSlots,
  totalMemorials = 0,
  totalAccounts = 0,
  onClose,
}) {
  const [adminTab, setAdminTab] = useState('general'); // 'general' | 'plots' | 'assets'
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [musicInput, setMusicInput] = useState(
    adminConfig?.globalMusicUrl?.startsWith('data:') ? '' : adminConfig?.globalMusicUrl || ''
  );
  const [notifCategory, setNotifCategory] = useState('News');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [banPreset, setBanPreset] = useState('24h'); // '15m' | '1h' | '6h' | '24h' | '7d' | 'custom' | 'perm'
  const [customHours, setCustomHours] = useState('12');
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newSpeciesEmoji, setNewSpeciesEmoji] = useState('🐾');
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

  const resolveDurationTarget = () => {
    const now = Date.now();
    switch (banPreset) {
      case '15m':
        return now + 15 * 60 * 1000;
      case '1h':
        return now + 60 * 60 * 1000;
      case '6h':
        return now + 6 * 60 * 60 * 1000;
      case '24h':
        return now + 24 * 60 * 60 * 1000;
      case '7d':
        return now + 7 * 24 * 60 * 60 * 1000;
      case 'custom': {
        const hrs = Math.max(0.25, Math.min(8760, Number(customHours) || 1));
        return now + Math.round(hrs * 60 * 60 * 1000);
      }
      case 'perm':
      default:
        return -1;
    }
  };

  const formatDurationLabel = () => {
    if (banPreset === 'perm') return 'Permanent';
    if (banPreset === 'custom') return `${Math.max(0.25, Math.min(8760, Number(customHours) || 1))}h`;
    return banPreset;
  };

  const handleModerateUser = (acc, patch, msg) => {
    if (!acc) return;
    if (acc.role === 'admin' || acc.usernameLower === 'admin') {
      showNotice('Protected Administrator account cannot be banned or muted.');
      return;
    }
    const res = updateUserModeration(acc.usernameLower || acc.username, patch);
    if (!res.ok) {
      showNotice(res.error || 'Unable to update user status.');
      return;
    }
    showNotice(msg);
  };

  const filteredUsers = (accountsList || []).filter((acc) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return `${acc.name || ''} ${acc.username || ''} ${acc.email || ''}`.toLowerCase().includes(q);
  });

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

            {/* Admin Workspace Tabs */}
            <div className="modal-tabs" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={`modal-tab ${adminTab === 'general' ? 'active' : ''}`}
                onClick={() => setAdminTab('general')}
              >
                ⚙️ General &amp; Moderation
              </button>
              <button
                type="button"
                className={`modal-tab ${adminTab === 'plots' ? 'active' : ''}`}
                onClick={() => setAdminTab('plots')}
              >
                🪦 Plots &amp; Niches (1–200)
              </button>
              <button
                type="button"
                className={`modal-tab ${adminTab === 'assets' ? 'active' : ''}`}
                onClick={() => setAdminTab('assets')}
              >
                ✨ Custom Asset Studio ({adminAssets.length})
              </button>
            </div>

            {adminTab === 'plots' && (
              <AdminPlotManager
                allMemorials={allMemorials}
                adminAssets={adminAssets}
                defaultSpecies={activeSpecies}
                defaultRoom={activeRoom}
                onSaveMemorial={onSaveAdminMemorial}
                onDeleteMemorial={onDeleteAdminMemorial}
                onRestoreMemorial={onRestoreAdminMemorial}
                onBulkCreateBlankSlots={onBulkCreateBlankSlots}
              />
            )}

            {adminTab === 'assets' && (
              <AdminAssetStudio
                adminAssets={adminAssets}
                onPublishAsset={onPublishAsset}
                onDeleteAsset={onDeleteAsset}
              />
            )}

            {adminTab === 'general' && (
            <>
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

            {/* 1b. View Mode Visibility Controls (3D / 2D / Cards) */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Activated Park Views</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Enable or hide 3D World, 2D World, and Card view tabs for all visitors
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { key: 'world3d', label: '3D View' },
                  { key: 'world2d', label: '2D View' },
                  { key: 'grid', label: 'Cards View' },
                ].map((item) => {
                  const currentViews = {
                    world3d: adminConfig?.enabledViews?.world3d !== false,
                    world2d: adminConfig?.enabledViews?.world2d !== false,
                    grid: adminConfig?.enabledViews?.grid !== false,
                  };
                  const isOn = currentViews[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={isOn ? 'btn-primary' : 'btn-ghost'}
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      onClick={() => {
                        const enabledCount = Object.values(currentViews).filter(Boolean).length;
                        if (isOn && enabledCount <= 1) {
                          showNotice('At least one view must remain active.');
                          return;
                        }
                        const nextViews = { ...currentViews, [item.key]: !isOn };
                        publishAdminConfig({ enabledViews: nextViews });
                        showNotice(`${item.label} is now ${!isOn ? 'ENABLED' : 'HIDDEN'}.`);
                      }}
                    >
                      {isOn ? <Eye size={13} /> : <EyeOff size={13} />}
                      {item.label}: {isOn ? 'Active' : 'Hidden'}
                    </button>
                  );
                })}
              </div>
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

            {/* Dynamic Species Gates Manager */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
                🐾 Manage Species Gates ({SPECIES_LIST.length} Built-in + {(adminConfig?.customSpecies || []).length} Custom)
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Add new pet species gates anytime. They immediately appear in Species Gate, Enshrine, and Plots &amp; Niches for all visitors.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const label = newSpeciesName.trim().slice(0, 32);
                  const emoji = newSpeciesEmoji.trim().slice(0, 8) || '🐾';
                  if (!label) return;
                  const existing = Array.isArray(adminConfig?.customSpecies) ? adminConfig.customSpecies : [];
                  const dup =
                    SPECIES_LIST.some((s) => s.id.toLowerCase() === label.toLowerCase()) ||
                    existing.some((s) => (s.label || s.id || '').toLowerCase() === label.toLowerCase());
                  if (dup) {
                    showNotice(`Species "${label}" already exists.`);
                    return;
                  }
                  const nextCustom = [...existing, { id: label, label, emoji }];
                  publishAdminConfig({ customSpecies: nextCustom });
                  setNewSpeciesName('');
                  setNewSpeciesEmoji('🐾');
                  showNotice(`Added new species gate: ${emoji} ${label}!`);
                }}
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <input
                  type="text"
                  maxLength={32}
                  aria-label="New species name"
                  className="input-control"
                  placeholder="New species name (e.g. Capybara)"
                  value={newSpeciesName}
                  onChange={(e) => setNewSpeciesName(e.target.value)}
                  style={{ flex: 2, minWidth: 160 }}
                />
                <input
                  type="text"
                  maxLength={8}
                  aria-label="New species emoji"
                  className="input-control"
                  value={newSpeciesEmoji}
                  onChange={(e) => setNewSpeciesEmoji(e.target.value)}
                  style={{ width: 64, textAlign: 'center' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  + Add Species
                </button>
              </form>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {['🦫', '🦊', '🦉', '🐼', '🐨', '🦚', '🦋', '🐢'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={`chip-btn ${newSpeciesEmoji === em ? 'active' : ''}`}
                    style={{ padding: '2px 8px' }}
                    onClick={() => setNewSpeciesEmoji(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
              {(adminConfig?.customSpecies || []).length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {adminConfig.customSpecies.map((cs) => (
                    <span
                      key={cs.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-soft)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {cs.emoji} {cs.label}
                      <button
                        type="button"
                        aria-label={`Remove ${cs.label}`}
                        onClick={() => {
                          const next = (adminConfig?.customSpecies || []).filter((x) => x.id !== cs.id);
                          publishAdminConfig({ customSpecies: next });
                          showNotice(`Removed custom species "${cs.label}".`);
                        }}
                        style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Registered Users List & Moderation */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
                👥 All Registered Users ({accountsList.length})
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Select duration and manage per-user Vigil Action pause, Chat/Message mute, or Login ban.
              </p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  { id: '15m', label: '15m' },
                  { id: '1h', label: '1h' },
                  { id: '6h', label: '6h' },
                  { id: '24h', label: '24h' },
                  { id: '7d', label: '7d' },
                  { id: 'custom', label: 'Custom (h)' },
                  { id: 'perm', label: 'Permanent' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`chip ${banPreset === opt.id ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    onClick={() => setBanPreset(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
                {banPreset === 'custom' && (
                  <input
                    type="number"
                    min="0.25"
                    max="8760"
                    step="0.25"
                    className="input-control"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    placeholder="Hours"
                    style={{ width: 88, padding: '4px 8px', fontSize: '0.74rem' }}
                    aria-label="Custom ban duration in hours"
                  />
                )}
              </div>

              <input
                type="search"
                className="input-control"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or @username..."
                style={{ marginBottom: 8, padding: '6px 10px', fontSize: '0.78rem' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: 6 }}>
                    No registered users match your filter.
                  </div>
                ) : (
                  filteredUsers.map((acc) => {
                    const isAdminAcc = acc.role === 'admin' || acc.usernameLower === 'admin';
                    const mod = acc.moderation || {};
                    const vigilPaused = isModerationActive(mod.vigilPausedUntil);
                    const muted = isModerationActive(mod.mutedUntil);
                    const loginBanned = isModerationActive(mod.loginBannedUntil);

                    return (
                      <div
                        key={acc.usernameLower || acc.username}
                        style={{
                          padding: '9px 10px',
                          borderRadius: 10,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.8rem' }}>
                            <strong>{acc.name || acc.username}</strong>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>@{acc.username}</span>{' '}
                            <span>{acc.gender === 'boy' ? '👦' : '👩'}</span>
                            {isAdminAcc && (
                              <span className="owner-pill" style={{ marginLeft: 6 }}>
                                🛡️ Admin
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: '0.7rem' }}>
                            {vigilPaused && (
                              <span className="owner-pill">
                                ⏸️ Vigil Paused ({formatModerationRemaining(mod.vigilPausedUntil)})
                              </span>
                            )}
                            {muted && (
                              <span className="owner-pill">
                                🔇 Muted ({formatModerationRemaining(mod.mutedUntil)})
                              </span>
                            )}
                            {loginBanned && (
                              <span className="owner-pill">
                                ⛔ Login Banned ({formatModerationRemaining(mod.loginBannedUntil)})
                              </span>
                            )}
                          </div>
                        </div>

                        {!isAdminAcc && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={vigilPaused ? 'btn-primary' : 'btn-ghost'}
                              style={{ padding: '4px 8px', fontSize: '0.71rem' }}
                              onClick={() =>
                                handleModerateUser(
                                  acc,
                                  { vigilPausedUntil: vigilPaused ? 0 : resolveDurationTarget() },
                                  vigilPaused
                                    ? `Resumed vigil activity for ${acc.name}.`
                                    : `Paused vigil visit, message & actions for ${acc.name} (${formatDurationLabel()}).`
                                )
                              }
                            >
                              {vigilPaused ? '▶️ Resume Vigil' : `⏸️ Pause Vigil (${formatDurationLabel()})`}
                            </button>

                            <button
                              type="button"
                              className={muted ? 'btn-primary' : 'btn-ghost'}
                              style={{ padding: '4px 8px', fontSize: '0.71rem' }}
                              onClick={() =>
                                handleModerateUser(
                                  acc,
                                  { mutedUntil: muted ? 0 : resolveDurationTarget() },
                                  muted
                                    ? `Unmuted ${acc.name}.`
                                    : `Muted ${acc.name} (${formatDurationLabel()}).`
                                )
                              }
                            >
                              {muted ? '🔊 Unmute' : `🔇 Mute (${formatDurationLabel()})`}
                            </button>

                            <button
                              type="button"
                              className={loginBanned ? 'btn-primary' : 'btn-ghost'}
                              style={{ padding: '4px 8px', fontSize: '0.71rem' }}
                              onClick={() =>
                                handleModerateUser(
                                  acc,
                                  { loginBannedUntil: loginBanned ? 0 : resolveDurationTarget() },
                                  loginBanned
                                    ? `Unbanned login for ${acc.name}.`
                                    : `Banned ${acc.name} from login (${formatDurationLabel()}).`
                                )
                              }
                            >
                              {loginBanned ? '✅ Unban Login' : `⛔ Ban Login (${formatDurationLabel()})`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
