import React, { useState, useMemo } from 'react';
import { X, Search, Footprints, HeartOff } from 'lucide-react';
import { getSpeciesEmoji } from '../data/memorialData';

export default function FavoritesModal({
  favorites = [],
  allMemorials = [],
  onWalkAndVisit,
  onToggleFavorite,
  onClose,
}) {
  const [filterText, setFilterText] = useState('');

  const favoriteMemorials = useMemo(
    () => allMemorials.filter((m) => favorites.includes(m.id)),
    [allMemorials, favorites]
  );

  const filteredFavorites = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return favoriteMemorials;
    return favoriteMemorials.filter((m) =>
      `${m.name || ''} ${m.species || ''} ${m.breed || ''} ${m.locationCode || ''} ${m.ownerName || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [favoriteMemorials, filterText]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', margin: 0 }}>
              💖 Favorite Pet Vigils
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Choose a saved companion below to walk right to their vigil and pay a visit
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close favorites list">
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-soft)',
            borderRadius: 10,
            padding: '6px 10px',
            marginBottom: 10,
          }}
        >
          <Search size={14} />
          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter favorites (e.g. Bella, Cat, Plot G-01, Caretaker)..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          />
        </div>

        {favoriteMemorials.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🤍</div>
            <strong style={{ fontSize: '0.96rem', display: 'block', marginBottom: 4 }}>
              No favorite pets saved yet
            </strong>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Tap <strong>🤍 Favorite</strong> on any tombstone or ash niche in the park to add them to this quick-visit list.
            </p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No saved favorites match “{filterText}”.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))',
              gap: 10,
              maxHeight: '56vh',
              overflowY: 'auto',
              paddingRight: 2,
            }}
          >
            {filteredFavorites.map((m) => {
              const emoji = getSpeciesEmoji(m.species || 'Dog');
              const visits = Number(m.visitsCount) || 0;
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  className="style-option"
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (onWalkAndVisit) onWalkAndVisit(m);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onWalkAndVisit) onWalkAndVisit(m);
                      onClose();
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          objectFit: 'cover',
                          border: '1px solid rgba(255,213,126,0.4)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: 'rgba(255,213,126,0.12)',
                          border: '1px solid rgba(255,213,126,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          flexShrink: 0,
                        }}
                      >
                        {emoji}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '0.92rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {emoji} {m.name}
                      </strong>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {m.species || 'Dog'} • {m.locationCode || 'Plot'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {m.space === 'ash-room' ? '🏛️ Ash Room' : '🌿 Garden'} • 👣 {visits}{' '}
                        {visits === 1 ? 'visit' : 'visits'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '0.76rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onWalkAndVisit) onWalkAndVisit(m);
                        onClose();
                      }}
                    >
                      <Footprints size={13} /> Walk &amp; Visit
                    </button>
                    {onToggleFavorite && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '6px 9px', fontSize: '0.74rem' }}
                        title="Remove from favorites"
                        aria-label={`Remove ${m.name} from favorites`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(m.id);
                        }}
                      >
                        <HeartOff size={13} />
                      </button>
                    )}
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
