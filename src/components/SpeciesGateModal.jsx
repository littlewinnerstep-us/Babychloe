import React from 'react';
import { X, DoorOpen } from 'lucide-react';
import { SPECIES_LIST } from '../data/memorialData';

export default function SpeciesGateModal({
  activeSpecies,
  allMemorials = [],
  onSelectSpecies,
  onClose,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: 0 }}>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
            gap: 8,
            maxHeight: '58vh',
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {SPECIES_LIST.map((sp) => {
            const count = allMemorials.filter((m) => (m.species || 'Dog') === sp.id).length;
            const isActive = activeSpecies === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                className={`style-option ${isActive ? 'active' : ''}`}
                style={{ textAlign: 'left', padding: '10px 12px' }}
                onClick={() => {
                  onSelectSpecies(sp.id);
                  onClose();
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
