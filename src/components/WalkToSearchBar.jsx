import React, { useMemo, useState } from 'react';
import { Search, Compass } from 'lucide-react';
import { getSpeciesEmoji } from '../data/memorialData';

export default function WalkToSearchBar({
  allMemorials = [],
  activeSpecies,
  nearbyMemorialId,
  onSelectPet,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allMemorials.filter((m) => {
      if (!q) return (m.species || 'Dog') === activeSpecies;
      const hay = `${m.locationCode || ''} ${m.name || ''} ${m.ownerName || ''} ${m.ownerUsername || ''} ${m.species || ''}`.toLowerCase();
      return hay.includes(q);
    });
    return list.slice(0, 12);
  }, [allMemorials, activeSpecies, query]);

  return (
    <div className="walk-search-wrap">
      <div className="walk-search-box">
        <Compass size={13} style={{ flexShrink: 0, opacity: 0.8 }} />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={`Walk to Plot, Pet, or Caretaker (${activeSpecies})...`}
          aria-label="Search plot, pet name, or caretaker to walk to"
        />
        <Search size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
      </div>

      {open && (
        <div className="walk-search-dropdown">
          {results.length === 0 ? (
            <div className="walk-search-empty">No matching Plot, Pet, or Caretaker found</div>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`walk-search-item ${nearbyMemorialId === m.id ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setQuery('');
                  onSelectPet(m);
                }}
              >
                <span className="walk-search-main">
                  <span>{getSpeciesEmoji(m.species)}</span>
                  <strong>{m.name}</strong>
                  <span className="walk-search-code">{m.locationCode}</span>
                </span>
                <span className="walk-search-sub">
                  {m.space === 'ash-room' ? '🏛️ Ash' : '🌿 Garden'} • by {m.ownerName}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
