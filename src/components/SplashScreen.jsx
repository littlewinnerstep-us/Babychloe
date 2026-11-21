import React, { useEffect, useMemo, useState } from 'react';
import { MEMORIAL_WISDOM_QUOTES } from '../data/memorialData';

export const DEFAULT_SPLASH_ICON = './nevermore-garden-logo.jpg';

export default function SplashScreen({
  splashConfig = {},
  onFinish,
}) {
  const [fading, setFading] = useState(false);

  const quote = useMemo(() => {
    const pool = Array.isArray(MEMORIAL_WISDOM_QUOTES) && MEMORIAL_WISDOM_QUOTES.length > 0
      ? MEMORIAL_WISDOM_QUOTES
      : ['Until we meet again across the sunlit garden gate, they are never truly gone.'];
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const iconUrl = splashConfig?.iconUrl || DEFAULT_SPLASH_ICON;
  const animation = splashConfig?.animation || 'breathing';
  const durationMs = Math.max(1200, Math.min(5000, Number(splashConfig?.durationMs) || 2000));

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), Math.max(500, durationMs - 320));
    const doneTimer = setTimeout(() => onFinish?.(), durationMs);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`splash-screen-overlay ${fading ? 'is-fading' : ''}`}
      role="status"
      aria-label="Loading Nevermore Garden"
      onClick={() => onFinish?.()}
    >
      <div className="splash-content">
        <div className={`splash-icon-frame splash-anim-${animation}`}>
          <img
            src={iconUrl}
            alt="Nevermore Garden"
            onError={(e) => {
              if (e.currentTarget.src !== DEFAULT_SPLASH_ICON) {
                e.currentTarget.src = DEFAULT_SPLASH_ICON;
              }
            }}
          />
        </div>
        <h2 className="splash-title">Nevermore Garden</h2>
        <div className="splash-subtitle">Never Be Forgotten</div>
        <p className="splash-quote">“{quote}”</p>
      </div>
    </div>
  );
}
