import React from 'react';

function UrnArtwork({ styleId }) {
  if (styleId === 'warm-cherrywood') {
    return (
      <svg className="urn-svg" viewBox="0 0 80 100" aria-hidden="true">
        <defs>
          <linearGradient id="cherryWood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c47c56" />
            <stop offset="55%" stopColor="#8d4b2d" />
            <stop offset="100%" stopColor="#5a2c18" />
          </linearGradient>
        </defs>
        <rect x="14" y="34" width="52" height="50" rx="6" fill="url(#cherryWood)" stroke="#e4b77d" strokeWidth="2" />
        <path d="M10 34 L40 22 L70 34 Z" fill="#a25a37" stroke="#e4b77d" strokeWidth="2" />
        <rect x="28" y="50" width="24" height="14" rx="2" fill="#e5c37a" />
        <circle cx="40" cy="57" r="3" fill="#5a2c18" />
        <rect x="10" y="84" width="60" height="8" rx="3" fill="#472111" />
      </svg>
    );
  }

  const palette = {
    'celadon-urn': { top: '#b8dac6', mid: '#78a58b', base: '#4f7660', rim: '#e4c37b' },
    'gilded-lotus': { top: '#f4d58d', mid: '#c6933d', base: '#7d561b', rim: '#fff1c1' },
    'starlight-glass': { top: '#cbe3ff', mid: '#78a9ea', base: '#3d68a8', rim: '#eef6ff' },
  }[styleId] || { top: '#b8dac6', mid: '#78a58b', base: '#4f7660', rim: '#e4c37b' };

  const gradId = `urnGrad-${styleId}`;

  return (
    <svg className="urn-svg" viewBox="0 0 80 100" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.top} />
          <stop offset="60%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.base} />
        </linearGradient>
      </defs>
      <circle cx="40" cy="14" r="5" fill={palette.rim} />
      <path d="M26 24 Q40 16 54 24 L50 30 L30 30 Z" fill={palette.rim} />
      <path
        d="M28 30 C14 40 14 66 26 84 L54 84 C66 66 66 40 52 30 Z"
        fill={`url(#${gradId})`}
        stroke={palette.rim}
        strokeWidth="1.8"
      />
      <ellipse cx="40" cy="48" rx="14" ry="2.5" fill="none" stroke={palette.rim} strokeOpacity="0.65" strokeWidth="1.4" />
      <rect x="23" y="84" width="34" height="8" rx="3" fill={palette.rim} />
    </svg>
  );
}

function OfferingTokens({ activeOfferings = [] }) {
  const items = (Array.isArray(activeOfferings) ? activeOfferings : []).slice(0, 6);
  return (
    <>
      {items.map((emoji, idx) => {
        const isCandle = emoji === '🕯️';
        const isIncense = emoji === '🪔';
        const cls = [
          'offering-token',
          isCandle ? 'candle-glow' : '',
          isIncense ? 'incense-smoke' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <span key={`${emoji}-${idx}`} className={cls}>
            {emoji}
          </span>
        );
      })}
    </>
  );
}

export default function MonumentVisual({ memorial, mode = 'compact' }) {
  const birthYear = memorial.birthDate ? memorial.birthDate.slice(0, 4) : '—';
  const passedYear = memorial.passedDate ? memorial.passedDate.slice(0, 4) : '—';
  const yearsLabel = `${birthYear} – ${passedYear}`;

  if (memorial.space === 'ash-room') {
    return (
      <div className={`monument-stage stage-ash-room ${mode}`}>
        <div className="niche-alcove">
          <div className="niche-spotlight" />
          <div className="niche-row">
            <div className="niche-frame">
              <img src={memorial.photo} alt={memorial.name} />
            </div>
            <UrnArtwork styleId={memorial.styleId || 'celadon-urn'} />
          </div>
          <div className="niche-plaque">
            {memorial.name} • {yearsLabel}
          </div>
        </div>
        <div className="niche-shelf">
          <OfferingTokens activeOfferings={memorial.activeOfferings} />
        </div>
      </div>
    );
  }

  const stoneClass = `tombstone-stone stone-${memorial.styleId || 'classic-granite'}`;

  return (
    <div className={`monument-stage stage-tombstone ${mode}`}>
      <div className="stage-stars" />
      <div className={stoneClass}>
        <img className="stone-portrait" src={memorial.photo} alt={memorial.name} />
        <div className="stone-name">{memorial.name}</div>
        <div className="stone-years">{yearsLabel}</div>
      </div>
      <div className="meadow-base">
        <OfferingTokens activeOfferings={memorial.activeOfferings} />
      </div>
    </div>
  );
}
