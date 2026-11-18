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
  Video,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import {
  OFFERING_TYPES,
  getSpeciesEmoji,
  GARDEN_NPCS_DATA,
  ASH_NPCS_DATA,
  stepBandNpcs,
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
  drawAvatarHeadAndHair,
  drawMourningFlower,
  drawWrappedSpeechBubble,
  drawCachedPetPortrait,
} from '../utils/avatarRenderer';
import MultiplayerMeetupHUD from './MultiplayerMeetupHUD';
import AvatarCustomizerDrawer from './AvatarCustomizerDrawer';
import SpeciesGateModal from './SpeciesGateModal';
import WorldJoystick from './WorldJoystick';
import WorldHudBar from './WorldHudBar';

const AVATAR_STORAGE_KEY = 'evergreen_paws_avatar_v1';

const CAMERA_PRESETS = {
  follow: { label: 'Follow', dist: 235, height: 145, pitch: 0.36 },
  close: { label: 'Close', dist: 155, height: 95, pitch: 0.25 },
  high: { label: 'Overview', dist: 330, height: 245, pitch: 0.54 },
};

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
    // ignore
  }
  return DEFAULT_AVATAR;
}

// 10 tombs max on left row + 10 tombs max on right row = 20 per row (10 rows = 200 max)
// 135-unit column spacing & 250-unit row spacing leaves ~1 full tomb plot of empty space between plots
const COLS_3D = [
  -1400, -1265, -1130, -995, -860, -725, -590, -455, -320, -185,
  185, 320, 455, 590, 725, 860, 995, 1130, 1265, 1400,
];

export default function ParkWorld3D({
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
  const [cameraMode, setCameraMode] = useState('follow');
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
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
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
    if (Math.hypot(p.x - 460, p.z - 0) < 54) {
      p.x = 355;
      p.z = 0;
    }
    p.targetX = 460;
    p.targetZ = 0;
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
    playerRef.current.targetX = 415;
    playerRef.current.targetZ = 0;
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
    x: getLocalSpawnOffset(),
    z: activeRoom === 'ash-room' ? 235 : 190,
    facingX: 0,
    facingZ: -1,
    bob: 0,
    moving: false,
    targetX: null,
    targetZ: null,
    history: [],
    portalCooldownUntil: 0,
  });

  const camRef = useRef({
    yaw: 0,
    preset: 'follow',
  });

  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    rotLeft: false,
    rotRight: false,
  });
  const joystickRef = useRef({ x: 0, y: 0 });

  const dragRef = useRef({
    active: false,
    startX: 0,
    startYaw: 0,
    moved: false,
  });

  const screenHitsRef = useRef([]);
  const gateScreenHitRef = useRef(null);
  const portalScreenHitRef = useRef(null);
  const npcScreenHitsRef = useRef([]);
  const showOutsideChatRef = useRef(showOutsideChat);
  showOutsideChatRef.current = showOutsideChat;
  const npcQuoteOffsetsRef = useRef({});
  const npcSimRef = useRef({ tombstone: [], 'ash-room': [] });
  const particlesRef = useRef([]);
  const weatherParticlesRef = useRef([]);
  const lightningFlashRef = useRef(0);
  const nextLightningRef = useRef(performance.now() + 4000);
  const roomRef = useRef(activeRoom);
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
  const maxZRef = useRef(360);

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
      // ignore
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
        spawnFloatingParticles(target.worldX, 34, target.worldZ, remoteWorldEvent.emoji || '✨', 6);
      }
    } else if (Number.isFinite(remoteWorldEvent.nx) && Number.isFinite(remoteWorldEvent.nz)) {
      spawnFloatingParticles(remoteWorldEvent.nx, 38, remoteWorldEvent.nz, remoteWorldEvent.emoji || '✨', 6);
    }
    if (remoteWorldEvent.text) {
      setWalkMessage(remoteWorldEvent.text);
      setTimeout(() => setWalkMessage(''), 2600);
    }
  }, [remoteWorldEvent]);

  useEffect(() => {
    const p = playerRef.current;
    if (speciesRef.current !== activeSpecies) {
      speciesRef.current = activeSpecies;
      pendingTargetSpeciesRef.current = null;
      p.targetX = null;
      p.targetZ = null;
      p.portalCooldownUntil = performance.now() + 900;
      p.x = getLocalSpawnOffset();
      p.z = -225;
      p.facingX = 0;
      p.facingZ = 1;
      camRef.current.yaw = 0;
      p.history = [];
      setInspectedId(null);
      setNearbyMemorialId(null);
      nearbyIdRef.current = null;
    }
    updateLocalPresence({
      name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
      room: roomRef.current,
      species: activeSpecies,
      nx: p.x,
      nz: p.z,
      facingX: p.facingX,
      facingZ: p.facingZ,
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

  useEffect(() => {
    camRef.current.preset = cameraMode;
  }, [cameraMode]);

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
    if (roomRef.current !== activeRoom) {
      roomRef.current = activeRoom;
      const p = playerRef.current;
      p.targetX = null;
      p.targetZ = null;
      p.portalCooldownUntil = performance.now() + 900;
      p.x = getLocalSpawnOffset();
      p.z = -225;
      camRef.current.yaw = 0;
      p.history = [];
    }
  }, [activeRoom]);

  useEffect(() => {
    if (!walkToRoomRequest || walkToRoomRequest === roomRef.current) {
      if (walkToRoomRequest && onClearWalkToRoomRequest) onClearWalkToRoomRequest();
      return;
    }
    const p = playerRef.current;
    const portalZ = roomRef.current === 'tombstone' ? -320 : 320;
    pendingOpenGateRef.current = false;
    pendingOpenIdRef.current = null;
    p.targetX = 0;
    p.targetZ = portalZ;
    setWalkMessage(
      walkToRoomRequest === 'ash-room'
        ? 'Walking to Ash Room Archway...'
        : 'Walking to Tombstone Garden Exit...'
    );
    setTimeout(() => setWalkMessage(''), 2400);
    if (onClearWalkToRoomRequest) onClearWalkToRoomRequest();
  }, [walkToRoomRequest, onClearWalkToRoomRequest]);

  const positionedMemorials = useMemo(() => {
    const sortSeq = (a, b) => {
      const na = parseInt((a.locationCode || '').match(/(\d+)\s*$/)?.[1] || '9999', 10);
      const nb = parseInt((b.locationCode || '').match(/(\d+)\s*$/)?.[1] || '9999', 10);
      if (na !== nb) return na - nb;
      return String(a.id).localeCompare(String(b.id));
    };

    const tombstones = memorials.filter((m) => m.space === 'tombstone').sort(sortSeq);
    const ashNiches = memorials.filter((m) => m.space === 'ash-room').sort(sortSeq);
    const list = [];
    tombstones.forEach((m, idx) => {
      const n = parseInt((m.locationCode || '').match(/(\d+)\s*$/)?.[1] || '', 10);
      const slot = Number.isFinite(n) && n >= 1 && n <= 200 ? n - 1 : Math.min(199, 20 + idx);
      const col = COLS_3D[slot % COLS_3D.length];
      const row = Math.floor(slot / COLS_3D.length);
      list.push({ ...m, worldX: col, worldZ: -170 + row * 250 });
    });
    ashNiches.forEach((m, idx) => {
      const n = parseInt((m.locationCode || '').match(/(\d+)\s*$/)?.[1] || '', 10);
      const slot = Number.isFinite(n) && n >= 1 && n <= 200 ? n - 1 : Math.min(199, 20 + idx);
      const col = COLS_3D[slot % COLS_3D.length];
      const row = Math.floor(slot / COLS_3D.length);
      list.push({ ...m, worldX: col, worldZ: -170 + row * 250 });
    });
    return list;
  }, [memorials]);

  const positionedRef = useRef(positionedMemorials);
  useEffect(() => {
    positionedRef.current = positionedMemorials;
    const activeList = positionedMemorials.filter((m) => m.space === roomRef.current);
    const maxMonZ = activeList.reduce((mx, m) => Math.max(mx, m.worldZ), 200);
    maxZRef.current = Math.max(2200, maxMonZ + 220);
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
    p.targetZ = found.worldZ + 56;
    setWalkMessage(`Walking in 3D to ${found.name} (${found.locationCode})...`);
    setTimeout(() => setWalkMessage(''), 2400);
  }, [
    walkToMemorialRequest,
    positionedMemorials,
    activeSpecies,
    activeRoom,
    onChangeRoom,
    onClearWalkToMemorialRequest,
  ]);

  const spawnFloatingParticles = (wx, wy, wz, emoji, count = 5) => {
    for (let i = 0; i < count; i += 1) {
      particlesRef.current.push({
        x: wx + (Math.random() - 0.5) * 26,
        y: wy + Math.random() * 14,
        z: wz + (Math.random() - 0.5) * 26,
        vx: (Math.random() - 0.5) * 14,
        vy: 28 + Math.random() * 18,
        vz: (Math.random() - 0.5) * 14,
        emoji,
        life: 1.3 + Math.random() * 0.4,
      });
    }
  };

  const triggerEmote = (emoji, label) => {
    const p = playerRef.current;
    spawnFloatingParticles(p.x, 42, p.z, emoji, 6);
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
      p.portalCooldownUntil = performance.now() + 900;
      p.targetX = Math.max(-480, Math.min(480, (peer.nx || 0) + 34));
      p.targetZ = Math.max(-340, Math.min(340, (peer.nz || 0) + 28));
      setWalkMessage(`Walking in 3D to ${peer.name}...`);
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
        p.targetZ = found.worldZ + 56;
        setWalkMessage(`Walking in 3D to ${found.name} (${found.locationCode})...`);
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
      spawnFloatingParticles(target.worldX, 34, target.worldZ, offering.emoji, 6);
    }
    onPerformOffering(memorial.id, offering);
    setWalkMessage(`You ${offering.blessing} for ${memorial.name || 'this pet'}`);
    setTimeout(() => setWalkMessage(''), 2400);
  };

  const cycleCameraPreset = () => {
    setCameraMode((prev) =>
      prev === 'follow' ? 'close' : prev === 'close' ? 'high' : 'follow'
    );
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
      if (e.key === 'q' || e.key === 'Q') keysRef.current.rotLeft = down;
      if (e.key === 'r' || e.key === 'R') keysRef.current.rotRight = down;

      if (down && (e.key === 'e' || e.key === 'E' || e.key === 'Enter')) {
        if (nearbyIdRef.current) onSelectMemorial(nearbyIdRef.current);
        else if (nearGateRef.current) openSpeciesGate();
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

  // 3D Render Loop
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const frame = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(frame);
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

      // Camera orbit keys
      if (keysRef.current.rotLeft) camRef.current.yaw -= 1.8 * dt;
      if (keysRef.current.rotRight) camRef.current.yaw += 1.8 * dt;

      const yaw = camRef.current.yaw;
      const dirX = Math.sin(yaw);
      const dirZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = Math.sin(yaw);

      const p = playerRef.current;
      const speed = 195;

      // Camera-relative movement (keyboard, D-pad, or APK analog joystick)
      let moveForward = -joystickRef.current.y;
      let moveRight = joystickRef.current.x;
      if (keysRef.current.up) moveForward += 1;
      if (keysRef.current.down) moveForward -= 1;
      if (keysRef.current.right) moveRight += 1;
      if (keysRef.current.left) moveRight -= 1;
      const inputMag = Math.min(1, Math.hypot(moveForward, moveRight));

      if (inputMag > 0.01) {
        p.targetX = null;
        p.targetZ = null;
        pendingOpenIdRef.current = null;
        pendingOpenGateRef.current = false;
        pendingTargetSpeciesRef.current = null;
        let vx = dirX * moveForward + rightX * moveRight;
        let vz = dirZ * moveForward + rightZ * moveRight;
        const len = Math.hypot(vx, vz) || 1;
        vx /= len;
        vz /= len;
        p.x += vx * speed * inputMag * dt;
        p.z += vz * speed * inputMag * dt;
        p.facingX = vx;
        p.facingZ = vz;
        p.moving = true;
        p.bob += dt * 12;
      } else if (p.targetX !== null && p.targetZ !== null) {
        const dx = p.targetX - p.x;
        const dz = p.targetZ - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 8) {
          const vx = dx / dist;
          const vz = dz / dist;
          p.x += vx * speed * dt;
          p.z += vz * speed * dt;
          p.facingX = vx;
          p.facingZ = vz;
          p.moving = true;
          p.bob += dt * 12;
        } else {
          p.targetX = null;
          p.targetZ = null;
          p.moving = false;
        }
      } else {
        p.moving = false;
      }

      // Clamp 3D world bounds (expanding dynamically as more memorials are added)
      const maxZ = maxZRef.current;
      p.x = Math.max(-1500, Math.min(1500, p.x));
      p.z = Math.max(-360, Math.min(maxZ, p.z));

      if (p.moving || p.history.length === 0) {
        p.history.unshift({ x: p.x, z: p.z });
        if (p.history.length > 28) p.history.pop();
      }

      const room = roomRef.current;
      updateLocalPresence({
        name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
        room,
        species: speciesRef.current,
        nx: p.x,
        nz: p.z,
        facingX: p.facingX,
        facingZ: p.facingZ,
        moving: p.moving,
        avatar: avatarRef.current,
      });
      const portalZ = -320;
      const portalDist = Math.hypot(p.x - 0, p.z - portalZ);
      const isNearPortalNow = portalDist < 95;
      if (isNearPortalNow !== nearPortalRef.current) {
        nearPortalRef.current = isNearPortalNow;
        setNearPortal(isNearPortalNow);
      }

      const gateDist = Math.hypot(p.x - 460, p.z - 0);
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
        p.targetZ = null;
        p.x = getLocalSpawnOffset();
        p.z = -225;
        p.facingX = 0;
        p.facingZ = 1;
        camRef.current.yaw = 0;
        p.history = [];
        updateLocalPresence({
          name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
          room,
          species: nextSpecies,
          nx: p.x,
          nz: p.z,
          facingX: p.facingX,
          facingZ: p.facingZ,
          moving: false,
          avatar: avatarRef.current,
          force: true,
        });
        if (onSelectSpeciesRef.current) onSelectSpeciesRef.current(nextSpecies);
        spawnFloatingParticles(p.x, 38, p.z, getSpeciesEmoji(nextSpecies), 7);
        setWalkMessage(`⛩️ Entered ${getSpeciesEmoji(nextSpecies)} ${nextSpecies} Gates`);
        setTimeout(() => setWalkMessage(''), 2400);
        animId = requestAnimationFrame(frame);
        return;
      }
      if (isNearGateNow && pendingOpenGateRef.current) {
        pendingOpenGateRef.current = false;
        p.targetX = null;
        p.targetZ = null;
        p.moving = false;
        if (openSpeciesGateRef.current) openSpeciesGateRef.current();
      }

      if (portalDist < 44 && now > p.portalCooldownUntil) {
        const nextRoom = room === 'tombstone' ? 'ash-room' : 'tombstone';
        p.portalCooldownUntil = now + 1100;
        roomRef.current = nextRoom;
        onChangeRoom(nextRoom);
        p.targetX = null;
        p.targetZ = null;
        p.x = getLocalSpawnOffset();
        p.z = -225;
        camRef.current.yaw = 0;
        p.history = [];
        updateLocalPresence({
          name: mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor',
          room: nextRoom,
          species: speciesRef.current,
          nx: p.x,
          nz: p.z,
          facingX: p.facingX,
          facingZ: p.facingZ,
          moving: false,
          avatar: avatarRef.current,
          force: true,
        });
        animId = requestAnimationFrame(frame);
        return;
      }

      // Proximity to 3D monuments (78-unit radius so spacious vigils never overlap)
      const roomMemorials = positionedRef.current.filter((m) => m.space === room);
      let closest = null;
      let closestDist = 78;
      for (const m of roomMemorials) {
        const d = Math.hypot(p.x - m.worldX, p.z - m.worldZ);
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

      // 3D Camera Setup (with zoom slider: 0 = current view, 100 = full 200-plot overview)
      const baseCfg = CAMERA_PRESETS[camRef.current.preset] || CAMERA_PRESETS.follow;
      const zt = Math.max(0, Math.min(1, zoomOverviewRef.current / 100));
      const cfg = {
        dist: baseCfg.dist + (1950 - baseCfg.dist) * zt,
        height: baseCfg.height + (2250 - baseCfg.height) * zt,
        pitch: baseCfg.pitch + (0.92 - baseCfg.pitch) * zt,
      };
      const camX = p.x - dirX * cfg.dist;
      const camZ = p.z - dirZ * cfg.dist;
      const camY = cfg.height;
      const pitch = cfg.pitch;
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const fov = Math.min(viewW, viewH) * 1.18;
      const horizonY = viewH * 0.52 - (sinP / cosP) * fov;

      const project3D = (wx, wy, wz) => {
        const rx = wx - camX;
        const ry = wy - camY;
        const rz = wz - camZ;
        const cx = rx * rightX + rz * rightZ;
        const depth = rx * dirX + rz * dirZ;
        const cz = depth * cosP - ry * sinP;
        const cy = ry * cosP + depth * sinP;
        if (cz <= 15) return null;
        const scale = fov / cz;
        return {
          sx: viewW / 2 + cx * scale,
          sy: viewH * 0.52 - cy * scale,
          scale,
          cz,
        };
      };

      // ====================
      // DRAW 3D SKY & GROUND HORIZON
      // ====================
      const atm = atmosphereRef.current;
      const curSeason = seasonRef.current;
      const curWeather = weatherRef.current;
      const horizonClamp = Math.max(40, Math.min(viewH * 0.65, horizonY));

      if (room === 'tombstone') {
        const sky = ctx.createLinearGradient(0, 0, 0, horizonClamp + 20);
        if (curWeather === 'thunderstorm' || curWeather === 'rain') {
          if (atm === 'night') {
            sky.addColorStop(0, '#060a10');
            sky.addColorStop(1, '#14202b');
          } else {
            sky.addColorStop(0, '#3a4956');
            sky.addColorStop(1, '#687985');
          }
        } else if (atm === 'morning') {
          sky.addColorStop(0, curSeason === 'winter' ? '#85a7ba' : '#6ba3be');
          sky.addColorStop(1, curSeason === 'autumn' ? '#eed8c2' : '#dcebd5');
        } else if (atm === 'dusk') {
          sky.addColorStop(0, '#2c2233');
          sky.addColorStop(0.65, '#7c4e56');
          sky.addColorStop(1, '#d99a6c');
        } else {
          sky.addColorStop(0, '#09111b');
          sky.addColorStop(1, '#1a2f3d');
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, viewW, horizonClamp + 16);

        // Orbiting Sun / Moon Shine & Stars
        const celestialX = ((viewW * 0.5 - yaw * 180) % (viewW + 160) + viewW + 160) % (viewW + 160) - 80;
        const celestialY = Math.max(36, horizonClamp * 0.42);
        if (atm === 'night' || atm === 'dusk') {
          ctx.fillStyle = 'rgba(255, 244, 214, 0.72)';
          for (let i = 0; i < 22; i += 1) {
            const sx = ((i * 97 - yaw * 130) % viewW + viewW) % viewW;
            const sy = 18 + ((i * 53) % Math.max(30, horizonClamp - 25));
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
        if (curWeather === 'clear' && atm === 'night') {
          const moonHalo = ctx.createRadialGradient(
            celestialX,
            celestialY,
            10,
            celestialX,
            celestialY,
            88
          );
          moonHalo.addColorStop(0, 'rgba(255, 246, 208, 0.65)');
          moonHalo.addColorStop(0.4, 'rgba(216, 232, 255, 0.22)');
          moonHalo.addColorStop(1, 'rgba(216, 232, 255, 0)');
          ctx.fillStyle = moonHalo;
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, 88, 0, Math.PI * 2);
          ctx.fill();

          // Moonshine beam across the horizon
          const beam = ctx.createLinearGradient(celestialX, celestialY, celestialX, viewH);
          beam.addColorStop(0, 'rgba(235, 244, 255, 0.14)');
          beam.addColorStop(1, 'rgba(235, 244, 255, 0)');
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.moveTo(celestialX - 24, celestialY);
          ctx.lineTo(celestialX + 24, celestialY);
          ctx.lineTo(celestialX + 120, viewH);
          ctx.lineTo(celestialX - 120, viewH);
          ctx.closePath();
          ctx.fill();
        } else if (curWeather === 'clear' && (atm === 'morning' || atm === 'dusk')) {
          const sunHalo = ctx.createRadialGradient(celestialX, celestialY, 10, celestialX, celestialY, 72);
          sunHalo.addColorStop(0, 'rgba(255, 232, 168, 0.52)');
          sunHalo.addColorStop(1, 'rgba(255, 232, 168, 0)');
          ctx.fillStyle = sunHalo;
          ctx.beginPath();
          ctx.arc(celestialX, celestialY, 72, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = atm === 'night' ? '#f8f0d8' : '#ffdf9e';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, atm === 'night' ? 18 : 22, 0, Math.PI * 2);
        ctx.fill();

        const ground = ctx.createLinearGradient(0, horizonClamp, 0, viewH);
        const seasonGrass = {
          spring: { morning: ['#6fa66e', '#4c7c4d'], dusk: ['#475d43', '#2a3c2b'], night: ['#192a22', '#0e1914'] },
          summer: { morning: ['#579654', '#396b3a'], dusk: ['#3e563a', '#233623'], night: ['#15281d', '#0b1710'] },
          autumn: { morning: ['#948b53', '#6e6437'], dusk: ['#5f4e37', '#3c3021'], night: ['#24221a', '#14130e'] },
          winter: { morning: ['#d2dfe3', '#aebfc6'], dusk: ['#6a7d8a', '#4a5a66'], night: ['#223340', '#14202a'] },
        }[curSeason] || { morning: ['#6c9c6b', '#477249'], dusk: ['#445740', '#283829'], night: ['#192a22', '#0e1914'] };
        const [gTop, gBot] = seasonGrass[atm] || seasonGrass.dusk;
        ground.addColorStop(0, gTop);
        ground.addColorStop(1, gBot);
        ctx.fillStyle = ground;
        ctx.fillRect(0, horizonClamp, viewW, viewH - horizonClamp);
      } else {
        // Indoor Ash Room ceiling & timber floor
        const ceil = ctx.createLinearGradient(0, 0, 0, horizonClamp + 20);
        ceil.addColorStop(0, '#140d0a');
        ceil.addColorStop(1, '#2d1e17');
        ctx.fillStyle = ceil;
        ctx.fillRect(0, 0, viewW, horizonClamp + 16);

        const floor = ctx.createLinearGradient(0, horizonClamp, 0, viewH);
        floor.addColorStop(0, '#2a1c15');
        floor.addColorStop(1, '#422c20');
        ctx.fillStyle = floor;
        ctx.fillRect(0, horizonClamp, viewW, viewH - horizonClamp);
      }

      // Helper for 3D Projected Ground Quads
      const drawGroundPoly = (pts, fill, stroke) => {
        const proj = pts.map(([wx, wy, wz]) => project3D(wx, wy, wz));
        if (proj.some((pt) => pt === null)) return;
        ctx.beginPath();
        ctx.moveTo(proj[0].sx, proj[0].sy);
        for (let i = 1; i < proj.length; i += 1) {
          ctx.lineTo(proj[i].sx, proj[i].sy);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      // Draw 3D Ground Grid & Paths
      if (room === 'tombstone') {
        // Subtle meadow grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let gx = -1600; gx <= 1600; gx += 160) {
          const a = project3D(gx, 0, -360);
          const b = project3D(gx, 0, maxZ);
          if (a && b) {
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
        // Expanded Main Stone Walkway along Z
        const pathColor = atm === 'night' ? '#3d4952' : '#c6bea9';
        for (let pz = -330; pz < maxZ - 20; pz += 66) {
          drawGroundPoly(
            [
              [-72, 0, pz],
              [72, 0, pz],
              [72, 0, pz + 66],
              [-72, 0, pz + 66],
            ],
            pathColor,
            'rgba(0,0,0,0.12)'
          );
        }
        // Expanded Cross paths spanning all 10+10 columns
        for (let cz = -45; cz < maxZ - 40; cz += 250) {
          for (let px = -1440; px < 1440; px += 180) {
            drawGroundPoly(
              [
                [px, 0, cz - 28],
                [px + 180, 0, cz - 28],
                [px + 180, 0, cz + 28],
                [px, 0, cz + 28],
              ],
              pathColor,
              'rgba(0,0,0,0.08)'
            );
          }
        }
        // 3D Reflection Pools at every 3-row road interval (with 3-7 jumping fish each)
        [-45, 705, 1455].forEach((poolZ) => {
          const pondPts = [];
          for (let a = 0; a < 14; a += 1) {
            const ang = (a / 14) * Math.PI * 2;
            pondPts.push([Math.cos(ang) * 86, 0.5, poolZ + Math.sin(ang) * 48]);
          }
          drawGroundPoly(
            pondPts,
            atm === 'night' ? '#1c4259' : '#589ab3',
            'rgba(180,225,240,0.4)'
          );
        });
      } else {
        // Ash Room Crimson & Gold Sanctuary Runners (10 rows: 10 left + 10 right niches = 200)
        for (let pz = -300; pz < maxZ - 20; pz += 62) {
          drawGroundPoly(
            [
              [-64, 0.5, pz],
              [64, 0.5, pz],
              [64, 0.5, pz + 62],
              [-64, 0.5, pz + 62],
            ],
            '#5e262b',
            '#d4a853'
          );
        }
        for (let row = 0; row < 10; row += 1) {
          const rz = -170 + row * 250;
          for (let px = -1440; px < 1440; px += 180) {
            drawGroundPoly(
              [
                [px, 0.5, rz - 36],
                [px + 180, 0.5, rz - 36],
                [px + 180, 0.5, rz + 36],
                [px, 0.5, rz + 36],
              ],
              '#5e262b',
              '#d4a853'
            );
          }
        }
      }

      // Helper for Extruded 3D Box
      const draw3DBox = (cx, baseY, cz, w, h, d, colors) => {
        const hw = w / 2;
        const hd = d / 2;
        const corners = [
          project3D(cx - hw, baseY, cz - hd), // 0: bfl
          project3D(cx + hw, baseY, cz - hd), // 1: bfr
          project3D(cx + hw, baseY, cz + hd), // 2: bbr
          project3D(cx - hw, baseY, cz + hd), // 3: bbl
          project3D(cx - hw, baseY + h, cz - hd), // 4: tfl
          project3D(cx + hw, baseY + h, cz - hd), // 5: tfr
          project3D(cx + hw, baseY + h, cz + hd), // 6: tbr
          project3D(cx - hw, baseY + h, cz + hd), // 7: tbl
        ];
        if (corners.some((c) => c === null)) return null;

        const faces = [
          { idx: [4, 5, 6, 7], col: colors.top },
          { idx: [0, 1, 5, 4], col: colors.front },
          { idx: [2, 3, 7, 6], col: colors.back || colors.front },
          { idx: [1, 2, 6, 5], col: colors.side },
          { idx: [3, 0, 4, 7], col: colors.side },
        ];

        // Sort faces back-to-front by avg cz
        faces.sort((a, b) => {
          const za = a.idx.reduce((s, i) => s + corners[i].cz, 0) / 4;
          const zb = b.idx.reduce((s, i) => s + corners[i].cz, 0) / 4;
          return zb - za;
        });

        faces.forEach((f) => {
          ctx.beginPath();
          ctx.moveTo(corners[f.idx[0]].sx, corners[f.idx[0]].sy);
          for (let k = 1; k < 4; k += 1) {
            ctx.lineTo(corners[f.idx[k]].sx, corners[f.idx[k]].sy);
          }
          ctx.closePath();
          ctx.fillStyle = f.col;
          ctx.fill();
          ctx.strokeStyle = colors.stroke || 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        return project3D(cx, baseY + h + 8, cz);
      };

      // ====================
      // BUILD 3D RENDER QUEUE (PAINTER'S ALGORITHM)
      // ====================
      const drawList = [];
      const pushEntity = (wx, wz, renderFn) => {
        const pr = project3D(wx, 0, wz);
        if (pr) drawList.push({ cz: pr.cz, render: renderFn });
      };

      // 1. Portal Archway
      let nextPortalHit = null;
      pushEntity(0, portalZ, () => {
        if (room === 'tombstone') {
          draw3DBox(-44, 0, portalZ, 22, 88, 22, {
            top: '#8c725a',
            front: '#6e5642',
            side: '#513d2e',
          });
          draw3DBox(44, 0, portalZ, 22, 88, 22, {
            top: '#8c725a',
            front: '#6e5642',
            side: '#513d2e',
          });
          const labelPt = draw3DBox(0, 82, portalZ, 124, 22, 26, {
            top: '#a58465',
            front: '#7b5f47',
            side: '#584130',
          });
          const pMid = project3D(0, 42, portalZ);
          if (pMid) {
            ctx.fillStyle = 'rgba(255, 206, 120, 0.32)';
            ctx.beginPath();
            ctx.ellipse(pMid.sx, pMid.sy, 32 * pMid.scale, 38 * pMid.scale, 0, 0, Math.PI * 2);
            ctx.fill();
            nextPortalHit = {
              sx: pMid.sx,
              sy: pMid.sy,
              radius: Math.max(58, 72 * pMid.scale),
              portalZ,
            };
          }
          if (labelPt) {
            ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#ffe5ad';
            ctx.textAlign = 'center';
            ctx.fillText('🏛️ Hall of Serenity (Ash Room)', labelPt.sx, labelPt.sy - 6);
          }
        } else {
          draw3DBox(-42, 0, portalZ, 18, 76, 18, {
            top: '#52785d',
            front: '#3a5c44',
            side: '#284230',
          });
          draw3DBox(42, 0, portalZ, 18, 76, 18, {
            top: '#52785d',
            front: '#3a5c44',
            side: '#284230',
          });
          const labelPt = draw3DBox(0, 72, portalZ, 112, 18, 20, {
            top: '#6d9678',
            front: '#446b50',
            side: '#2d4a36',
          });
          const pMid = project3D(0, 38, portalZ);
          if (pMid) {
            nextPortalHit = {
              sx: pMid.sx,
              sy: pMid.sy,
              radius: Math.max(56, 68 * pMid.scale),
              portalZ,
            };
          }
          if (labelPt) {
            ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#d7f4db';
            ctx.textAlign = 'center';
            ctx.fillText('🌿 Exit to Tombstone Garden', labelPt.sx, labelPt.sy - 6);
          }
        }
      });

      // 2. Decorative 3D Environment Props
      if (room === 'tombstone') {
        // Jumping fish (3-7 per pool) & flanking benches at every 3-row pool
        [-45, 705, 1455].forEach((poolZ, pIdx) => {
          const fishCount = 3 + ((pIdx * 3 + 2) % 5);
          for (let f = 0; f < fishCount; f += 1) {
            const seed = pIdx * 19 + f * 7;
            const fx = Math.cos(now * 0.0009 + seed) * (46 - (f % 3) * 10);
            const fz = poolZ + Math.sin(now * 0.0011 + seed * 0.7) * (22 - (f % 2) * 6);
            const jumpWave = Math.sin(now * (0.0022 + (seed % 5) * 0.0004) + seed * 1.3);
            const fy = jumpWave > 0.35 ? (jumpWave - 0.35) * 38 : 3;
            pushEntity(fx, fz, () => {
              const fp = project3D(fx, fy, fz);
              if (fp) {
                ctx.font = `${Math.max(10, Math.round(14 * fp.scale))}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText(f % 2 === 0 ? '🐟' : '🐠', fp.sx, fp.sy);
              }
            });
          }
          [-150, 150].forEach((bx) => {
            pushEntity(bx, poolZ, () => {
              draw3DBox(bx, 0, poolZ, 44, 12, 18, {
                top: '#9b6a46',
                front: '#7c5134',
                side: '#5e3d27',
              });
            });
          });
        });

        const trees = [];
        [-260, 490, 1240, 1990].forEach((tz, ti) => {
          [-1460, -920, -380, 380, 920, 1460].forEach((tx, xi) => {
            trees.push({ x: tx, z: tz, cherry: (ti + xi) % 2 === 0 });
          });
        });
        trees.forEach((t) => {
          pushEntity(t.x, t.z, () => {
            draw3DBox(t.x, 0, t.z, 14, 52, 14, {
              top: '#754e33',
              front: '#5e3d27',
              side: '#432b1a',
            });
            const crown = project3D(t.x, 70, t.z);
            if (crown) {
              const r = 34 * crown.scale;
              let canopyColor;
              if (curSeason === 'winter') {
                canopyColor = atm === 'night' ? '#637a8a' : '#dce8ee';
              } else if (curSeason === 'autumn') {
                canopyColor = t.cherry
                  ? atm === 'night' ? '#7a4430' : '#df7b3d'
                  : atm === 'night' ? '#663c27' : '#c95c34';
              } else if (curSeason === 'summer') {
                canopyColor = atm === 'night' ? '#1c4226' : '#3d7f46';
              } else {
                canopyColor = t.cherry
                  ? atm === 'night' ? '#7d4d67' : '#ebaec2'
                  : atm === 'night' ? '#214532' : '#4b7e52';
              }
              ctx.fillStyle = canopyColor;
              ctx.beginPath();
              ctx.arc(crown.sx, crown.sy, r, 0, Math.PI * 2);
              ctx.arc(crown.sx - r * 0.55, crown.sy + r * 0.2, r * 0.72, 0, Math.PI * 2);
              ctx.arc(crown.sx + r * 0.55, crown.sy + r * 0.2, r * 0.72, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });

        // 3D Lantern Posts
        [
          { x: -55, z: -210 },
          { x: 55, z: -210 },
          { x: -55, z: 120 },
          { x: 55, z: 120 },
        ].forEach((l) => {
          pushEntity(l.x, l.z, () => {
            draw3DBox(l.x, 0, l.z, 6, 46, 6, {
              top: '#48545e',
              front: '#313a42',
              side: '#232a30',
            });
            const lamp = project3D(l.x, 52, l.z);
            if (lamp) {
              const g = ctx.createRadialGradient(lamp.sx, lamp.sy, 2, lamp.sx, lamp.sy, 32 * lamp.scale);
              g.addColorStop(0, 'rgba(255, 218, 128, 0.85)');
              g.addColorStop(1, 'rgba(255, 218, 128, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(lamp.sx, lamp.sy, 32 * lamp.scale, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });
      } else {
        // Warm 3D Incense Braziers / Lights in the middle of every Ash Room row (1-10)
        for (let row = 0; row < 10; row += 1) {
          const rz = -170 + row * 250;
          pushEntity(0, rz, () => {
            draw3DBox(0, 0, rz, 44, 24, 44, {
              top: '#8c6632',
              front: '#69491f',
              side: '#4b3314',
            });
            const topPt = project3D(0, 32, rz);
            if (topPt) {
              const g = ctx.createRadialGradient(topPt.sx, topPt.sy, 2, topPt.sx, topPt.sy, 38 * topPt.scale);
              g.addColorStop(0, 'rgba(255, 206, 120, 0.55)');
              g.addColorStop(1, 'rgba(255, 206, 120, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(topPt.sx, topPt.sy, 38 * topPt.scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.font = `${Math.max(14, Math.round(24 * topPt.scale))}px serif`;
              ctx.textAlign = 'center';
              ctx.fillText('🪔', topPt.sx, topPt.sy);
            }
          });
        }
      }

      // 3. 3D Tombstones & Ash Alcoves
      const newScreenHits = [];
      const newNpcHits = [];
      const npcSpeechQueue = [];
      let nextGateHit = null;
      roomMemorials.forEach((m) => {
        pushEntity(m.worldX, m.worldZ, () => {
          const isNear = m.id === nearbyIdRef.current;
          const isOwner = isMemorialOwner(m, userRef.current);

          // Proximity halo on ground
          if (isNear) {
            const gp = project3D(m.worldX, 1, m.worldZ);
            if (gp) {
              const pr = (44 + Math.sin(now * 0.006) * 4) * gp.scale;
              ctx.strokeStyle = '#ffd57e';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(gp.sx, gp.sy, pr, pr * 0.52, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          let topLabelPt = null;
          if (room === 'tombstone') {
            const palette = {
              'classic-granite': { top: '#cfd6dd', front: '#9aa4ae', side: '#6d7782' },
              'angel-wings': { top: '#fbf7ee', front: '#e2dac9', side: '#bfb49f' },
              'rose-heart': { top: '#fadfe5', front: '#e2aeb9', side: '#ba8290' },
              'moss-celtic': { top: '#9fb49c', front: '#6c856b', side: '#4b614b' },
            }[m.styleId] || { top: '#cfd6dd', front: '#9aa4ae', side: '#6d7782' };

            // Stone plinth
            draw3DBox(m.worldX, 0, m.worldZ, 52, 10, 34, {
              top: '#848f88',
              front: '#5f6963',
              side: '#454e49',
            });
            // Extruded gravestone slab
            topLabelPt = draw3DBox(m.worldX, 10, m.worldZ, 38, 48, 16, {
              ...palette,
              stroke: isNear ? '#ffd57e' : 'rgba(255,255,255,0.35)',
            });

            // Pet picture at top center of 3D tombstone
            const tombPicPt = project3D(m.worldX, 46, m.worldZ + 9);
            if (tombPicPt) {
              drawCachedPetPortrait(
                ctx,
                m.photo,
                tombPicPt.sx,
                tombPicPt.sy,
                Math.max(8, 11.5 * tombPicPt.scale),
                getSpeciesEmoji(m.species),
                isNear ? '#ffd57e' : '#f7ead2'
              );
            }
          } else {
            // 3D Columbarium Alcove Tower
            const urnCol = {
              'celadon-urn': '#86b599',
              'gilded-lotus': '#d4a853',
              'starlight-glass': '#82b3ee',
              'warm-cherrywood': '#a95f3a',
            }[m.styleId] || '#86b599';

            topLabelPt = draw3DBox(m.worldX, 0, m.worldZ, 56, 74, 34, {
              top: '#7a573d',
              front: '#3e291e',
              side: '#2a1b13',
              stroke: isNear ? '#ffd57e' : '#a47e49',
            });

            // Pet picture at top center of 3D Ash Alcove
            const ashPicPt = project3D(m.worldX, 58, m.worldZ + 18);
            if (ashPicPt) {
              drawCachedPetPortrait(
                ctx,
                m.photo,
                ashPicPt.sx,
                ashPicPt.sy,
                Math.max(8, 11 * ashPicPt.scale),
                getSpeciesEmoji(m.species),
                isNear ? '#ffd57e' : '#e6c278'
              );
            }

            const urnPt = project3D(m.worldX, 27, m.worldZ + 18);
            if (urnPt) {
              ctx.fillStyle = urnCol;
              ctx.beginPath();
              ctx.ellipse(urnPt.sx, urnPt.sy, 9.5 * urnPt.scale, 13 * urnPt.scale, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#f2d085';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }

          // Floating 3D Nameplate & Offerings
          if (topLabelPt) {
            const fontSize = Math.max(10, Math.min(15, Math.round(13 * topLabelPt.scale)));
            ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
            const text = `${isOwner ? '⭐ ' : ''}${m.name} (${m.locationCode})`;
            const tw = ctx.measureText(text).width + 14;
            ctx.fillStyle = 'rgba(16, 22, 20, 0.84)';
            ctx.fillRect(topLabelPt.sx - tw / 2, topLabelPt.sy - 20, tw, 18);
            ctx.strokeStyle = isNear ? '#ffd57e' : 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 1;
            ctx.strokeRect(topLabelPt.sx - tw / 2, topLabelPt.sy - 20, tw, 18);
            ctx.fillStyle = '#ffe6b3';
            ctx.textAlign = 'center';
            ctx.fillText(text, topLabelPt.sx, topLabelPt.sy - 7);

            // Hit rect for tap-to-walk
            newScreenHits.push({
              id: m.id,
              worldX: m.worldX,
              worldZ: m.worldZ,
              sx: topLabelPt.sx,
              sy: topLabelPt.sy + 20 * topLabelPt.scale,
              radius: Math.max(30, 42 * topLabelPt.scale),
            });
          }

          // Active offerings in front of plinth
          const baseFront = project3D(m.worldX, 6, m.worldZ + 26);
          if (baseFront) {
            const toks = (m.activeOfferings || []).slice(0, 4).join(' ');
            ctx.font = `${Math.max(11, Math.round(14 * baseFront.scale))}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(toks, baseFront.sx, baseFront.sy);
          }
        });
      });

      // 4. 3D Ambient NPCs
      const npcs = room === 'tombstone' ? GARDEN_NPCS_DATA : ASH_NPCS_DATA;
      const npcStates = npcSimRef.current[room] || (npcSimRef.current[room] = []);
      stepBandNpcs(npcStates, npcs, dt, '3d', 675);
      npcs.forEach((npc, idx) => {
        const st = npcStates[idx];
        const nx = st ? st.x : npc.x3d;
        const nz = st ? st.y : npc.z3d;
        const walkBob = st && st.mode === 'walk' ? Math.abs(Math.sin(st.bob)) * 2.5 : 0;
        pushEntity(nx, nz, () => {
          const headPt = draw3DBox(nx, walkBob, nz, 18, 30, 14, {
            top: npc.cloak,
            front: npc.cloak,
            side: npc.cloak,
          });
          if (npc.role === 'gardener') {
            draw3DBox(nx, walkBob + 6, nz + 1, 12, 16, 14.5, {
              top: '#d9cbb3',
              front: '#d9cbb3',
              side: '#c7b89e',
            });
          }
          const head = project3D(nx, 37 + walkBob, nz);
          if (head) {
            ctx.fillStyle = '#f2cfb6';
            ctx.beginPath();
            ctx.arc(head.sx, head.sy, 8 * head.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = npc.hair;
            ctx.beginPath();
            ctx.arc(head.sx, head.sy - 2 * head.scale, 8.2 * head.scale, Math.PI, 0);
            ctx.fill();
            if (npc.role === 'gardener') {
              ctx.fillStyle = '#dfc17b';
              ctx.beginPath();
              ctx.ellipse(head.sx, head.sy - 5.5 * head.scale, 13 * head.scale, 4 * head.scale, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#caa659';
              ctx.fillRect(
                head.sx - 6.5 * head.scale,
                head.sy - 12 * head.scale,
                13 * head.scale,
                6.5 * head.scale
              );
              if (npc.tool) {
                ctx.font = `${Math.max(11, Math.round(13 * head.scale))}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText(npc.tool, head.sx + (st?.facing || 1) * 14 * head.scale, head.sy + 14 * head.scale);
              }
            }
            newNpcHits.push({
              id: npc.id,
              name: npc.name,
              sx: head.sx,
              sy: head.sy + 10 * head.scale,
              radius: Math.max(28, 34 * head.scale),
            });
          }
          const anchor = head || headPt;
          if (anchor && Math.hypot(p.x - nx, p.z - nz) < 128) {
            const qList = npc.quotes || [];
            const offset = npcQuoteOffsetsRef.current[npc.id] || 0;
            const qIdx = (Math.floor(now / 9000) + idx + offset) % Math.max(1, qList.length);
            npcSpeechQueue.push({
              sx: anchor.sx,
              sy: anchor.sy - 16 * (anchor.scale || 1),
              speaker: npc.name,
              text: qList[qIdx] || '',
            });
          }
        });
      });

      // 2b. Species Sanctuary Gate (East side at x=460, z=0)
      pushEntity(460, 0, () => {
        const leftPost = draw3DBox(460, 0, -28, 12, 82, 12, { top: '#b84242', front: '#943030', side: '#6e2020' });
        const rightPost = draw3DBox(460, 0, 28, 12, 82, 12, { top: '#b84242', front: '#943030', side: '#6e2020' });
        const topGate = draw3DBox(460, 76, 0, 16, 12, 76, {
          top: '#e0a958',
          front: '#8f2929',
          side: '#6b1d1d',
          stroke: '#ffd57e',
        });
        const gateCenter = project3D(460, 42, 0);
        if (topGate) {
          ctx.font = `700 ${Math.max(10, Math.round(12 * topGate.scale))}px "Plus Jakarta Sans", sans-serif`;
          const gTxt = '⛩️ Other Species Gate';
          const gw = ctx.measureText(gTxt).width + 14;
          const labelX = topGate.sx - gw / 2;
          const labelY = topGate.sy - 24;
          ctx.fillStyle = 'rgba(20, 16, 18, 0.88)';
          ctx.fillRect(labelX, labelY, gw, 18);
          ctx.fillStyle = '#ffe5ad';
          ctx.textAlign = 'center';
          ctx.fillText(gTxt, topGate.sx, topGate.sy - 11);

          const baseCenter = gateCenter || topGate;
          const xs = [labelX, labelX + gw, topGate.sx - 38 * topGate.scale, topGate.sx + 38 * topGate.scale];
          const ys = [labelY - 6, baseCenter.sy + 48 * baseCenter.scale];
          if (leftPost) {
            xs.push(leftPost.sx);
            ys.push(leftPost.sy);
          }
          if (rightPost) {
            xs.push(rightPost.sx);
            ys.push(rightPost.sy);
          }
          nextGateHit = {
            minX: Math.min(...xs) - 12,
            maxX: Math.max(...xs) + 12,
            minY: Math.min(...ys) - 10,
            maxY: Math.max(...ys) + 18,
            sx: baseCenter.sx,
            sy: baseCenter.sy,
            radius: Math.max(54, 62 * (baseCenter.scale || 1)),
          };
        }
      });

      const drawVisitorStyle = (wx, wyBase, wz, head, cAv) => {
        const isBoy = cAv?.gender === 'boy';
        const style = cAv?.avatarStyle || 'classic';
        if (style === 'uniform') {
          const beltPt = project3D(wx, wyBase + 14, wz + 6);
          if (beltPt) {
            ctx.fillStyle = '#f5d078';
            ctx.fillRect(beltPt.sx - 8 * beltPt.scale, beltPt.sy - 2 * beltPt.scale, 16 * beltPt.scale, 3.5 * beltPt.scale);
          }
        } else if (style === 'cape') {
          const scarfPt = project3D(wx, wyBase + 27, wz + 5);
          if (scarfPt) {
            ctx.fillStyle = '#ffe5ad';
            ctx.beginPath();
            ctx.ellipse(scarfPt.sx, scarfPt.sy, 8.5 * scarfPt.scale, 3 * scarfPt.scale, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (style === 'kimono') {
          const obiPt = project3D(wx, wyBase + 14, wz + 6);
          if (obiPt) {
            ctx.fillStyle = '#e5a05d';
            ctx.fillRect(obiPt.sx - 8 * obiPt.scale, obiPt.sy - 2.5 * obiPt.scale, 16 * obiPt.scale, 5 * obiPt.scale);
          }
        } else if (style === 'formal' || isBoy) {
          const collarPt = project3D(wx, wyBase + 27, wz + 6);
          if (collarPt) {
            ctx.fillStyle = 'rgba(248, 244, 234, 0.92)';
            ctx.beginPath();
            ctx.moveTo(collarPt.sx - 6 * collarPt.scale, collarPt.sy - 2 * collarPt.scale);
            ctx.lineTo(collarPt.sx, collarPt.sy + 4 * collarPt.scale);
            ctx.lineTo(collarPt.sx + 6 * collarPt.scale, collarPt.sy - 2 * collarPt.scale);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          const hemPt = project3D(wx, wyBase + 5, wz + 4);
          if (hemPt) {
            ctx.fillStyle = cAv?.cloakColor || '#b86578';
            ctx.beginPath();
            ctx.moveTo(hemPt.sx - 9 * hemPt.scale, hemPt.sy - 10 * hemPt.scale);
            ctx.lineTo(hemPt.sx + 9 * hemPt.scale, hemPt.sy - 10 * hemPt.scale);
            ctx.lineTo(hemPt.sx + 13 * hemPt.scale, hemPt.sy + 4 * hemPt.scale);
            ctx.lineTo(hemPt.sx - 13 * hemPt.scale, hemPt.sy + 4 * hemPt.scale);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (head) {
          drawAvatarHeadAndHair(ctx, head.sx, head.sy, head.scale, cAv);
        }
      };

      // 4b. Remote Live Multiplayer Visitors
      const nowMs = Date.now();
      getPeersMap().forEach((peer) => {
        if (peer.room !== room || (peer.species || 'Dog') !== speciesRef.current) return;
        peer.rx += (peer.nx - peer.rx) * Math.min(1, dt * 10);
        peer.rz += (peer.nz - peer.rz) * Math.min(1, dt * 10);
        if (peer.moving) peer.bob = (peer.bob || 0) + dt * 12;

        const pAv = peer.avatar || DEFAULT_AVATAR;
        if (pAv.companion && pAv.companion !== 'none') {
          const sx = peer.rx - (peer.facingX || 0) * 20;
          const sz = peer.rz - (peer.facingZ || 0) * 20;
          const sy = 10 + Math.sin(now * 0.005 + peer.rx) * 4;
          pushEntity(sx, sz, () => {
            const sp = project3D(sx, sy, sz);
            if (sp) {
              const glow = ctx.createRadialGradient(sp.sx, sp.sy, 2, sp.sx, sp.sy, 20 * sp.scale);
              glow.addColorStop(0, 'rgba(182, 238, 255, 0.72)');
              glow.addColorStop(1, 'rgba(182, 238, 255, 0)');
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(sp.sx, sp.sy, 20 * sp.scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.font = `${Math.max(13, Math.round(17 * sp.scale))}px serif`;
              ctx.textAlign = 'center';
              const em =
                pAv.companion === 'cat'
                  ? '🐈'
                  : pAv.companion === 'bunny'
                    ? '🐇'
                    : pAv.companion === 'dog'
                      ? '🐕'
                      : pAv.companion;
              ctx.fillText(em, sp.sx, sp.sy + 5);
            }
          });
        }

        const pBobY = peer.moving ? Math.abs(Math.sin(peer.bob || 0)) * 6 : 0;
        pushEntity(peer.rx, peer.rz, () => {
          const shadow = project3D(peer.rx, 0.5, peer.rz);
          if (shadow) {
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.beginPath();
            ctx.ellipse(shadow.sx, shadow.sy, 14 * shadow.scale, 7 * shadow.scale, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          draw3DBox(peer.rx, 2 + pBobY, peer.rz, 20, 28, 14, {
            top: pAv.cloakColor || '#7c6a9a',
            front: pAv.cloakColor || '#7c6a9a',
            side: pAv.cloakColor || '#7c6a9a',
            stroke: 'rgba(130, 245, 175, 0.75)',
          });
          const head = project3D(peer.rx, 37 + pBobY, peer.rz);
          drawVisitorStyle(peer.rx, 2 + pBobY, peer.rz, head, pAv);
          if (head) {
            if (pAv.carryingLantern) {
              if (atm === 'morning' || atm === 'dusk') {
                drawMourningFlower(ctx, head.sx + 15 * head.scale, head.sy + 14 * head.scale, Math.max(0.75, head.scale), pAv.flowerColor || '#f7f5ef');
              } else {
                ctx.font = `${Math.max(11, Math.round(14 * head.scale))}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText('🏮', head.sx + 16 * head.scale, head.sy + 14 * head.scale);
              }
            }

            const gEmoji = pAv.gender === 'boy' ? '👦' : '👩';
            const pTag = `🟢 ${gEmoji} ${peer.name || 'Visitor'}`;
            ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
            const ptw = ctx.measureText(pTag).width + 12;
            const nameY = head.sy - 28 * head.scale - 14;
            ctx.fillStyle = 'rgba(15, 22, 20, 0.84)';
            ctx.fillRect(head.sx - ptw / 2, nameY, ptw, 16);
            ctx.fillStyle = '#aef5c8';
            ctx.textAlign = 'center';
            ctx.fillText(pTag, head.sx, nameY + 12);

            if (peer.chatText && nowMs < peer.chatExpiresAt && (peer.chatIsGroup || showOutsideChatRef.current)) {
              ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
              const displayChat = peer.chatIsGroup ? `🔒 ${peer.chatText}` : peer.chatText;
              const cw = ctx.measureText(displayChat).width + 18;
              const bubbleY = nameY - 26;
              ctx.fillStyle = 'rgba(20, 28, 25, 0.94)';
              ctx.fillRect(head.sx - cw / 2, bubbleY, cw, 22);
              ctx.strokeStyle = peer.chatIsGroup ? 'rgba(255, 213, 126, 0.88)' : 'rgba(130, 245, 175, 0.8)';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(head.sx - cw / 2, bubbleY, cw, 22);
              ctx.fillStyle = '#ffffff';
              ctx.fillText(displayChat, head.sx, bubbleY + 15);
            }
          }
        });
      });

      // 5. 3D Spirit Pet Companion (only when user has enshrined a pet in the game)
      const av = avatarRef.current;
      if (av.companion && av.companion !== 'none') {
        const trail = p.history[Math.min(18, p.history.length - 1)] || { x: p.x - 24, z: p.z + 18 };
        const sx = trail.x - p.facingX * 18;
        const sz = trail.z - p.facingZ * 18;
        const sy = 10 + Math.sin(now * 0.005) * 4;
        pushEntity(sx, sz, () => {
          const sp = project3D(sx, sy, sz);
          if (sp) {
            const glow = ctx.createRadialGradient(sp.sx, sp.sy, 2, sp.sx, sp.sy, 22 * sp.scale);
            glow.addColorStop(0, 'rgba(182, 238, 255, 0.72)');
            glow.addColorStop(1, 'rgba(182, 238, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(sp.sx, sp.sy, 22 * sp.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = `${Math.max(14, Math.round(18 * sp.scale))}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(av.companion, sp.sx, sp.sy + 5);
          }
        });
      }

      // 6. 3D Player Character
      const bobY = p.moving ? Math.abs(Math.sin(p.bob)) * 6 : 0;
      pushEntity(p.x, p.z, () => {
        const shadow = project3D(p.x, 0.5, p.z);
        if (shadow) {
          ctx.fillStyle = 'rgba(0,0,0,0.34)';
          ctx.beginPath();
          ctx.ellipse(shadow.sx, shadow.sy, 14 * shadow.scale, 7 * shadow.scale, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        draw3DBox(p.x, 2 + bobY, p.z, 20, 28, 14, {
          top: av.cloakColor,
          front: av.cloakColor,
          side: av.cloakColor,
          stroke: 'rgba(255,255,255,0.45)',
        });
        const head = project3D(p.x, 37 + bobY, p.z);
        drawVisitorStyle(p.x, 2 + bobY, p.z, head, av);
        if (head) {
          if (av.carryingLantern) {
            if (atm === 'morning' || atm === 'dusk') {
              drawMourningFlower(ctx, head.sx + 15 * head.scale, head.sy + 14 * head.scale, Math.max(0.75, head.scale), av.flowerColor || '#f7f5ef');
            } else {
              ctx.font = `${Math.max(11, Math.round(14 * head.scale))}px serif`;
              ctx.textAlign = 'center';
              ctx.fillText('🏮', head.sx + 16 * head.scale, head.sy + 14 * head.scale);
            }
          }

          const gEmoji = av.gender === 'boy' ? '👦' : '👩';
          const rawTag = mpNicknameRef.current || userRef.current?.name?.split(' ')[0] || 'Visitor';
          const tag = `${gEmoji} ${rawTag}`;
          ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
          const tw = ctx.measureText(tag).width + 12;
          const myNameY = head.sy - 28 * head.scale - 14;
          ctx.fillStyle = 'rgba(15, 22, 20, 0.78)';
          ctx.fillRect(head.sx - tw / 2, myNameY, tw, 16);
          ctx.fillStyle = '#ffe5b0';
          ctx.textAlign = 'center';
          ctx.fillText(tag, head.sx, myNameY + 12);

          const myBubble = getLocalChatBubble();
          if (myBubble) {
            ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
            const cw = ctx.measureText(myBubble).width + 18;
            const bubbleY = myNameY - 26;
            ctx.fillStyle = 'rgba(20, 28, 25, 0.94)';
            ctx.fillRect(head.sx - cw / 2, bubbleY, cw, 22);
            ctx.strokeStyle = 'rgba(255, 213, 126, 0.85)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(head.sx - cw / 2, bubbleY, cw, 22);
            ctx.fillStyle = '#fff8eb';
            ctx.fillText(myBubble, head.sx, bubbleY + 15);
          }
        }
      });

      // 7. Destination Target Ring
      if (p.targetX !== null && p.targetZ !== null) {
        pushEntity(p.targetX, p.targetZ, () => {
          const gp = project3D(p.targetX, 1, p.targetZ);
          if (gp) {
            const rr = (12 + Math.sin(now * 0.01) * 3) * gp.scale;
            ctx.strokeStyle = 'rgba(255, 232, 165, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(gp.sx, gp.sy, rr, rr * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }

      // Execute back-to-front Painter's sort
      drawList.sort((a, b) => b.cz - a.cz);
      drawList.forEach((item) => item.render());
      screenHitsRef.current = newScreenHits;
      npcScreenHitsRef.current = newNpcHits;
      gateScreenHitRef.current = nextGateHit;
      portalScreenHitRef.current = nextPortalHit;

      // Render wrapped NPC speech bubbles cleanly above 3D world geometry
      npcSpeechQueue.forEach((sb) => {
        drawWrappedSpeechBubble(ctx, sb.sx, sb.sy, {
          speaker: sb.speaker,
          text: sb.text,
          maxWidth: 236,
          viewportWidth: viewW,
        });
      });

      // 3D Floating Particles
      particlesRef.current = particlesRef.current.filter((pt) => pt.life > 0);
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        pt.life -= dt;
        const sp = project3D(pt.x, pt.y, pt.z);
        if (sp) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, pt.life));
          ctx.font = `${Math.max(13, Math.round(18 * sp.scale))}px serif`;
          ctx.textAlign = 'center';
          ctx.fillText(pt.emoji, sp.sx, sp.sy);
          ctx.restore();
        }
      });

      // ====================
      // 4-SEASON WEATHER EFFECTS OVERLAY
      // ====================
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

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [onChangeRoom]);

  const handlePointerDown = (e) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startYaw: camRef.current.yaw,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 9) {
      dragRef.current.moved = true;
      camRef.current.yaw = dragRef.current.startYaw - dx * 0.0065;
    }
  };

  const handlePointerUp = (e) => {
    const wasMoved = dragRef.current.moved;
    dragRef.current.active = false;
    if (wasMoved) return;

    // Tap-to-open Species Gate, cycle NPC speech, tap monument, or walk 3D ground plane
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. Check Species Sanctuary Gate hit first (walk nearby if far, open if already nearby)
    const gHit = gateScreenHitRef.current;
    if (
      gHit &&
      ((clickX >= gHit.minX && clickX <= gHit.maxX && clickY >= gHit.minY && clickY <= gHit.maxY) ||
        Math.hypot(clickX - gHit.sx, clickY - gHit.sy) < gHit.radius)
    ) {
      walkOrOpenSpeciesGate();
      return;
    }

    // 1b. Check Portal Archway hit — walk character to the portal archway before changing room
    const pHit = portalScreenHitRef.current;
    if (pHit && Math.hypot(clickX - pHit.sx, clickY - pHit.sy) < pHit.radius) {
      pendingOpenGateRef.current = false;
      pendingOpenIdRef.current = null;
      playerRef.current.targetX = 0;
      playerRef.current.targetZ = pHit.portalZ;
      setWalkMessage(
        roomRef.current === 'tombstone'
          ? 'Walking to Ash Room Archway...'
          : 'Walking to Tombstone Garden Exit...'
      );
      setTimeout(() => setWalkMessage(''), 2200);
      return;
    }

    // 2. Check NPC tap to hear their next quote
    const npcHit = npcScreenHitsRef.current.find(
      (n) => Math.hypot(clickX - n.sx, clickY - n.sy) < n.radius
    );
    if (npcHit) {
      pendingOpenGateRef.current = false;
      npcQuoteOffsetsRef.current[npcHit.id] = (npcQuoteOffsetsRef.current[npcHit.id] || 0) + 1;
      setWalkMessage(`💬 Listening to ${npcHit.name}...`);
      setTimeout(() => setWalkMessage(''), 1800);
      return;
    }

    // 3. Check monument hitboxes — walk first if not nearby, open right away if nearby
    const hit = screenHitsRef.current.find(
      (h) => Math.hypot(clickX - h.sx, clickY - h.sy) < h.radius
    );
    if (hit) {
      pendingOpenGateRef.current = false;
      if (nearbyIdRef.current === hit.id) {
        setInspectedId(hit.id);
      } else {
        setInspectedId(null);
        pendingOpenIdRef.current = hit.id;
        playerRef.current.targetX = hit.worldX;
        playerRef.current.targetZ = hit.worldZ + 52;
        const tapped = positionedRef.current.find((m) => m.id === hit.id);
        if (tapped) {
          setWalkMessage(`Walking to ${tapped.name}...`);
          setTimeout(() => setWalkMessage(''), 2000);
        }
      }
      return;
    }

    pendingOpenIdRef.current = null;
    pendingOpenGateRef.current = false;

    // Raycast click onto ground plane (wy = 0)
    const viewW = rect.width;
    const viewH = rect.height;
    const fov = Math.min(viewW, viewH) * 1.18;
    const baseCfg = CAMERA_PRESETS[camRef.current.preset] || CAMERA_PRESETS.follow;
    const zt = Math.max(0, Math.min(1, zoomOverviewRef.current / 100));
    const cfg = {
      dist: baseCfg.dist + (1950 - baseCfg.dist) * zt,
      height: baseCfg.height + (2250 - baseCfg.height) * zt,
      pitch: baseCfg.pitch + (0.92 - baseCfg.pitch) * zt,
    };
    const yaw = camRef.current.yaw;
    const dirX = Math.sin(yaw);
    const dirZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = Math.sin(yaw);

    const p = playerRef.current;
    const camX = p.x - dirX * cfg.dist;
    const camZ = p.z - dirZ * cfg.dist;
    const camY = cfg.height;
    const pitch = cfg.pitch;

    const nx = (clickX - viewW / 2) / fov;
    const ny = (viewH * 0.52 - clickY) / fov;

    const worldRight = nx;
    const worldUp = ny * Math.cos(pitch) - Math.sin(pitch);
    const worldForward = Math.cos(pitch) + ny * Math.sin(pitch);

    const rayX = worldRight * rightX + worldForward * dirX;
    const rayY = worldUp;
    const rayZ = worldRight * rightZ + worldForward * dirZ;

    if (rayY < -0.02) {
      const t = -camY / rayY;
      const gx = camX + t * rayX;
      const gz = camZ + t * rayZ;
      p.targetX = Math.max(-1500, Math.min(1500, gx));
      p.targetZ = Math.max(-360, Math.min(maxZRef.current, gz));
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

      {/* 3D Canvas Viewport */}
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

        {/* 3D Camera Icon Button on Right Side (below Gate icon) */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 176,
            right: 10,
            zIndex: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          <button
            type="button"
            className="world-fs-floating-btn"
            style={{ position: 'static' }}
            onClick={() => setCameraMenuOpen((v) => !v)}
            aria-label="Camera View Options"
            title="Camera View Options"
          >
            <Video size={16} />
          </button>
          {cameraMenuOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 8,
                borderRadius: 12,
                background: 'rgba(16, 22, 20, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                  onClick={() => (camRef.current.yaw -= 0.45)}
                  title="Rotate camera left (Q)"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                  onClick={() => (camRef.current.yaw += 0.45)}
                  title="Rotate camera right (R)"
                >
                  <RotateCw size={14} />
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '5px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={cycleCameraPreset}
              >
                <Video size={13} /> {(CAMERA_PRESETS[cameraMode] || CAMERA_PRESETS.follow).label}
              </button>
            </div>
          )}
        </div>

        {/* 3D Overview Zoom Slider (0 = current view, 100 = see all 200 plots/niches) */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: isFullScreen ? 82 : 40,
            left: 8,
            zIndex: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(16, 22, 20, 0.82)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#f5efe6',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>🔍 Zoom</span>
          <input
            type="range"
            min="0"
            max="100"
            value={zoomOverview}
            onChange={(e) => setZoomOverview(Number(e.target.value))}
            style={{ width: 92, accentColor: '#ffd57e', cursor: 'pointer' }}
            aria-label="3D Garden Overview Zoom"
          />
          <span style={{ minWidth: 32, textAlign: 'right', color: '#ffd57e', fontWeight: 700 }}>
            {zoomOverview === 0 ? '1×' : zoomOverview === 100 ? 'All' : `${zoomOverview}%`}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="world-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
        />

        <div className="world-room-pill">
          {activeRoom === 'ash-room'
            ? `🧊 3D ${activeSpecies} Ash Room`
            : `🧊 3D ${activeSpecies} Tombstone Garden`}
          <span className="world-hint-text">
            {' '}
            • Walk with WASD / Arrow keys / Mouse click &amp; drag or Joystick
          </span>
        </div>

        {walkTipVisible && (
          <div
            className="armtip-notif world-walk-armtip"
            role="status"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              💡 Walk around using <strong>WASD</strong> or <strong>Arrow</strong> keyboard, click/drag with <strong>Mouse</strong>, or use the <strong>Joystick</strong>!
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
                ? 'Enter 3D Ash Room'
                : 'Step Out to 3D Tombstone Garden'}
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
          <div className="world-dpad" aria-label="3D walk controls">
            <div />
            <button
              type="button"
              className="dpad-btn"
              onPointerDown={() => setDpad('up', true)}
              onPointerUp={() => setDpad('up', false)}
              onPointerLeave={() => setDpad('up', false)}
              onPointerCancel={() => setDpad('up', false)}
              aria-label="Walk forward"
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
              aria-label="Walk back"
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
