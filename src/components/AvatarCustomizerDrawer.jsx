import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  AVATAR_STYLES,
  HAIR_STYLES,
  CLOAK_OPTIONS,
  HAIR_OPTIONS,
  getSpeciesEmoji,
} from '../data/memorialData';
import {
  CUSTOMER_FLOWER_PRESETS,
  makeOfferingToken,
  normalizeHex,
} from '../utils/customAssets';

const MOURNING_FLOWER_COLORS = [
  { id: '#f7f5ef', label: 'White Lily' },
  { id: '#f2e2ba', label: 'Warm Cream' },
  { id: '#c8b6e2', label: 'Pale Lavender' },
  { id: '#e3a8b8', label: 'Soft Rose' },
  { id: '#9dc6e8', label: 'Forget-me-not' },
  { id: '#c4d8b6', label: 'Sage Blossom' },
];

export default function AvatarCustomizerDrawer({
  avatar,
  userPets = [],
  onUpdateAvatar,
  customerHold = { flowerEmoji: '🌸', flowerColor: '#ff7eb6', glowOn: true },
  holdFlowerActive = false,
  onSetHoldFlowerActive,
  onUpdateCustomerHold,
  onTriggerEmote,
  onHoldFlowerEmote,
  onClose,
}) {
  const [genderArmTip, setGenderArmTip] = useState('');
  const flowerEmoji = customerHold?.flowerEmoji || '🌸';
  const flowerColor = normalizeHex(customerHold?.flowerColor || avatar?.flowerColor, '#ff7eb6');

  const handleLockedGenderClick = () => {
    setGenderArmTip('Character gender cannot be changed after account creation.');
    setTimeout(() => setGenderArmTip(''), 3200);
  };

  return (
    <div className="world-avatar-drawer" style={{ maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }}>
      <div className="modal-header" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: '0.92rem' }}>Customize Visitor Avatar</strong>
        <button
          type="button"
          className="modal-close"
          style={{ width: 36, height: 36 }}
          onClick={onClose}
          aria-label="Close avatar customizer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="form-grid" style={{ gap: 10 }}>
        <div>
          <div className="field-label">Character Type (Permanent)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`chip ${(avatar.gender || 'girl') !== 'boy' ? 'active' : ''}`}
              onClick={handleLockedGenderClick}
            >
              👩 Girl
            </button>
            <button
              type="button"
              className={`chip ${avatar.gender === 'boy' ? 'active' : ''}`}
              onClick={handleLockedGenderClick}
            >
              👦 Boy
            </button>
          </div>
          {genderArmTip && (
            <div className="armtip-notif" style={{ marginTop: 6 }}>
              {genderArmTip}
            </div>
          )}
        </div>

        <div>
          <div className="field-label">Avatar / Uniform Style</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {AVATAR_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`chip ${(avatar.avatarStyle || 'classic') === st.id ? 'active' : ''}`}
                onClick={() => onUpdateAvatar({ avatarStyle: st.id })}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Hair Model</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {HAIR_STYLES.map((hs) => (
              <button
                key={hs.id}
                type="button"
                className={`chip ${(avatar.hairStyle || (avatar.gender === 'boy' ? 'short' : 'long')) === hs.id ? 'active' : ''}`}
                onClick={() => onUpdateAvatar({ hairStyle: hs.id })}
              >
                {hs.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Uniform / Cloak Color</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CLOAK_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={`Cloak color ${c.label}`}
                onClick={() => onUpdateAvatar({ cloakColor: c.color })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: c.color,
                  border:
                    avatar.cloakColor === c.color
                      ? '2.5px solid #ffd57e'
                      : '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Hair Color</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {HAIR_OPTIONS.map((h) => (
              <button
                key={h.id}
                type="button"
                title={h.label}
                aria-label={`Hair color ${h.label}`}
                onClick={() => onUpdateAvatar({ hairColor: h.color })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: h.color,
                  border:
                    avatar.hairColor === h.color
                      ? '2.5px solid #ffd57e'
                      : '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Your Spirit Pet Companion</div>
          {userPets.length === 0 ? (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              None — Enshrine your own pet in the park first to unlock their Spirit Pet companion.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {userPets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className={`chip ${avatar.companionPetId === pet.id ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateAvatar({
                      companionPetId: pet.id,
                      companion: getSpeciesEmoji(pet.species),
                    })
                  }
                >
                  {getSpeciesEmoji(pet.species)} {pet.name}
                </button>
              ))}
              <button
                type="button"
                className={`chip ${!avatar.companionPetId || avatar.companion === 'none' ? 'active' : ''}`}
                onClick={() => onUpdateAvatar({ companionPetId: '', companion: 'none' })}
              >
                None
              </button>
            </div>
          )}
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={avatar.carryingLantern}
            onChange={(e) => onUpdateAvatar({ carryingLantern: e.target.checked })}
          />
          Carry lantern (night) / mourning flower (morning &amp; dusk)
        </label>

        <div
          style={{
            borderTop: '1px solid rgba(154, 184, 159, 0.2)',
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="field-label">🎨 Color Flower &amp; Hex Menu</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {CUSTOMER_FLOWER_PRESETS.map((cf) => (
              <button
                key={cf.emoji}
                type="button"
                className={`chip ${flowerEmoji === cf.emoji ? 'active' : ''}`}
                style={{ padding: '3px 8px' }}
                title={cf.label}
                onClick={() => onUpdateCustomerHold?.({ flowerEmoji: cf.emoji })}
              >
                {cf.emoji}
              </button>
            ))}
          </div>

          <div className="swatch-row">
            {MOURNING_FLOWER_COLORS.map((fc) => (
              <button
                key={fc.id}
                type="button"
                className={`color-swatch ${flowerColor === fc.id ? 'active' : ''}`}
                style={{ background: fc.id }}
                title={fc.label}
                onClick={() => {
                  onUpdateAvatar?.({ flowerColor: fc.id });
                  onUpdateCustomerHold?.({ flowerColor: fc.id });
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={flowerColor}
              onChange={(e) => {
                onUpdateAvatar?.({ flowerColor: e.target.value });
                onUpdateCustomerHold?.({ flowerColor: e.target.value });
              }}
              style={{ width: 30, height: 26, borderRadius: 6, cursor: 'pointer' }}
              title="Pick custom flower hex color"
            />
            <input
              type="text"
              maxLength={7}
              value={customerHold?.flowerColor || flowerColor}
              onChange={(e) => onUpdateCustomerHold?.({ flowerColor: e.target.value })}
              onBlur={() => {
                const normalized = normalizeHex(customerHold?.flowerColor, '#ff7eb6');
                onUpdateAvatar?.({ flowerColor: normalized });
                onUpdateCustomerHold?.({ flowerColor: normalized });
              }}
              className="input-control"
              style={{ flex: 1, fontFamily: 'monospace', padding: '4px 8px', fontSize: '0.78rem' }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={customerHold?.glowOn !== false}
              onChange={(e) => onUpdateCustomerHold?.({ glowOn: e.target.checked })}
            />
            ✨ Soft glow on held flower
          </label>

          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.78rem', padding: '7px 10px', justifyContent: 'center' }}
            onClick={() => {
              const nextHold = !holdFlowerActive;
              onSetHoldFlowerActive?.(nextHold);
              if (nextHold) {
                onTriggerEmote?.(
                  makeOfferingToken({ emoji: flowerEmoji, color: flowerColor }),
                  `Holding ${flowerEmoji} (${flowerColor})`
                );
                onHoldFlowerEmote?.();
              }
            }}
          >
            {holdFlowerActive ? `✓ Holding ${flowerEmoji} in Hand` : `✋ Hold ${flowerEmoji} in Hand`}
          </button>
        </div>
      </div>
    </div>
  );
}
