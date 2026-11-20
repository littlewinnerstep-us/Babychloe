import React, { useEffect, useMemo, useState } from 'react';
import { Download, KeyRound, Mail, Search, RefreshCw } from 'lucide-react';
import {
  adminResetUserPassword,
  formatModerationRemaining,
  isModerationActive,
  updateUserModeration,
} from '../utils/multiplayerEngine';
import {
  supabaseFetchProfiles,
  supabaseSendPasswordReset,
} from '../utils/supabaseClient';

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminUsersTab({
  accountsList = [],
  onFeedback,
}) {
  const [supabaseProfiles, setSupabaseProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [banPreset, setBanPreset] = useState('24h');
  const [customHours, setCustomHours] = useState('12');
  const [resetTarget, setResetTarget] = useState(null); // usernameLower
  const [newPasswordDraft, setNewPasswordDraft] = useState('');
  const [sendingResetEmail, setSendingResetEmail] = useState('');

  const loadSupabaseUsers = async () => {
    setLoadingProfiles(true);
    const list = await supabaseFetchProfiles();
    setSupabaseProfiles(list);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    loadSupabaseUsers();
  }, []);

  const mergedUsers = useMemo(() => {
    const map = new Map();
    (accountsList || []).forEach((acc) => {
      if (!acc?.usernameLower) return;
      map.set(acc.usernameLower, {
        ...acc,
        createdAt: acc.createdAt || acc.updatedAt || null,
        lastLoginAt: acc.lastLoginAt || acc.updatedAt || null,
      });
    });
    (supabaseProfiles || []).forEach((sp) => {
      const key = sp.usernameLower;
      if (!key) return;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, sp);
      } else {
        map.set(key, {
          ...existing,
          ...sp,
          createdAt: Math.min(
            existing.createdAt || Number.MAX_SAFE_INTEGER,
            sp.createdAt || Number.MAX_SAFE_INTEGER
          ),
          lastLoginAt: Math.max(existing.lastLoginAt || 0, sp.lastLoginAt || 0) || null,
          email: sp.email || existing.email || '',
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (b.lastLoginAt || b.createdAt || 0) - (a.lastLoginAt || a.createdAt || 0)
    );
  }, [accountsList, supabaseProfiles]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return mergedUsers;
    return mergedUsers.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }, [mergedUsers, userSearch]);

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
    if (banPreset === 'custom') return `${Math.max(0.25, Number(customHours) || 1)}h`;
    return banPreset;
  };

  const handleModerateUser = (account, patch, message) => {
    updateUserModeration(account.usernameLower || account.username, patch);
    onFeedback?.(message);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Username',
      'Display Name',
      'Email',
      'Gender',
      'Role',
      'First Registered',
      'Last Login',
      'Status',
    ];
    const rows = mergedUsers.map((u) => {
      const mod = u.moderation || {};
      const flags = [];
      if (isModerationActive(mod.vigilPausedUntil)) flags.push('Vigil Paused');
      if (isModerationActive(mod.mutedUntil)) flags.push('Muted');
      if (isModerationActive(mod.loginBannedUntil)) flags.push('Login Banned');
      return [
        u.username || '',
        u.name || '',
        u.email || '',
        u.gender || 'girl',
        u.role || 'visitor',
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
        u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '',
        flags.length > 0 ? flags.join('; ') : 'Active',
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evergreen-paws-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onFeedback?.(`Exported ${mergedUsers.length} users to CSV.`);
  };

  const handleSendResetEmail = async (acc) => {
    if (!acc.email || acc.email.endsWith('.local')) {
      onFeedback?.(`No real email found for @${acc.username}. Use Set Local Password instead.`);
      return;
    }
    setSendingResetEmail(acc.usernameLower);
    const res = await supabaseSendPasswordReset(acc.email);
    setSendingResetEmail('');
    if (!res.ok) {
      onFeedback?.(`Reset email failed: ${res.error}`);
      return;
    }
    onFeedback?.(`📧 Password reset email sent to ${acc.email}.`);
  };

  const handleApplyLocalPasswordReset = (acc) => {
    const res = adminResetUserPassword(acc.usernameLower || acc.username, newPasswordDraft);
    if (!res.ok) {
      onFeedback?.(res.error);
      return;
    }
    setNewPasswordDraft('');
    setResetTarget(null);
    onFeedback?.(`🔑 Updated password for @${acc.username}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header Actions: Stats, Refresh, Download CSV */}
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            👥 Registered Users &amp; Account Activity ({mergedUsers.length})
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            View first registration, last login, reset passwords, moderate accounts, or export CSV.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
            onClick={loadSupabaseUsers}
            disabled={loadingProfiles}
          >
            <RefreshCw size={13} /> {loadingProfiles ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            onClick={handleDownloadCsv}
            disabled={mergedUsers.length === 0}
          >
            <Download size={14} /> Download Users CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          borderRadius: 10,
          padding: '6px 10px',
        }}
      >
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="search"
          aria-label="Search registered users"
          className="input-control"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Search users by name, @username, email, or role..."
          style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.84rem' }}
        />
      </div>

      {/* Moderation Duration Presets */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Moderation Duration:
        </span>
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
            style={{ fontSize: '0.72rem', padding: '4px 9px' }}
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

      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
        {filteredUsers.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: 10 }}>
            No registered users match your search.
          </div>
        ) : (
          filteredUsers.map((acc) => {
            const isAdminAcc = acc.role === 'admin' || acc.usernameLower === 'admin';
            const mod = acc.moderation || {};
            const vigilPaused = isModerationActive(mod.vigilPausedUntil);
            const muted = isModerationActive(mod.mutedUntil);
            const loginBanned = isModerationActive(mod.loginBannedUntil);
            const isResetOpen = resetTarget === acc.usernameLower;

            return (
              <div
                key={acc.usernameLower || acc.username}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.84rem' }}>
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

                {/* User Metadata: Email, First Registered, Last Login */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 14px',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>
                    <strong>Email:</strong> {acc.email && !acc.email.endsWith('.local') ? acc.email : 'Local account'}
                  </span>
                  <span>
                    <strong>First Registered:</strong> {formatDateTime(acc.createdAt)}
                  </span>
                  <span>
                    <strong>Last Login:</strong> {formatDateTime(acc.lastLoginAt || acc.updatedAt)}
                  </span>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={isResetOpen ? 'btn-secondary' : 'btn-ghost'}
                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    onClick={() => {
                      setResetTarget(isResetOpen ? null : acc.usernameLower);
                      setNewPasswordDraft('');
                    }}
                  >
                    <KeyRound size={12} /> Reset Password
                  </button>

                  {!isAdminAcc && (
                    <>
                      <button
                        type="button"
                        className={vigilPaused ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        onClick={() =>
                          handleModerateUser(
                            acc,
                            { vigilPausedUntil: vigilPaused ? 0 : resolveDurationTarget() },
                            vigilPaused
                              ? `Resumed vigil activity for ${acc.name}.`
                              : `Paused vigil actions for ${acc.name} (${formatDurationLabel()}).`
                          )
                        }
                      >
                        {vigilPaused ? '▶️ Resume Vigil' : `⏸️ Pause Vigil (${formatDurationLabel()})`}
                      </button>

                      <button
                        type="button"
                        className={muted ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
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
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
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
                    </>
                  )}
                </div>

                {/* Inline Admin Password Reset Box */}
                {isResetOpen && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 8,
                      borderRadius: 8,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-soft)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    {acc.email && !acc.email.endsWith('.local') && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.74rem', padding: '5px 9px' }}
                        disabled={sendingResetEmail === acc.usernameLower}
                        onClick={() => handleSendResetEmail(acc)}
                      >
                        <Mail size={12} />{' '}
                        {sendingResetEmail === acc.usernameLower ? 'Sending...' : 'Send Reset Email'}
                      </button>
                    )}
                    <input
                      type="text"
                      minLength={4}
                      className="input-control"
                      aria-label={`New local password for ${acc.username}`}
                      placeholder="New local password (min 4 chars)"
                      value={newPasswordDraft}
                      onChange={(e) => setNewPasswordDraft(e.target.value)}
                      style={{ flex: 1, minWidth: 160, padding: '5px 8px', fontSize: '0.76rem' }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                      onClick={() => handleApplyLocalPasswordReset(acc)}
                    >
                      Set Password
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
