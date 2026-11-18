import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const TOUR_STEPS = [
  {
    selector: '[data-tour="notif-bell"]',
    icon: '🔔',
    title: 'Notifications',
    desc: 'Read Sanctuary announcements, incoming 24-hour Friend Requests (Accept or Ignore), and Group Chat invites.',
  },
  {
    selector: '[data-tour="sound-toggle"]',
    icon: '🎵',
    title: 'Music & Sound Toggle',
    desc: 'Quickly turn background music and ambient sanctuary sound ON or OFF.',
  },
  {
    selector: '[data-tour="update-btn"]',
    icon: '🔄',
    title: 'Check App Updates',
    desc: 'View your current build version and refresh to get the latest Evergreen Paws release.',
  },
  {
    selector: '[data-tour="env-controls"]',
    icon: '🌅',
    title: 'Time, Season & Weather',
    desc: 'Switch Morning, Dusk, or Night lighting, change Seasons (Spring–Winter), and toggle Weather effects.',
  },
  {
    selector: '[data-tour="volume-btn"]',
    icon: '🔊',
    title: 'Volume Mixer & Tips Switch',
    desc: 'Adjust Master (default 100%) and individual effect sounds (default 30%), reset defaults, or toggle guide tips.',
  },
  {
    selector: '[data-tour="view-mode"]',
    icon: '🧊',
    title: '3D / 2D / Cards View',
    desc: 'Switch smoothly between 3D World, 2D World, and Cards without losing your character spot.',
  },
  {
    selector: '[data-tour="walk-search"]',
    icon: '🔎',
    title: 'Find & Walk to a Pet',
    desc: 'Search any beloved pet by name and tap their result to auto-walk straight to their plot or niche.',
  },
  {
    selector: '[data-tour="other-gates"]',
    icon: '⛩️',
    title: 'Other Species Gates',
    desc: 'Travel through the Sanctuary Gate to visit Dog, Cat, Bird, Rabbit, and other pet species gates.',
  },
  {
    selector: '[data-tour="meetup-btn"]',
    icon: '🟢',
    title: 'Live Meetup, Friends & Groups',
    desc: 'See visitors in your gate, add friends, join private Group Chats, or tap any visitor to walk near them.',
  },
  {
    selector: '[data-tour="avatar-btn"]',
    icon: '👤',
    title: 'Avatar & Companion',
    desc: 'Customize your cloak, hairstyle, lantern, and walking spirit companion.',
  },
  {
    selector: '[data-tour="fullscreen-btn"]',
    icon: '⛶',
    title: 'Full Screen Scene',
    desc: 'Expand the memorial park to full screen on Desktop, Mobile Web, or APK.',
  },
  {
    selector: '[data-tour="outside-chat"]',
    icon: '💬',
    title: 'Outside Chat Filter',
    desc: 'Show or hide public sanctuary messages while keeping your private Group Chat visible.',
  },
  {
    selector: '[data-tour="favorites-btn"]',
    icon: '💖',
    title: 'Favorite Memorials',
    desc: 'Open your favorited pet memorials to jump or walk directly to their vigil.',
  },
  {
    selector: '[data-tour="camera-btn"]',
    icon: '🎥',
    title: '3D Camera Controls',
    desc: 'Rotate left/right or cycle Follow, Close, and Overview camera angles (automatically remembered).',
  },
  {
    selector: '[data-tour="plot-list-btn"]',
    icon: '🪦',
    title: 'Plot & Niche Directory',
    desc: 'Browse or search all 200 Tombstone Plots or Ash Room Niches and auto-walk directly to any slot.',
  },
  {
    selector: '[data-tour="zoom-btn"]',
    icon: '🔍',
    title: 'Zoom View Icon',
    desc: 'Tap the Zoom icon anytime to adjust from 1× close view up to All 200 plots (automatically remembered).',
  },
  {
    selector: '[data-tour="chat-bar"]',
    icon: '🗨️',
    title: 'Chat & Scroll History',
    desc: 'Send messages to visitors in the same gate and scroll upward to read past chat messages.',
  },
];

function isElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export default function FirstVisitGuide({ isOpen, onComplete, onSkip, onTurnTipsOff }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [visibleSteps, setVisibleSteps] = useState([]);

  // Scan visible [data-tour] icons whenever the guide opens
  useEffect(() => {
    if (!isOpen) return;
    const scan = () => {
      const matched = TOUR_STEPS.filter((s) => isElementVisible(document.querySelector(s.selector)));
      setVisibleSteps(matched.length > 0 ? matched : TOUR_STEPS.slice(0, 1));
    };
    const t = setTimeout(scan, 160);
    window.addEventListener('resize', scan);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', scan);
    };
  }, [isOpen]);

  const activeStep = visibleSteps[Math.min(stepIdx, Math.max(0, visibleSteps.length - 1))] || null;

  useLayoutEffect(() => {
    if (!isOpen || !activeStep) {
      setTargetRect(null);
      return undefined;
    }
    const updateRect = () => {
      const el = document.querySelector(activeStep.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.top < 16 || r.bottom > window.innerHeight - 16) {
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          // ignore
        }
      }
      setTargetRect({
        top: Math.max(4, r.top - 5),
        left: Math.max(4, r.left - 5),
        width: r.width + 10,
        height: r.height + 10,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
      });
    };
    updateRect();
    const timer = setTimeout(updateRect, 220);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, activeStep, stepIdx]);

  const bubblePos = useMemo(() => {
    if (typeof window === 'undefined') return { top: 90, left: 16 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(320, vw - 24);
    const cardH = 190;
    if (!targetRect) {
      return {
        top: Math.max(20, Math.round((vh - cardH) / 2)),
        left: Math.max(12, Math.round((vw - cardW) / 2)),
      };
    }
    const spaceBelow = vh - (targetRect.top + targetRect.height);
    let top;
    if (spaceBelow >= cardH + 18) {
      top = targetRect.top + targetRect.height + 12;
    } else if (targetRect.top >= cardH + 18) {
      top = targetRect.top - cardH - 12;
    } else {
      top = Math.max(12, Math.min(vh - cardH - 12, targetRect.cy - cardH / 2));
    }
    const left = Math.max(12, Math.min(vw - cardW - 12, targetRect.cx - cardW / 2));
    return { top: Math.round(top), left: Math.round(left) };
  }, [targetRect]);

  if (!isOpen || !activeStep) return null;

  const total = visibleSteps.length;
  const clampedIdx = Math.min(stepIdx, total - 1);
  const isLast = clampedIdx >= total - 1;

  const handleFinish = () => {
    if (dontShowAgain) {
      onTurnTipsOff();
    } else {
      onComplete();
    }
  };

  const handleSkipClick = () => {
    if (dontShowAgain) {
      onTurnTipsOff();
    } else {
      onSkip();
    }
  };

  return (
    <div
      className="first-visit-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="First visit park icon guide"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {targetRect && (
        <div
          className="first-visit-guide-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <div
        className="armtip-notif first-visit-guide-card"
        style={{
          top: bubblePos.top,
          left: bubblePos.left,
        }}
      >
        <div className="first-visit-guide-head">
          <span className="first-visit-guide-title">
            {activeStep.icon} {activeStep.title}
          </span>
          <span className="first-visit-guide-step">
            {clampedIdx + 1} / {total}
          </span>
          <button
            type="button"
            className="first-visit-guide-close"
            onClick={handleSkipClick}
            aria-label="Skip guide"
            title="Skip guide"
          >
            <X size={13} />
          </button>
        </div>

        <p className="first-visit-guide-desc">{activeStep.desc}</p>

        <label className="first-visit-guide-toggle">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span>Turn tips off (don&apos;t show tips)</span>
        </label>

        <div className="first-visit-guide-actions">
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '4px 9px', fontSize: '0.72rem' }}
            onClick={() => onTurnTipsOff()}
          >
            Turn Tips Off
          </button>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {clampedIdx > 0 && (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '4px 9px', fontSize: '0.72rem' }}
              onClick={handleSkipClick}
            >
              Skip
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '4px 11px', fontSize: '0.74rem' }}
              onClick={() => {
                if (isLast) handleFinish();
                else setStepIdx((i) => Math.min(total - 1, i + 1));
              }}
            >
              {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
