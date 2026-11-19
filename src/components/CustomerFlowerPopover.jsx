import React, { useState } from 'react';
import { CUSTOMER_FLOWER_PRESETS, makeOfferingToken, normalizeHex } from '../utils/customAssets';

export default function CustomerFlowerPopover({
  mobileHud = false,
  customerHold,
  holdFlowerActive,
  onSetHoldFlowerActive,
  onUpdateCustomerHold,
  onTriggerEmote,
  onHoldFlowerEmote,
}) {
  const [open, setOpen] = useState(false);
  const emoji = customerHold?.flowerEmoji || '🌸';
  const color = normalizeHex(customerHold?.flowerColor, '#ff7eb6');

  return (
    <div
      style={{
        position: 'absolute',
        right: mobileHud ? 12 : 16,
        bottom: mobileHud ? 132 : 158,
        zIndex: 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      <button
        type="button"
        className="btn-secondary"
        style={{
          padding: '6px 10px',
          fontSize: '0.76rem',
          borderRadius: 999,
          borderColor: color,
          boxShadow: holdFlowerActive ? `0 0 12px ${color}` : undefined,
        }}
        onClick={() => setOpen((v) => !v)}
        title="Customer Flower & Hex Color Menu"
      >
        {emoji} Color Flower
      </button>
      {open && (
        <div
          style={{
            background: 'rgba(14, 22, 18, 0.94)',
            border: '1px solid rgba(154, 184, 159, 0.35)',
            borderRadius: 12,
            padding: 10,
            width: 230,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f3d98b', display: 'flex', justifyContent: 'space-between' }}>
            <span>🎨 Customer Flower Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {CUSTOMER_FLOWER_PRESETS.map((cf) => (
              <button
                key={cf.emoji}
                type="button"
                className={`chip-btn ${emoji === cf.emoji ? 'active' : ''}`}
                style={{ padding: '2px 6px' }}
                onClick={() => onUpdateCustomerHold?.({ flowerEmoji: cf.emoji })}
              >
                {cf.emoji}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => onUpdateCustomerHold?.({ flowerColor: e.target.value })}
              style={{ width: 28, height: 24, borderRadius: 6, cursor: 'pointer' }}
            />
            <input
              type="text"
              maxLength={7}
              value={customerHold?.flowerColor || '#ff7eb6'}
              onChange={(e) => onUpdateCustomerHold?.({ flowerColor: e.target.value })}
              onBlur={() => onUpdateCustomerHold?.({ flowerColor: color })}
              className="input-control"
              style={{ flex: 1, fontFamily: 'monospace', padding: '3px 6px', fontSize: '0.76rem' }}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.75rem', padding: '5px 8px', justifyContent: 'center' }}
            onClick={() => {
              const nextHold = !holdFlowerActive;
              onSetHoldFlowerActive?.(nextHold);
              if (nextHold) {
                onTriggerEmote?.(makeOfferingToken({ emoji, color }), `Holding ${emoji} (${color})`);
                onHoldFlowerEmote?.();
              }
            }}
          >
            {holdFlowerActive ? '✓ Holding Customer Flower' : `✋ Hold ${emoji} in Hand`}
          </button>
        </div>
      )}
    </div>
  );
}
