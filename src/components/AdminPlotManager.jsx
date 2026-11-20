import React, { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, RotateCcw, Upload, Link2, Sparkles, Grid } from 'lucide-react';
import {
  getAllSpeciesList,
  MONUMENT_STYLES,
  MAX_PLOTS_PER_GARDEN,
  getAdminSlotCode,
  parsePlotNumber,
} from '../data/memorialData';
import { ASSET_EFFECTS, isSafeImageUrl, normalizeHex } from '../utils/customAssets';
import { compressImageFile } from '../utils/imageCompressor';

export default function AdminPlotManager({
  allMemorials = [],
  adminAssets = [],
  defaultSpecies = 'Dog',
  defaultRoom = 'tombstone',
  onSaveMemorial,
  onDeleteMemorial,
  onRestoreMemorial,
  onBulkCreateBlankSlots,
}) {
  const [species, setSpecies] = useState(defaultSpecies || 'Dog');
  const [space, setSpace] = useState(defaultRoom === 'ash-room' ? 'ash-room' : 'tombstone');
  const [showTrash, setShowTrash] = useState(false);
  const [editing, setEditing] = useState(null);
  const [photoLinkDraft, setPhotoLinkDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const activeBucket = useMemo(() => {
    return (allMemorials || []).filter(
      (m) =>
        m &&
        !m.deletedAt &&
        (m.species || 'Dog') === species &&
        (m.space === 'ash-room' ? 'ash-room' : 'tombstone') === space
    );
  }, [allMemorials, species, space]);

  const slotMap = useMemo(() => {
    const map = new Map();
    activeBucket.forEach((m) => {
      const n = parsePlotNumber(m.locationCode);
      if (n && !map.has(n)) map.set(n, m);
    });
    return map;
  }, [activeBucket]);

  const laterList = useMemo(() => {
    return activeBucket
      .map((m) => ({ memorial: m, num: parsePlotNumber(m.locationCode) || 999 }))
      .filter((x) => x.num > 20)
      .sort((a, b) => a.num - b.num);
  }, [activeBucket]);

  const trashList = useMemo(
    () => (allMemorials || []).filter((m) => m && Boolean(m.deletedAt)),
    [allMemorials]
  );

  const customStyles = useMemo(() => {
    const wantedKind = space === 'ash-room' ? 'niche-style' : 'plot-style';
    return (adminAssets || []).filter((a) => a && !a.deletedAt && a.kind === wantedKind);
  }, [adminAssets, space]);

  const builtInStyles = MONUMENT_STYLES[space] || MONUMENT_STYLES.tombstone;

  const findNextAvailableSlot = (start = 21) => {
    let n = start;
    while (slotMap.has(n) && n <= MAX_PLOTS_PER_GARDEN) n += 1;
    return Math.min(n, MAX_PLOTS_PER_GARDEN);
  };

  const openEditorForSlot = (slotNumber, existingMemorial = null) => {
    setErrorMsg('');
    setStatusMsg('');
    if (existingMemorial) {
      setEditing({
        id: existingMemorial.id,
        slotNumber: parsePlotNumber(existingMemorial.locationCode) || slotNumber,
        name: existingMemorial.name || '',
        breed: existingMemorial.breed || '',
        years: existingMemorial.years || '',
        styleId: existingMemorial.styleId || builtInStyles[0]?.id || (space === 'ash-room' ? 'celadon-urn' : 'classic-granite'),
        photo: existingMemorial.photo || (space === 'ash-room' ? '⚱️' : '🕊️'),
        epitaph: existingMemorial.epitaph || '',
        story: existingMemorial.story || '',
        customHex: existingMemorial.customHex || '',
        glowColor: existingMemorial.glowColor || '#f5d076',
        glowOn: Boolean(existingMemorial.glowOn),
        glowStrength: existingMemorial.glowStrength ?? 0.65,
        effects: Array.isArray(existingMemorial.effects) ? existingMemorial.effects : [],
        isBlankPlaceholder: Boolean(existingMemorial.isBlankPlaceholder),
        visibility: existingMemorial.visibility || 'public',
      });
      setPhotoLinkDraft(existingMemorial.photo?.startsWith('https://') ? existingMemorial.photo : '');
    } else {
      const code = getAdminSlotCode(space, slotNumber);
      setEditing({
        id: '',
        slotNumber,
        name: `Open ${code}`,
        breed: space === 'ash-room' ? 'Sanctuary Niche' : 'Memorial Plot',
        years: 'Open Slot',
        styleId: builtInStyles[0]?.id || (space === 'ash-room' ? 'celadon-urn' : 'classic-granite'),
        photo: space === 'ash-room' ? '⚱️' : '🕊️',
        epitaph: 'Reserved space prepared for remembrance.',
        story: '',
        customHex: '',
        glowColor: '#f5d076',
        glowOn: false,
        glowStrength: 0.65,
        effects: [],
        isBlankPlaceholder: false,
        visibility: 'public',
      });
      setPhotoLinkDraft('');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const compressed = await compressImageFile(file, 220, 0.72);
      setEditing((prev) => ({ ...prev, photo: compressed }));
    } catch {
      setErrorMsg('Failed to process uploaded image.');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyPhotoLink = () => {
    const clean = String(photoLinkDraft || '').trim();
    if (!clean) return;
    if (!clean.startsWith('https://') || !isSafeImageUrl(clean)) {
      setErrorMsg('Please provide a valid https:// image URL.');
      return;
    }
    setErrorMsg('');
    setEditing((prev) => ({ ...prev, photo: clean }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editing) return;
    setErrorMsg('');
    setStatusMsg('');
    if (!editing.name.trim()) {
      setErrorMsg('Please enter a name or plot title.');
      return;
    }
    const payload = {
      id: editing.id || undefined,
      species,
      space,
      slotNumber: Number(editing.slotNumber) || 1,
      name: editing.name.trim(),
      breed: editing.breed.trim() || (space === 'ash-room' ? 'Ash Niche' : 'Memorial Plot'),
      years: editing.years.trim() || 'In Memory',
      styleId: editing.styleId,
      photo: editing.photo || (space === 'ash-room' ? '⚱️' : '🕊️'),
      epitaph: editing.epitaph.trim() || 'Always loved, never forgotten.',
      story: editing.story.trim(),
      customHex: editing.customHex ? normalizeHex(editing.customHex, '#d8dfcf') : '',
      glowColor: editing.glowColor ? normalizeHex(editing.glowColor, '#f5d076') : '#f5d076',
      glowOn: Boolean(editing.glowOn),
      glowStrength: editing.glowStrength ?? 0.65,
      effects: Array.isArray(editing.effects) ? editing.effects : [],
      isBlankPlaceholder: Boolean(editing.isBlankPlaceholder),
      visibility: editing.visibility || 'public',
    };
    const res = onSaveMemorial?.(payload);
    if (!res?.ok) {
      setErrorMsg(res?.error || 'Could not save plot/niche.');
      return;
    }
    setStatusMsg(`Saved ${res.memorial.locationCode} in ${species} gate.`);
    setEditing(null);
  };

  const toggleEditorEffect = (effId) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const has = prev.effects.includes(effId);
      return {
        ...prev,
        effects: has ? prev.effects.filter((e) => e !== effId) : [...prev.effects, effId],
      };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text-primary)' }}>
      {/* Gate & Space selector */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Species Gate:
            <select
              className="input-control"
              value={species}
              onChange={(e) => {
                setSpecies(e.target.value);
                setEditing(null);
              }}
              style={{ width: 'auto', padding: '5px 10px' }}
            >
              {getAllSpeciesList().map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.emoji} {sp.label}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`chip-btn ${space === 'tombstone' ? 'active' : ''}`}
              onClick={() => {
                setSpace('tombstone');
                setEditing(null);
              }}
            >
              {space === 'tombstone' ? '✓ ' : ''}🪦 Tombstone Plots
            </button>
            <button
              type="button"
              className={`chip-btn ${space === 'ash-room' ? 'active' : ''}`}
              onClick={() => {
                setSpace('ash-room');
                setEditing(null);
              }}
            >
              {space === 'ash-room' ? '✓ ' : ''}⚱️ Ash Room Niches
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.78rem' }}
            onClick={() => openEditorForSlot(findNextAvailableSlot(21), null)}
          >
            <Plus size={14} /> Add Slot (21–200)
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.78rem' }}
            onClick={() => onBulkCreateBlankSlots?.({ species, space, styleId: builtInStyles[0]?.id })}
          >
            <Sparkles size={14} /> Fill Empty 1–20 ({species})
          </button>
          <button
            type="button"
            className={`chip-btn ${showTrash ? 'active' : ''}`}
            onClick={() => setShowTrash((v) => !v)}
          >
            {showTrash ? '✓ ' : ''}🗑️ Trash ({trashList.length})
          </button>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Slots 1–20 are scoped strictly per species gate. Creating or filling 1–20 in <strong>{species}</strong> leaves other species gates empty until you add them manually.
      </p>

      {statusMsg && (
        <p style={{ margin: 0, color: '#166534', background: '#dcfce7', padding: '6px 10px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
          ✅ {statusMsg}
        </p>
      )}
      {errorMsg && (
        <p style={{ margin: 0, color: '#991b1b', background: '#fee2e2', padding: '6px 10px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </p>
      )}

      {/* Inline Editor */}
      {editing && (
        <form
          onSubmit={handleSave}
          style={{
            background: 'var(--bg-elevated)',
            border: '2px solid var(--accent)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong style={{ color: 'var(--accent)', fontSize: '0.96rem' }}>
              {editing.id ? '✏️ Editing' : '➕ Creating'} {getAdminSlotCode(space, editing.slotNumber)} ({species} Gate)
            </strong>
            <div style={{ display: 'flex', gap: 6 }}>
              {editing.id && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ color: '#b91c1c', borderColor: 'rgba(185, 28, 28, 0.35)', fontSize: '0.78rem' }}
                  onClick={() => {
                    onDeleteMemorial?.(editing.id);
                    setEditing(null);
                  }}
                >
                  <Trash2 size={13} /> Move to Trash
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.78rem' }}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="field-group" style={{ maxWidth: 130, minWidth: 100 }}>
              <label>Slot # (1–200)</label>
              <input
                type="number"
                min={1}
                max={MAX_PLOTS_PER_GARDEN}
                value={editing.slotNumber}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    slotNumber: Math.max(1, Math.min(MAX_PLOTS_PER_GARDEN, Number(e.target.value) || 1)),
                  }))
                }
              />
            </div>
            <div className="field-group" style={{ flex: 2 }}>
              <label>Memorial / Plot Title *</label>
              <input
                type="text"
                maxLength={40}
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label>Breed / Tag</label>
              <input
                type="text"
                maxLength={36}
                value={editing.breed}
                onChange={(e) => setEditing((p) => ({ ...p, breed: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label>Years</label>
              <input
                type="text"
                maxLength={24}
                value={editing.years}
                onChange={(e) => setEditing((p) => ({ ...p, years: e.target.value }))}
                placeholder="2014 – 2026"
              />
            </div>
            <div className="field-group">
              <label>Monument / Urn Style</label>
              <select
                value={editing.styleId}
                onChange={(e) => setEditing((p) => ({ ...p, styleId: e.target.value }))}
              >
                <optgroup label="Standard Styles">
                  {builtInStyles.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </optgroup>
                {customStyles.length > 0 && (
                  <optgroup label="Admin Custom Styles">
                    {customStyles.map((cs) => (
                      <option key={cs.id} value={`custom:${cs.id}`}>
                        {cs.emoji} {cs.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Photo upload / link */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <label className="chip-btn" style={{ cursor: 'pointer' }}>
              <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </label>
            <input
              type="url"
              className="input-control"
              aria-label="Photo URL link"
              placeholder="or https:// photo link"
              value={photoLinkDraft}
              onChange={(e) => setPhotoLinkDraft(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '7px 10px' }}
            />
            <button type="button" className="btn-secondary" onClick={handleApplyPhotoLink}>
              <Link2 size={13} /> Use Link
            </button>
            <input
              type="text"
              maxLength={8}
              className="input-control"
              aria-label="Plot or niche emoji icon"
              value={editing.photo?.startsWith('data:') || editing.photo?.startsWith('https://') ? '' : editing.photo}
              onChange={(e) => setEditing((p) => ({ ...p, photo: e.target.value || '🕊️' }))}
              placeholder="Emoji"
              style={{ width: 64, textAlign: 'center', padding: '7px 6px' }}
            />
          </div>

          {/* Hex override, Glow & Effects */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Custom Stone/Urn Hex:
                <input
                  type="color"
                  value={normalizeHex(editing.customHex, '#d8dfcf')}
                  onChange={(e) => setEditing((p) => ({ ...p, customHex: e.target.value }))}
                  style={{ width: 30, height: 26, borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  maxLength={7}
                  className="input-control"
                  value={editing.customHex}
                  onChange={(e) => setEditing((p) => ({ ...p, customHex: e.target.value }))}
                  placeholder="(optional)"
                  style={{ width: 100, fontFamily: 'monospace', padding: '4px 8px' }}
                />
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editing.glowOn}
                  onChange={(e) => setEditing((p) => ({ ...p, glowOn: e.target.checked }))}
                />
                ✨ Glow
              </label>

              {editing.glowOn && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Glow Hex:
                  <input
                    type="color"
                    value={normalizeHex(editing.glowColor, '#f5d076')}
                    onChange={(e) => setEditing((p) => ({ ...p, glowColor: e.target.value }))}
                    style={{ width: 28, height: 24, borderRadius: 6, cursor: 'pointer' }}
                  />
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={editing.glowStrength ?? 0.65}
                    onChange={(e) => setEditing((p) => ({ ...p, glowStrength: Number(e.target.value) }))}
                  />
                </label>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ASSET_EFFECTS.map((eff) => {
                const selected = editing.effects.includes(eff.id);
                return (
                  <button
                    key={eff.id}
                    type="button"
                    aria-pressed={selected}
                    className={`chip-btn ${selected ? 'active' : ''}`}
                    onClick={() => toggleEditorEffect(eff.id)}
                  >
                    {selected ? '✓ ' : ''}{eff.icon} {eff.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-group">
            <label>Epitaph</label>
            <input
              type="text"
              maxLength={120}
              value={editing.epitaph}
              onChange={(e) => setEditing((p) => ({ ...p, epitaph: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editing.isBlankPlaceholder}
                onChange={(e) => setEditing((p) => ({ ...p, isBlankPlaceholder: e.target.checked }))}
              />
              Mark as Open / Reserved Slot
            </label>
            <button type="submit" className="btn-primary">
              Save {getAdminSlotCode(space, editing.slotNumber)}
            </button>
          </div>
        </form>
      )}

      {/* Trash Panel */}
      {showTrash && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 12,
            color: '#7f1d1d',
          }}
        >
          <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: 8 }}>
            🗑️ Soft-Deleted Plots & Niches ({trashList.length})
          </strong>
          {trashList.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Trash is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {trashList.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fff',
                    border: '1px solid #fecaca',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>
                    <strong>{m.name}</strong> ({m.species} • {m.locationCode})
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => onRestoreMemorial?.(m.id)}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visual 1-20 Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.86rem', color: 'var(--accent)', fontWeight: 700 }}>
          <Grid size={14} /> Front Row Slots 1–20 — {species} ({space === 'ash-room' ? 'Ash Room' : 'Tombstones'})
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
            gap: 6,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
            const occupant = slotMap.get(num);
            const code = getAdminSlotCode(space, num);
            const isSelected = editing && Number(editing.slotNumber) === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => openEditorForSlot(num, occupant || null)}
                style={{
                  textAlign: 'left',
                  padding: '8px 9px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--accent)'
                    : occupant
                      ? occupant.isBlankPlaceholder
                        ? 'var(--accent-soft)'
                        : 'var(--bg-elevated)'
                      : 'var(--bg-surface)',
                  border: isSelected
                    ? '2px solid var(--accent)'
                    : occupant
                      ? '1.5px solid var(--accent)'
                      : '1px dashed var(--border-soft)',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: '0.72rem', color: isSelected ? '#fef3c7' : 'var(--accent)', fontWeight: 700 }}>
                  {isSelected ? '✓ ' : ''}{code}
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? '#fff' : occupant ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {occupant ? occupant.name : 'Empty Space (+)'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots 21-200 list */}
      <div>
        <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
          Plots & Niches 21–200 in {species} ({laterList.length})
        </strong>
        {laterList.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No memorials in slots 21–200 for this gate/room yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {laterList.map(({ memorial: m }) => {
              const isSelected = editing && editing.id === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
                    borderRadius: 9,
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isSelected ? '✓ ' : ''}{m.locationCode} — {m.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {m.breed} {m.glowOn ? '• ✨' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '4px 6px' }}
                      onClick={() => openEditorForSlot(parsePlotNumber(m.locationCode) || 21, m)}
                      title="Edit"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '4px 6px', color: '#b91c1c' }}
                      onClick={() => onDeleteMemorial?.(m.id)}
                      title="Delete"
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
    </div>
  );
}
