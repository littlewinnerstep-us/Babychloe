import React, { useMemo, useState, useEffect } from 'react';
import { X, Search, Footprints } from 'lucide-react';
import { getSpeciesEmoji } from '../data/memorialData';

/**
 * Floating/modal list of existing pet plots & niches with search by pet name,
 * plot/niche code, or caretaker name, and a Visit button to auto-walk there.
 */
export default function PlotNicheListModal({
  isOpen,
  onClose,
  activeRoom = 'tombstone',
  activeSpecies = 'Dog',
  memorials = [],
  onVisitPet,
}) {
  const [query, setQuery] = useState('');
  const [spaceFilter, setSpaceFilter] = useState(activeRoom === 'ash-room' ? 'ash-room' : 'tombstone');

  useEffect(() => {
    if (isOpen) {
      setSpaceFilter(activeRoom === 'ash-room' ? 'ash-room' : 'tombstone');
    }
  }, [isOpen, activeRoom]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const parseNum = (code) => {
      const m = String(code || '').match(/(\d+)\s*$/);
      return m ? parseInt(m[1], 10) : 9999;
    };
    return (memorials || [])
      .filter((m) => {
        if (spaceFilter !== 'all' && m.space !== spaceFilter) return false;
        if (!q) return true;
        const name = String(m.name || '').toLowerCase();
        const code = String(m.locationCode || '').toLowerCase();
        const caretaker = String(m.ownerName || '').toLowerCase();
        return name.includes(q) || code.includes(q) || caretaker.includes(q);
      })
      .sort((a, b) => parseNum(a.locationCode) - parseNum(b.locationCode));
  }, [memorials, spaceFilter, query]);

  if (!isOpen) return null;

  const isAsh = activeRoom === 'ash-room';

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 60 }}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: 520,
          width: '92vw',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{isAsh ? '🏺' : '🪦'}</span>
              <span>{isAsh ? `${activeSpecies} Niche List` : `${activeSpecies} Plot List`}</span>
            </h3>
            <p className="modal-subtitle" style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>
              Search by pet name, plot/niche code, or caretaker and tap Visit to walk there.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close list">
            <X size={18} />
          </button>
        </div>

        {/* Room filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'tombstone', label: '🪦 Garden Plots' },
            { id: 'ash-room', label: '🏺 Ash Niches' },
            { id: 'all', label: '✨ All' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={spaceFilter === tab.id ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: '0.76rem', padding: '5px 11px' }}
              onClick={() => setSpaceFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: 34, width: '100%' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pet name, plot/niche (G-21, A-21), or caretaker..."
          />
        </div>

        {/* Scrollable list */}
        <div
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '48vh',
            paddingRight: 2,
          }}
        >
          {filteredList.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No matching plots or niches found.
            </div>
          ) : (
            filteredList.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name || 'Pet'}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        objectFit: 'cover',
                        border: '1.5px solid #d4a853',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid #d4a853',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {getSpeciesEmoji(m.species)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{m.name || 'Pet'}</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: 'rgba(212, 168, 83, 0.16)',
                          border: '1px solid rgba(212, 168, 83, 0.4)',
                          color: '#ffe5ad',
                        }}
                      >
                        {m.space === 'ash-room' ? '🏺 Niche' : '🪦 Plot'} {m.locationCode || ''}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Caretaker: {m.ownerName || 'Sanctuary'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.76rem', padding: '6px 11px', flexShrink: 0 }}
                  onClick={() => {
                    if (onVisitPet) onVisitPet(m);
                    onClose();
                  }}
                >
                  <Footprints size={13} /> Visit
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
