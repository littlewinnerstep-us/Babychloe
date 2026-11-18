import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  DoorOpen,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  OFFERING_TYPES,
  getSpeciesEmoji,
  GARDEN_NPCS_DATA,
  ASH_NPCS_DATA,
  getUserIdentityKey,
  isMemorialOwner,
} from '../data/memorialData';
import {
  hasGivenToday,
  recordGivenToday,
  getDailyLimitNotice,
} from '../utils/dailyLimits';
import {
  updateLocalPresence,
  getPeersMap,
  getLocalChatBubble,
  getLocalSpawnOffset,
} from '../utils/multiplayerEngine';
import {
  drawAvatar2D,
  drawWrappedSpeechBubble,
  drawCachedPetPortrait,
} from '../utils/avatarRenderer';
import MultiplayerMeetupHUD from './MultiplayerMeetupHUD';
import AvatarCustomizerDrawer from './AvatarCustomizerDrawer';
import SpeciesGateModal from './SpeciesGateModal';
import WorldJoystick from './WorldJoystick';
import WorldHudBar from './WorldHudBar';

const AVATAR_STORAGE_KEY = 'evergreen_paws_avatar_v1';

const DEFAULT_AVATAR = {
  gender: 'girl',
  avatarStyle: 'classic',
  hairStyle: 'long',
  cloakColor: '#b86578',
  hairColor: '#2c221e',
  companion: 'none',
  companionPetId: '',
  carryingLantern: true,
};

function loadAvatarPrefs() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_AVATAR, ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_AVATAR;
}

const CENTER_X = 1400;
const GATE_X = 2720;

const WORLD_BOUNDS = {
  tombstone: { width: 2800, height: 820, portalX: CENTER_X, portalY: 90 },
  'ash-room': { width: 2800, height: 820, portalX: CENTER_X, portalY: 90 },
};

// 10 tombs max on left row + 10 tombs max on right row = 20 per row (10 rows = 200 max)
// 120px column spacing & 240px row spacing leaves ~1 full tomb plot of breathing room between plots
const COLS_2D = [
  140, 260, 380, 500, 620, 740, 860, 980, 1100, 1220,
  1580, 1700, 1820, 1940, 2060, 2180, 2300, 2420, 2540, 2660,
];

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function ParkWorld2D({
  isApk = false,
  isMobileHud = false,
  onOpenUpdateModal,
  memorials,
  allMemorials = [],
  activeSpecies = 'Dog',
  onSelectSpecies,
  onOpenSpeciesGate,
  currentUser,
  characterGender,
  atmosphere,
  season = 'spring',
  weather = 'clear',
  activeRoom,
  walkToRoomRequest = null,
  onClearWalkToRoomRequest,
  walkToSpeciesRequest = null,
  onClearWalkToSpeciesRequest,
  walkToMemorialRequest = null,
  onClearWalkToMemorialRequest,
  mpPeers = [],
  mpStatus = 'connecting',
  mpOnline = true,
  mpRoomCode = 'PUBLIC',
  mpNickname = 'Visitor',
  mpChatLog = [],
  activeGroup = null,
  groupChatLog = [],
  showOutsideChat = true,
  favorites = [],
  showOnlyFavorites = false,
  friends = [],
  friendRequests = { incoming: [], outgoing: [] },
  groupInvites = [],
  accountsList = [],
  remoteWorldEvent = null,
  onToggleMpOnline,
  onToggleOutsideChat,
  onToggleShowFavorites,
  onToggleFavorite,
  onToggleFriend,
  onAcceptFriendRequest,
  onIgnoreFriendRequest,
  onCancelFriendRequest,
  onInviteFriendToGroup,
  onAcceptInvite,
  onIgnoreInvite,
  onSendChat,
  onSendGroupChat,
  onCreateGroup,
  onJoinGroup,
  onExitGroup,
  onSendEmote,
  onChangeMpRoom,
  moderationStatus = {},
  onChangeRoom,
  onSelectMemorial,
  onRecordVisit,
  onPerformOffering,
  onLightningStrike,
  onRequireLogin,
}) {
  const canvasRef = useRef(null);
  const [avatar, setAvatar] = useState(loadAvatarPrefs);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  const [showMeetupPanel, setShowMeetupPanel] = useState(false);
  const [showSpeciesGate, setShowSpeciesGate] = useState(false);
  const [nearbyMemorialId, setNearbyMemorialId] = useState(null);
  const [inspectedId, setInspectedId] = useState(null);
  const [armtipText, setArmtipText] = useState('');
  const [nearPortal, setNearPortal] = useState(false);
  const [nearSpeciesGate, setNearSpeciesGate] = useState(false);
  const [walkMessage, setWalkMessage] = useState('');
  const [walkTipVisible, setWalkTipVisible] = useState(true);
  const [zoomOverview, setZoomOverview] = useState(0); // 0 = current view, 100 = full 200-plot overview
  const zoomOverviewRef = useRef(0);
  zoomOverviewRef.current = zoomOverview;
  const activeZoomRef = useRef(1);
  const nativeFsRef = useRef(false);

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) {
          const el = document.documentElement;
          if (el.requestFullscreen) {
            el.requestFullscreen().then(() => { nativeFsRef.current = true; }).catch(() => {});
          } else if (el.webkitRequestFullscreen) {
            try { el.webkitRequestFullscreen(); nativeFsRef.current = true; } catch {}
          }
        } else if (document.fullscreenElement || document.webkitFullscreenElement) {
          nativeFsRef.current = false;
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if (document.webkitExitFullscreen) {
            try { document.webkitExitFullscreen(); } catch {}
          }
        }
      }
      return next;
    });
  };

  const pendingOpenGateRef = useRef(false);
  const pendingTargetSpeciesRef = useRef(null);
  const speciesRef = useRef(activeSpecies);
  const onSelectSpeciesRef = useRef(onSelectSpecies);
  onSelectSpeciesRef.current = onSelectSpecies;
  const openSpeciesGateRef = useRef(null);

  const openSpeciesGate = () => {
    if (onOpenSpeciesGate) onOpenSpeciesGate();
    else setShowSpeciesGate(true);
  };
  openSpeciesGateRef.current = openSpeciesGate;

  const startWalkToSpeciesGate = (targetSpecies) => {
    if (!targetSpecies || targetSpecies === speciesRef.current) return;
    const p = playerRef.current;
    setInspectedId(null);
    pendingOpenGateRef.current = false;
    pendingOpenIdRef.current = null;
    pendingTargetSpeciesRef.current = targetSpecies;
    p.targetMemorialId = null;
    if (Math.hypot(p.x - GATE_X, p.y - 410) < 54) {
      p.x = GATE_X - 115;
      p.y = 410;
    }
    p.targetX = GATE_X;
    p.targetY = 410;
    setWalkMessage(`Walking to ${getSpeciesEmoji(targetSpecies)} ${targetSpecies} Gates...`);
    setTimeout(() => setWalkMessage(''), 2600);
  };

  const walkOrOpenSpeciesGate = () => {
    setInspectedId(null);
    pendingOpenIdRef.current = null;
    if (nearGateRef.current) {
      pendingOpenGateRef.current = false;
      openSpeciesGate();
      return;
    }
    pendingOpenGateRef.current = true;
    playerRef.current.targetX = 1085;
    playerRef.current.targetY = 410;
    playerRef.current.targetMemorialId = null;
    setWalkMessage('Walking to Species Sanctuary Gate...');
    setTimeout(() => setWalkMessage(''), 2200);
  };

  useEffect(() => {
    if (!nearbyMemorialId) {
      setInspectedId(null);
      setArmtipText('');
    }
  }, [nearbyMemorialId]);

  useEffect(() => {
    if (inspectedId && onRecordVisit) {
      onRecordVisit(inspectedId);
    }
  }, [inspectedId, onRecordVisit]);

  const playerRef = useRef({
    x: CENTER_X + getLocalSpawnOffset(),
    y: activeRoom === 'ash-room' ? 165 : 540,
    facingX: 0,
    facingY: 1,
    bob: 0,
    moving: false,
    targetX: null,
    targetY: null,
    targetMemorialId: null,
    history: [],
    portalCooldownUntil: 0,
  });

  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const joystickRef = useRef({ x: 0, y: 0 });

  const particlesRef = useRef([]);
  const weatherParticlesRef = useRef([]);
  const lightningFlashRef = useRef(0);
  const nextLightningRef = useRef(performance.now() + 4000);
  const roomRef = useRef(activeRoom);
  const memorialsRef = useRef(memorials);
  const atmosphereRef = useRef(atmosphere);
  const seasonRef = useRef(season);
  const weatherRef = useRef(weather);
  const lightningCbRef = useRef(onLightningStrike);
  const avatarRef = useRef(avatar);
  const userRef = useRef(currentUser);
  const mpNicknameRef = useRef(mpNickname);
  const nearbyIdRef = useRef(null);
  const pendingOpenIdRef = useRef(null);
  const nearPortalRef = useRef(false);
  const nearGateRef = useRef(false);
  const showOutsideChatRef = useRef(showOutsideChat);
  showOutsideChatRef.current = showOutsideChat;
  const npcQuoteOffsetsRef = useRef({});
  const npcPosListRef = useRef([]);
  const roomHeightRef = useRef(820);

  const userPets = useMemo(() => {
    if (!currentUser) return [];
    const uName = (currentUser.username || '').toLowerCase();
    const uEmail = (currentUser.email || '').toLowerCase();
    return (allMemorials || []).filter((m) => {
      if (!m) return false;
      if (uName && (m.ownerUsername || '').toLowerCase() === uName) return true;
      if (uEmail && (m.ownerEmail || '').toLowerCase() === uEmail) return true;
      return false;
    });
  }, [allMemorials, currentUser]);

  const effectiveCompanion = useMemo(() => {
    if (userPets.length === 0 || avatar.companion === 'none') return 'none';
    const matched = userPets.find((p) => p.id === avatar.companionPetId);
    if (matched) return getSpeciesEmoji(matched.species);
    return getSpeciesEmoji(userPets[0].species);
  }, [userPets, avatar.companion, avatar.companionPetId]);

  useEffect(() => {
    memorialsRef.current = memorials;
  }, [memorials]);

  useEffect(() => {
    setWalkTipVisible(true);
    const timer = setTimeout(() => setWalkTipVisible(false), 9000);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (active) {
        nativeFsRef.current = true;
      } else if (nativeFsRef.current) {
        nativeFsRef.current = false;
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.toggle('world-is-fullscreen', isFullScreen);
    const prevOverflow = document.body.style.overflow;
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.classList.remove('world-is-fullscreen');
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullScreen]);

  useEffect(() => {
    atmosphereRef.current = atmosphere;
  }, [atmosphere]);

  useEffect(() => {
    seasonRef.current = season;
  }, [season]);

  useEffect(() => {
    weatherRef.current = weather;
    weatherParticlesRef.current = [];
  }, [weather]);

  useEffect(() => {
    lightningCbRef.current = onLightningStrike;
  }, [onLightningStrike]);

  useEffect(() => {
    avatarRef.current = { ...avatar, companion: effectiveCompanion };
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
    } catch {
      // ignore storage errors
    }
  }, [avatar, effectiveCompanion]);

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (characterGender === 'girl' || characterGender === 'boy') {
      setAvatar((a) => (a.gender === characterGender ? a : { ...a, gender: characterGender }));
    }
  }, [characterGender]);

  useEffect(() => {
    mpNicknameRef.current = mpNickname;
  }, [mpNickname]);

  useEffect(() => {
    if (!remoteWorldEvent || remoteWorldEvent.room !== roomRef.current) return;
    if (remoteWorldEvent.species && remoteWorldEvent.species !== speciesRef.current) return;
    if (remoteWorldEvent.memorialId) {
      const target = positionedRef.current.find((m) => m.id === remoteWorldEvent.memorialId);
      if (target) {
        spawnFloatingParticles(target.worldX, target.worldY - 22, remoteWorldEvent.emoji || '✨', 6);
      }
    } else if (Number.isFinite(remoteWorldEvent.nx) && Number.isFinite(remoteWorldEvent.nz)) {
      spawnFloatingParticles(CENTER_X + remoteWorldEvent.nx, 410 + remoteWorldEvent.nz - 16, remoteWorldEvent.emoji || '✨', 6);
    }
    if (remoteWorldEvent.text) {
      setWalkMessage(remoteWorldEvent.text);
      setTimeout(() => setWalkMessage(''), 2600);
    }
  }, [remoteWorldEvent]);

  // Synchronize player spawn & broadcast presence when species gate changes
  useEffect(() => {
    const p = playerRef.current;
    if (speciesRef.current !== activeSpecies) {
      speciesRef.current = activeSpecies;
      pendingTargetSpeciesRef.current = null;
      p.targetX = null;
      p.targetY = null;
      p.targetMemorialId = null;
      p.portalCooldownUntil = performance.now() + 900;
      p.x = CENTER_X + getLocalSpawnOffset();
      p.y = 165;
      p.facingX = 0;
      p.facingY = 1;
      p.history = [];
      setInspectedId(null);
      setNearbyMemorialId(null);
      nearbyIdRef.current = null;
    }
    updateLocalPresence({
      name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
      room: roomRef.current,
      species: activeSpecies,
      nx: p.x - CENTER_X,
      nz: p.y - 410,
      facingX: p.facingX,
      facingZ: p.facingY,
      moving: false,
      avatar: avatarRef.current,
      force: true,
    });
  }, [activeSpecies]);

  useEffect(() => {
    if (!walkToSpeciesRequest || walkToSpeciesRequest === speciesRef.current) {
      if (walkToSpeciesRequest && onClearWalkToSpeciesRequest) onClearWalkToSpeciesRequest();
      return;
    }
    startWalkToSpeciesGate(walkToSpeciesRequest);
    if (onClearWalkToSpeciesRequest) onClearWalkToSpeciesRequest();
  }, [walkToSpeciesRequest, onClearWalkToSpeciesRequest]);

  // Synchronize player spawn when room changes externally (tabs or portal)
  useEffect(() => {
    if (roomRef.current !== activeRoom) {
      roomRef.current = activeRoom;
      const p = playerRef.current;
      p.targetX = null;
      p.targetY = null;
      p.targetMemorialId = null;
      p.portalCooldownUntil = performance.now() + 900;
      p.x = CENTER_X + getLocalSpawnOffset();
      p.y = 165;
      p.history = [];
    }
  }, [activeRoom]);

  useEffect(() => {
    if (!walkToRoomRequest || walkToRoomRequest === roomRef.current) {
      if (walkToRoomRequest && onClearWalkToRoomRequest) onClearWalkToRoomRequest();
      return;
    }
    const p = playerRef.current;
    const bounds = WORLD_BOUNDS[roomRef.current] || WORLD_BOUNDS.tombstone;
    pendingOpenGateRef.current = false;
    pendingOpenIdRef.current = null;
    p.targetMemorialId = null;
    p.targetX = bounds.portalX;
    p.targetY = bounds.portalY;
    setWalkMessage(
      walkToRoomRequest === 'ash-room'
        ? 'Walking to Ash Room Archway...'
        : 'Walking to Tombstone Garden Exit...'
    );
    setTimeout(() => setWalkMessage(''), 2400);
    if (onClearWalkToRoomRequest) onClearWalkToRoomRequest();
  }, [walkToRoomRequest, onClearWalkToRoomRequest]);

  // Compute positioned memorials per room deterministically with generous spacing (>= 195px)
  const positionedMemorials = useMemo(() => {
    const sortSeq = (a, b) => {
      const na = parseInt((a.locationCode || '').match(/(\d+)\s*$/)?.[1] || '9999', 10);
      const nb = parseInt((b.locationCode || '').match(/(\d+)\s*$/)?.[1] || '9999', 10);
      if (na !== nb) return na - nb;
      return String(a.id).localeCompare(String(b.id));
    };

    const tombstones = memorials.filter((m) => m.space === 'tombstone').sort(sortSeq);
    const ashNiches = memorials.filter((m) => m.space === 'ash-room').sort(sortSeq);

    const map = [];
    tombstones.forEach((m, idx) => {
      const n = parseInt((m.locationCode || '').match(/(\d+)\s*$/)?.[1] || '', 10);
      const slot = Number.isFinite(n) && n >= 1 && n <= 200 ? n - 1 : Math.min(199, 20 + idx);
      const col = COLS_2D[slot % COLS_2D.length];
      const row = Math.floor(slot / COLS_2D.length);
      map.push({ ...m, worldX: col, worldY: 220 + row * 240 });
    });
    ashNiches.forEach((m, idx) => {
      const n = parseInt((m.locationCode || '').match(/(\d+)\s*$/)?.[1] || '', 10);
      const slot = Number.isFinite(n) && n >= 1 && n <= 200 ? n - 1 : Math.min(199, 20 + idx);
      const col = COLS_2D[slot % COLS_2D.length];
      const row = Math.floor(slot / COLS_2D.length);
      map.push({ ...m, worldX: col, worldY: 200 + row * 240 });
    });
    return map;
  }, [memorials]);

  const positionedRef = useRef(positionedMemorials);
  useEffect(() => {
    positionedRef.current = positionedMemorials;
    const activeList = positionedMemorials.filter((m) => m.space === roomRef.current);
    const maxY = activeList.reduce((mx, m) => Math.max(mx, m.worldY), 640);
    roomHeightRef.current = Math.max(2600, maxY + 200);
  }, [positionedMemorials, activeRoom]);

  useEffect(() => {
    const targetMem = walkToMemorialRequest?.memorial;
    if (!targetMem) return;
    if (targetMem.species && targetMem.species !== activeSpecies) return;
    if (targetMem.space && targetMem.space !== roomRef.current) {
      roomRef.current = targetMem.space;
      if (onChangeRoom) onChangeRoom(targetMem.space);
      return;
    }
    const found = positionedMemorials.find((m) => m.id === targetMem.id);
    if (!found) return;
    if (onClearWalkToMemorialRequest) onClearWalkToMemorialRequest();

    const p = playerRef.current;
    p.portalCooldownUntil = performance.now() + 900;
    if (nearbyIdRef.current === found.id) {
      setInspectedId(found.id);
      return;
    }
    setInspectedId(null);
    pendingOpenIdRef.current = found.id;
    p.targetX = found.worldX;
    p.targetY = found.worldY + 62;
    p.targetMemorialId = found.id;
    setWalkMessage(`Walking to ${found.name} (${found.locationCode})...`);
    setTimeout(() => setWalkMessage(''), 2400);
  }, [
    walkToMemorialRequest,
    positionedMemorials,
    activeSpecies,
    activeRoom,
    onChangeRoom,
    onClearWalkToMemorialRequest,
  ]);

  const spawnFloatingParticles = (x, y, emoji, count = 5) => {
    for (let i = 0; i < count; i += 1) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 32,
        y: y - 16 + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.9 - Math.random() * 0.7,
        emoji,
        alpha: 1,
        life: 65 + Math.random() * 25,
      });
    }
  };

  const triggerEmote = (emoji, label) => {
    const p = playerRef.current;
    spawnFloatingParticles(p.x, p.y - 16, emoji, 6);
    if (onSendEmote) onSendEmote(emoji, label);
    setWalkMessage(label);
    setTimeout(() => setWalkMessage(''), 2200);
  };

  const handleWalkToPeer = (peer) => {
    if (!peer) return;
    if (peer.room && peer.room !== roomRef.current) {
      roomRef.current = peer.room;
      onChangeRoom(peer.room);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 680) {
      setShowMeetupPanel(false);
    }
    setTimeout(() => {
      const p = playerRef.current;
      const bounds = WORLD_BOUNDS[roomRef.current] || WORLD_BOUNDS.tombstone;
      p.portalCooldownUntil = performance.now() + 900;
      p.targetX = Math.max(46, Math.min(bounds.width - 46, CENTER_X + (peer.nx || 0) + 34));
      p.targetY = Math.max(66, Math.min(bounds.height - 40, 410 + (peer.nz || 0) + 28));
      p.targetMemorialId = null;
      setWalkMessage(`Walking to ${peer.name}...`);
      setTimeout(() => setWalkMessage(''), 2200);
    }, 60);
  };

  const handleWalkToPet = (memorial) => {
    if (memorial.species && memorial.species !== activeSpecies && onSelectSpecies) {
      onSelectSpecies(memorial.species);
    }
    if (nearbyIdRef.current === memorial.id && (!memorial.species || memorial.species === activeSpecies)) {
      setInspectedId(memorial.id);
      return;
    }
    setInspectedId(null);
    pendingOpenIdRef.current = memorial.id;
    if (memorial.space !== roomRef.current) {
      roomRef.current = memorial.space;
      onChangeRoom(memorial.space);
    }
    setTimeout(() => {
      const found = positionedRef.current.find((m) => m.id === memorial.id);
      if (found) {
        const p = playerRef.current;
        p.portalCooldownUntil = performance.now() + 900;
        p.targetX = found.worldX;
        p.targetY = found.worldY + 62;
        p.targetMemorialId = found.id;
        setWalkMessage(`Walking to ${found.name} (${found.locationCode})...`);
        setTimeout(() => setWalkMessage(''), 2200);
      }
    }, 100);
  };

  const showArmtip = (msg) => {
    setArmtipText(msg);
    setTimeout(() => setArmtipText(''), 3200);
  };

  const userKey = getUserIdentityKey(currentUser);

  const performQuickOffering = (memorial, offering) => {
    const activeUserKey = getUserIdentityKey(userRef.current);
    if (!activeUserKey) {
      onRequireLogin();
      return;
    }
    if (moderationStatus?.vigilPaused) {
      showArmtip(
        `⏸️ Vigil actions are paused by Admin (${moderationStatus.vigilLabel || 'Active'}).`
      );
      return;
    }
    if (hasGivenToday(activeUserKey, memorial.id, offering.category)) {
      showArmtip(getDailyLimitNotice(offering.category, memorial.name || 'this pet'));
      return;
    }
    recordGivenToday(activeUserKey, memorial.id, offering.category);
    const target = positionedRef.current.find((m) => m.id === memorial.id);
    if (target) {
      spawnFloatingParticles(target.worldX, target.worldY - 22, offering.emoji, 6);
    }
    onPerformOffering(memorial.id, offering);
    setWalkMessage(`You ${offering.blessing} for ${memorial.name || 'this pet'}`);
    setTimeout(() => setWalkMessage(''), 2400);
  };

  // Keyboard Listeners
  useEffect(() => {
    const mapKey = (e, down) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = down;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = down;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = down;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = down;

      if (down && (e.key === 'e' || e.key === 'E' || e.key === 'Enter')) {
        if (nearbyIdRef.current) {
          onSelectMemorial(nearbyIdRef.current);
        } else if (nearGateRef.current) {
          openSpeciesGate();
        }
      }
      if (down && (e.key === 'f' || e.key === 'F')) {
        const nearby = positionedRef.current.find((m) => m.id === nearbyIdRef.current);
        if (nearby) performQuickOffering(nearby, OFFERING_TYPES.flowers[0]);
      }
      if (down && (e.key === 'c' || e.key === 'C')) {
        const nearby = positionedRef.current.find((m) => m.id === nearbyIdRef.current);
        if (nearby) performQuickOffering(nearby, OFFERING_TYPES.candle);
      }
    };

    const onDown = (e) => mapKey(e, true);
    const onUp = (e) => mapKey(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [onSelectMemorial]);

  // Main Canvas Game Loop
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const renderFrame = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const viewW = Math.max(300, Math.round(rect.width));
      const viewH = Math.max(320, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== viewW * dpr || canvas.height !== viewH * dpr) {
        canvas.width = viewW * dpr;
        canvas.height = viewH * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const room = roomRef.current;
      const bounds = { ...WORLD_BOUNDS[room], height: roomHeightRef.current };
      const p = playerRef.current;
      const speed = 190;

      // Update player velocity from keys/D-pad, APK analog joystick, or click target
      let vx = joystickRef.current.x;
      let vy = joystickRef.current.y;
      if (keysRef.current.up) vy -= 1;
      if (keysRef.current.down) vy += 1;
      if (keysRef.current.left) vx -= 1;
      if (keysRef.current.right) vx += 1;
      const inputMag = Math.min(1, Math.hypot(vx, vy));

      if (inputMag > 0.01) {
        p.targetX = null;
        p.targetY = null;
        p.targetMemorialId = null;
        pendingOpenIdRef.current = null;
        pendingOpenGateRef.current = false;
        pendingTargetSpeciesRef.current = null;
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        p.x += vx * speed * inputMag * dt;
        p.y += vy * speed * inputMag * dt;
        p.facingX = vx;
        p.facingY = vy;
        p.moving = true;
        p.bob += dt * 12;
      } else if (p.targetX !== null && p.targetY !== null) {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          vx = dx / dist;
          vy = dy / dist;
          p.x += vx * speed * dt;
          p.y += vy * speed * dt;
          p.facingX = vx;
          p.facingY = vy;
          p.moving = true;
          p.bob += dt * 12;
        } else {
          p.targetX = null;
          p.targetY = null;
          p.moving = false;
        }
      } else {
        p.moving = false;
      }

      // Clamp player within room boundaries
      p.x = Math.max(46, Math.min(bounds.width - 46, p.x));
      p.y = Math.max(66, Math.min(bounds.height - 40, p.y));

      updateLocalPresence({
        name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
        room,
        species: speciesRef.current,
        nx: p.x - CENTER_X,
        nz: p.y - 410,
        facingX: p.facingX,
        facingZ: p.facingY,
        moving: p.moving,
        avatar: avatarRef.current,
      });

      // Record player history for spirit pet trailing
      if (p.moving || p.history.length === 0) {
        p.history.unshift({ x: p.x, y: p.y });
        if (p.history.length > 26) p.history.pop();
      }

      // Check portal archway crossing
      const portalDist = Math.hypot(p.x - bounds.portalX, p.y - bounds.portalY);
      const isNearPortalNow = portalDist < 92;
      if (isNearPortalNow !== nearPortalRef.current) {
        nearPortalRef.current = isNearPortalNow;
        setNearPortal(isNearPortalNow);
      }

      const gateDist = Math.hypot(p.x - GATE_X, p.y - 410);
      const isNearGateNow = gateDist < 92;
      if (isNearGateNow !== nearGateRef.current) {
        nearGateRef.current = isNearGateNow;
        setNearSpeciesGate(isNearGateNow);
      }
      if (pendingTargetSpeciesRef.current && gateDist < 38) {
        const nextSpecies = pendingTargetSpeciesRef.current;
        pendingTargetSpeciesRef.current = null;
        pendingOpenGateRef.current = false;
        p.portalCooldownUntil = now + 1100;
        speciesRef.current = nextSpecies;
        p.targetX = null;
        p.targetY = null;
        p.x = CENTER_X + getLocalSpawnOffset();
        p.y = 165;
        p.facingX = 0;
        p.facingY = 1;
        p.history = [];
        updateLocalPresence({
          name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
          room,
          species: nextSpecies,
          nx: p.x - CENTER_X,
          nz: p.y - 410,
          facingX: p.facingX,
          facingZ: p.facingY,
          moving: false,
          avatar: avatarRef.current,
          force: true,
        });
        if (onSelectSpeciesRef.current) onSelectSpeciesRef.current(nextSpecies);
        spawnFloatingParticles(p.x, p.y - 18, getSpeciesEmoji(nextSpecies), 7);
        setWalkMessage(`⛩️ Entered ${getSpeciesEmoji(nextSpecies)} ${nextSpecies} Gates`);
        setTimeout(() => setWalkMessage(''), 2400);
        animId = requestAnimationFrame(renderFrame);
        return;
      }
      if (isNearGateNow && pendingOpenGateRef.current) {
        pendingOpenGateRef.current = false;
        p.targetX = null;
        p.targetY = null;
        p.moving = false;
        if (openSpeciesGateRef.current) openSpeciesGateRef.current();
      }

      if (portalDist < 46 && now > p.portalCooldownUntil) {
        const nextRoom = room === 'tombstone' ? 'ash-room' : 'tombstone';
        p.portalCooldownUntil = now + 1100;
        roomRef.current = nextRoom;
        onChangeRoom(nextRoom);
        p.targetX = null;
        p.targetY = null;
        p.x = CENTER_X + getLocalSpawnOffset();
        p.y = 165;
        p.history = [];
        updateLocalPresence({
          name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
          room: nextRoom,
          species: speciesRef.current,
          nx: p.x - CENTER_X,
          nz: p.y - 410,
          facingX: p.facingX,
          facingZ: p.facingY,
          moving: false,
          avatar: avatarRef.current,
          force: true,
        });
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      // Proximity check to memorials in current room (78px radius for spacious vigils)
      const roomMemorials = positionedRef.current.filter((m) => m.space === room);
      let closest = null;
      let closestDist = 78;
      for (const m of roomMemorials) {
        const d = Math.hypot(p.x - m.worldX, p.y - (m.worldY + 24));
        if (d < closestDist) {
          closestDist = d;
          closest = m;
        }
      }
      const nextNearbyId = closest ? closest.id : null;
      if (nextNearbyId !== nearbyIdRef.current) {
        nearbyIdRef.current = nextNearbyId;
        setNearbyMemorialId(nextNearbyId);
        if (nextNearbyId && pendingOpenIdRef.current === nextNearbyId) {
          setInspectedId(nextNearbyId);
          pendingOpenIdRef.current = null;
        } else if (!nextNearbyId) {
          setInspectedId(null);
        }
      }

      // Camera zoom (slider: 0 = current close view, 100 = full 200-plot overview)
      const currentZoom = Math.max(1, viewW / bounds.width, viewH / bounds.height);
      const fitAllZoom = Math.min(viewW / bounds.width, viewH / bounds.height);
      const tZoom = Math.max(0, Math.min(1, zoomOverviewRef.current / 100));
      const zoom = currentZoom + (fitAllZoom - currentZoom) * tZoom;
      activeZoomRef.current = zoom;
      const effW = viewW / zoom;
      const effH = viewH / zoom;
      const camX =
        bounds.width <= effW
          ? -(effW - bounds.width) / 2
          : Math.max(0, Math.min(bounds.width - effW, p.x - effW / 2));
      const camY =
        bounds.height <= effH
          ? -(effH - bounds.height) / 2
          : Math.max(0, Math.min(bounds.height - effH, p.y - effH / 2));

      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(-camX, -camY);

      const atm = atmosphereRef.current;
      const curSeason = seasonRef.current;
      const curWeather = weatherRef.current;

      // ====================
      // DRAW MAP BACKGROUND
      // ====================
      if (room === 'tombstone') {
        const grassGrad = ctx.createLinearGradient(0, 0, 0, bounds.height);
        const seasonGrass2D = {
          spring: { morning: ['#79a878', '#588659'], dusk: ['#4f634b', '#344734'], night: ['#1e3128', '#12201a'] },
          summer: { morning: ['#5fa15b', '#417842'], dusk: ['#425a3e', '#283b27'], night: ['#172c20', '#0d1a13'] },
          autumn: { morning: ['#9b8f56', '#746839'], dusk: ['#635139', '#413322'], night: ['#26231a', '#15140e'] },
          winter: { morning: ['#d5e2e6', '#b5c6cd'], dusk: ['#6e818e', '#4d5d69'], night: ['#233441', '#15212b'] },
        }[curSeason] || { morning: ['#79a878', '#588659'], dusk: ['#4f634b', '#344734'], night: ['#1e3128', '#12201a'] };
        const [gTop, gBot] = seasonGrass2D[atm] || seasonGrass2D.dusk;
        grassGrad.addColorStop(0, gTop);
        grassGrad.addColorStop(1, gBot);
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, 0, bounds.width, bounds.height);

        // Expanded stone roads & cross paths
        ctx.strokeStyle = atm === 'night' ? '#36434c' : '#b7b09c';
        ctx.lineWidth = 86;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(CENTER_X, 95);
        ctx.lineTo(CENTER_X, Math.max(760, bounds.height - 60));
        for (let cy = 330; cy < bounds.height - 80; cy += 240) {
          ctx.moveTo(120, cy);
          ctx.lineTo(bounds.width - 120, cy);
        }
        ctx.stroke();

        // Inner path texture
        ctx.strokeStyle = atm === 'night' ? '#46545f' : '#cfc7b2';
        ctx.lineWidth = 68;
        ctx.stroke();

        // Tranquil reflection pools every 3-row road interval (with 3-7 jumping fish each)
        const poolIntervals = [330, 1050, 1770];
        poolIntervals.forEach((py, pIdx) => {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(CENTER_X, py, 138, 62, 0, 0, Math.PI * 2);
          const pondGrad = ctx.createRadialGradient(CENTER_X, py - 10, 10, CENTER_X, py, 140);
          pondGrad.addColorStop(0, atm === 'night' ? '#2c5a73' : '#74b3c8');
          pondGrad.addColorStop(1, atm === 'night' ? '#163142' : '#43798c');
          ctx.fillStyle = pondGrad;
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = atm === 'night' ? '#354840' : '#859c7c';
          ctx.stroke();

          // Lily pads
          ctx.fillStyle = '#4e8a55';
          ctx.beginPath();
          ctx.arc(CENTER_X - 58, py - 10, 10, 0.2, Math.PI * 1.85);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(CENTER_X + 52, py + 12, 9, 0.5, Math.PI * 2.1);
          ctx.fill();
          ctx.fillStyle = '#f6b8c9';
          ctx.beginPath();
          ctx.arc(CENTER_X - 56, py - 12, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // 3-7 random fishes jumping & playing in each pool
          const fishCount = 3 + ((pIdx * 3 + 2) % 5);
          for (let f = 0; f < fishCount; f += 1) {
            const seed = pIdx * 17 + f * 7;
            const speed = 0.0022 + (seed % 5) * 0.0004;
            const phase = seed * 1.3;
            const swimX = CENTER_X + Math.cos(now * 0.0009 + seed) * (76 - (f % 3) * 18);
            const swimY = py + Math.sin(now * 0.0011 + seed * 0.7) * (28 - (f % 2) * 8);
            const jumpWave = Math.sin(now * speed + phase);
            const jumpH = jumpWave > 0.35 ? (jumpWave - 0.35) * 28 : 0;
            if (jumpH > 0) {
              ctx.strokeStyle = 'rgba(220, 245, 255, 0.55)';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.ellipse(swimX, swimY + 3, 7 + jumpH * 0.35, 3 + jumpH * 0.15, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.font = '14px serif';
            ctx.textAlign = 'center';
            ctx.fillText(f % 2 === 0 ? '🐟' : '🐠', swimX, swimY - jumpH);
          }
          ctx.restore();
        });

        // Wooden Park Benches flanking every 3-row pool
        const benches = [];
        poolIntervals.forEach((py) => {
          benches.push({ x: CENTER_X - 185, y: py }, { x: CENTER_X + 185, y: py });
        });
        benches.forEach((b) => {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(b.x - 28, b.y + 8, 60, 12);
          ctx.fillStyle = '#7c5134';
          drawRoundedRect(ctx, b.x - 28, b.y - 10, 56, 20, 4);
          ctx.fill();
          ctx.fillStyle = '#9b6a46';
          drawRoundedRect(ctx, b.x - 28, b.y - 14, 56, 7, 3);
          ctx.fill();
        });

        // Decorative Garden Trees at 3-row road intervals
        const trees = [];
        [210, 930, 1650, 2370].forEach((ty, ti) => {
          [90, 560, 1040, 1760, 2240, 2710].forEach((tx, xi) => {
            trees.push({ x: tx, y: ty, cherry: (ti + xi) % 2 === 0 });
          });
        });
        trees.forEach((tr) => {
          ctx.fillStyle = 'rgba(0,0,0,0.24)';
          ctx.beginPath();
          ctx.ellipse(tr.x, tr.y + 24, 34, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#5e402c';
          ctx.fillRect(tr.x - 7, tr.y - 4, 14, 28);
          let treeCol;
          if (curSeason === 'winter') {
            treeCol = atm === 'night' ? '#637a8a' : '#dce8ee';
          } else if (curSeason === 'autumn') {
            treeCol = tr.cherry
              ? atm === 'night' ? '#7a4430' : '#df7b3d'
              : atm === 'night' ? '#663c27' : '#c95c34';
          } else if (curSeason === 'summer') {
            treeCol = atm === 'night' ? '#1c4226' : '#3d7f46';
          } else {
            treeCol = tr.cherry
              ? atm === 'night' ? '#7e536b' : '#eab2c4'
              : atm === 'night' ? '#244734' : '#4a7c52';
          }
          ctx.fillStyle = treeCol;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y - 16, 34, 0, Math.PI * 2);
          ctx.arc(tr.x - 22, tr.y - 4, 22, 0, Math.PI * 2);
          ctx.arc(tr.x + 22, tr.y - 4, 22, 0, Math.PI * 2);
          ctx.fill();
        });

        // Path Lanterns
        const lanterns = [
          { x: 525, y: 160 },
          { x: 675, y: 160 },
          { x: 525, y: 540 },
          { x: 675, y: 540 },
        ];
        lanterns.forEach((l) => {
          const glow = ctx.createRadialGradient(l.x, l.y - 12, 2, l.x, l.y - 12, 46);
          glow.addColorStop(0, 'rgba(255, 214, 130, 0.55)');
          glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(l.x, l.y - 12, 46, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#333b42';
          ctx.fillRect(l.x - 3, l.y - 16, 6, 20);
          ctx.fillStyle = '#ffe29c';
          ctx.fillRect(l.x - 5, l.y - 22, 10, 8);
        });

        // Columbarium Portal Archway at Top Center (600, 90)
        const px = bounds.portalX;
        const py = bounds.portalY;
        const archGlow = ctx.createRadialGradient(px, py, 8, px, py, 90);
        archGlow.addColorStop(0, 'rgba(255, 204, 118, 0.5)');
        archGlow.addColorStop(1, 'rgba(255, 204, 118, 0)');
        ctx.fillStyle = archGlow;
        ctx.beginPath();
        ctx.arc(px, py, 90, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5a4332';
        drawRoundedRect(ctx, px - 72, py - 62, 144, 72, 18);
        ctx.fill();
        ctx.fillStyle = '#241914';
        drawRoundedRect(ctx, px - 42, py - 42, 84, 52, 40);
        ctx.fill();
        ctx.fillStyle = '#f3cf94';
        ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏛️ Hall of Serenity (Ash Room)', px, py - 68);
        ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffe7ba';
        ctx.fillText('Walk in to Enter', px, py - 10);
      } else {
        // ASH ROOM FLOOR & ARCHITECTURE
        ctx.fillStyle = '#1b1310';
        ctx.fillRect(0, 0, bounds.width, bounds.height);

        // Cedarwood floor planks
        ctx.fillStyle = '#33221a';
        ctx.fillRect(50, 50, bounds.width - 100, bounds.height - 90);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1;
        for (let y = 70; y < bounds.height - 50; y += 26) {
          ctx.beginPath();
          ctx.moveTo(50, y);
          ctx.lineTo(bounds.width - 50, y);
          ctx.stroke();
        }

        // Gold-bordered Crimson Sanctuary Runners (10 rows: 10 left + 10 right niches = 200)
        ctx.fillStyle = '#5c262a';
        ctx.fillRect(CENTER_X - 80, 120, 160, Math.max(610, bounds.height - 180));
        ctx.strokeStyle = '#d4a853';
        ctx.lineWidth = 3;
        ctx.strokeRect(CENTER_X - 76, 124, 152, Math.max(602, bounds.height - 188));
        for (let row = 0; row < 10; row += 1) {
          const ry = 200 + row * 240;
          ctx.fillStyle = '#5c262a';
          ctx.fillRect(140, ry - 41, bounds.width - 280, 82);
          ctx.strokeStyle = '#d4a853';
          ctx.strokeRect(144, ry - 37, bounds.width - 288, 74);

          // Warm Bronze Incense Brazier / Light in the middle of each row
          const ax = CENTER_X;
          const ay = ry;
          const altarGlow = ctx.createRadialGradient(ax, ay, 8, ax, ay, 85);
          altarGlow.addColorStop(0, 'rgba(255, 196, 108, 0.45)');
          altarGlow.addColorStop(1, 'rgba(255, 196, 108, 0)');
          ctx.fillStyle = altarGlow;
          ctx.beginPath();
          ctx.arc(ax, ay, 85, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#6f4e28';
          ctx.beginPath();
          ctx.arc(ax, ay, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d4a853';
          ctx.beginPath();
          ctx.arc(ax, ay - 2, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffdfb0';
          ctx.font = '18px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪔', ax, ay + 5);
        }

        // Meditation Cushions
        [
          { x: 470, y: 430 },
          { x: 470, y: 350 },
        ].forEach((c) => {
          ctx.fillStyle = '#754148';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + 4, 22, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d4a853';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Potted White Lilies in Corners
        [
          { x: 100, y: 100 },
          { x: 1100, y: 100 },
          { x: 100, y: 690 },
          { x: 1100, y: 690 },
        ].forEach((pot) => {
          ctx.fillStyle = '#4e3528';
          ctx.beginPath();
          ctx.arc(pot.x, pot.y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '18px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌸', pot.x, pot.y + 6);
        });

        // Garden Exit Doorway at Bottom Center (600, 735)
        const px = bounds.portalX;
        const py = bounds.portalY;
        ctx.fillStyle = '#2d4736';
        drawRoundedRect(ctx, px - 64, py - 24, 128, 38, 8);
        ctx.fill();
        ctx.strokeStyle = '#97c19e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#e7f5e8';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌿 Exit to Tombstone Garden', px, py - 2);
      }

      // ====================
      // DRAW MONUMENTS (TOMBSTONES OR ASH NICHES)
      // ====================
      roomMemorials.forEach((m) => {
        const mx = m.worldX;
        const my = m.worldY;
        const isNear = m.id === nearbyIdRef.current;
        const isOwner = isMemorialOwner(m, userRef.current);

        // Proximity Ring
        if (isNear) {
          const pulse = 44 + Math.sin(now * 0.006) * 4;
          ctx.strokeStyle = '#ffd57e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(mx, my + 24, pulse, pulse * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (room === 'tombstone') {
          // Ground shadow & grassy plot
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.beginPath();
          ctx.ellipse(mx, my + 24, 34, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Stone fill by styleId
          const stonePalette = {
            'classic-granite': '#aeb7c0',
            'angel-wings': '#ece4d4',
            'rose-heart': '#ebb8c4',
            'moss-celtic': '#768f74',
          }[m.styleId] || '#aeb7c0';

          ctx.fillStyle = stonePalette;
          ctx.strokeStyle = isNear ? '#ffe099' : 'rgba(255,255,255,0.5)';
          ctx.lineWidth = isNear ? 2.5 : 1.5;

          ctx.beginPath();
          if (m.styleId === 'rose-heart') {
            ctx.moveTo(mx, my + 18);
            ctx.bezierCurveTo(mx - 30, my + 2, mx - 30, my - 34, mx, my - 18);
            ctx.bezierCurveTo(mx + 30, my - 34, mx + 30, my + 2, mx, my + 18);
          } else {
            ctx.moveTo(mx - 24, my + 20);
            ctx.lineTo(mx - 24, my - 14);
            ctx.arc(mx, my - 14, 24, Math.PI, 0);
            ctx.lineTo(mx + 24, my + 20);
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();

          // Pet Picture at top center of Tombstone
          drawCachedPetPortrait(
            ctx,
            m.photo,
            mx,
            my - 19,
            11.5,
            getSpeciesEmoji(m.species),
            isNear ? '#ffe099' : '#f7ead2'
          );

          // Pet Name & Plot Code
          ctx.fillStyle = m.styleId === 'moss-celtic' ? '#f5faf3' : '#263038';
          ctx.font = '700 11px "Cormorant Garamond", serif';
          ctx.textAlign = 'center';
          ctx.fillText((m.name || 'Pet').slice(0, 10), mx, my + 3);
          ctx.font = '600 8.5px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(m.locationCode || 'Plot G-21', mx, my + 14);
        } else {
          // Ash Room Columbarium Alcove
          const alcGlow = ctx.createRadialGradient(mx, my - 6, 4, mx, my - 6, 56);
          alcGlow.addColorStop(0, 'rgba(255, 206, 128, 0.36)');
          alcGlow.addColorStop(1, 'rgba(255, 206, 128, 0)');
          ctx.fillStyle = alcGlow;
          ctx.beginPath();
          ctx.arc(mx, my - 6, 56, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#2b1d17';
          drawRoundedRect(ctx, mx - 34, my - 40, 68, 60, 10);
          ctx.fill();
          ctx.strokeStyle = isNear ? '#ffd57e' : '#a47e49';
          ctx.lineWidth = isNear ? 3 : 2;
          ctx.stroke();

          // Pet Picture at top center of Ash Niche
          drawCachedPetPortrait(
            ctx,
            m.photo,
            mx,
            my - 26,
            11,
            getSpeciesEmoji(m.species),
            isNear ? '#ffd57e' : '#e6c278'
          );

          // Urn silhouette inside alcove
          const urnColor = {
            'celadon-urn': '#86b599',
            'gilded-lotus': '#d4a853',
            'starlight-glass': '#82b3ee',
            'warm-cherrywood': '#a95f3a',
          }[m.styleId] || '#86b599';

          ctx.fillStyle = urnColor;
          ctx.beginPath();
          ctx.ellipse(mx, my - 2, 10, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e7c57c';
          ctx.fillRect(mx - 7, my - 15, 14, 3);

          // Brass plaque
          ctx.fillStyle = '#d8b26e';
          ctx.fillRect(mx - 26, my + 11, 52, 13);
          ctx.fillStyle = '#281b09';
          ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText((m.name || 'Pet').slice(0, 9), mx, my + 20);
        }

        // Owner Star
        if (isOwner) {
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⭐', mx + 26, my - 28);
        }

        // Live active offerings around base
        const tokens = (m.activeOfferings || []).slice(0, 4);
        ctx.font = '13px serif';
        ctx.textAlign = 'center';
        tokens.forEach((tok, ti) => {
          const ox = mx - 21 + ti * 14;
          const oy = my + 32;
          if (tok === '🕯️') {
            const flicker = 8 + Math.sin(now * 0.015 + ti) * 2;
            const cg = ctx.createRadialGradient(ox, oy - 5, 1, ox, oy - 5, flicker + 4);
            cg.addColorStop(0, 'rgba(255, 212, 108, 0.75)');
            cg.addColorStop(1, 'rgba(255, 212, 108, 0)');
            ctx.fillStyle = cg;
            ctx.beginPath();
            ctx.arc(ox, oy - 5, flicker + 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillText(tok, ox, oy);
        });
      });

      // ====================
      // DRAW AMBIENT NPCs
      // ====================
      const npcs = room === 'tombstone' ? GARDEN_NPCS_DATA : ASH_NPCS_DATA;
      const npcSpeechQueue2D = [];
      const curNpcPositions = [];
      npcs.forEach((npc, idx) => {
        let nx = npc.x2d;
        const ny = npc.y2d;
        if (npc.patrol2d > 0) {
          nx += Math.sin(now * 0.001 * npc.speed2d + idx * 2) * npc.patrol2d;
        }
        curNpcPositions.push({ id: npc.id, name: npc.name, x: nx, y: ny });
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.26)';
        ctx.beginPath();
        ctx.ellipse(nx, ny + 14, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = npc.cloak;
        drawRoundedRect(ctx, nx - 9, ny - 6, 18, 19, 6);
        ctx.fill();
        // Head
        ctx.fillStyle = '#f2cfb6';
        ctx.beginPath();
        ctx.arc(nx, ny - 13, 8, 0, Math.PI * 2);
        ctx.fill();
        // Hair
        ctx.fillStyle = npc.hair;
        ctx.beginPath();
        ctx.arc(nx, ny - 15, 8.2, Math.PI, 0);
        ctx.fill();

        // Speech bubble queued for viewport-clamped wrapped rendering when player is near NPC
        const distToNpc = Math.hypot(p.x - nx, p.y - ny);
        if (distToNpc < 115) {
          const qList = npc.quotes || [];
          const offset = npcQuoteOffsetsRef.current[npc.id] || 0;
          const qIdx = (Math.floor(now / 9000) + idx + offset) % Math.max(1, qList.length);
          npcSpeechQueue2D.push({
            x: (nx - camX) * zoom,
            y: (ny - camY - 26) * zoom,
            speaker: npc.name,
            text: qList[qIdx] || '',
          });
        }
      });
      npcPosListRef.current = curNpcPositions;

      // Species Sanctuary Gate (East side at 1135, 410)
      ctx.save();
      ctx.fillStyle = '#943030';
      ctx.fillRect(GATE_X - 21, 382, 10, 56);
      ctx.fillRect(GATE_X + 13, 382, 10, 56);
      ctx.fillStyle = '#b84242';
      drawRoundedRect(ctx, GATE_X - 31, 374, 64, 12, 5);
      ctx.fill();
      ctx.strokeStyle = '#ffd57e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(20, 16, 18, 0.88)';
      drawRoundedRect(ctx, GATE_X - 53, 348, 108, 19, 6);
      ctx.fill();
      ctx.fillStyle = '#ffe5ad';
      ctx.textAlign = 'center';
      ctx.fillText('⛩️ Other Species', GATE_X + 1, 361);
      ctx.restore();

      // ====================
      // DRAW REMOTE MULTIPLAYER VISITORS
      // ====================
      const nowMs = Date.now();
      getPeersMap().forEach((peer) => {
        if (peer.room !== room || (peer.species || 'Dog') !== speciesRef.current) return;
        peer.rx += (peer.nx - peer.rx) * Math.min(1, dt * 10);
        peer.rz += (peer.nz - peer.rz) * Math.min(1, dt * 10);
        if (peer.moving) peer.bob = (peer.bob || 0) + dt * 12;

        const px = CENTER_X + peer.rx;
        const py = 410 + peer.rz;
        const pAv = peer.avatar || DEFAULT_AVATAR;
        const pBob = peer.moving ? Math.abs(Math.sin(peer.bob || 0)) * 4 : 0;

        if (pAv.companion && pAv.companion !== 'none') {
          const sx = px - (peer.facingX || 0) * 20;
          const sy = py - (peer.facingZ || 0) * 14 + Math.sin(now * 0.005 + px) * 3;
          const spGlow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
          spGlow.addColorStop(0, 'rgba(182, 238, 255, 0.65)');
          spGlow.addColorStop(1, 'rgba(182, 238, 255, 0)');
          ctx.fillStyle = spGlow;
          ctx.beginPath();
          ctx.arc(sx, sy, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '16px serif';
          ctx.textAlign = 'center';
          const em =
            pAv.companion === 'cat'
              ? '🐈'
              : pAv.companion === 'bunny'
                ? '🐇'
                : pAv.companion === 'dog'
                  ? '🐕'
                  : pAv.companion;
          ctx.fillText(em, sx, sy + 6);
        }

        if (pAv.carryingLantern && atm === 'night') {
          const plg = ctx.createRadialGradient(px, py - 6, 4, px, py - 6, 60);
          plg.addColorStop(0, 'rgba(255, 212, 128, 0.3)');
          plg.addColorStop(1, 'rgba(255, 212, 128, 0)');
          ctx.fillStyle = plg;
          ctx.beginPath();
          ctx.arc(px, py - 6, 60, 0, Math.PI * 2);
          ctx.fill();
        }

        drawAvatar2D(ctx, px, py, 1, pBob, pAv, 'rgba(130, 245, 175, 0.8)', atm);

        const gEmoji = pAv.gender === 'boy' ? '👦' : '👩';
        const pTag = `🟢 ${gEmoji} ${peer.name || 'Visitor'}`;
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        const ptw = ctx.measureText(pTag).width + 12;
        const pNameY = py - 44 - pBob;
        ctx.fillStyle = 'rgba(15, 22, 20, 0.84)';
        drawRoundedRect(ctx, px - ptw / 2, pNameY, ptw, 16, 6);
        ctx.fill();
        ctx.fillStyle = '#aef5c8';
        ctx.textAlign = 'center';
        ctx.fillText(pTag, px, pNameY + 12);

        if (peer.chatText && nowMs < peer.chatExpiresAt && (peer.chatIsGroup || showOutsideChatRef.current)) {
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          const displayChat = peer.chatIsGroup ? `🔒 ${peer.chatText}` : peer.chatText;
          const cw = ctx.measureText(displayChat).width + 18;
          const bubbleY = pNameY - 26;
          ctx.fillStyle = 'rgba(20, 28, 25, 0.94)';
          drawRoundedRect(ctx, px - cw / 2, bubbleY, cw, 22, 8);
          ctx.fill();
          ctx.strokeStyle = peer.chatIsGroup ? 'rgba(255, 213, 126, 0.88)' : 'rgba(130, 245, 175, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(displayChat, px, bubbleY + 15);
        }
      });

      // ====================
      // DRAW CLICK DESTINATION RING
      // ====================
      if (p.targetX !== null && p.targetY !== null) {
        const ringR = 10 + Math.sin(now * 0.01) * 3;
        ctx.strokeStyle = 'rgba(255, 232, 165, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.targetX, p.targetY, ringR, ringR * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ====================
      // DRAW SPIRIT PET COMPANION (only when user has enshrined a pet)
      // ====================
      const av = avatarRef.current;
      if (av.companion && av.companion !== 'none') {
        const trail = p.history[Math.min(18, p.history.length - 1)] || {
          x: p.x - 28,
          y: p.y + 8,
        };
        const sx = trail.x - p.facingX * 18;
        const sy = trail.y - p.facingY * 10 + Math.sin(now * 0.005) * 3;
        const spiritGlow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 20);
        spiritGlow.addColorStop(0, 'rgba(182, 238, 255, 0.65)');
        spiritGlow.addColorStop(1, 'rgba(182, 238, 255, 0)');
        ctx.fillStyle = spiritGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '17px serif';
        ctx.textAlign = 'center';
        ctx.fillText(av.companion, sx, sy + 6);
      }

      // ====================
      // DRAW PLAYER CHARACTER
      // ====================
      const bobOffset = p.moving ? Math.abs(Math.sin(p.bob)) * 4 : 0;

      if (av.carryingLantern && atm === 'night') {
        const lg = ctx.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y - 6, 68);
        lg.addColorStop(0, 'rgba(255, 212, 128, 0.34)');
        lg.addColorStop(1, 'rgba(255, 212, 128, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 6, 68, 0, Math.PI * 2);
        ctx.fill();
      }

      drawAvatar2D(ctx, p.x, p.y, 1, bobOffset, av, 'rgba(255,255,255,0.45)', atm);

      // Player Name Tag
      const gEmoji = av.gender === 'boy' ? '👦' : '👩';
      const rawLabel = mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor';
      const label = `${gEmoji} ${rawLabel}`;
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      const lw = ctx.measureText(label).width + 12;
      const myNameY = p.y - 44 - bobOffset;
      ctx.fillStyle = 'rgba(15, 22, 20, 0.78)';
      drawRoundedRect(ctx, p.x - lw / 2, myNameY, lw, 16, 6);
      ctx.fill();
      ctx.fillStyle = '#ffe5b0';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, myNameY + 12);

      const myBubble = getLocalChatBubble();
      if (myBubble) {
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        const cw = ctx.measureText(myBubble).width + 18;
        const bubbleY = myNameY - 26;
        ctx.fillStyle = 'rgba(20, 28, 25, 0.94)';
        drawRoundedRect(ctx, p.x - cw / 2, bubbleY, cw, 22, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 213, 126, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#fff8eb';
        ctx.fillText(myBubble, p.x, bubbleY + 15);
      }

      // ====================
      // FLOATING PARTICLES
      // ====================
      particlesRef.current = particlesRef.current.filter((pt) => pt.life > 0);
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        pt.alpha = Math.max(0, pt.life / 75);
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(pt.emoji, pt.x, pt.y);
        ctx.restore();
      });

      ctx.restore();

      // Render wrapped NPC speech bubbles in viewport coordinates so text wraps and stays on-screen
      npcSpeechQueue2D.forEach((sb) => {
        drawWrappedSpeechBubble(ctx, sb.x, sb.y, {
          speaker: sb.speaker,
          text: sb.text,
          maxWidth: 236,
          viewportWidth: viewW,
        });
      });

      // ====================
      // 4-SEASON WEATHER & MOONSHINE OVERLAY
      // ====================
      if (room === 'tombstone' && curWeather === 'clear') {
        if (atm === 'night') {
          const mx = viewW * 0.82;
          const my = 56;
          const moonGlow = ctx.createRadialGradient(mx, my, 8, mx, my, 92);
          moonGlow.addColorStop(0, 'rgba(255, 246, 208, 0.72)');
          moonGlow.addColorStop(0.4, 'rgba(216, 232, 255, 0.22)');
          moonGlow.addColorStop(1, 'rgba(216, 232, 255, 0)');
          ctx.fillStyle = moonGlow;
          ctx.beginPath();
          ctx.arc(mx, my, 92, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f8f0d8';
          ctx.beginPath();
          ctx.arc(mx, my, 18, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const sunGlow = ctx.createRadialGradient(viewW * 0.85, 50, 8, viewW * 0.85, 50, 130);
          sunGlow.addColorStop(0, 'rgba(255, 234, 174, 0.34)');
          sunGlow.addColorStop(1, 'rgba(255, 234, 174, 0)');
          ctx.fillStyle = sunGlow;
          ctx.fillRect(0, 0, viewW, viewH);
        }
      }

      if (room === 'tombstone' && (curWeather === 'snow' || curWeather === 'rain' || curWeather === 'thunderstorm' || curWeather === 'windy')) {
        if (weatherParticlesRef.current.length === 0) {
          const count = curWeather === 'windy' ? 14 : curWeather === 'snow' ? 24 : 28;
          for (let i = 0; i < count; i += 1) {
            weatherParticlesRef.current.push({
              x: Math.random() * viewW,
              y: Math.random() * viewH,
              speed:
                curWeather === 'snow'
                  ? 14 + Math.random() * 14
                  : curWeather === 'windy'
                    ? 26 + Math.random() * 22
                    : 85 + Math.random() * 45,
              size:
                curWeather === 'snow'
                  ? 2.2 + Math.random() * 2.8
                  : curWeather === 'windy'
                    ? 4.2 + Math.random() * 3.0
                    : 1.5,
              phase: Math.random() * Math.PI * 2,
              hueIdx: i % 3,
              ripple: 0,
              rx: Math.random() * viewW,
              ry: viewH * (0.58 + Math.random() * 0.38),
            });
          }
        }

        const leafPalette = {
          spring: ['#f3b6c6', '#e896ae', '#f8d4df'],
          summer: ['#6eb36b', '#4d9352', '#8fd182'],
          autumn: ['#e28238', '#c84b31', '#e8b349'],
          winter: ['#d8e6ec', '#b6cdd6', '#eef6fa'],
        }[curSeason] || ['#e28238', '#c84b31', '#e8b349'];

        weatherParticlesRef.current.forEach((wp) => {
          if (curWeather === 'snow') {
            wp.y += wp.speed * dt;
            wp.x += Math.sin(now * 0.0012 + wp.phase) * 18 * dt;
            if (wp.y > viewH + 10) { wp.y = -10; wp.x = Math.random() * viewW; }
            if (wp.x < 0) wp.x += viewW;
            if (wp.x > viewW) wp.x -= viewW;
            const sg = ctx.createRadialGradient(wp.x, wp.y, 0.5, wp.x, wp.y, wp.size * 2.2);
            sg.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
            sg.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, wp.size * 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (curWeather === 'windy') {
            wp.x += wp.speed * dt;
            wp.y += (10 + Math.sin(now * 0.0016 + wp.phase) * 14) * dt;
            if (wp.x > viewW + 16) { wp.x = -16; wp.y = Math.random() * viewH; }
            if (wp.y > viewH + 14) { wp.y = -12; }
            ctx.save();
            ctx.translate(wp.x, wp.y);
            ctx.rotate(now * 0.0014 + wp.phase);
            ctx.fillStyle = leafPalette[wp.hueIdx];
            ctx.beginPath();
            ctx.ellipse(0, 0, wp.size * 1.4, wp.size * 0.68, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Slow dramatic rain + ground ripples
            wp.y += wp.speed * dt;
            wp.x -= 14 * dt;
            if (wp.y > viewH) {
              wp.y = -20;
              wp.x = Math.random() * (viewW + 40);
              wp.ripple = 1;
              wp.rx = Math.random() * viewW;
              wp.ry = viewH * (0.58 + Math.random() * 0.36);
            }
            ctx.strokeStyle = 'rgba(192, 226, 255, 0.55)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(wp.x, wp.y);
            ctx.lineTo(wp.x - 3, wp.y + 20);
            ctx.stroke();

            if (wp.ripple > 0.05) {
              const rad = (1 - wp.ripple) * 18 + 3;
              ctx.strokeStyle = `rgba(205, 232, 255, ${wp.ripple * 0.35})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.ellipse(wp.rx, wp.ry, rad, rad * 0.42, 0, 0, Math.PI * 2);
              ctx.stroke();
              wp.ripple = Math.max(0, wp.ripple - dt * 0.9);
            }
          }
        });
      }

      if (curWeather === 'thunderstorm') {
        if (now > nextLightningRef.current) {
          lightningFlashRef.current = 0.82;
          nextLightningRef.current = now + 7000 + Math.random() * 5500;
          if (lightningCbRef.current) lightningCbRef.current();
        }
        if (lightningFlashRef.current > 0.01) {
          ctx.fillStyle = `rgba(235, 244, 255, ${lightningFlashRef.current * (room === 'ash-room' ? 0.16 : 0.45)})`;
          ctx.fillRect(0, 0, viewW, viewH);
          lightningFlashRef.current *= Math.pow(0.05, dt);
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [onChangeRoom]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const viewW = rect.width;
    const viewH = rect.height;
    const room = roomRef.current;
    const bounds = { ...WORLD_BOUNDS[room], height: roomHeightRef.current };
    const p = playerRef.current;

    const zoom = activeZoomRef.current || Math.max(1, viewW / bounds.width, viewH / bounds.height);
    const effW = viewW / zoom;
    const effH = viewH / zoom;
    const camX =
      bounds.width <= effW
        ? -(effW - bounds.width) / 2
        : Math.max(0, Math.min(bounds.width - effW, p.x - effW / 2));
    const camY =
      bounds.height <= effH
        ? -(effH - bounds.height) / 2
        : Math.max(0, Math.min(bounds.height - effH, p.y - effH / 2));

    const worldX = clickX / zoom + camX;
    const worldY = clickY / zoom + camY;

    // 1. Check if user clicked/tapped the Species Sanctuary Gate (East side at 1135, 410)
    if (worldX >= GATE_X - 67 && worldX <= GATE_X + 69 && worldY >= 335 && worldY <= 454) {
      walkOrOpenSpeciesGate();
      return;
    }

    // 1b. Check if user clicked/tapped the Room Archway / Portal — walk to gate before changing location
    if (Math.hypot(worldX - bounds.portalX, worldY - bounds.portalY) < 76) {
      pendingOpenGateRef.current = false;
      pendingOpenIdRef.current = null;
      p.targetMemorialId = null;
      p.targetX = bounds.portalX;
      p.targetY = bounds.portalY;
      setWalkMessage(
        room === 'tombstone'
          ? 'Walking to Ash Room Archway...'
          : 'Walking to Tombstone Garden Exit...'
      );
      setTimeout(() => setWalkMessage(''), 2200);
      return;
    }

    // 2. Check if user tapped an NPC to hear their next quote
    const tappedNpc = npcPosListRef.current.find(
      (n) => Math.hypot(worldX - n.x, worldY - n.y) < 32
    );
    if (tappedNpc) {
      pendingOpenGateRef.current = false;
      npcQuoteOffsetsRef.current[tappedNpc.id] = (npcQuoteOffsetsRef.current[tappedNpc.id] || 0) + 1;
      setWalkMessage(`💬 Listening to ${tappedNpc.name}...`);
      setTimeout(() => setWalkMessage(''), 1800);
      return;
    }

    // 3. Check if user tapped directly on a monument
    const tappedMonument = positionedMemorials.find(
      (m) => m.space === room && Math.hypot(worldX - m.worldX, worldY - m.worldY) < 48
    );

    if (tappedMonument) {
      pendingOpenGateRef.current = false;
      if (nearbyIdRef.current === tappedMonument.id) {
        setInspectedId(tappedMonument.id);
      } else {
        setInspectedId(null);
        pendingOpenIdRef.current = tappedMonument.id;
        p.targetX = tappedMonument.worldX;
        p.targetY = tappedMonument.worldY + 52;
        p.targetMemorialId = tappedMonument.id;
        setWalkMessage(`Walking to ${tappedMonument.name}...`);
        setTimeout(() => setWalkMessage(''), 2000);
      }
    } else {
      pendingOpenIdRef.current = null;
      pendingOpenGateRef.current = false;
      p.targetX = Math.max(46, Math.min(bounds.width - 46, worldX));
      p.targetY = Math.max(66, Math.min(bounds.height - 40, worldY));
      p.targetMemorialId = null;
    }
  };

  const setDpad = (dir, active) => {
    keysRef.current[dir] = active;
  };

  const nearbyMemorial = useMemo(
    () => positionedMemorials.find((m) => m.id === nearbyMemorialId) || null,
    [positionedMemorials, nearbyMemorialId]
  );

  const inspectedMemorial = useMemo(
    () => positionedMemorials.find((m) => m.id === inspectedId) || null,
    [positionedMemorials, inspectedId]
  );

  const worldHudNode = (
    <WorldHudBar
      isFullScreen={isFullScreen}
      onToggleFullScreen={handleToggleFullScreen}
      allMemorials={allMemorials}
      activeSpecies={activeSpecies}
      nearbyMemorialId={nearbyMemorialId}
      onSelectPet={handleWalkToPet}
      onOpenSpeciesGate={openSpeciesGate}
      onTriggerEmote={triggerEmote}
      showMeetupPanel={showMeetupPanel}
      onToggleMeetup={() => {
        setShowAvatarPanel(false);
        setShowMeetupPanel((v) => !v);
      }}
      mpPeersCount={
        mpPeers.filter(
          (p) =>
            (p.room || 'tombstone') === activeRoom &&
            (p.species || 'Dog') === activeSpecies
        ).length
      }
      showAvatarPanel={showAvatarPanel}
      onToggleAvatar={() => {
        setShowMeetupPanel(false);
        setShowAvatarPanel((v) => !v);
      }}
      onOpenUpdateModal={onOpenUpdateModal}
    />
  );

  const mobileHud = true;

  return (
    <div className={`world-container ${isFullScreen ? 'is-fullscreen' : ''}`}>
      {/* Non-fullscreen HUD bar sits above scene; Full Scene wraps menu cleanly inside scene */}
      {!isFullScreen && worldHudNode}

      {/* Interactive Canvas Viewport */}
      <div className="world-canvas-wrap">
        {isFullScreen && worldHudNode}
        <button
          type="button"
          className="world-fs-floating-btn"
          onClick={handleToggleFullScreen}
          aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <canvas
          ref={canvasRef}
          className="world-canvas"
          onClick={handleCanvasClick}
        />

        {/* Room Indicator & 2D Overview Zoom Slider */}
        <div className="world-room-pill" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            {activeRoom === 'ash-room'
              ? `🏛️ ${activeSpecies} Ash Room (Hall of Serenity)`
              : `🌿 ${activeSpecies} Tombstone Garden`}
          </span>
          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', cursor: 'pointer' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span>🔍 Zoom</span>
            <input
              type="range"
              min="0"
              max="100"
              value={zoomOverview}
              onChange={(e) => setZoomOverview(Number(e.target.value))}
              style={{ width: 84, accentColor: '#ffd57e' }}
              aria-label="2D Garden Overview Zoom"
            />
          </label>
        </div>

        {walkTipVisible && (
          <div
            className="armtip-notif world-walk-armtip"
            role="status"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              💡 Walk around using <strong>WASD</strong> or <strong>Arrow</strong> keyboard, click ground with <strong>Mouse</strong>, or use the <strong>Joystick</strong>!
            </span>
            <button
              type="button"
              className="world-walk-armtip-close"
              onClick={() => setWalkTipVisible(false)}
              aria-label="Close walk tip"
            >
              ×
            </button>
          </div>
        )}

        {/* Toast / Walk Message */}
        {walkMessage && (
          <div className="world-toast">
            <Sparkles size={14} /> {walkMessage}
          </div>
        )}

        {nearSpeciesGate && !nearbyMemorial && (
          <div className="world-portal-prompt">
            <button
              type="button"
              className="btn-primary"
              onClick={openSpeciesGate}
            >
              ⛩️ Visit Other Species Gate
            </button>
          </div>
        )}

        {/* Portal Doorway Prompt */}
        {nearPortal && !nearSpeciesGate && !nearbyMemorial && (
          <div className="world-portal-prompt">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const next = activeRoom === 'tombstone' ? 'ash-room' : 'tombstone';
                onChangeRoom(next);
              }}
            >
              <DoorOpen size={15} />
              {activeRoom === 'tombstone'
                ? 'Enter Indoor Ash Room'
                : 'Step Out to Tombstone Garden'}
            </button>
          </div>
        )}

        {/* Walk Controls: Touch Joystick in APK / Mobile Web, D-Pad on Desktop */}
        {mobileHud ? (
          <WorldJoystick
            atmosphere={atmosphere}
            onMove={(x, y) => {
              joystickRef.current = { x, y };
            }}
            onEmote={() =>
              atmosphere === 'morning' || atmosphere === 'dusk'
                ? triggerEmote('🌸', 'Holding mourning flower')
                : triggerEmote('🕯️', 'Holding lantern light')
            }
          />
        ) : (
          <div className="world-dpad" aria-label="Walk controls">
            <div />
            <button
              type="button"
              className="dpad-btn"
              onPointerDown={() => setDpad('up', true)}
              onPointerUp={() => setDpad('up', false)}
              onPointerLeave={() => setDpad('up', false)}
              onPointerCancel={() => setDpad('up', false)}
              aria-label="Walk up"
            >
              <ArrowUp size={16} />
            </button>
            <div />
            <button
              type="button"
              className="dpad-btn"
              onPointerDown={() => setDpad('left', true)}
              onPointerUp={() => setDpad('left', false)}
              onPointerLeave={() => setDpad('left', false)}
              onPointerCancel={() => setDpad('left', false)}
              aria-label="Walk left"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="dpad-btn center"
              onClick={() =>
                atmosphere === 'morning' || atmosphere === 'dusk'
                  ? triggerEmote('🌸', 'Holding mourning flower')
                  : triggerEmote('🕯️', 'Holding lantern light')
              }
              aria-label={atmosphere === 'morning' || atmosphere === 'dusk' ? 'Mourning flower emote' : 'Lantern emote'}
            >
              {atmosphere === 'morning' || atmosphere === 'dusk' ? '🌸' : '🏮'}
            </button>
            <button
              type="button"
              className="dpad-btn"
              onPointerDown={() => setDpad('right', true)}
              onPointerUp={() => setDpad('right', false)}
              onPointerLeave={() => setDpad('right', false)}
              onPointerCancel={() => setDpad('right', false)}
              aria-label="Walk right"
            >
              <ArrowRight size={16} />
            </button>
            <div />
            <button
              type="button"
              className="dpad-btn"
              onPointerDown={() => setDpad('down', true)}
              onPointerUp={() => setDpad('down', false)}
              onPointerLeave={() => setDpad('down', false)}
              onPointerCancel={() => setDpad('down', false)}
              aria-label="Walk down"
            >
              <ArrowDown size={16} />
            </button>
            <div />
          </div>
        )}

        {/* Nearby Popup Note (Tap to Open Vigil Card) */}
        {nearbyMemorial && !inspectedMemorial && (
          <button
            type="button"
            className="world-nearby-note"
            onClick={() => setInspectedId(nearbyMemorial.id)}
          >
            {nearbyMemorial.photo ? (
              <img
                src={nearbyMemorial.photo}
                alt={nearbyMemorial.name || 'Pet'}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <span>
              🕯️ Near {nearbyMemorial.name || 'Pet'} ({nearbyMemorial.locationCode || 'Sanctuary'}) — Tap to Visit / Give Flower
            </span>
          </button>
        )}

        {/* Closable Vigil Encounter Card (Reverted clean 3-button layout) */}
        {inspectedMemorial && (
          <div className="world-proximity-card">
            <button
              type="button"
              className="vigil-close-btn"
              onClick={() => setInspectedId(null)}
              aria-label="Close vigil card"
            >
              <X size={14} />
            </button>
            {inspectedMemorial.photo ? (
              <img
                src={inspectedMemorial.photo}
                alt={inspectedMemorial.name || 'Pet'}
                className="proximity-pet-photo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div className="proximity-info">
              <div className="proximity-title-row">
                <strong>{inspectedMemorial.name || 'Beloved Pet'}</strong>
                <span className="location-badge">{inspectedMemorial.locationCode || 'Sanctuary'}</span>
                <span className="location-badge">👣 {inspectedMemorial.visitsCount || 0} visits</span>
              </div>
              <p className="proximity-epitaph">“{inspectedMemorial.epitaph || 'Forever loved and remembered'}”</p>
              {armtipText && <div className="armtip-notif">{armtipText}</div>}
              <div className="proximity-actions">
                <button
                  type="button"
                  className={`btn-ghost ${
                    userKey &&
                    hasGivenToday(userKey, inspectedMemorial.id, 'candle')
                      ? 'btn-given-today'
                      : ''
                  }`}
                  onClick={() => performQuickOffering(inspectedMemorial, OFFERING_TYPES.candle)}
                >
                  🕯️ Candle ({inspectedMemorial.candlesCount || 0})
                  {userKey &&
                  hasGivenToday(userKey, inspectedMemorial.id, 'candle')
                    ? ' ✓'
                    : ''}
                </button>
                <button
                  type="button"
                  className={`btn-ghost ${
                    userKey &&
                    hasGivenToday(userKey, inspectedMemorial.id, 'flower')
                      ? 'btn-given-today'
                      : ''
                  }`}
                  onClick={() =>
                    performQuickOffering(inspectedMemorial, OFFERING_TYPES.flowers[0])
                  }
                >
                  🌸 Give Flower ({inspectedMemorial.flowersCount || 0})
                  {userKey &&
                  hasGivenToday(userKey, inspectedMemorial.id, 'flower')
                    ? ' ✓'
                    : ''}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setInspectedId(null);
                    onSelectMemorial(inspectedMemorial.id);
                  }}
                >
                  💌 Visit &amp; Leave Message
                </button>
                {onToggleFavorite && (
                  <button
                    type="button"
                    className={(favorites || []).includes(inspectedMemorial.id) ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => onToggleFavorite(inspectedMemorial.id)}
                  >
                    {(favorites || []).includes(inspectedMemorial.id) ? '💖 Favorited' : '🤍 Favorite'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Avatar Customizer Drawer */}
        {showAvatarPanel && (
          <AvatarCustomizerDrawer
            avatar={avatar}
            userPets={userPets}
            onUpdateAvatar={(patch) => setAvatar((a) => ({ ...a, ...patch }))}
            onClose={() => setShowAvatarPanel(false)}
          />
        )}

        <MultiplayerMeetupHUD
          isApk={isApk}
          isMobileHud={mobileHud}
          showDrawer={showMeetupPanel}
          onCloseDrawer={() => setShowMeetupPanel(false)}
          mpPeers={mpPeers}
          mpStatus={mpStatus}
          mpOnline={mpOnline}
          mpRoomCode={mpRoomCode}
          mpNickname={mpNickname}
          mpChatLog={mpChatLog}
          activeGroup={activeGroup}
          groupChatLog={groupChatLog}
          showOutsideChat={showOutsideChat}
          favorites={favorites}
          friends={friends}
          friendRequests={friendRequests}
          groupInvites={groupInvites}
          accountsList={accountsList}
          currentUser={currentUser}
          currentRoom={activeRoom}
          activeSpecies={activeSpecies}
          speciesEmoji={getSpeciesEmoji(activeSpecies)}
          hideBottomChatBar={Boolean(inspectedMemorial || showMeetupPanel || nearSpeciesGate || nearPortal)}
          onToggleMpOnline={onToggleMpOnline}
          onToggleOutsideChat={onToggleOutsideChat}
          showOnlyFavorites={showOnlyFavorites}
          onToggleShowFavorites={onToggleShowFavorites}
          onToggleFriend={onToggleFriend}
          onAcceptFriendRequest={onAcceptFriendRequest}
          onIgnoreFriendRequest={onIgnoreFriendRequest}
          onCancelFriendRequest={onCancelFriendRequest}
          onInviteFriendToGroup={onInviteFriendToGroup}
          onAcceptInvite={onAcceptInvite}
          onIgnoreInvite={onIgnoreInvite}
          onChangeMpRoom={onChangeMpRoom}
          isMuted={Boolean(moderationStatus?.muted)}
          muteLabel={moderationStatus?.muteLabel || ''}
          onCreateGroup={onCreateGroup}
          onJoinGroup={onJoinGroup}
          onExitGroup={onExitGroup}
          onSendGroupChat={onSendGroupChat}
          onSendChat={onSendChat}
          onSendEmote={(em, label) => triggerEmote(em, label)}
          onWalkToPeer={handleWalkToPeer}
        />
      </div>

      {showSpeciesGate && (
        <SpeciesGateModal
          activeSpecies={activeSpecies}
          allMemorials={allMemorials}
          onSelectSpecies={(sp) => {
            startWalkToSpeciesGate(sp);
          }}
          onClose={() => setShowSpeciesGate(false)}
        />
      )}
    </div>
  );
}
