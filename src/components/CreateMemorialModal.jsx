import React, { useMemo, useState } from 'react';
import { X, Upload, Sparkles, Link2, ShieldCheck } from 'lucide-react';
import MonumentVisual from './MonumentVisual';
import AdminAssetStudio from './AdminAssetStudio';
import {
  MONUMENT_STYLES,
  PHOTO_PRESETS,
  SPECIES_LIST,
  MAX_PLOTS_PER_GARDEN,
  getNextPlotCode,
  getAdminSlotCode,
  getUsedSlotsSet,
} from '../data/memorialData';
import { compressImageFile } from '../utils/imageCompressor';
import { ASSET_EFFECTS, isSafeImageUrl, normalizeHex } from '../utils/customAssets';

export default function CreateMemorialModal({
  currentUser,
  memorials = [],
  defaultSpecies = 'Dog',
  isAdminUser = false,
  adminAssets = [],
  onPublishAsset,
  onClose,
  onCreate,
}) {
  const [space, setSpace] = useState('tombstone');
  const [styleId, setStyleId] = useState(MONUMENT_STYLES.tombstone[0].id);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState(defaultSpecies || 'Dog');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('2015-05-10');
  const [passedDate, setPassedDate] = useState(new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState(PHOTO_PRESETS[0].url);
  const [epitaph, setEpitaph] = useState('');
  const [story, setStory] = useState('');
  const [favoriteTreat, setFavoriteTreat] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [customHex, setCustomHex] = useState('');
  const [glowOn, setGlowOn] = useState(false);
  const [glowColor, setGlowColor] = useState('#f5d076');
  const [glowStrength, setGlowStrength] = useState(0.65);
  const [effects, setEffects] = useState([]);
  const [adminSlotMode, setAdminSlotMode] = useState('auto'); // 'auto' | 'custom'
  const [adminSlotNum, setAdminSlotNum] = useState(1);
  const [photoLinkDraft, setPhotoLinkDraft] = useState('');
  const [photoLinkError, setPhotoLinkError] = useState('');
  const [showAssetBuilder, setShowAssetBuilder] = useState(false);

  const autoCode = getNextPlotCode(memorials, species, space, isAdminUser);
  const usedSlots = useMemo(() => getUsedSlotsSet(memorials, species, space), [memorials, species, space]);
  const chosenAdminCode =
    isAdminUser && adminSlotMode === 'custom'
      ? getAdminSlotCode(space, adminSlotNum)
      : autoCode;
  const adminSlotConflict =
    isAdminUser && adminSlotMode === 'custom' && usedSlots.has(Number(adminSlotNum));

  const customStylesForSpace = useMemo(() => {
    const wanted = space === 'ash-room' ? 'niche-style' : 'plot-style';
    return (adminAssets || []).filter((a) => a && !a.deletedAt && a.kind === wanted);
  }, [adminAssets, space]);

  const handleSpaceChange = (next) => {
    setSpace(next);
    setStyleId(MONUMENT_STYLES[next][0].id);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedUrl = await compressImageFile(file, 220, 0.74);
    if (compressedUrl) {
      setPhoto(compressedUrl);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    if (adminSlotConflict) return;

    const newMemorial = {
      id: `mem-${Date.now()}`,
      createdAt: Date.now(),
      name: cleanName,
      species,
      breed: breed.trim() || species,
      space,
      styleId,
      locationCode: chosenAdminCode,
      adminManaged: Boolean(isAdminUser && adminSlotMode === 'custom'),
      customHex: customHex ? normalizeHex(customHex, '#d8dfcf') : '',
      glowOn: isAdminUser ? Boolean(glowOn) : false,
      glowColor: isAdminUser && glowOn ? normalizeHex(glowColor, '#f5d076') : '',
      glowStrength: isAdminUser ? glowStrength : 0,
      effects: isAdminUser ? effects : [],
      zoneName: space === 'ash-room' ? `${species} Hall of Serenity` : `${species} Meadow`,
      birthDate,
      passedDate,
      ownerUsername: currentUser.username || currentUser.email,
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      visibility,
      photo,
      epitaph:
        epitaph.trim() || 'Forever loved, forever remembered in gentle light.',
      story:
        story.trim() ||
        `${cleanName} brought endless warmth and joyful paws into our home every single day.`,
      favoriteTreat: favoriteTreat.trim() || 'Golden Biscuit',
      traits: ['Cherished Companion', 'Forever Loved'],
      candlesCount: 1,
      incenseCount: space === 'ash-room' ? 1 : 0,
      flowersCount: 1,
      treatsCount: 0,
      activeOfferings: space === 'ash-room' ? ['🕯️', '🪔', '🌸'] : ['🕯️', '🌸'],
      memories: [
        {
          id: `m-${Date.now()}`,
          photo,
          caption: `In loving memory of ${cleanName}.`,
          date: passedDate,
        },
      ],
      offeringsLog: [
        {
          id: `o-${Date.now()}`,
          emoji: '🕯️',
          label: 'Eternal Vigil Candle',
          visitor: currentUser.name,
          createdAt: Date.now(),
          time: 'Just now',
        },
      ],
      tributes: [],
    };

    onCreate(newMemorial);
  };

  const previewMemorial = {
    name: name.trim() || 'Beloved Pet',
    space,
    styleId,
    birthDate,
    passedDate,
    photo,
    customHex: customHex ? normalizeHex(customHex, '#d8dfcf') : '',
    glowOn: isAdminUser ? Boolean(glowOn) : false,
    glowColor: isAdminUser && glowOn ? normalizeHex(glowColor, '#f5d076') : '',
    glowStrength: isAdminUser ? glowStrength : 0,
    effects: isAdminUser ? effects : [],
    activeOfferings: space === 'ash-room' ? ['🕯️', '🪔', '🌸'] : ['🕯️', '🌸'],
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', margin: 0 }}>
              Enshrine a Beloved Pet
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Create an Outdoor Garden Tombstone or an Indoor Ash Room Niche
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          <MonumentVisual memorial={previewMemorial} mode="compact" adminAssets={adminAssets} />
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label className="field-label">1. Choose Memorial Space</label>
            <div className="form-row-2">
              <button
                type="button"
                className={`style-option ${space === 'tombstone' ? 'active' : ''}`}
                onClick={() => handleSpaceChange('tombstone')}
              >
                <strong>🌿 Outdoor Tombstone</strong>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Meadow plot with carved stone
                </div>
              </button>
              <button
                type="button"
                className={`style-option ${space === 'ash-room' ? 'active' : ''}`}
                onClick={() => handleSpaceChange('ash-room')}
              >
                <strong>🏛️ Indoor Ash Room</strong>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Columbarium urn & candle niche
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="field-label">
              2. Choose {space === 'ash-room' ? 'Urn Vessel Style' : 'Tombstone Style'}
            </label>
            <div className="style-grid">
              {MONUMENT_STYLES[space].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`style-option ${styleId === st.id ? 'active' : ''}`}
                  onClick={() => setStyleId(st.id)}
                >
                  <strong style={{ fontSize: '0.82rem' }}>{st.name}</strong>
                  <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                    {st.subtitle}
                  </div>
                </button>
              ))}
              {customStylesForSpace.map((cs) => (
                <button
                  key={cs.id}
                  type="button"
                  className={`style-option ${styleId === `custom:${cs.id}` ? 'active' : ''}`}
                  onClick={() => setStyleId(`custom:${cs.id}`)}
                  style={{
                    borderColor: styleId === `custom:${cs.id}` ? cs.accentColor : undefined,
                  }}
                >
                  <strong style={{ fontSize: '0.82rem' }}>
                    {cs.emoji} {cs.name}
                  </strong>
                  <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                    Admin Custom {cs.glowOn ? '• ✨ Glow' : ''}
                  </div>
                </button>
              ))}
            </div>

            {/* Customer Color Trim for Visitors & Admins */}
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(154,184,159,0.16)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                🎨 Custom Color Trim (Hex):
              </span>
              <input
                type="color"
                value={normalizeHex(customHex, '#d8dfcf')}
                onChange={(e) => setCustomHex(e.target.value)}
                style={{ width: 28, height: 26, borderRadius: 6, cursor: 'pointer' }}
              />
              <input
                type="text"
                maxLength={7}
                className="input-control"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#rrggbb (optional)"
                style={{ width: 130, fontFamily: 'monospace', padding: '4px 8px' }}
              />
              {customHex && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={() => setCustomHex('')}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="field-label">3. Pet Portrait (Upload from Phone or Pick Preset)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <label className="btn-ghost" style={{ cursor: 'pointer' }}>
                <Upload size={15} /> Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </label>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                or tap a quick portrait:
              </span>
            </div>
            <div className="preset-thumbs">
              {PHOTO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-thumb ${photo === p.url ? 'active' : ''}`}
                  onClick={() => setPhoto(p.url)}
                  title={p.label}
                >
                  <img src={p.url} alt={p.label} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="field-label">Pet Name *</label>
              <input
                type="text"
                required
                className="input-control"
                placeholder="e.g., Biscuit"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Species (Separated Sanctuary)</label>
              <select
                className="input-control"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              >
                {SPECIES_LIST.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.emoji} {sp.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="field-label">Breed / Description</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g., Corgi, Syrian Hamster, Abyssinian"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">
                {isAdminUser ? 'Plot / Niche Slot (Admin: 1–200)' : 'Auto Sequential Plot / Niche'}
              </label>
              <input
                type="text"
                readOnly
                className="input-control"
                value={chosenAdminCode}
                style={{ fontWeight: 700, opacity: 0.9, cursor: 'default' }}
                title="Sequential code scoped per species gate"
              />
            </div>
          </div>

          {isAdminUser && (
            <div
              style={{
                background: 'rgba(243, 217, 139, 0.08)',
                border: '1px solid rgba(243, 217, 139, 0.32)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong style={{ fontSize: '0.86rem', color: '#f3d98b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={15} /> Admin Enshrine Studio (Slots 1–200, Link, Glow &amp; Effects)
                </strong>
                {onPublishAsset && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={() => setShowAssetBuilder((v) => !v)}
                  >
                    {showAssetBuilder ? 'Hide Asset Publisher' : '✨ Publish Custom Asset'}
                  </button>
                )}
              </div>

              {showAssetBuilder && onPublishAsset && (
                <AdminAssetStudio
                  compact
                  defaultKind={space === 'ash-room' ? 'niche-style' : 'plot-style'}
                  adminAssets={adminAssets}
                  onPublishAsset={onPublishAsset}
                  onSelectCreatedAsset={(created) => {
                    if (
                      (space === 'ash-room' && created.kind === 'niche-style') ||
                      (space === 'tombstone' && created.kind === 'plot-style')
                    ) {
                      setStyleId(`custom:${created.id}`);
                    }
                  }}
                />
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#cfe0d4' }}>Slot Assignment:</span>
                <button
                  type="button"
                  className={`chip-btn ${adminSlotMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setAdminSlotMode('auto')}
                >
                  Auto ({autoCode})
                </button>
                <button
                  type="button"
                  className={`chip-btn ${adminSlotMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setAdminSlotMode('custom')}
                >
                  Pick Slot 1–200 ({species})
                </button>
                {adminSlotMode === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    max={MAX_PLOTS_PER_GARDEN}
                    value={adminSlotNum}
                    onChange={(e) =>
                      setAdminSlotNum(Math.max(1, Math.min(MAX_PLOTS_PER_GARDEN, Number(e.target.value) || 1)))
                    }
                    className="input-control"
                    style={{ width: 90, padding: '4px 8px' }}
                  />
                )}
              </div>
              {adminSlotConflict && (
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.78rem' }}>
                  ⚠️ Slot {chosenAdminCode} in {species} is already occupied. Pick another number or edit it in Admin Backend.
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link2 size={14} style={{ color: '#9ab89f' }} />
                <input
                  type="url"
                  className="input-control"
                  value={photoLinkDraft}
                  onChange={(e) => setPhotoLinkDraft(e.target.value)}
                  placeholder="Optional portrait / custom image https:// link"
                  style={{ flex: 1, minWidth: 180, padding: '5px 8px' }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                  onClick={() => {
                    const clean = photoLinkDraft.trim();
                    if (!clean.startsWith('https://') || !isSafeImageUrl(clean)) {
                      setPhotoLinkError('Enter a valid https:// image link.');
                      return;
                    }
                    setPhotoLinkError('');
                    setPhoto(clean);
                  }}
                >
                  Apply Link
                </button>
              </div>
              {photoLinkError && <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.76rem' }}>{photoLinkError}</p>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={glowOn} onChange={(e) => setGlowOn(e.target.checked)} />
                  ✨ Glow Effect
                </label>
                {glowOn && (
                  <>
                    <input
                      type="color"
                      value={normalizeHex(glowColor, '#f5d076')}
                      onChange={(e) => setGlowColor(e.target.value)}
                      style={{ width: 28, height: 24, borderRadius: 6 }}
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={glowColor}
                      onChange={(e) => setGlowColor(e.target.value)}
                      className="input-control"
                      style={{ width: 88, fontFamily: 'monospace', padding: '3px 6px' }}
                    />
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={glowStrength}
                      onChange={(e) => setGlowStrength(Number(e.target.value))}
                    />
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ASSET_EFFECTS.map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    className={`chip-btn ${effects.includes(eff.id) ? 'active' : ''}`}
                    onClick={() =>
                      setEffects((prev) =>
                        prev.includes(eff.id) ? prev.filter((x) => x !== eff.id) : [...prev, eff.id]
                      )
                    }
                  >
                    {eff.icon} {eff.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row-2">
            <div>
              <label className="field-label">Birth Date</label>
              <input
                type="date"
                className="input-control"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Passing Date</label>
              <input
                type="date"
                className="input-control"
                value={passedDate}
                onChange={(e) => setPassedDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Carved Epitaph Quote</label>
            <input
              type="text"
              className="input-control"
              placeholder="A short comforting line engraved on their stone or plaque..."
              value={epitaph}
              onChange={(e) => setEpitaph(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label">Life Story & Memories</label>
            <textarea
              rows={3}
              className="input-control"
              placeholder="Share their quirks, favorite walks, or sunny nap spots..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div>
              <label className="field-label">Favorite Treat / Toy</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g., Salmon bites, Tennis ball"
                value={favoriteTreat}
                onChange={(e) => setFavoriteTreat(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Sanctuary Visibility</label>
              <select
                className="input-control"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">Public (Logged-in visitors can visit)</option>
                <option value="private">Private (Only you can see & visit)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
            <Sparkles size={16} /> Enshrine Memorial
          </button>
        </form>
      </div>
    </div>
  );
}
