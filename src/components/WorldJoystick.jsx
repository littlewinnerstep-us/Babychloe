import React, { useRef, useState } from 'react';

const JOYSTICK_RADIUS = 34;
const DEADZONE = 0.12;

/**
 * Analog 360-degree touch joystick for mobile APK walk controls,
 * paired with a compact lantern emote button beside it.
 */
export default function WorldJoystick({ onMove, onEmote, atmosphere = 'night' }) {
  const isFlowerTime = atmosphere === 'morning' || atmosphere === 'dusk';
  const baseRef = useRef(null);
  const pointerIdRef = useRef(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const emitMove = (dx, dy) => {
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(JOYSTICK_RADIUS, dist);
    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: clampedX, y: clampedY });

    const norm = clampedDist / JOYSTICK_RADIUS;
    if (norm < DEADZONE) {
      onMove(0, 0);
      return;
    }
    const scaled = (norm - DEADZONE) / (1 - DEADZONE);
    onMove(Math.cos(angle) * scaled, Math.sin(angle) * scaled);
  };

  const updateFromClientPos = (clientX, clientY) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    emitMove(clientX - cx, clientY - cy);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
    }
    pointerIdRef.current = e.pointerId;
    setDragging(true);
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    e.stopPropagation();
    if (pointerIdRef.current !== e.pointerId) return;
    updateFromClientPos(e.clientX, e.clientY);
  };

  const releaseJoystick = (e) => {
    e.stopPropagation();
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      className="world-joystick-wrap"
      aria-label="Joystick walk control"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={baseRef}
        className={`world-joystick-base ${dragging ? 'is-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
      >
        <div
          className="world-joystick-knob"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {onEmote && (
        <button
          type="button"
          className="world-joystick-lantern-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEmote();
          }}
          aria-label={isFlowerTime ? 'Hold mourning flower' : 'Hold lantern light'}
          title={isFlowerTime ? 'Hold mourning flower' : 'Hold lantern light'}
        >
          {isFlowerTime ? '🌸' : '🏮'}
        </button>
      )}
    </div>
  );
}
