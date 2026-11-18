import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2, DownloadCloud, AlertCircle } from 'lucide-react';

export const APP_BUILD_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.5';

export const APP_BUILD_TIMESTAMP =
  typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? __BUILD_TIMESTAMP__
    : new Date().toISOString();

export function formatBuildTimestamp(iso) {
  if (!iso) return 'Unknown build time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function UpdateCheckModal({ isApk = false, onClose }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'checking' | 'latest' | 'update-available' | 'error'
  const [remoteInfo, setRemoteInfo] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckUpdate = useCallback(async () => {
    setStatus('checking');
    setErrorMsg('');
    const nonce = Date.now();
    const urls = isApk
      ? [`https://littlewinnerstep-us.github.io/Babychloe/version.json?t=${nonce}`, `./version.json?t=${nonce}`]
      : [`./version.json?t=${nonce}`, `https://littlewinnerstep-us.github.io/Babychloe/version.json?t=${nonce}`];

    let data = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed && (parsed.version || parsed.buildTimestamp)) {
            data = parsed;
            break;
          }
        }
      } catch {
        // try next source
      }
    }

    setCheckedAt(new Date().toISOString());
    if (!data) {
      setStatus('error');
      setErrorMsg('Unable to reach the update server right now (offline or network unavailable).');
      return;
    }

    setRemoteInfo(data);
    const hasNewVersion = Boolean(data.version && data.version !== APP_BUILD_VERSION);
    const hasNewBuild = Boolean(
      data.buildTimestamp && data.buildTimestamp !== APP_BUILD_TIMESTAMP
    );
    setStatus(hasNewVersion || hasNewBuild ? 'update-available' : 'latest');
  }, [isApk]);

  useEffect(() => {
    handleCheckUpdate();
  }, [handleCheckUpdate]);

  const handleApplyUpdate = async () => {
    const t = Date.now();
    if (typeof caches !== 'undefined' && caches.keys) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // ignore
      }
    }
    if (isApk) {
      window.location.replace(`https://littlewinnerstep-us.github.io/Babychloe/?apk=1&t=${t}`);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', remoteInfo?.version || APP_BUILD_VERSION);
    url.searchParams.set('t', String(t));
    window.location.replace(url.toString());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: 0 }}>
              🔄 App Build &amp; Updates
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isApk ? 'Evergreen Paws Android APK' : 'Evergreen Paws Web Sanctuary'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close update modal">
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-soft)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Installed Version</span>
            <strong>v{APP_BUILD_VERSION}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', gap: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Build Timestamp</span>
            <strong style={{ textAlign: 'right' }}>{formatBuildTimestamp(APP_BUILD_TIMESTAMP)}</strong>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            UTC: {APP_BUILD_TIMESTAMP}
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            padding: '11px 13px',
            marginBottom: 14,
            border: '1px solid var(--border-soft)',
            background:
              status === 'update-available'
                ? 'rgba(255, 200, 90, 0.12)'
                : status === 'latest'
                ? 'rgba(110, 220, 150, 0.1)'
                : 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {status === 'checking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
              <RefreshCw size={15} />
              <span>Checking server for newer build...</span>
            </div>
          )}

          {status === 'latest' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem' }}>
              <CheckCircle2 size={16} style={{ color: '#82f5af', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>You are on the latest version (v{APP_BUILD_VERSION}).</strong>
                {checkedAt && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Last checked: {formatBuildTimestamp(checkedAt)}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === 'update-available' && remoteInfo && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem' }}>
              <DownloadCloud size={17} style={{ color: '#ffd57e', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>
                  New update ready: v{remoteInfo.version || APP_BUILD_VERSION}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Built: {formatBuildTimestamp(remoteInfo.buildTimestamp)}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem' }}>
              <AlertCircle size={16} style={{ color: '#f5b0b0', flexShrink: 0, marginTop: 2 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleCheckUpdate}
            disabled={status === 'checking'}
          >
            <RefreshCw size={14} /> {status === 'checking' ? 'Checking...' : 'Check Update'}
          </button>

          {status === 'update-available' && (
            <button type="button" className="btn-primary" onClick={handleApplyUpdate}>
              <DownloadCloud size={14} /> Update &amp; Reload Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
