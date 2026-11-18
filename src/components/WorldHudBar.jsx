import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  RotateCw,
  Video,
  Users,
  UserCheck,
  Maximize2,
  Minimize2,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import WalkToSearchBar from './WalkToSearchBar';

/**
 * Shared top controls & search bar for 3D and 2D Park worlds.
 * In non-fullscreen mode it sits compactly above the canvas with wrapped actions.
 * In Full Scene mode it floats cleanly inside the top-left of the canvas with a collapsible wrapped menu.
 */
export default function WorldHudBar({
  isFullScreen,
  onToggleFullScreen,
  allMemorials,
  activeSpecies,
  nearbyMemorialId,
  onSelectPet,
  onOpenSpeciesGate,
  onTriggerEmote,
  showMeetupPanel,
  onToggleMeetup,
  mpPeersCount = 0,
  showAvatarPanel,
  onToggleAvatar,
  onOpenUpdateModal,
  cameraControls = null, // { onRotateLeft, onRotateRight, onCycleCamera, cameraLabel } for 3D
}) {
  const [fullMenuOpen, setFullMenuOpen] = useState(false);

  useEffect(() => {
    if (!isFullScreen) setFullMenuOpen(false);
  }, [isFullScreen]);

  const actionsContent = (
    <div className="world-hud-actions">
      <button
        type="button"
        className="btn-ghost"
        data-tour="other-gates"
        onClick={() => {
          onOpenSpeciesGate();
          if (isFullScreen) setFullMenuOpen(false);
        }}
        title="Open another species sanctuary gate"
      >
        ⛩️ Other Gates
      </button>

      {cameraControls && (
        <>
          <button
            type="button"
            className="btn-ghost"
            onClick={cameraControls.onRotateLeft}
            title="Rotate camera left (Q)"
            aria-label="Rotate camera left"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={cameraControls.onRotateRight}
            title="Rotate camera right (R)"
            aria-label="Rotate camera right"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={cameraControls.onCycleCamera}
            title="Switch 3D camera angle"
          >
            <Video size={14} /> {cameraControls.cameraLabel}
          </button>
        </>
      )}

      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          onTriggerEmote('👋', 'Waved hello to visitors');
          if (isFullScreen) setFullMenuOpen(false);
        }}
      >
        👋 Wave
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          onTriggerEmote('🙏', 'Shared a quiet prayer');
          if (isFullScreen) setFullMenuOpen(false);
        }}
      >
        🙏 Pray
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          onTriggerEmote('🌸', 'Scattered gentle petals');
          if (isFullScreen) setFullMenuOpen(false);
        }}
      >
        🌸 Petals
      </button>
      <button
        type="button"
        className={`btn-ghost ${showMeetupPanel ? 'active' : ''}`}
        data-tour="meetup-btn"
        onClick={() => {
          onToggleMeetup();
          if (isFullScreen) setFullMenuOpen(false);
        }}
        title="Live multiplayer meetup, room code & chat"
      >
        <Users size={14} /> 🟢 Meetup ({mpPeersCount + 1})
      </button>
      <button
        type="button"
        className={`btn-ghost ${showAvatarPanel ? 'active' : ''}`}
        data-tour="avatar-btn"
        onClick={() => {
          onToggleAvatar();
          if (isFullScreen) setFullMenuOpen(false);
        }}
      >
        <UserCheck size={14} /> Avatar
      </button>

      {onOpenUpdateModal && isFullScreen && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            onOpenUpdateModal();
            setFullMenuOpen(false);
          }}
          title="Check app build version & updates"
        >
          <RefreshCw size={13} /> Update
        </button>
      )}

      <button
        type="button"
        className="btn-ghost"
        data-tour="fullscreen-btn"
        onClick={onToggleFullScreen}
        title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
      >
        {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {isFullScreen ? 'Exit' : 'Full'}
      </button>
    </div>
  );

  if (isFullScreen) {
    return (
      <div
        className="world-fullscene-menu-overlay"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="world-fullscene-bar-row">
          <button
            type="button"
            className={`world-fullmenu-toggle-btn ${fullMenuOpen ? 'active' : ''}`}
            onClick={() => setFullMenuOpen((v) => !v)}
            aria-expanded={fullMenuOpen}
            aria-label={fullMenuOpen ? 'Close scene menu' : 'Open scene menu'}
          >
            {fullMenuOpen ? <X size={15} /> : <Menu size={15} />}
            <span>Menu</span>
          </button>

          <WalkToSearchBar
            allMemorials={allMemorials}
            activeSpecies={activeSpecies}
            nearbyMemorialId={nearbyMemorialId}
            onSelectPet={onSelectPet}
          />
        </div>

        {fullMenuOpen && (
          <div className="world-fullscene-drawer">{actionsContent}</div>
        )}
      </div>
    );
  }

  return (
    <div className="world-hud-top">
      <div data-tour="walk-search" style={{ display: 'contents' }}>
        <WalkToSearchBar
          allMemorials={allMemorials}
          activeSpecies={activeSpecies}
          nearbyMemorialId={nearbyMemorialId}
          onSelectPet={onSelectPet}
        />
      </div>
      {actionsContent}
    </div>
  );
}
