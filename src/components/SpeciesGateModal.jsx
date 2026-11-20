import React, { useState, useMemo } from 'react';
import { X, DoorOpen, Search } from 'lucide-react';
import { getAllSpeciesList } from '../data/memorialData';

export default function SpeciesGateModal({
  activeSpecies,
  allMemorials = [],
  onSelectSpecies,
  onClose,
}) {
  const [filterText, setFilterText] = useState('');
  const [confirmSpecies, setConfirmSpecies] = useState(null);
  const allSpecies = getAllSpeciesList();

  const filteredSpecies = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return allSpecies;
    return allSpecies.filter((sp) => sp.label.toLowerCase().includes(q));
  }, [filterText, allSpecies]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', margin: 0 }}>
              ⛩️ Species Sanctuary Gate
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Each pet species rests in its own dedicated Tombstone Garden &amp; Ash Room
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close gate">
            <X size={18} />
          </button>
        </div>

        {confirmSpecies && (
          <div
            role="dialog"
            aria-label={`Move to ${confirmSpecies.label} Gates?`}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(10, 16, 13, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmSpecies(null);
            }}
          >
            <div
              className="armtip-notif"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 360,
                width: '100%',
                padding: '18px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 14,
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                ⛩️ Move to <strong>{confirmSpecies.emoji} {confirmSpecies.label} Gates</strong>?
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.86rem' }}
                  onClick={() => {
                    const chosenId = confirmSpecies.id;
                    setConfirmSpecies(null);
                    onSelectSpecies(chosenId);
                    onClose();
                  }}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '8px 20px', fontSize: '0.86rem' }}
                  onClick={() => setConfirmSpecies(null)}
                >
                  ✖️ No
                </button>
              </div>
            </div>
          </div>
        )}

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
            placeholder="Filter species gate (e.g. Snake, Otter, Dog, Large Pet)..."
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
            gap: 8,
            maxHeight: '56vh',
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {filteredSpecies.map((sp) => {
            const count = allMemorials.filter((m) => (m.species || 'Dog') === sp.id).length;
            const isActive = activeSpecies === sp.id;
            const isConfirming = confirmSpecies?.id === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                className={`style-option ${isActive || isConfirming ? 'active' : ''}`}
                style={{ textAlign: 'left', padding: '10px 12px' }}
                onClick={() => {
                  if (isActive) {
                    onClose();
                    return;
                  }
                  setConfirmSpecies(sp);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <strong style={{ fontSize: '0.86rem' }}>
                    {sp.emoji} {sp.label}
                  </strong>
                  {isActive && <DoorOpen size={13} />}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  {count} {count === 1 ? 'companion' : 'companions'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
