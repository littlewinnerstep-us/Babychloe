import React from 'react';
import { resolveOfferingToken, resolveStyle } from '../utils/customAssets';

function isImageSrc(val) {
  const s = String(val || '').trim();
  return s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') || s.startsWith('./');
}

function UrnArtwork({ styleId, customPrimary }) {
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

function OfferingTokens({ activeOfferings = [], adminAssets = [] }) {
  const items = (Array.isArray(activeOfferings) ? activeOfferings : []).slice(0, 6);
  return (
    <>
      {items.map((rawToken, idx) => {
        const tok = resolveOfferingToken(rawToken, adminAssets);
        const isCandle = tok.emoji === '🕯️';
        const isIncense = tok.emoji === '🪔';
        const effectClasses = (tok.effects || []).map((id) => `fx-${id}`);
        const cls = [
          'offering-token',
          isCandle ? 'candle-glow' : '',
          isIncense ? 'incense-smoke' : '',
          tok.glowOn ? 'fx-glow' : '',
          ...effectClasses,
        ]
          .filter(Boolean)
          .join(' ');
        const style = {
          ...(tok.color ? { '--fx-glow': tok.glowColor || tok.color, filter: tok.glowOn ? `drop-shadow(0 0 ${Math.round((tok.glowStrength || 0.6) * 10)}px ${tok.glowColor || tok.color})` : undefined } : {}),
        };
        return (
          <span key={`${rawToken}-${idx}`} className={cls} style={style} title={tok.label}>
            {tok.imageUrl ? (
              <img className="custom-offering-img" src={tok.imageUrl} alt={tok.label} />
            ) : (
              tok.emoji
            )}
          </span>
        );
      })}
    </>
  );
}

export default function MonumentVisual({ memorial, mode = 'compact', adminAssets = [] }) {
  const birthYear = memorial.birthDate ? memorial.birthDate.slice(0, 4) : '—';
  const passedYear = memorial.passedDate ? memorial.passedDate.slice(0, 4) : '—';
  const yearsLabel = memorial.years || `${birthYear} – ${passedYear}`;
  const resolved = resolveStyle(memorial.styleId, adminAssets, memorial);
  const fxClasses = [
    resolved.glowOn ? 'fx-glow' : '',
    ...(resolved.effects || []).map((e) => `fx-${e}`),
  ]
    .filter(Boolean)
    .join(' ');
  const customStageVars = {
    '--fx-glow': resolved.glowColor || '#f5d076',
    '--fx-glow-px': `${Math.round((resolved.glowStrength || 0.65) * 24)}px`,
  };
  const customSurfaceStyle = {
    ...(resolved.primaryColor
      ? {
          background: `linear-gradient(165deg, ${resolved.primaryColor}, ${resolved.accentColor || resolved.primaryColor})`,
          borderColor: resolved.accentColor || resolved.primaryColor,
        }
      : {}),
    ...customStageVars,
  };

  if (memorial.space === 'ash-room') {
    return (
      <div className={`monument-stage stage-ash-room ${mode}`}>
        <div
          className={`niche-alcove ${fxClasses}`}
          style={{
            ...(resolved.primaryColor ? { borderColor: resolved.accentColor || resolved.primaryColor } : {}),
            ...customStageVars,
          }}
        >
          <div className="niche-spotlight" />
          <div className="niche-row">
            <div className="niche-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isImageSrc(memorial.photo) ? (
                <img src={memorial.photo} alt={memorial.name} />
              ) : (
                <span style={{ fontSize: mode === 'full' ? '2rem' : '1.4rem' }}>{memorial.photo || '⚱️'}</span>
              )}
            </div>
            {resolved.imageUrl ? (
              <img
                src={resolved.imageUrl}
                alt={resolved.name || 'Custom Urn'}
                style={{ width: mode === 'full' ? 70 : 50, height: mode === 'full' ? 84 : 62, objectFit: 'cover', borderRadius: 10 }}
              />
            ) : (
              <UrnArtwork styleId={memorial.styleId || 'celadon-urn'} customPrimary={resolved.primaryColor} />
            )}
          </div>
          <div className="niche-plaque">
            {memorial.name} • {yearsLabel}
          </div>
        </div>
        <div className="niche-shelf">
          <OfferingTokens activeOfferings={memorial.activeOfferings} adminAssets={adminAssets} />
        </div>
      </div>
    );
  }

  const stoneClass = `tombstone-stone stone-${memorial.styleId || 'classic-granite'} ${fxClasses}`;

  return (
    <div className={`monument-stage stage-tombstone ${mode}`}>
      <div className="stage-stars" />
      <div className={stoneClass} style={customSurfaceStyle}>
        {resolved.imageUrl ? (
          <img className="stone-portrait" src={resolved.imageUrl} alt={memorial.name} />
        ) : isImageSrc(memorial.photo) ? (
          <img className="stone-portrait" src={memorial.photo} alt={memorial.name} />
        ) : (
          <div className="stone-portrait" style={{ display: 'grid', placeItems: 'center', fontSize: mode === 'full' ? '1.8rem' : '1.3rem', background: 'rgba(255,255,255,0.22)' }}>
            {memorial.photo || '🕊️'}
          </div>
        )}
        <div className="stone-name">{memorial.name}</div>
        <div className="stone-years">{yearsLabel}</div>
      </div>
      <div className="meadow-base">
        <OfferingTokens activeOfferings={memorial.activeOfferings} adminAssets={adminAssets} />
      </div>
    </div>
  );
}
