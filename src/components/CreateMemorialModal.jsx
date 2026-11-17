import React, { useState } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';
import MonumentVisual from './MonumentVisual';
import { MONUMENT_STYLES, PHOTO_PRESETS } from '../data/memorialData';

export default function CreateMemorialModal({
  currentUser,
  existingCount,
  onClose,
  onCreate,
}) {
  const [space, setSpace] = useState('tombstone');
  const [styleId, setStyleId] = useState(MONUMENT_STYLES.tombstone[0].id);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('2015-05-10');
  const [passedDate, setPassedDate] = useState(new Date().toISOString().slice(0, 10));
  const [locationCode, setLocationCode] = useState('');
  const [photo, setPhoto] = useState(PHOTO_PRESETS[0].url);
  const [epitaph, setEpitaph] = useState('');
  const [story, setStory] = useState('');
  const [favoriteTreat, setFavoriteTreat] = useState('');
  const [visibility, setVisibility] = useState('public');

  const autoCode =
    space === 'ash-room'
      ? `Niche B-${String(existingCount + 3).padStart(2, '0')}`
      : `Plot G-${String(existingCount + 10).padStart(2, '0')}`;

  const handleSpaceChange = (next) => {
    setSpace(next);
    setStyleId(MONUMENT_STYLES[next][0].id);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const newMemorial = {
      id: `mem-${Date.now()}`,
      name: cleanName,
      species,
      breed: breed.trim() || species,
      space,
      styleId,
      locationCode: locationCode.trim() || autoCode,
      zoneName: space === 'ash-room' ? 'Hall of Serenity' : 'Whispering Meadow',
      birthDate,
      passedDate,
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
          <MonumentVisual memorial={previewMemorial} mode="compact" />
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
              <label className="field-label">Species</label>
              <select
                className="input-control"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Bird">Bird</option>
                <option value="Small Pet">Small Pet</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="field-label">Breed / Description</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g., Corgi, Calico"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Plot / Niche Code</label>
              <input
                type="text"
                className="input-control"
                placeholder={autoCode}
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
              />
            </div>
          </div>

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
