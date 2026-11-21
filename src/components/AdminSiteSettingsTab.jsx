import React, { useState } from 'react';
import { Upload, Link2, RotateCcw, Sparkles, Play } from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { publishAdminConfig } from '../utils/multiplayerEngine';
import { DEFAULT_SPLASH_ICON } from './SplashScreen';

const ANIMATION_OPTIONS = [
  { id: 'breathing', label: '🌬️ Gentle Breathing' },
  { id: 'pulse', label: '💓 Soft Pulse' },
  { id: 'float', label: '🪶 Floating' },
  { id: 'glow-pulse', label: '✨ Golden Glow' },
  { id: 'spin-slow', label: '🌀 Slow Orbit' },
  { id: 'none', label: '⏸️ None (Static)' },
];

export default function AdminSiteSettingsTab({
  adminConfig,
  onFeedback,
  onPreviewSplash,
}) {
  const splash = {
    enabled: adminConfig?.splashScreen?.enabled !== false,
    durationMs: adminConfig?.splashScreen?.durationMs || 2000,
    iconUrl: adminConfig?.splashScreen?.iconUrl || DEFAULT_SPLASH_ICON,
    animation: adminConfig?.splashScreen?.animation || 'breathing',
  };

  const [linkDraft, setLinkDraft] = useState(
    splash.iconUrl?.startsWith('https://') ? splash.iconUrl : ''
  );
  const [uploading, setUploading] = useState(false);

  const updateSplash = (patch, notice = '') => {
    const nextSplash = { ...splash, ...patch };
    publishAdminConfig({ splashScreen: nextSplash });
    if (notice) onFeedback?.(notice);
  };

  const handleUploadIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
      const result = await compressImageFile(file, 340, 0.8, { preserveGif: true });
      if (!result) {
        onFeedback?.('Could not read that image file.');
      } else if (result.length > 160000) {
        onFeedback?.('Uploaded file is too large for live sync (>160 KB). Please pick a smaller image or GIF, or use a link.');
      } else {
        updateSplash(
          { iconUrl: result },
          isGif
            ? 'Animated GIF icon saved for loading screen!'
            : 'Image converted to WebP & saved as site icon!'
        );
        setLinkDraft('');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleApplyLink = () => {
    const clean = linkDraft.trim();
    if (!clean) {
      updateSplash({ iconUrl: DEFAULT_SPLASH_ICON }, 'Reset icon to default Nevermore Garden crest.');
      return;
    }
    if (!clean.startsWith('https://')) {
      onFeedback?.('Please enter a valid https:// image or GIF URL.');
      return;
    }
    updateSplash({ iconUrl: clean }, 'Custom icon link saved!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} /> Nevermore Garden — 2-Second Loading Screen
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Shows your crest/GIF icon with a random pet life, loss &amp; afterlife quote when visitors open the site or app.
            </div>
          </div>

          <button
            type="button"
            className={splash.enabled ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: '0.78rem', padding: '7px 12px' }}
            onClick={() =>
              updateSplash(
                { enabled: !splash.enabled },
                !splash.enabled ? 'Loading screen turned ON.' : 'Loading screen turned OFF.'
              )
            }
          >
            {splash.enabled ? '✓ Enabled on Visit' : 'Disabled (Turned Off)'}
          </button>
        </div>

        {/* Live Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            padding: 12,
            borderRadius: 12,
            background: '#17231d',
            color: '#f5efe2',
          }}
        >
          <div
            className={`splash-icon-frame splash-anim-${splash.animation}`}
            style={{ width: 84, height: 84, flexShrink: 0 }}
          >
            <img src={splash.iconUrl || DEFAULT_SPLASH_ICON} alt="Site Icon Preview" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: '#f3d98b' }}>
              Nevermore Garden
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cde0d2', marginBottom: 8 }}>
              Animation: <strong>{splash.animation}</strong> • Duration: <strong>2.0s</strong>
            </div>
            {onPreviewSplash && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                onClick={onPreviewSplash}
              >
                <Play size={13} /> Preview 2s Loading Screen
              </button>
            )}
          </div>
        </div>

        {/* Icon Upload (WebP / GIF) or Link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="field-label" style={{ marginBottom: 0 }}>
            Loading Screen &amp; Site Crest Icon (JPG/PNG auto-converts to WebP, GIF stays animated)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="chip-btn" style={{ cursor: 'pointer' }}>
              <Upload size={13} /> {uploading ? 'Converting to WebP...' : 'Manual Upload (Image / GIF)'}
              <input
                type="file"
                accept="image/*,.gif"
                style={{ display: 'none' }}
                onChange={handleUploadIcon}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '0.76rem', padding: '5px 10px' }}
              onClick={() => {
                setLinkDraft('');
                updateSplash({ iconUrl: DEFAULT_SPLASH_ICON }, 'Restored default Nevermore Garden logo.');
              }}
            >
              <RotateCcw size={13} /> Reset Default Logo
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="url"
              aria-label="Custom icon or GIF HTTPS URL"
              className="input-control"
              placeholder="or paste https:// image or .gif link"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <button type="button" className="btn-secondary" onClick={handleApplyLink}>
              <Link2 size={13} /> Apply Link
            </button>
          </div>
        </div>

        {/* Animation Setting */}
        <div>
          <div className="field-label">Icon Animation Setting</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ANIMATION_OPTIONS.map((opt) => {
              const active = splash.animation === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => updateSplash({ animation: opt.id }, `Animation set to ${opt.label}`)}
                >
                  {active ? '✓ ' : ''}{opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Default First-Visit View Mode */}
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            👁️ Default First-Visit View Mode
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Choose which view opens first for new visitors. Once a visitor picks another mode, the app remembers their choice.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'world3d', label: '🧊 3D World' },
            { id: 'world2d', label: '🗺️ 2D World' },
            { id: 'grid', label: '🗂️ Cards (Grid / List)' },
          ].map((opt) => {
            const curDefault = adminConfig?.defaultViewMode || 'world3d';
            const active = curDefault === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                className={`chip-btn ${active ? 'active' : ''}`}
                onClick={() => {
                  const curEnabled = adminConfig?.enabledViews || { world3d: true, world2d: true, grid: true };
                  publishAdminConfig({
                    defaultViewMode: opt.id,
                    enabledViews: { ...curEnabled, [opt.id]: true },
                  });
                  onFeedback?.(`Default first-visit view set to ${opt.label}.`);
                }}
              >
                {active ? '✓ ' : ''}{opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
