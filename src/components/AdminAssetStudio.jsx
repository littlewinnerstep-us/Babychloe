import React, { useMemo, useState } from 'react';
import { Upload, Link2, Sparkles, Trash2, Edit3, Plus, Check } from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import {
  ASSET_EFFECTS,
  isSafeImageUrl,
  normalizeHex,
} from '../utils/customAssets';

const KIND_META = [
  { id: 'plot-style', label: '🪦 Plot Style', defaultEmoji: '🪦' },
  { id: 'niche-style', label: '⚱️ Niche Style', defaultEmoji: '⚱️' },
  { id: 'flower', label: '🌸 Flower', defaultEmoji: '🌸' },
  { id: 'toy', label: '🧸 Toy / Treat', defaultEmoji: '🧸' },
];

const QUICK_EMOJIS = {
  'plot-style': ['🪦', '🏛️', '🪨', '🌿', '🕯️', '✨'],
  'niche-style': ['⚱️', '🏺', '⛩️', '🪷', '🕯️', '💎'],
  flower: ['🌸', '🌹', '🌻', '🪷', '🌼', '🌷', '💐', '🌺'],
  toy: ['🧸', '🎾', '🦴', '🐟', '🧶', '🪶', '🍓', '🍯'],
};

const EMPTY_FORM = {
  id: '',
  kind: 'flower',
  name: '',
  emoji: '🌸',
  imageUrl: '',
  primaryColor: '#ff7eb6',
  accentColor: '#ffe066',
  glowColor: '#ff9ebb',
  glowOn: true,
  glowStrength: 0.7,
  effects: ['lively', 'sparkle'],
};

export default function AdminAssetStudio({
  adminAssets = [],
  onPublishAsset,
  onDeleteAsset,
  compact = false,
  defaultKind = 'flower',
  onSelectCreatedAsset,
}) {
  const [filterKind, setFilterKind] = useState('all');
  const [sourceMode, setSourceMode] = useState('upload'); // 'upload' | 'link'
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    kind: defaultKind,
    emoji: KIND_META.find((k) => k.id === defaultKind)?.defaultEmoji || '🌸',
  }));
  const [linkDraft, setLinkDraft] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const filteredAssets = useMemo(() => {
    const active = (adminAssets || []).filter((a) => a && !a.deletedAt);
    if (filterKind === 'all') return active;
    return active.filter((a) => a.kind === filterKind);
  }, [adminAssets, filterKind]);

  const setColorField = (field, raw) => {
    setForm((prev) => ({ ...prev, [field]: raw }));
  };

  const commitHexField = (field, fallback) => {
    setForm((prev) => ({
      ...prev,
      [field]: normalizeHex(prev[field], fallback),
    }));
  };

  const toggleEffect = (effId) => {
    setForm((prev) => {
      const has = prev.effects.includes(effId);
      return {
        ...prev,
        effects: has
          ? prev.effects.filter((e) => e !== effId)
          : [...prev.effects, effId],
      };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const dataUrl = await compressImageFile(file, 160, 0.72);
      if (!isSafeImageUrl(dataUrl)) {
        setErrorMsg('Compressed image is still too large. Please pick a smaller image.');
      } else {
        setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
        setStatusMsg('Image uploaded & compressed for live park sync.');
      }
    } catch {
      setErrorMsg('Could not read that image file.');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyLink = () => {
    const clean = String(linkDraft || '').trim();
    if (!clean) {
      setForm((prev) => ({ ...prev, imageUrl: '' }));
      setErrorMsg('');
      return;
    }
    if (!clean.startsWith('https://') || !isSafeImageUrl(clean)) {
      setErrorMsg('Please enter a valid https:// image link (under 1024 chars).');
      return;
    }
    setErrorMsg('');
    setForm((prev) => ({ ...prev, imageUrl: clean }));
    setStatusMsg('Image link attached.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    if (!form.name.trim()) {
      setErrorMsg('Please enter an asset name.');
      return;
    }
    const payload = {
      ...form,
      name: form.name.trim(),
      primaryColor: normalizeHex(form.primaryColor, '#ff7eb6'),
      accentColor: normalizeHex(form.accentColor, '#ffe066'),
      glowColor: normalizeHex(form.glowColor || form.accentColor, '#ffe066'),
    };
    const res = onPublishAsset?.(payload);
    if (!res?.ok) {
      setErrorMsg(res?.error || 'Could not publish asset.');
      return;
    }
    setStatusMsg(`Published "${res.asset.name}" to live park!`);
    if (onSelectCreatedAsset) {
      onSelectCreatedAsset(res.asset);
    }
    setForm({
      ...EMPTY_FORM,
      kind: form.kind,
      emoji: KIND_META.find((k) => k.id === form.kind)?.defaultEmoji || '🌸',
    });
    setLinkDraft('');
  };

  const startEdit = (asset) => {
    setForm({
      id: asset.id,
      kind: asset.kind,
      name: asset.name,
      emoji: asset.emoji || '🌸',
      imageUrl: asset.imageUrl || '',
      primaryColor: asset.primaryColor || '#ff7eb6',
      accentColor: asset.accentColor || '#ffe066',
      glowColor: asset.glowColor || asset.accentColor || '#ffe066',
      glowOn: Boolean(asset.glowOn),
      glowStrength: asset.glowStrength ?? 0.7,
      effects: Array.isArray(asset.effects) ? asset.effects : [],
    });
    setLinkDraft(asset.imageUrl?.startsWith('https://') ? asset.imageUrl : '');
    setSourceMode(asset.imageUrl?.startsWith('https://') ? 'link' : 'upload');
    setErrorMsg('');
    setStatusMsg(`Editing "${asset.name}"`);
  };

  const safeGlowHex = normalizeHex(form.glowColor || form.accentColor, '#f5d076');
  const safePrimaryHex = normalizeHex(form.primaryColor, '#d8dfcf');
  const safeAccentHex = normalizeHex(form.accentColor, '#f5d076');
  const previewClass = [
    'asset-preview-stage',
    form.glowOn ? 'fx-glow' : '',
    ...form.effects.map((id) => `fx-${id}`),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--text-primary)' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          borderRadius: 12,
          padding: compact ? 10 : 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: '0.92rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} /> {form.id ? 'Edit Custom Asset' : 'Create Admin Custom Asset'}
          </strong>
          {form.id && (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => {
                setForm({ ...EMPTY_FORM, kind: form.kind });
                setLinkDraft('');
              }}
            >
              + New Asset
            </button>
          )}
        </div>

        {/* Category selector */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {KIND_META.map((k) => {
            const active = form.kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={active}
                className={`chip-btn ${active ? 'active' : ''}`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    kind: k.id,
                    emoji: prev.id ? prev.emoji : k.defaultEmoji,
                  }))
                }
              >
                {active ? '✓ ' : ''}{k.label}
              </button>
            );
          })}
        </div>

        <div className="form-row">
          <div className="field-group" style={{ flex: 2 }}>
            <label>Asset Name *</label>
            <input
              type="text"
              maxLength={40}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Moonlight Lotus / Jade Arch"
            />
          </div>
          <div className="field-group" style={{ flex: 1 }}>
            <label>Icon / Emoji</label>
            <input
              type="text"
              maxLength={8}
              value={form.emoji}
              onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quick icons:</span>
          {(QUICK_EMOJIS[form.kind] || QUICK_EMOJIS.flower).map((em) => {
            const active = form.emoji === em;
            return (
              <button
                key={em}
                type="button"
                aria-pressed={active}
                className={`chip-btn ${active ? 'active' : ''}`}
                style={{ padding: '3px 9px' }}
                onClick={() => setForm((p) => ({ ...p, emoji: em }))}
              >
                {em}
              </button>
            );
          })}
        </div>

        {/* Image upload or HTTPS link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Artwork Image (Optional):</span>
            <button
              type="button"
              aria-pressed={sourceMode === 'upload'}
              className={`chip-btn ${sourceMode === 'upload' ? 'active' : ''}`}
              onClick={() => setSourceMode('upload')}
            >
              {sourceMode === 'upload' ? '✓ ' : ''}<Upload size={12} /> Direct Upload
            </button>
            <button
              type="button"
              aria-pressed={sourceMode === 'link'}
              className={`chip-btn ${sourceMode === 'link' ? 'active' : ''}`}
              onClick={() => setSourceMode('link')}
            >
              {sourceMode === 'link' ? '✓ ' : ''}<Link2 size={12} /> Image URL Link
            </button>
            {form.imageUrl && (
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                onClick={() => {
                  setForm((p) => ({ ...p, imageUrl: '' }));
                  setLinkDraft('');
                }}
              >
                Clear Image
              </button>
            )}
          </div>

          {sourceMode === 'upload' ? (
            <label className="chip-btn" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
              <Upload size={13} /> {uploading ? 'Compressing...' : 'Choose Image File'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="url"
                className="input-control"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                placeholder="https://example.com/custom-flower.png"
                style={{ flex: 1, padding: '7px 10px' }}
              />
              <button type="button" className="btn-secondary" onClick={handleApplyLink}>
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Hex Colors */}
        <div className="form-row" style={{ gap: 10 }}>
          {[
            { key: 'primaryColor', label: 'Primary Color', fallback: '#ff7eb6' },
            { key: 'accentColor', label: 'Accent Color', fallback: '#ffe066' },
            { key: 'glowColor', label: 'Glow Color', fallback: '#f5d076' },
          ].map((c) => (
            <div key={c.key} className="field-group" style={{ flex: 1 }}>
              <label>{c.label} (Hex)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  aria-label={`${c.label} color picker`}
                  value={normalizeHex(form[c.key], c.fallback)}
                  onChange={(e) => setColorField(c.key, e.target.value)}
                  style={{ width: 34, height: 32, padding: 2, borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  maxLength={7}
                  aria-label={`${c.label} hex value`}
                  className="input-control"
                  value={form[c.key]}
                  onChange={(e) => setColorField(c.key, e.target.value)}
                  onBlur={() => commitHexField(c.key, c.fallback)}
                  placeholder="#rrggbb"
                  style={{ flex: 1, fontFamily: 'monospace', padding: '6px 8px' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Glow Toggle & Strength + Effects */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.glowOn}
              onChange={(e) => setForm((p) => ({ ...p, glowOn: e.target.checked }))}
            />
            ✨ Enable Glow Effect
          </label>
          {form.glowOn && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Strength: {Math.round((form.glowStrength ?? 0.7) * 100)}%
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={form.glowStrength ?? 0.7}
                onChange={(e) => setForm((p) => ({ ...p, glowStrength: Number(e.target.value) }))}
              />
            </label>
          )}
        </div>

        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Lively & Radiant Effects:
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASSET_EFFECTS.map((eff) => {
              const active = form.effects.includes(eff.id);
              return (
                <button
                  key={eff.id}
                  type="button"
                  aria-pressed={active}
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleEffect(eff.id)}
                >
                  {active ? '✓ ' : ''}{eff.icon} {eff.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview + Save */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 8,
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className={previewClass}
              style={{
                '--fx-primary': safePrimaryHex,
                '--fx-accent': safeAccentHex,
                '--fx-glow': safeGlowHex,
                '--fx-glow-px': `${Math.round((form.glowStrength ?? 0.7) * 22)}px`,
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(145deg, ${safePrimaryHex}, ${safeAccentHex})`,
                border: `2px solid ${safeAccentHex}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                overflow: 'hidden',
                boxShadow: form.glowOn ? `0 0 ${Math.round((form.glowStrength ?? 0.7) * 20)}px ${safeGlowHex}` : 'none',
              }}
            >
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.name || 'Preview'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{form.emoji || '✨'}</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{form.name || 'Live Preview'}</div>
              <div>{form.effects.length > 0 ? form.effects.join(' • ') : 'Standard finish'}</div>
            </div>
          </div>

          <button type="submit" className="btn-primary">
            {form.id ? <><Check size={14} /> Update Asset</> : <><Plus size={14} /> Publish Custom Asset</>}
          </button>
        </div>

        {errorMsg && (
          <p style={{ margin: 0, color: '#991b1b', background: '#fee2e2', padding: '6px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </p>
        )}
        {statusMsg && (
          <p style={{ margin: 0, color: '#166534', background: '#dcfce7', padding: '6px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
            ✅ {statusMsg}
          </p>
        )}
      </form>

      {/* Asset Library */}
      {!compact && (
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button
              type="button"
              className={`chip-btn ${filterKind === 'all' ? 'active' : ''}`}
              onClick={() => setFilterKind('all')}
            >
              {filterKind === 'all' ? '✓ ' : ''}All ({adminAssets.length})
            </button>
            {KIND_META.map((k) => {
              const active = filterKind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => setFilterKind(k.id)}
                >
                  {active ? '✓ ' : ''}{k.label} ({adminAssets.filter((a) => a.kind === k.id).length})
                </button>
              );
            })}
          </div>

          {filteredAssets.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No custom assets published in this category yet.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {filteredAssets.map((a) => {
                const isEditingThis = form.id === a.id;
                return (
                  <div
                    key={a.id}
                    style={{
                      background: isEditingThis ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      border: isEditingThis ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
                      borderRadius: 10,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${a.primaryColor}, ${a.accentColor})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        boxShadow: a.glowOn ? `0 0 12px ${a.glowColor || a.accentColor}` : 'none',
                      }}
                    >
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem' }}>{a.emoji}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {a.kind} {a.glowOn ? '• glow' : ''} {a.effects?.length ? `• ${a.effects.slice(0, 2).join(',')}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '4px 6px' }}
                        title="Edit"
                        onClick={() => startEdit(a)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '4px 6px', color: '#b91c1c' }}
                        title="Delete"
                        onClick={() => onDeleteAsset?.(a.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
