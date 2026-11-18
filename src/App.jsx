import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Trees,
  Flame,
  Sparkles,
  Plus,
  Sun,
  Sunset,
  Moon,
  LogIn,
  LogOut,
  RotateCcw,
  ArrowRight,
  Lock,
  Footprints,
  LayoutGrid,
  Box,
  Volume2,
  VolumeX,
  Music,
  Shuffle,
  Bell,
  ShieldCheck,
  RefreshCw,
  Calendar,
  CloudSun,
  X,
} from 'lucide-react';
import {
  INITIAL_MEMORIALS,
  getSpeciesEmoji,
  normalizeAndDeduplicateMemorials,
  isMemorialOwner,
} from './data/memorialData';
import MonumentVisual from './components/MonumentVisual';
import ParkWorld2D from './components/ParkWorld2D';
import ParkWorld3D from './components/ParkWorld3D';
import VisitMemorialModal from './components/VisitMemorialModal';
import CreateMemorialModal from './components/CreateMemorialModal';
import AuthModal from './components/AuthModal';
import SpeciesGateModal from './components/SpeciesGateModal';
import FavoritesModal from './components/FavoritesModal';
import AdminBackendModal from './components/AdminBackendModal';
import NotificationsModal from './components/NotificationsModal';
import UpdateCheckModal, { APP_BUILD_VERSION } from './components/UpdateCheckModal';
import FirstVisitGuide from './components/FirstVisitGuide';
import { loadTipsPrefs, saveTipsPrefs } from './utils/viewPrefs';
import { isApkEnvironment, useIsMobileHud } from './utils/platform';
import {
  DEFAULT_SOUND_VOLUMES,
  setSoundState,
  setSoundVolumes,
  playThunderSound,
  playDogBarkAndHowl,
  playOwlHoot,
  playMorningBird,
  unlockAudioFromGesture,
  isAudioUnlocked,
  wasRecentlyUnlockedInGesture,
} from './utils/soundEngine';
import {
  initMultiplayer,
  sendMultiplayerAction,
  sendMultiplayerChat,
  sendMultiplayerEmote,
  publishSharedMemorial,
  syncAllLocalMemorials,
  isMultiplayerOnline,
  setMultiplayerOnline,
  getRegisteredAccounts,
  getUserRestrictionStatus,
  normalizeAccountNameFix,
  getAdminConfig,
  getAdminNotifications,
  getActiveGroup,
  getGroupChatHistory,
  createGroupChat,
  joinGroupChat,
  exitGroupChat,
  sendGroupChatMessage,
  getPendingGroupInvites,
  sendGroupInvite,
  acceptGroupInvite,
  ignoreGroupInvite,
  getPendingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  ignoreFriendRequest,
  cancelOutgoingFriendRequest,
  setCurrentUserIdentity,
} from './utils/multiplayerEngine';

const STORAGE_MEMORIALS_KEY = 'evergreen_paws_memorials_v1';
const STORAGE_USER_KEY = 'evergreen_paws_user_v1';
const STORAGE_VIEWMODE_KEY = 'evergreen_paws_viewmode_v1';
const STORAGE_FAVORITES_KEY = 'evergreen_paws_favorites_v1';
const STORAGE_FRIENDS_KEY = 'evergreen_paws_friends_v1';
const STORAGE_WEATHER_FX_KEY = 'evergreen_paws_weather_fx_v1';
const STORAGE_WEATHER_SOUND_KEY = 'evergreen_paws_weather_sound_v1';
const STORAGE_VOLUMES_KEY = 'evergreen_paws_volumes_v1';
const STORAGE_READ_NOTIFS_KEY = 'evergreen_paws_read_notifs_v1';
const STORAGE_OUTSIDE_CHAT_KEY = 'evergreen_paws_outside_chat_v1';
const STORAGE_VISITED_KEY = 'evergreen_paws_visited_v1';
const STORAGE_MP_CHAT_KEY = 'evergreen_paws_mp_chat_v1';

const VOLUME_CHANNELS = [
  { key: 'master', label: 'Master', emoji: '🔊' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'weather', label: 'Weather', emoji: '🌧️' },
  { key: 'thunder', label: 'Thunder', emoji: '⚡' },
  { key: 'bird', label: 'Birds', emoji: '🐦' },
  { key: 'bark', label: 'Bark/Howl', emoji: '🐕' },
  { key: 'owl', label: 'Owl', emoji: '🦉' },
];

const SEASONS = [
  { id: 'spring', label: '🌸 Spring' },
  { id: 'summer', label: '☀️ Summer' },
  { id: 'autumn', label: '🍂 Autumn' },
  { id: 'winter', label: '❄️ Winter' },
];

const WEATHERS = [
  { id: 'clear', label: '✨ Clear' },
  { id: 'windy', label: '🍃 Windy Leaves' },
  { id: 'snow', label: '❄️ Snow' },
  { id: 'rain', label: '🌧️ Rain' },
  { id: 'thunderstorm', label: '⛈️ Thunder' },
];

const SEASON_WEATHER_WEIGHTS = {
  spring: { clear: 0.35, rain: 0.3, windy: 0.25, thunderstorm: 0.1 },
  summer: { clear: 0.45, thunderstorm: 0.23, rain: 0.22, windy: 0.1 },
  autumn: { windy: 0.48, rain: 0.24, clear: 0.2, thunderstorm: 0.08 },
  winter: { snow: 0.6, clear: 0.22, rain: 0.13, thunderstorm: 0.05 },
};

function pickWeatherForSeason(seasonId) {
  const weights = SEASON_WEATHER_WEIGHTS[seasonId] || SEASON_WEATHER_WEIGHTS.spring;
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return entries[0][0];
}

function loadSavedMemorials() {
  try {
    const raw = localStorage.getItem(STORAGE_MEMORIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeAndDeduplicateMemorials(parsed);
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return normalizeAndDeduplicateMemorials(INITIAL_MEMORIALS);
}

function loadBoolPref(key, fallback = true) {
  try {
    const v = localStorage.getItem(key);
    if (v === 'false') return false;
    if (v === 'true') return true;
  } catch {
    // ignore
  }
  return fallback;
}

function loadVolumePrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_SOUND_VOLUMES, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SOUND_VOLUMES };
}

function loadArrayPref(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function loadSavedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeAccountNameFix(parsed);
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return null;
}

function loadSavedViewMode() {
  try {
    const saved = localStorage.getItem(STORAGE_VIEWMODE_KEY);
    if (saved === 'world3d' || saved === 'world2d' || saved === 'grid') return saved;
  } catch {
    // ignore storage errors
  }
  return 'world3d';
}

function loadSavedMusicUrl() {
  try {
    return localStorage.getItem(STORAGE_MUSIC_URL_KEY) || '';
  } catch {
    return '';
  }
}

function pickRandomAtmosphere() {
  const atms = ['morning', 'dusk', 'night'];
  return atms[Math.floor(Math.random() * atms.length)];
}

function pickRandomSeason() {
  return SEASONS[Math.floor(Math.random() * SEASONS.length)].id;
}

export default function App() {
  const [initialEnv] = useState(() => {
    const initSeason = pickRandomSeason();
    return {
      atmosphere: pickRandomAtmosphere(),
      season: initSeason,
      weather: pickWeatherForSeason(initSeason),
    };
  });
  const [memorials, setMemorials] = useState(loadSavedMemorials);
  const [currentUser, setCurrentUser] = useState(loadSavedUser);
  const [atmosphere, setAtmosphere] = useState(initialEnv.atmosphere); // 'morning' | 'dusk' | 'night'
  const [season, setSeason] = useState(initialEnv.season); // 'spring' | 'summer' | 'autumn' | 'winter'
  const [weather, setWeather] = useState(initialEnv.weather); // 'clear' | 'windy' | 'snow' | 'rain' | 'thunderstorm'
  const [randomWeather, setRandomWeather] = useState(true);
  const [weatherEffectsEnabled, setWeatherEffectsEnabled] = useState(() =>
    loadBoolPref(STORAGE_WEATHER_FX_KEY, true)
  );
  const [weatherSoundEnabled, setWeatherSoundEnabled] = useState(() =>
    loadBoolPref(STORAGE_WEATHER_SOUND_KEY, true)
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolumes, setSoundVolumesState] = useState(loadVolumePrefs);
  const [tipsEnabled, setTipsEnabled] = useState(() => loadTipsPrefs().tipsEnabled);
  const [showFirstGuide, setShowFirstGuide] = useState(() => {
    const tp = loadTipsPrefs();
    return tp.tipsEnabled && !tp.guideCompleted;
  });
  const [guideKey, setGuideKey] = useState(0);
  const [zoomGuideTipAt, setZoomGuideTipAt] = useState(0);
  const [showSpeciesGate, setShowSpeciesGate] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [adminConfig, setAdminConfig] = useState(getAdminConfig);
  const [notifications, setNotifications] = useState(getAdminNotifications);
  const [readNotifIds, setReadNotifIds] = useState(() => loadArrayPref(STORAGE_READ_NOTIFS_KEY));
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedRoom = typeof window !== 'undefined' ? localStorage.getItem('evergreen_paws_active_room_v1') : null;
      return savedRoom === 'ash-room' ? 'ash-room' : 'tombstone';
    } catch {
      return 'tombstone';
    }
  }); // 'tombstone' | 'ash-room' | 'sanctuary'
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      const savedRoom = typeof window !== 'undefined' ? localStorage.getItem('evergreen_paws_active_room_v1') : null;
      return savedRoom === 'ash-room' ? 'ash-room' : 'tombstone';
    } catch {
      return 'tombstone';
    }
  }); // 'tombstone' | 'ash-room'
  const [walkToRoomRequest, setWalkToRoomRequest] = useState(null);
  const [walkToSpeciesRequest, setWalkToSpeciesRequest] = useState(null);
  const [walkToMemorialRequest, setWalkToMemorialRequest] = useState(null);
  const [activeSpecies, setActiveSpecies] = useState(() => {
    try {
      const savedSp = typeof window !== 'undefined' ? localStorage.getItem('evergreen_paws_active_species_v1') : null;
      return savedSp || 'Dog';
    } catch {
      return 'Dog';
    }
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState(loadSavedViewMode); // 'world3d' | 'world2d' | 'grid'
  const [favorites, setFavorites] = useState(() => loadArrayPref(STORAGE_FAVORITES_KEY));
  const [visitedMemorialIds, setVisitedMemorialIds] = useState(() =>
    loadArrayPref(STORAGE_VISITED_KEY)
  );
  const [friends, setFriends] = useState(() => loadArrayPref(STORAGE_FRIENDS_KEY));
  const [friendRequests, setFriendRequests] = useState(getPendingFriendRequests);
  const [mpOnline, setMpOnline] = useState(isMultiplayerOnline);
  const [activeGroup, setActiveGroup] = useState(getActiveGroup);
  const [groupChatLog, setGroupChatLog] = useState(getGroupChatHistory);
  const [groupInvites, setGroupInvites] = useState(getPendingGroupInvites);
  const [, setInviteClockTick] = useState(0);
  const [showOutsideChat, setShowOutsideChat] = useState(() =>
    loadBoolPref(STORAGE_OUTSIDE_CHAT_KEY, true)
  );
  const [accountMenuFeedback, setAccountMenuFeedback] = useState('');

  const [selectedMemorialId, setSelectedMemorialId] = useState(null);
  const [pendingMemorialId, setPendingMemorialId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [accountsList, setAccountsList] = useState(getRegisteredAccounts);
  const [globalNotice, setGlobalNotice] = useState('');
  const [openEnvPanel, setOpenEnvPanel] = useState(null); // null | 'season' | 'weather' | 'volume'
  const envBarRef = useRef(null);
  const isApk = useMemo(() => isApkEnvironment(), []);
  const isMobileHud = useIsMobileHud(isApk);

  useEffect(() => {
    if (!openEnvPanel || typeof document === 'undefined') return undefined;
    const handleOutside = (e) => {
      if (envBarRef.current && !envBarRef.current.contains(e.target)) {
        setOpenEnvPanel(null);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [openEnvPanel]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('is-apk-app', isApk);
      document.body.classList.toggle('is-mobile-hud', isMobileHud);
    }
  }, [isApk, isMobileHud]);

  // Auto-sync Web Desktop / Mobile Web when a newer build version is deployed on GitHub Pages
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.protocol.startsWith('http')) {
      return undefined;
    }
    let cancelled = false;
    const checkLatestVersion = async () => {
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const remoteVer = data && data.version ? String(data.version) : '';
        const remoteBuilt = data && data.buildTimestamp ? String(data.buildTimestamp) : '';
        const versionChanged = Boolean(remoteVer && remoteVer !== APP_BUILD_VERSION);
        const buildChanged = Boolean(remoteBuilt && remoteBuilt !== APP_BUILD_TIMESTAMP);
        if (!versionChanged && !buildChanged) return;
        const reloadKey = `${remoteVer}|${remoteBuilt}`;
        let alreadyReloaded = '';
        try {
          alreadyReloaded = sessionStorage.getItem('evergreen_auto_reloaded_ver') || '';
        } catch {
          // ignore
        }
        if (alreadyReloaded === reloadKey) return;
        try {
          sessionStorage.setItem('evergreen_auto_reloaded_ver', reloadKey);
        } catch {
          // ignore
        }
        if (typeof caches !== 'undefined' && caches.keys) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {
            // ignore
          }
        }
        const url = new URL(window.location.href);
        url.searchParams.set('v', remoteVer || APP_BUILD_VERSION);
        url.searchParams.set('t', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        // ignore transient fetch errors
      }
    };
    checkLatestVersion();
    const timer = setInterval(checkLatestVersion, 25000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const showGlobalNotice = (msg) => {
    setGlobalNotice(msg);
    setTimeout(() => setGlobalNotice(''), 4200);
  };

  const moderationStatus = useMemo(
    () => getUserRestrictionStatus(currentUser),
    [currentUser, accountsList]
  );

  useEffect(() => {
    setCurrentUserIdentity(currentUser);
    if (currentUser && moderationStatus.account?.name && currentUser.name !== moderationStatus.account.name) {
      setCurrentUser((prev) => (prev ? { ...prev, name: moderationStatus.account.name } : prev));
    }
    if (currentUser && moderationStatus.loginBanned) {
      setCurrentUser(null);
      setSelectedMemorialId(null);
      setShowCreateModal(false);
      setShowUserMenu(false);
      showGlobalNotice(
        `⛔ Your account is banned from logging in (${moderationStatus.loginBanLabel}).`
      );
    }
  }, [currentUser, moderationStatus]);

  const [mpPeers, setMpPeers] = useState([]);
  const [mpStatus, setMpStatus] = useState('connecting');
  const mpRoomCode = 'PUBLIC';
  const mpNickname = currentUser?.name?.split(' ')[0] || currentUser?.username || 'Visitor';
  const [mpChatLog, setMpChatLog] = useState(() =>
    loadArrayPref(STORAGE_MP_CHAT_KEY).slice(-80)
  );
  const [remoteWorldEvent, setRemoteWorldEvent] = useState(null);
  const memorialsRef = useRef(memorials);
  const recentVisitAtRef = useRef({});
  const removeFriendConfirmRef = useRef({ key: '', until: 0 });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MP_CHAT_KEY, JSON.stringify(mpChatLog.slice(-80)));
    } catch {
      // ignore
    }
  }, [mpChatLog]);

  useEffect(() => {
    memorialsRef.current = memorials;
    syncAllLocalMemorials(memorials);
  }, [memorials]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WEATHER_FX_KEY, String(weatherEffectsEnabled));
      localStorage.setItem(STORAGE_WEATHER_SOUND_KEY, String(weatherSoundEnabled));
      localStorage.setItem(STORAGE_OUTSIDE_CHAT_KEY, String(showOutsideChat));
      localStorage.setItem(STORAGE_READ_NOTIFS_KEY, JSON.stringify(readNotifIds));
    } catch {
      // ignore
    }
  }, [weatherEffectsEnabled, weatherSoundEnabled, showOutsideChat, readNotifIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VISITED_KEY, JSON.stringify(visitedMemorialIds));
    } catch {
      // ignore
    }
  }, [visitedMemorialIds]);

  const markMemorialVisited = useCallback((memorialId) => {
    if (!memorialId) return;
    const now = Date.now();
    const last = recentVisitAtRef.current[memorialId] || 0;
    if (now - last < 3000) return;
    recentVisitAtRef.current[memorialId] = now;

    setVisitedMemorialIds((prev) =>
      prev.includes(memorialId) ? prev : [...prev, memorialId]
    );
    let updatedForSync = null;
    setMemorials((prev) =>
      prev.map((m) => {
        if (m.id !== memorialId) return m;
        updatedForSync = {
          ...m,
          visitsCount: (Number(m.visitsCount) || 0) + 1,
          updatedAt: now,
        };
        return updatedForSync;
      })
    );
    if (updatedForSync) {
      publishSharedMemorial(updatedForSync);
      sendMultiplayerAction({
        kind: 'visit',
        memorialId,
        visitsCount: updatedForSync.visitsCount,
      });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(friends));
    } catch {
      // ignore
    }
  }, [friends]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VOLUMES_KEY, JSON.stringify(soundVolumes));
    } catch {
      // ignore
    }
    setSoundVolumes(soundVolumes);
  }, [soundVolumes]);

  const buildAudioState = (enabledOverride = soundEnabled) => ({
    enabled: enabledOverride,
    weatherSoundEnabled: weatherEffectsEnabled && weatherSoundEnabled,
    musicUrl: adminConfig?.globalMusicUrl || '',
    weather: weatherEffectsEnabled ? weather : 'clear',
    room: activeRoom,
    atmosphere,
    volumes: soundVolumes,
  });

  useEffect(() => {
    setSoundState(buildAudioState());
  }, [soundEnabled, weatherEffectsEnabled, weatherSoundEnabled, adminConfig?.globalMusicUrl, weather, activeRoom, atmosphere, soundVolumes]);

  useEffect(() => {
    if (!randomWeather) return undefined;
    const timer = setInterval(() => {
      const nextSeason = pickRandomSeason();
      setSeason(nextSeason);
      setWeather(pickWeatherForSeason(nextSeason));
      setAtmosphere(pickRandomAtmosphere());
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [randomWeather]);

  const handleSelectSeason = (nextSeason) => {
    setSeason(nextSeason);
    setWeather(pickWeatherForSeason(nextSeason));
  };

  const handleRandomizeWeather = () => {
    const nextSeason = pickRandomSeason();
    setSeason(nextSeason);
    setWeather(pickWeatherForSeason(nextSeason));
    setAtmosphere(pickRandomAtmosphere());
  };

  const handleVolumeSliderChange = (channelKey, pct) => {
    const val = Math.max(0, Math.min(1, Number(pct) / 100));
    setSoundVolumesState((prev) => {
      const next = { ...prev, [channelKey]: val };
      setSoundVolumes(next);
      return next;
    });
  };

  const handleToggleSound = () => {
    if (soundEnabled && (!isAudioUnlocked() || wasRecentlyUnlockedInGesture(350))) {
      setSoundState(buildAudioState(true));
      unlockAudioFromGesture();
      if (atmosphere === 'morning') playMorningBird(true);
      else playDogBarkAndHowl(true);
      return;
    }
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundState(buildAudioState(next));
    if (next) {
      unlockAudioFromGesture();
    }
  };

  const enabledViews = useMemo(
    () => ({
      world3d: adminConfig?.enabledViews?.world3d !== false,
      world2d: adminConfig?.enabledViews?.world2d !== false,
      grid: adminConfig?.enabledViews?.grid !== false,
    }),
    [adminConfig]
  );

  useEffect(() => {
    if (!enabledViews[viewMode]) {
      const fallbackView = enabledViews.world3d
        ? 'world3d'
        : enabledViews.world2d
          ? 'world2d'
          : 'grid';
      setViewMode(fallbackView);
    }
  }, [enabledViews, viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEWMODE_KEY, viewMode);
    } catch {
      // ignore storage errors
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('evergreen_paws_active_room_v1', activeRoom);
    } catch {
      // ignore
    }
  }, [activeRoom]);

  useEffect(() => {
    try {
      localStorage.setItem('evergreen_paws_active_species_v1', activeSpecies);
    } catch {
      // ignore
    }
  }, [activeSpecies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEMORIALS_KEY, JSON.stringify(memorials));
    } catch {
      // ignore storage quota errors
    }
  }, [memorials]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [currentUser]);

  const visibleMemorials = useMemo(() => {
    return memorials.filter((m) => {
      const isOwner = isMemorialOwner(m, currentUser);
      if (m.visibility === 'private' && !isOwner) return false;
      return true;
    });
  }, [memorials, currentUser]);

  const speciesMemorials = useMemo(
    () => visibleMemorials.filter((m) => (m.species || 'Dog') === activeSpecies),
    [visibleMemorials, activeSpecies]
  );

  const filteredMemorials = useMemo(() => {
    return visibleMemorials.filter((m) => {
      if (activeTab === 'tombstone' && m.space !== 'tombstone') return false;
      if (activeTab === 'ash-room' && m.space !== 'ash-room') return false;
      if (activeTab === 'sanctuary') {
        if (!isMemorialOwner(m, currentUser)) return false;
      } else if (!showOnlyFavorites) {
        if ((m.species || 'Dog') !== activeSpecies) return false;
      }
      if (showOnlyFavorites && !favorites.includes(m.id)) return false;
      return true;
    });
  }, [visibleMemorials, activeTab, activeSpecies, showOnlyFavorites, favorites, currentUser]);

  const stats = useMemo(() => {
    const candles = visibleMemorials.reduce((sum, m) => sum + (m.candlesCount || 0), 0);
    const flowers = visibleMemorials.reduce((sum, m) => sum + (m.flowersCount || 0), 0);
    return {
      totalPets: visibleMemorials.length,
      candles,
      flowers,
    };
  }, [visibleMemorials]);

  const selectedMemorial = useMemo(
    () => memorials.find((m) => m.id === selectedMemorialId) || null,
    [memorials, selectedMemorialId]
  );

  const handleOpenVisit = (memorialId) => {
    if (!currentUser) {
      setPendingMemorialId(memorialId);
      setShowAuthModal(true);
      return;
    }
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(
        `⏸️ Visiting & taking actions on vigils is paused by Admin (${moderationStatus.vigilLabel}).`
      );
      return;
    }
    markMemorialVisited(memorialId);
    setSelectedMemorialId(memorialId);
  };

  const handleOpenCreate = () => {
    if (!currentUser) {
      setPendingCreate(true);
      setShowAuthModal(true);
      return;
    }
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(
        `⏸️ Vigil actions are paused by Admin (${moderationStatus.vigilLabel}).`
      );
      return;
    }
    setShowCreateModal(true);
  };

  const syncAvatarGenderToStorage = (nextGender, applyDefaultCloak = false) => {
    try {
      const raw = localStorage.getItem('evergreen_paws_avatar_v1');
      const existing = raw ? JSON.parse(raw) : {};
      const nextAvatar = {
        cloakColor: nextGender === 'boy' ? '#4a7c59' : '#b86578',
        hairColor: '#2c221e',
        companion: 'dog',
        carryingLantern: true,
        ...existing,
        gender: nextGender,
      };
      if (applyDefaultCloak && !raw) {
        nextAvatar.cloakColor = nextGender === 'boy' ? '#4a7c59' : '#b86578';
      }
      localStorage.setItem('evergreen_paws_avatar_v1', JSON.stringify(nextAvatar));
    } catch {
      // ignore storage errors
    }
  };

  const showLockedGenderNotice = () => {
    setAccountMenuFeedback('Character gender cannot be changed after account creation.');
    setTimeout(() => setAccountMenuFeedback(''), 3200);
  };

  const showLockedNameNotice = () => {
    setAccountMenuFeedback('Name and display name are permanent and cannot be changed.');
    setTimeout(() => setAccountMenuFeedback(''), 3200);
  };

  const handleToggleMpOnline = () => {
    const next = setMultiplayerOnline(!mpOnline);
    setMpOnline(next);
  };

  const handleToggleFavorite = (memorialId) => {
    setFavorites((prev) =>
      prev.includes(memorialId) ? prev.filter((id) => id !== memorialId) : [...prev, memorialId]
    );
  };

  const handleWalkAndVisitFavorite = (memorial) => {
    if (!memorial) return;
    setShowFavoritesModal(false);
    setShowOnlyFavorites(false);
    if (memorial.species) setActiveSpecies(memorial.species);
    const targetRoom = memorial.space === 'ash-room' ? 'ash-room' : 'tombstone';
    setActiveRoom(targetRoom);
    setActiveTab(targetRoom);
    if (viewMode === 'grid') {
      if (adminConfig?.enabledViews?.world3d !== false) setViewMode('world3d');
      else if (adminConfig?.enabledViews?.world2d !== false) setViewMode('world2d');
    }
    setWalkToMemorialRequest({ memorial, ts: Date.now() });
  };

  const handleAcceptFriendRequest = (reqId) => {
    const req = acceptFriendRequest(reqId);
    setFriendRequests(getPendingFriendRequests());
    if (req) {
      const friendLabel = req.fromName || req.fromUsername;
      if (friendLabel) {
        setFriends((prev) =>
          prev.some((f) => f.toLowerCase() === friendLabel.toLowerCase())
            ? prev
            : [...prev, friendLabel]
        );
      }
      showGlobalNotice(`🤝 You and ${friendLabel || 'Visitor'} are now friends!`);
    } else {
      showGlobalNotice('⏳ That Friend Request expired (24h timeout) and was auto-cancelled.');
    }
  };

  const handleIgnoreFriendRequest = (reqId) => {
    ignoreFriendRequest(reqId);
    setFriendRequests(getPendingFriendRequests());
    showGlobalNotice('✖️ Friend request ignored and cancelled.');
  };

  const handleCancelFriendRequest = (reqIdOrName) => {
    if (cancelOutgoingFriendRequest(reqIdOrName)) {
      setFriendRequests(getPendingFriendRequests());
      showGlobalNotice('✖️ Friend request cancelled.');
    }
  };

  const handleToggleFriend = (friendName, peerObj = null) => {
    const clean = String(friendName || peerObj?.name || '').trim();
    if (!clean) return;
    const cleanLower = clean.toLowerCase();

    const matchedAccount = accountsList.find(
      (a) =>
        a &&
        ((a.name || '').toLowerCase() === cleanLower ||
          (a.username || '').toLowerCase() === cleanLower)
    );
    const targetName = matchedAccount?.name || clean;
    const targetUser = matchedAccount?.username || '';
    const targetNameLower = targetName.toLowerCase();
    const targetUserLower = targetUser.toLowerCase();

    const isAlreadyFriend = friends.some((f) => {
      const fl = f.toLowerCase();
      return fl === cleanLower || fl === targetNameLower || (targetUserLower && fl === targetUserLower);
    });
    if (isAlreadyFriend) {
      const now = Date.now();
      const pendingConfirm = removeFriendConfirmRef.current;
      if (pendingConfirm.key !== targetNameLower || now > pendingConfirm.until) {
        removeFriendConfirmRef.current = { key: targetNameLower, until: now + 3500 };
        showGlobalNotice(`⚠️ Tap again within 3s to confirm removing ${targetName} from friends.`);
        return 'confirm_remove';
      }
      removeFriendConfirmRef.current = { key: '', until: 0 };
      setFriends((prev) =>
        prev.filter((f) => {
          const fl = f.toLowerCase();
          return fl !== cleanLower && fl !== targetNameLower && (!targetUserLower || fl !== targetUserLower);
        })
      );
      showGlobalNotice(`Removed ${targetName} from friends.`);
      return 'removed';
    }

    const pendingIncoming = (friendRequests.incoming || []).find((r) => {
      const fn = (r.fromName || '').trim().toLowerCase();
      const fu = (r.fromUsername || '').trim().toLowerCase();
      return fn === cleanLower || fn === targetNameLower || (targetUserLower && fu === targetUserLower);
    });
    if (pendingIncoming) {
      handleAcceptFriendRequest(pendingIncoming.id);
      return;
    }

    const pendingOutgoing = (friendRequests.outgoing || []).find((r) => {
      const tn = (r.toName || '').trim().toLowerCase();
      const tu = (r.toUsername || '').trim().toLowerCase();
      return tn === cleanLower || tn === targetNameLower || (targetUserLower && tu === targetUserLower);
    });
    if (pendingOutgoing) {
      handleCancelFriendRequest(pendingOutgoing.id);
      return;
    }

    const res = sendFriendRequest({
      toName: targetName,
      toUsername: targetUser,
      toPeerId: peerObj?.peerId || '',
      fromName: currentUser?.name || mpNickname || 'Visitor',
      fromUsername: currentUser?.username || '',
    });
    setFriendRequests(getPendingFriendRequests());
    if (res?.ok) {
      showGlobalNotice(`📨 Friend request sent to ${targetName} (24h countdown to accept).`);
    }
  };

  const handleLogin = (user) => {
    const gender = user.gender === 'boy' ? 'boy' : 'girl';
    const enriched = { ...user, gender };
    setCurrentUser(enriched);
    if (user.avatar) {
      try {
        localStorage.setItem('evergreen_paws_avatar_v1', JSON.stringify(user.avatar));
      } catch {
        // ignore
      }
    } else {
      syncAvatarGenderToStorage(gender, true);
    }
    setShowAuthModal(false);
    if (pendingMemorialId) {
      setSelectedMemorialId(pendingMemorialId);
      setPendingMemorialId(null);
    } else if (pendingCreate) {
      setShowCreateModal(true);
      setPendingCreate(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowUserMenu(false);
    if (selectedMemorial?.visibility === 'private') {
      setSelectedMemorialId(null);
    }
  };

  const handleResetDemo = () => {
    setMemorials(INITIAL_MEMORIALS);
    setShowUserMenu(false);
  };

  const mergeById = (existing = [], incoming = []) => {
    const map = new Map();
    incoming.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    existing.forEach((item) => {
      if (item && item.id && !map.has(item.id)) map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  const mergeIncomingMemorial = (prevList, incoming) => {
    if (!incoming || !incoming.id || incoming.visibility === 'private') return prevList;
    const idx = prevList.findIndex((m) => m.id === incoming.id);
    if (idx === -1) {
      return normalizeAndDeduplicateMemorials([incoming, ...prevList]);
    }
    const existing = prevList[idx];
    const preferIncomingMeta = (incoming.updatedAt || 0) >= (existing.updatedAt || 0);
    const mergedOfferings = Array.from(
      new Set([
        ...(preferIncomingMeta ? incoming.activeOfferings || [] : existing.activeOfferings || []),
        ...(preferIncomingMeta ? existing.activeOfferings || [] : incoming.activeOfferings || []),
      ])
    ).slice(0, 6);

    const merged = {
      ...existing,
      ...(preferIncomingMeta
        ? {
            name: incoming.name || existing.name,
            species: incoming.species || existing.species,
            breed: incoming.breed || existing.breed,
            space: incoming.space || existing.space,
            styleId: incoming.styleId || existing.styleId,
            locationCode: incoming.locationCode || existing.locationCode,
            zoneName: incoming.zoneName || existing.zoneName,
            photo: incoming.photo || existing.photo,
            epitaph: incoming.epitaph || existing.epitaph,
            story: incoming.story || existing.story,
            favoriteTreat: incoming.favoriteTreat || existing.favoriteTreat,
            updatedAt: Math.max(existing.updatedAt || 0, incoming.updatedAt || 0),
          }
        : {}),
      candlesCount: Math.max(existing.candlesCount || 0, incoming.candlesCount || 0),
      incenseCount: Math.max(existing.incenseCount || 0, incoming.incenseCount || 0),
      flowersCount: Math.max(existing.flowersCount || 0, incoming.flowersCount || 0),
      treatsCount: Math.max(existing.treatsCount || 0, incoming.treatsCount || 0),
      visitsCount: Math.max(existing.visitsCount || 0, incoming.visitsCount || 0),
      activeOfferings: mergedOfferings,
      tributes: mergeById(existing.tributes, incoming.tributes),
      memories: mergeById(existing.memories, incoming.memories),
      offeringsLog: mergeById(existing.offeringsLog, incoming.offeringsLog),
    };

    const next = [...prevList];
    next[idx] = merged;
    return next;
  };

  const buildWithOffering = (m, offering, visitorName) => {
    const now = Date.now();
    const nextActive = [
      offering.emoji,
      ...(m.activeOfferings || []).filter((e, i) => i < 5 || e !== offering.emoji),
    ].slice(0, 6);
    return {
      ...m,
      updatedAt: now,
      candlesCount: offering.category === 'candle' ? m.candlesCount + 1 : m.candlesCount,
      incenseCount: offering.category === 'incense' ? m.incenseCount + 1 : m.incenseCount,
      flowersCount: offering.category === 'flower' ? m.flowersCount + 1 : m.flowersCount,
      treatsCount: offering.category === 'treat' ? m.treatsCount + 1 : m.treatsCount,
      activeOfferings: nextActive,
      offeringsLog: [
        {
          id: `o-${now}-${Math.random().toString(36).slice(2, 6)}`,
          emoji: offering.emoji,
          label: offering.label,
          visitor: visitorName,
          createdAt: now,
          time: 'Just now',
        },
        ...(m.offeringsLog || []),
      ],
    };
  };

  const buildWithTribute = (m, message, author) => {
    const now = Date.now();
    return {
      ...m,
      updatedAt: now,
      tributes: [
        {
          id: `t-${now}-${Math.random().toString(36).slice(2, 6)}`,
          author,
          message,
          createdAt: now,
          date: 'Just now',
        },
        ...(m.tributes || []),
      ],
    };
  };

  const applyOfferingToState = (memorialId, offering, visitorName) => {
    setMemorials((prev) =>
      prev.map((m) => (m.id === memorialId ? buildWithOffering(m, offering, visitorName) : m))
    );
  };

  const applyTributeToState = (memorialId, message, author) => {
    setMemorials((prev) =>
      prev.map((m) => (m.id === memorialId ? buildWithTribute(m, message, author) : m))
    );
  };

  useEffect(() => {
    initMultiplayer({
      onPeersChange: (peers) => setMpPeers(peers),
      onStatusChange: (status) => setMpStatus(status),
      onChatMessage: (msg) => {
        setMpChatLog((prev) => [...prev, msg].slice(-80));
      },
      onSyncMemorial: (memorial) => {
        setMemorials((prev) => mergeIncomingMemorial(prev, memorial));
      },
      onAdminConfigChange: (cfg) => {
        setAdminConfig(cfg);
      },
      onNotificationsChange: (list) => {
        setNotifications(list);
      },
      onGroupChange: (grp) => {
        setActiveGroup(grp);
      },
      onGroupChatChange: (msgs) => {
        setGroupChatLog(msgs);
      },
      onAccountsChange: (list) => {
        setAccountsList(list);
      },
      onGroupInvitesChange: (list) => {
        setGroupInvites(list);
      },
      onFriendRequestsChange: (reqs) => {
        setFriendRequests(reqs);
      },
      onFriendRequestAccepted: (req) => {
        const friendLabel = req?.toName || req?.toUsername;
        if (friendLabel) {
          setFriends((prev) =>
            prev.some((f) => f.toLowerCase() === friendLabel.toLowerCase())
              ? prev
              : [...prev, friendLabel]
          );
          showGlobalNotice(`🤝 ${friendLabel} accepted your Friend Request!`);
        }
      },
      onRemoteEvent: (evt) => {
        if (!evt) return;
        if (evt.kind === 'visit' && evt.memorialId) {
          setMemorials((prev) =>
            prev.map((m) =>
              m.id === evt.memorialId
                ? {
                    ...m,
                    visitsCount: Math.max((Number(m.visitsCount) || 0) + 1, Number(evt.visitsCount) || 0),
                  }
                : m
            )
          );
        } else if (evt.kind === 'offering' && evt.memorialId && evt.offering) {
          applyOfferingToState(evt.memorialId, evt.offering, evt.senderName || 'Visitor');
          const petName =
            evt.petName ||
            memorialsRef.current.find((m) => m.id === evt.memorialId)?.name ||
            'a companion';
          setRemoteWorldEvent({
            id: evt.id,
            kind: 'offering',
            peerId: evt.peerId,
            room: evt.room,
            species: evt.species,
            nx: evt.nx,
            nz: evt.nz,
            memorialId: evt.memorialId,
            emoji: evt.offering.emoji || '🌸',
            text: `✨ ${evt.senderName} ${evt.offering.blessing || 'left an offering'} for ${petName}`,
          });
        } else if (evt.kind === 'tribute' && evt.memorialId && evt.message) {
          applyTributeToState(evt.memorialId, evt.message, evt.senderName || 'Visitor');
          const petName =
            evt.petName ||
            memorialsRef.current.find((m) => m.id === evt.memorialId)?.name ||
            'a companion';
          setRemoteWorldEvent({
            id: evt.id,
            kind: 'tribute',
            peerId: evt.peerId,
            room: evt.room,
            species: evt.species,
            nx: evt.nx,
            nz: evt.nz,
            memorialId: evt.memorialId,
            emoji: '💌',
            text: `💌 ${evt.senderName} left a message for ${petName}`,
          });
        } else if (evt.kind === 'create_memorial' && evt.memorial) {
          setMemorials((prev) => mergeIncomingMemorial(prev, evt.memorial));
          setRemoteWorldEvent({
            id: evt.id,
            kind: 'create_memorial',
            peerId: evt.peerId,
            room: evt.memorial.space || evt.room,
            species: evt.memorial.species || evt.species,
            nx: evt.nx,
            nz: evt.nz,
            emoji: '🕯️',
            text: `🕯️ ${evt.senderName} enshrined ${evt.memorial.name}`,
          });
        } else if (evt.kind === 'emote') {
          setRemoteWorldEvent({
            id: evt.id,
            kind: 'emote',
            peerId: evt.peerId,
            room: evt.room,
            species: evt.species,
            nx: evt.nx,
            nz: evt.nz,
            emoji: evt.emoji || '✨',
            text: `${evt.senderName}: ${evt.label || evt.emoji}`,
          });
        }
      },
    });
    syncAllLocalMemorials(memorialsRef.current, true);
    const invTimer = setInterval(() => {
      setGroupInvites(getPendingGroupInvites());
      setFriendRequests(getPendingFriendRequests());
      setInviteClockTick((n) => n + 1);
    }, 30000);
    return () => clearInterval(invTimer);
  }, []);

  const handleSendMpChat = (text) => {
    if (moderationStatus.muted) {
      showGlobalNotice(`🔇 You are muted by Admin (${moderationStatus.muteLabel}) and cannot chat.`);
      return;
    }
    const msg = sendMultiplayerChat(text);
    if (msg) {
      setMpChatLog((prev) => [...prev, msg].slice(-80));
    }
  };

  const handleSendGroupChat = (text) => {
    if (moderationStatus.muted) {
      showGlobalNotice(`🔇 You are muted by Admin (${moderationStatus.muteLabel}) and cannot message groups.`);
      return;
    }
    sendGroupChatMessage(text);
  };

  const handleCreateGroup = (groupName) => {
    const grp = createGroupChat(groupName);
    if (grp) setActiveGroup(grp);
  };

  const handleJoinGroup = (groupCode) => {
    const grp = joinGroupChat(groupCode);
    if (grp) setActiveGroup(grp);
  };

  const handleExitGroup = () => {
    exitGroupChat();
    setActiveGroup(null);
    setGroupChatLog([]);
  };

  const handleToggleOutsideChat = () => {
    setShowOutsideChat((v) => !v);
  };

  const handleInviteFriendToGroup = (friendName, peerObj = null) => {
    const cleanTarget = String(friendName || peerObj?.name || '').trim();
    if (!cleanTarget) return;
    const matchedAccount = accountsList.find(
      (a) =>
        a &&
        ((a.name || '').toLowerCase() === cleanTarget.toLowerCase() ||
          (a.username || '').toLowerCase() === cleanTarget.toLowerCase())
    );
    const res = sendGroupInvite({
      toName: matchedAccount?.name || cleanTarget,
      toUsername: matchedAccount?.username || '',
      toPeerId: peerObj?.peerId || '',
      fromName: currentUser?.name || mpNickname || 'Friend',
      fromUsername: currentUser?.username || '',
    });
    if (res?.ok && res.group) {
      setActiveGroup(res.group);
      showGlobalNotice(`📨 Group Chat invite sent to ${matchedAccount?.name || cleanTarget} (valid 30m).`);
    }
  };

  const handleAcceptGroupInvite = (inviteId) => {
    const joined = acceptGroupInvite(inviteId);
    setGroupInvites(getPendingGroupInvites());
    if (joined) {
      setActiveGroup(joined);
      showGlobalNotice(`🔒 Joined Group Chat "${joined.name}"!`);
    } else {
      showGlobalNotice('⏳ That Group Chat invite expired (30m timeout).');
    }
  };

  const handleIgnoreGroupInvite = (inviteId) => {
    ignoreGroupInvite(inviteId);
    setGroupInvites(getPendingGroupInvites());
  };

  const handlePerformOffering = (memorialId, offering) => {
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(`⏸️ Vigil actions are paused by Admin (${moderationStatus.vigilLabel}).`);
      return;
    }
    const visitorName = currentUser?.name || mpNickname || 'Kind Visitor';
    const current = memorialsRef.current.find((m) => m.id === memorialId);
    if (!current) return;
    const updated = buildWithOffering(current, offering, visitorName);
    setMemorials((prev) => prev.map((m) => (m.id === memorialId ? updated : m)));
    publishSharedMemorial(updated);
    sendMultiplayerAction({
      kind: 'offering',
      memorialId,
      offering,
      petName: updated.name,
    });
  };

  const handleAddTribute = (memorialId, message) => {
    if (moderationStatus.vigilPaused || moderationStatus.muted) {
      showGlobalNotice(
        moderationStatus.vigilPaused
          ? `⏸️ Giving vigil messages & visiting is paused by Admin (${moderationStatus.vigilLabel}).`
          : `🔇 You are muted by Admin (${moderationStatus.muteLabel}) and cannot leave messages.`
      );
      return;
    }
    const author = currentUser?.name || mpNickname || 'Kind Visitor';
    const current = memorialsRef.current.find((m) => m.id === memorialId);
    if (!current) return;
    const updated = buildWithTribute(current, message, author);
    setMemorials((prev) => prev.map((m) => (m.id === memorialId ? updated : m)));
    publishSharedMemorial(updated);
    sendMultiplayerAction({
      kind: 'tribute',
      memorialId,
      message,
      petName: updated.name,
    });
  };

  const handleAddMemory = (memorialId, memory) => {
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(`⏸️ Vigil actions are paused by Admin (${moderationStatus.vigilLabel}).`);
      return;
    }
    const current = memorialsRef.current.find((m) => m.id === memorialId);
    if (!current) return;
    const updated = {
      ...current,
      updatedAt: Date.now(),
      memories: [{ id: `m-${Date.now()}`, ...memory }, ...(current.memories || [])],
    };
    setMemorials((prev) => prev.map((m) => (m.id === memorialId ? updated : m)));
    publishSharedMemorial(updated);
  };

  const handleUpdateMemorial = (memorialId, patch) => {
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(`⏸️ Vigil actions are paused by Admin (${moderationStatus.vigilLabel}).`);
      return;
    }
    const current = memorialsRef.current.find((m) => m.id === memorialId);
    if (!current) return;
    const updated = { ...current, ...patch, updatedAt: Date.now() };
    setMemorials((prev) => prev.map((m) => (m.id === memorialId ? updated : m)));
    publishSharedMemorial(updated);
  };

  const handleCreateMemorial = (newMemorial) => {
    if (moderationStatus.vigilPaused) {
      showGlobalNotice(`⏸️ Vigil creation & actions are paused by Admin (${moderationStatus.vigilLabel}).`);
      return;
    }
    const withTs = { ...newMemorial, updatedAt: Date.now() };
    const nextList = normalizeAndDeduplicateMemorials([withTs, ...memorialsRef.current]);
    const finalMemorial = nextList.find((m) => m.id === withTs.id) || withTs;
    setMemorials(nextList);
    if (finalMemorial.visibility !== 'private') {
      publishSharedMemorial(finalMemorial);
      sendMultiplayerAction({
        kind: 'create_memorial',
        memorial: finalMemorial,
      });
    }
    setShowCreateModal(false);
    setActiveSpecies(finalMemorial.species || 'Dog');
    setActiveTab(finalMemorial.space === 'ash-room' ? 'ash-room' : 'tombstone');
    setActiveRoom(finalMemorial.space === 'ash-room' ? 'ash-room' : 'tombstone');
    setSelectedMemorialId(finalMemorial.id);
  };

  const handleRequestSelectSpecies = (nextSpecies) => {
    if (!nextSpecies || nextSpecies === activeSpecies) return;
    if (viewMode !== 'grid' && activeTab !== 'sanctuary' && !showOnlyFavorites) {
      // Walk character to the Other Species Gate before changing to the chosen species gate
      setWalkToSpeciesRequest(nextSpecies);
      return;
    }
    setWalkToSpeciesRequest(null);
    setActiveSpecies(nextSpecies);
  };

  const handleSelectNavTab = (tab) => {
    if (
      (tab === 'tombstone' || tab === 'ash-room') &&
      viewMode !== 'grid' &&
      activeTab !== 'sanctuary' &&
      activeRoom !== tab
    ) {
      // Walk character to the room portal/gate before changing location
      setWalkToRoomRequest(tab);
      return;
    }
    setWalkToRoomRequest(null);
    setActiveTab(tab);
    if (tab === 'tombstone' || tab === 'ash-room') {
      setActiveRoom(tab);
    }
  };

  const sectionMeta = showOnlyFavorites
    ? {
        title: `💖 Favorite Pet Memorials (${filteredMemorials.length})`,
        subtitle: 'All beloved companions you added to your favorites list across the sanctuary',
      }
    : {
        tombstone: {
          title: '🌿 Outdoor Tombstone Garden',
          subtitle: 'Sunlit meadow plots & carved memorial stones beneath open skies',
        },
        'ash-room': {
          title: '🏛️ Indoor Ash Room (Columbarium)',
          subtitle: 'Quiet candlelit cedar niches housing porcelain & crystal urns',
        },
        sanctuary: {
          title: '✨ My Personal Sanctuary',
          subtitle: currentUser
            ? `Beloved pets enshrined by ${currentUser.name}`
            : 'Sign in to view and tend to your own pets’ tombstones and ash niches',
        },
      }[activeTab] || {
        title: '🌿 Outdoor Tombstone Garden',
        subtitle: 'Sunlit meadow plots & carved memorial stones beneath open skies',
      };

  return (
    <div className={`park-shell theme-${atmosphere}`}>
      <div className="ambient-layer" aria-hidden="true">
        <span className="firefly f1" />
        <span className="firefly f2" />
        <span className="firefly f3" />
        <span className="firefly f4" />
        <span className="firefly f5" />
        <span className="firefly f6" />
      </div>

      {/* Header */}
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="brand-group">
            <div className="brand-crest">
              <Trees size={20} />
            </div>
            <div>
              <h1 className="brand-title">Evergreen Paws</h1>
              <p className="brand-sub">Pet Memorial Park &amp; Ash Room</p>
            </div>
          </div>

          <nav className="desktop-nav" aria-label="Primary sections">
            <button
              type="button"
              className={`nav-pill ${activeTab === 'tombstone' ? 'active' : ''}`}
              onClick={() => handleSelectNavTab('tombstone')}
            >
              <Trees size={15} /> Tombstone Garden
            </button>
            <button
              type="button"
              className={`nav-pill ${activeTab === 'ash-room' ? 'active' : ''}`}
              onClick={() => handleSelectNavTab('ash-room')}
            >
              <Flame size={15} /> Ash Room
            </button>
            <button
              type="button"
              className={`nav-pill ${activeTab === 'sanctuary' ? 'active' : ''}`}
              onClick={() => handleSelectNavTab('sanctuary')}
            >
              <Sparkles size={15} /> My Sanctuary
            </button>
          </nav>

          <div className="top-actions" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`top-music-btn notif-bell-btn ${(groupInvites.length > 0 || (friendRequests.incoming?.length || 0) > 0) ? 'has-invite' : ''}`}
              data-tour="notif-bell"
              onClick={() => {
                setShowNotificationsModal(true);
                setReadNotifIds((prev) => Array.from(new Set([...prev, ...notifications.map((n) => n.id)])));
              }}
              title="Sanctuary News, Updates, Friend Requests & Group Invites"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {(notifications.some((n) => !readNotifIds.includes(n.id)) || groupInvites.length > 0 || (friendRequests.incoming?.length || 0) > 0) && (
                <span className="notif-badge" aria-hidden="true">
                  {notifications.filter((n) => !readNotifIds.includes(n.id)).length + groupInvites.length + (friendRequests.incoming?.length || 0)}
                </span>
              )}
            </button>
            <button
              type="button"
              className="top-music-btn"
              onClick={() => setShowAdminModal(true)}
              title="Admin Backend"
              aria-label="Admin Backend"
            >
              <ShieldCheck size={16} />
            </button>
            <button
              type="button"
              className={`top-music-btn ${soundEnabled ? 'is-on' : 'is-off'}`}
              data-tour="sound-toggle"
              onClick={handleToggleSound}
              title={soundEnabled ? 'Music & Sound ON (Tap to turn off)' : 'Music & Sound OFF (Tap to turn on)'}
              aria-label={soundEnabled ? 'Music On' : 'Music Off'}
            >
              <span className="music-icon-wrap">
                <Music size={16} />
                {!soundEnabled && <span className="music-slash" aria-hidden="true" />}
              </span>
            </button>
            <button
              type="button"
              className="top-music-btn"
              data-tour="update-btn"
              onClick={() => setShowUpdateModal(true)}
              title={`Check Update (v${APP_BUILD_VERSION})`}
              aria-label={`Check for app updates (v${APP_BUILD_VERSION})`}
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              className="btn-primary top-enshrine-btn"
              onClick={handleOpenCreate}
            >
              <Plus size={15} /> {isMobileHud ? 'Enshrine' : 'Enshrine Pet'}
            </button>

            {currentUser ? (
              <button
                type="button"
                className="user-chip"
                onClick={() => setShowUserMenu((v) => !v)}
              >
                <span className="user-avatar-dot">
                  {currentUser.gender === 'boy' ? '👦' : '👩'}
                </span>
                <span>{(currentUser.name || currentUser.username || 'Visitor').split(' ')[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowAuthModal(true)}
              >
                <LogIn size={15} /> Sign In
              </button>
            )}

            {showUserMenu && currentUser && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  background: 'var(--bg-surface-strong)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 14,
                  padding: 12,
                  minWidth: 245,
                  boxShadow: 'var(--shadow-card)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ padding: '2px 4px 6px', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    {currentUser.gender === 'boy' ? '👦' : '👩'} {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    @{currentUser.username || currentUser.email} (permanent)
                  </div>
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 4 }}>
                    Character Gender (Permanent)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className={currentUser.gender !== 'boy' ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={showLockedGenderNotice}
                    >
                      👩 Girl
                    </button>
                    <button
                      type="button"
                      className={currentUser.gender === 'boy' ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={showLockedGenderNotice}
                    >
                      👦 Boy
                    </button>
                  </div>
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 4 }}>
                    Display Name (Permanent)
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'space-between', padding: '6px 9px', fontSize: '0.76rem' }}
                    onClick={showLockedNameNotice}
                  >
                    <span>{currentUser.name || currentUser.username}</span>
                    <Lock size={12} />
                  </button>
                </div>

                {accountMenuFeedback && (
                  <div className="armtip-notif" style={{ fontSize: '0.72rem', padding: '6px 8px' }}>
                    {accountMenuFeedback}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span>Presence Mode</span>
                  <button
                    type="button"
                    className={mpOnline ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                    onClick={handleToggleMpOnline}
                  >
                    {mpOnline ? '🟢 Online' : '⚪ Offline'}
                  </button>
                </div>

                {friends.length > 0 && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', padding: '2px 4px' }}>
                    🤝 Friends ({friends.length}): {friends.slice(0, 4).join(', ')}
                    {friends.length > 4 ? '…' : ''}
                  </div>
                )}

                {adminConfig?.showDemoLogin && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ borderRadius: 10, justifyContent: 'flex-start' }}
                    onClick={handleResetDemo}
                  >
                    <RotateCcw size={14} /> Reset Demo Data
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ borderRadius: 10, justifyContent: 'flex-start' }}
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {globalNotice && (
        <div
          className="armtip-notif"
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 140,
            maxWidth: '92vw',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {globalNotice}
        </div>
      )}

      <main className="main-content">
        {/* Hero Banner */}
        <section className="hero-card">
          <div className="hero-top">
            <div>
              <div className="hero-eyebrow">
                <Sparkles size={13} /> Quiet Sanctuary of Remembrance
              </div>
              <h2 className="hero-heading">Visit Their Tombstone or Candlelit Ash Niche</h2>
              <p className="hero-desc">
                {currentUser
                  ? `Welcome back, ${currentUser.name}. Walk the meadow paths or step inside the Hall of Serenity to light candles, burn incense, and leave treats.`
                  : 'Sign in to visit your pet’s tombstone or columbarium niche, light vigil candles, lay flowers, and share tributes across the community park.'}
              </p>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <strong>{stats.totalPets}</strong>
              <span>Enshrined Companions</span>
            </div>
            <div className="stat-item">
              <strong>{stats.candles}</strong>
              <span>Vigil Candles Lit</span>
            </div>
            <div className="stat-item">
              <strong>{stats.flowers}</strong>
              <span>Flowers &amp; Blossoms</span>
            </div>
            <div className="stat-item">
              <strong>{visitedMemorialIds.length}</strong>
              <span>Pet Vigils Visited</span>
            </div>
          </div>
        </section>

        {/* Auto-Hidden Time of Day, Season, Weather & Volume Icon Menus */}
        <div ref={envBarRef} className={`env-weather-bar ${openEnvPanel ? 'is-expanded' : 'is-collapsed'}`}>
          <div className="env-icon-trigger-row" data-tour="env-controls" role="toolbar" aria-label="Time of day, Season, Weather and Volume menus">
            <button
              type="button"
              className={`env-icon-trigger ${openEnvPanel === 'atmosphere' ? 'active' : ''}`}
              onClick={() => setOpenEnvPanel((p) => (p === 'atmosphere' ? null : 'atmosphere'))}
              title={`Time of day: ${atmosphere}`}
              aria-label="Time of day menu (Morning, Dusk, Night)"
              aria-expanded={openEnvPanel === 'atmosphere'}
            >
              {atmosphere === 'morning' ? <Sun size={14} /> : atmosphere === 'dusk' ? <Sunset size={14} /> : <Moon size={14} />}
            </button>

            <button
              type="button"
              className={`env-icon-trigger ${openEnvPanel === 'season' ? 'active' : ''}`}
              onClick={() => setOpenEnvPanel((p) => (p === 'season' ? null : 'season'))}
              title={`Season: ${SEASONS.find((s) => s.id === season)?.label || season}`}
              aria-label="Season menu"
              aria-expanded={openEnvPanel === 'season'}
            >
              <Calendar size={14} />
              <span>{(SEASONS.find((s) => s.id === season)?.label || '🌸').split(' ')[0]}</span>
            </button>

            <button
              type="button"
              className={`env-icon-trigger ${openEnvPanel === 'weather' ? 'active' : ''}`}
              onClick={() => setOpenEnvPanel((p) => (p === 'weather' ? null : 'weather'))}
              title={`Weather: ${WEATHERS.find((w) => w.id === weather)?.label || weather}`}
              aria-label="Weather menu"
              aria-expanded={openEnvPanel === 'weather'}
            >
              <CloudSun size={14} />
              <span>{(WEATHERS.find((w) => w.id === weather)?.label || '✨').split(' ')[0]}</span>
            </button>

            <button
              type="button"
              className={`env-icon-trigger ${openEnvPanel === 'volume' ? 'active' : ''}`}
              data-tour="volume-btn"
              onClick={() => setOpenEnvPanel((p) => (p === 'volume' ? null : 'volume'))}
              title="Sound Volume Controls"
              aria-label="Volume menu"
              aria-expanded={openEnvPanel === 'volume'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {openEnvPanel && (
              <button
                type="button"
                className="env-icon-close"
                onClick={() => setOpenEnvPanel(null)}
                aria-label="Hide environment panel"
                title="Hide"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {openEnvPanel === 'atmosphere' && (
            <div className="env-group env-dropdown-panel" role="group" aria-label="Park atmosphere">
              <span className="env-label">Sky:</span>
              <button
                type="button"
                className={`env-pill ${atmosphere === 'morning' ? 'active' : ''}`}
                onClick={() => {
                  setAtmosphere('morning');
                  setOpenEnvPanel(null);
                }}
              >
                <Sun size={12} /> Morning
              </button>
              <button
                type="button"
                className={`env-pill ${atmosphere === 'dusk' ? 'active' : ''}`}
                onClick={() => {
                  setAtmosphere('dusk');
                  setOpenEnvPanel(null);
                }}
              >
                <Sunset size={12} /> Dusk
              </button>
              <button
                type="button"
                className={`env-pill ${atmosphere === 'night' ? 'active' : ''}`}
                onClick={() => {
                  setAtmosphere('night');
                  setOpenEnvPanel(null);
                }}
              >
                <Moon size={12} /> Night
              </button>
            </div>
          )}

          {openEnvPanel === 'season' && (
            <div className="env-group env-dropdown-panel">
              <span className="env-label">Season:</span>
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`env-pill ${season === s.id ? 'active' : ''}`}
                  onClick={() => {
                    handleSelectSeason(s.id);
                    setOpenEnvPanel(null);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {openEnvPanel === 'weather' && (
            <div className="env-group env-dropdown-panel">
              <span className="env-label">Weather:</span>
              {WEATHERS.filter((w) => (SEASON_WEATHER_WEIGHTS[season]?.[w.id] || 0) > 0).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`env-pill ${weather === w.id ? 'active' : ''}`}
                  onClick={() => {
                    setWeather(w.id);
                    setOpenEnvPanel(null);
                  }}
                >
                  {w.label}
                </button>
              ))}
              <button
                type="button"
                className={`env-pill ${randomWeather ? 'active' : ''}`}
                onClick={() => setRandomWeather((r) => !r)}
                title="Toggle automatic random weather & day/night cycle"
              >
                <Shuffle size={12} /> Auto Random
              </button>
              <button
                type="button"
                className="env-pill"
                onClick={handleRandomizeWeather}
                title="Randomize season, weather & sky now"
              >
                🎲 Now
              </button>
              <button
                type="button"
                className={`env-pill ${weatherEffectsEnabled ? 'active' : ''}`}
                onClick={() => setWeatherEffectsEnabled((v) => !v)}
                title="Turn all weather visual effects on or off"
              >
                {weatherEffectsEnabled ? '🌦️ Weather FX: ON' : '☀️ Weather FX: OFF'}
              </button>
              <button
                type="button"
                className={`env-pill ${weatherSoundEnabled && weatherEffectsEnabled ? 'active' : ''}`}
                onClick={() => setWeatherSoundEnabled((v) => !v)}
                title="Turn weather sound effects (rain/wind/thunder) on or off"
              >
                {weatherSoundEnabled ? '🔊 Weather Sound: ON' : '🔇 Weather Sound: OFF'}
              </button>
              {atmosphere === 'morning' ? (
                <button
                  type="button"
                  className="env-pill"
                  onClick={() => {
                    if (!soundEnabled) setSoundEnabled(true);
                    setSoundState(buildAudioState(true));
                    unlockAudioFromGesture();
                    playMorningBird(true);
                  }}
                  title="Hear gentle morning songbirds"
                >
                  🐦 Morning Birds
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="env-pill"
                    onClick={() => {
                      if (!soundEnabled) {
                        setSoundEnabled(true);
                      }
                      setSoundState(buildAudioState(true));
                      unlockAudioFromGesture();
                      playDogBarkAndHowl(true);
                    }}
                    title="Hear distant dog bark & moonlight howl (Dusk/Night)"
                  >
                    🐕 Bark/Howl
                  </button>
                  <button
                    type="button"
                    className="env-pill"
                    onClick={() => {
                      if (!soundEnabled) {
                        setSoundEnabled(true);
                      }
                      setSoundState(buildAudioState(true));
                      unlockAudioFromGesture();
                      playOwlHoot(true);
                    }}
                    title="Hear distant owl hoot (Dusk/Night)"
                  >
                    🦉 Owl
                  </button>
                </>
              )}
            </div>
          )}

          {openEnvPanel === 'volume' && (
            <div className="volume-mixer-row env-dropdown-panel" aria-label="Sound volume controls">
              <span className="env-label">Volumes:</span>
              {VOLUME_CHANNELS.map((ch) => {
                const pct = Math.round((soundVolumes[ch.key] ?? 0.3) * 100);
                return (
                  <label key={ch.key} className="volume-slider-item" title={`${ch.label} Volume (${pct}%)`}>
                    <span className="volume-slider-label">
                      {ch.emoji} {ch.label}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={pct}
                      onChange={(e) => handleVolumeSliderChange(ch.key, e.target.value)}
                    />
                    <span className="volume-slider-pct">{pct}%</span>
                  </label>
                );
              })}
              <button
                type="button"
                className="env-pill"
                onClick={() => {
                  const next = { ...DEFAULT_SOUND_VOLUMES };
                  setSoundVolumesState(next);
                  setSoundVolumes(next);
                  showGlobalNotice('🔊 Reset volumes: Master 100%, effects 30%.');
                }}
                title="Reset Master to 100% and all other sounds to 30%"
              >
                ↺ Reset to defaults
              </button>
              <button
                type="button"
                className={`env-pill ${tipsEnabled ? 'active' : ''}`}
                onClick={() => {
                  const next = !tipsEnabled;
                  setTipsEnabled(next);
                  saveTipsPrefs({ tipsEnabled: next });
                  showGlobalNotice(next ? '💡 Guide tips turned ON.' : '🔕 Guide tips turned OFF.');
                }}
                title="Turn first-visit and feature arm tips on or off"
              >
                💡 Tips: {tipsEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="env-pill"
                onClick={() => {
                  setOpenEnvPanel(null);
                  setTipsEnabled(true);
                  saveTipsPrefs({ tipsEnabled: true, guideCompleted: false });
                  setGuideKey((k) => k + 1);
                  setShowFirstGuide(true);
                }}
                title="Replay the icon guide tour"
              >
                🎯 Replay Guide
              </button>
            </div>
          )}
        </div>

        {/* Section Header + View Mode Switch */}
        <div className="section-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h3 className="section-title">{sectionMeta.title}</h3>
            <p className="section-subtitle">{sectionMeta.subtitle}</p>
          </div>

          {activeTab !== 'sanctuary' && (
            <div className="view-mode-switch" data-tour="view-mode" role="group" aria-label="View mode">
              {enabledViews.world3d && (
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'world3d' && !showOnlyFavorites ? 'active' : ''}`}
                  onClick={() => {
                    setShowOnlyFavorites(false);
                    setViewMode('world3d');
                  }}
                >
                  <Box size={14} /> 3D World
                </button>
              )}
              {enabledViews.world2d && (
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'world2d' && !showOnlyFavorites ? 'active' : ''}`}
                  onClick={() => {
                    setShowOnlyFavorites(false);
                    setViewMode('world2d');
                  }}
                >
                  <Footprints size={14} /> 2D World
                </button>
              )}
              {enabledViews.grid && (
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'grid' && !showOnlyFavorites ? 'active' : ''}`}
                  onClick={() => {
                    setShowOnlyFavorites(false);
                    setViewMode('grid');
                  }}
                >
                  <LayoutGrid size={14} /> Cards
                </button>
              )}
              {(showOnlyFavorites || viewMode === 'grid') && (
                <button
                  type="button"
                  className={`view-mode-btn ${showFavoritesModal ? 'active' : ''}`}
                  onClick={() => setShowFavoritesModal(true)}
                >
                  💖 Favorites ({favorites.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3D Walkable Park, 2D Walkable Park, or Cards / Favorites Directory */}
        {viewMode === 'world3d' && activeTab !== 'sanctuary' && !showOnlyFavorites ? (
          <ParkWorld3D
            isApk={isApk}
            isMobileHud={isMobileHud}
            onOpenUpdateModal={() => setShowUpdateModal(true)}
            memorials={speciesMemorials}
            allMemorials={visibleMemorials}
            activeSpecies={activeSpecies}
            onSelectSpecies={setActiveSpecies}
            onOpenSpeciesGate={() => setShowSpeciesGate(true)}
            currentUser={currentUser}
            characterGender={currentUser?.gender}
            atmosphere={atmosphere}
            season={season}
            weather={weatherEffectsEnabled ? weather : 'clear'}
            activeRoom={activeRoom}
            walkToRoomRequest={walkToRoomRequest}
            onClearWalkToRoomRequest={() => setWalkToRoomRequest(null)}
            walkToSpeciesRequest={walkToSpeciesRequest}
            onClearWalkToSpeciesRequest={() => setWalkToSpeciesRequest(null)}
            walkToMemorialRequest={walkToMemorialRequest}
            onClearWalkToMemorialRequest={() => setWalkToMemorialRequest(null)}
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
            showOnlyFavorites={showFavoritesModal}
            friends={friends}
            friendRequests={friendRequests}
            groupInvites={groupInvites}
            accountsList={accountsList}
            remoteWorldEvent={remoteWorldEvent}
            onToggleMpOnline={handleToggleMpOnline}
            onToggleOutsideChat={handleToggleOutsideChat}
            onToggleShowFavorites={() => setShowFavoritesModal(true)}
            onToggleFavorite={handleToggleFavorite}
            onToggleFriend={handleToggleFriend}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onIgnoreFriendRequest={handleIgnoreFriendRequest}
            onCancelFriendRequest={handleCancelFriendRequest}
            onInviteFriendToGroup={handleInviteFriendToGroup}
            onAcceptInvite={handleAcceptGroupInvite}
            onIgnoreInvite={handleIgnoreGroupInvite}
            onSendChat={handleSendMpChat}
            onSendGroupChat={handleSendGroupChat}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
            onExitGroup={handleExitGroup}
            onSendEmote={sendMultiplayerEmote}
            moderationStatus={moderationStatus}
            onChangeRoom={(r) => {
              setActiveRoom(r);
              setActiveTab(r);
            }}
            onSelectMemorial={handleOpenVisit}
            onRecordVisit={markMemorialVisited}
            onPerformOffering={handlePerformOffering}
            onLightningStrike={playThunderSound}
            onRequireLogin={() => setShowAuthModal(true)}
            zoomGuideTipAt={zoomGuideTipAt}
            onClearZoomGuideTip={() => setZoomGuideTipAt(0)}
          />
        ) : viewMode === 'world2d' && activeTab !== 'sanctuary' && !showOnlyFavorites ? (
          <ParkWorld2D
            isApk={isApk}
            isMobileHud={isMobileHud}
            onOpenUpdateModal={() => setShowUpdateModal(true)}
            memorials={speciesMemorials}
            allMemorials={visibleMemorials}
            activeSpecies={activeSpecies}
            onSelectSpecies={setActiveSpecies}
            onOpenSpeciesGate={() => setShowSpeciesGate(true)}
            currentUser={currentUser}
            characterGender={currentUser?.gender}
            atmosphere={atmosphere}
            season={season}
            weather={weatherEffectsEnabled ? weather : 'clear'}
            activeRoom={activeRoom}
            walkToRoomRequest={walkToRoomRequest}
            onClearWalkToRoomRequest={() => setWalkToRoomRequest(null)}
            walkToSpeciesRequest={walkToSpeciesRequest}
            onClearWalkToSpeciesRequest={() => setWalkToSpeciesRequest(null)}
            walkToMemorialRequest={walkToMemorialRequest}
            onClearWalkToMemorialRequest={() => setWalkToMemorialRequest(null)}
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
            showOnlyFavorites={showFavoritesModal}
            friends={friends}
            friendRequests={friendRequests}
            groupInvites={groupInvites}
            accountsList={accountsList}
            remoteWorldEvent={remoteWorldEvent}
            onToggleMpOnline={handleToggleMpOnline}
            onToggleOutsideChat={handleToggleOutsideChat}
            onToggleShowFavorites={() => setShowFavoritesModal(true)}
            onToggleFavorite={handleToggleFavorite}
            onToggleFriend={handleToggleFriend}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onIgnoreFriendRequest={handleIgnoreFriendRequest}
            onCancelFriendRequest={handleCancelFriendRequest}
            onInviteFriendToGroup={handleInviteFriendToGroup}
            onAcceptInvite={handleAcceptGroupInvite}
            onIgnoreInvite={handleIgnoreGroupInvite}
            onSendChat={handleSendMpChat}
            onSendGroupChat={handleSendGroupChat}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
            onExitGroup={handleExitGroup}
            onSendEmote={sendMultiplayerEmote}
            moderationStatus={moderationStatus}
            onChangeRoom={(r) => {
              setActiveRoom(r);
              setActiveTab(r);
            }}
            onSelectMemorial={handleOpenVisit}
            onRecordVisit={markMemorialVisited}
            onPerformOffering={handlePerformOffering}
            onLightningStrike={playThunderSound}
            onRequireLogin={() => setShowAuthModal(true)}
            zoomGuideTipAt={zoomGuideTipAt}
            onClearZoomGuideTip={() => setZoomGuideTipAt(0)}
          />
        ) : activeTab === 'sanctuary' && !currentUser && !showOnlyFavorites ? (
          <div className="empty-state">
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: '0 0 8px' }}>
              Sign In to Enter Your Personal Sanctuary
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem' }}>
              Sign in with your username and password or create an account to visit and tend to your
              beloved pets’ tombstones and ash niches.
            </p>
            <button type="button" className="btn-primary" onClick={() => setShowAuthModal(true)}>
              <LogIn size={15} /> Sign In / Create Account
            </button>
          </div>
        ) : filteredMemorials.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: '0 0 6px' }}>
              {showOnlyFavorites ? 'No favorite pets saved yet' : 'No memorials match this view yet'}
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '0.86rem' }}>
              {showOnlyFavorites
                ? 'Tap 🤍 Favorite on any pet tombstone or ash niche to save them to your Favorites list.'
                : 'Try clearing your filter or enshrine a new companion in this space.'}
            </p>
            {showOnlyFavorites ? (
              <button type="button" className="btn-primary" onClick={() => setShowOnlyFavorites(false)}>
                🌿 Back to Park View
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleOpenCreate}>
                <Plus size={15} /> Enshrine a Pet
              </button>
            )}
          </div>
        ) : (
          <section className="memorial-grid">
            {filteredMemorials.map((m) => {
              const isOwner = isMemorialOwner(m, currentUser);
              return (
                <article
                  key={m.id}
                  className={`memorial-card ${m.space === 'ash-room' ? 'ash-card' : ''}`}
                  onClick={() => handleOpenVisit(m.id)}
                >
                  <MonumentVisual memorial={m} mode="compact" />
                  <div className="card-body">
                    <div className="card-top-row">
                      <div>
                        <h4 className="card-pet-name">{m.name}</h4>
                        <p className="card-meta">
                          {m.breed} • {m.ownerName}
                        </p>
                      </div>
                      <span className="location-badge">{m.locationCode}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isOwner && (
                        <span className="owner-pill">
                          <Sparkles size={11} /> Your Pet
                        </span>
                      )}
                      {m.visibility === 'private' && (
                        <span className="owner-pill">
                          <Lock size={11} /> Private
                        </span>
                      )}
                    </div>

                    <p className="card-epitaph">“{m.epitaph}”</p>

                    <div className="card-footer">
                      <div className="ritual-counts">
                        <span>🕯️ {m.candlesCount}</span>
                        <span>🌸 {m.flowersCount}</span>
                        <span>💌 {m.tributes?.length || 0}</span>
                        <span>👣 {m.visitsCount || 0}</span>
                      </div>
                      <span className="visit-cta">
                        {m.space === 'ash-room' ? 'Visit Ash Niche' : 'Visit Tombstone'}
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" aria-label="Mobile sections">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'tombstone' ? 'active' : ''}`}
          onClick={() => handleSelectNavTab('tombstone')}
        >
          <Trees size={18} />
          <span>Tombstones</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'ash-room' ? 'active' : ''}`}
          onClick={() => handleSelectNavTab('ash-room')}
        >
          <Flame size={18} />
          <span>Ash Room</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'sanctuary' ? 'active' : ''}`}
          onClick={() => handleSelectNavTab('sanctuary')}
        >
          <Sparkles size={18} />
          <span>My Sanctuary</span>
        </button>
      </nav>

      {/* Modals */}
      {selectedMemorial && (
        <VisitMemorialModal
          memorial={selectedMemorial}
          currentUser={currentUser}
          isFavorite={favorites.includes(selectedMemorial.id)}
          onToggleFavorite={handleToggleFavorite}
          isFriend={friends.some(
            (f) =>
              f.toLowerCase() === (selectedMemorial.ownerName || '').toLowerCase() ||
              (selectedMemorial.ownerUsername && f.toLowerCase() === selectedMemorial.ownerUsername.toLowerCase())
          )}
          friendRequests={friendRequests}
          onToggleFriend={handleToggleFriend}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onClose={() => setSelectedMemorialId(null)}
          onPerformOffering={handlePerformOffering}
          onAddTribute={handleAddTribute}
          onAddMemory={handleAddMemory}
          onUpdateMemorial={handleUpdateMemorial}
          onRequireLogin={() => setShowAuthModal(true)}
        />
      )}

      {showCreateModal && currentUser && (
        <CreateMemorialModal
          currentUser={currentUser}
          memorials={memorials}
          defaultSpecies={activeSpecies}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMemorial}
        />
      )}

      {showAuthModal && (
        <AuthModal
          showDemoLogin={Boolean(adminConfig?.showDemoLogin)}
          onClose={() => {
            setShowAuthModal(false);
            setPendingMemorialId(null);
            setPendingCreate(false);
          }}
          onLogin={handleLogin}
        />
      )}

      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          readIds={readNotifIds}
          groupInvites={groupInvites}
          friendRequests={friendRequests}
          onAcceptInvite={handleAcceptGroupInvite}
          onIgnoreInvite={handleIgnoreGroupInvite}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onIgnoreFriendRequest={handleIgnoreFriendRequest}
          onCancelFriendRequest={handleCancelFriendRequest}
          onClose={() => setShowNotificationsModal(false)}
        />
      )}

      {showAdminModal && (
        <AdminBackendModal
          adminAuthenticated={adminAuthenticated}
          onSetAdminAuthenticated={setAdminAuthenticated}
          adminConfig={adminConfig}
          notifications={notifications}
          accountsList={accountsList}
          totalMemorials={visibleMemorials.length}
          totalAccounts={accountsList.length}
          onClose={() => setShowAdminModal(false)}
        />
      )}

      {showSpeciesGate && (
        <SpeciesGateModal
          activeSpecies={activeSpecies}
          allMemorials={visibleMemorials}
          onSelectSpecies={handleRequestSelectSpecies}
          onClose={() => setShowSpeciesGate(false)}
        />
      )}

      {showFavoritesModal && (
        <FavoritesModal
          favorites={favorites}
          allMemorials={visibleMemorials}
          onWalkAndVisit={handleWalkAndVisitFavorite}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setShowFavoritesModal(false)}
        />
      )}

      {showUpdateModal && (
        <UpdateCheckModal
          isApk={isApk}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      <FirstVisitGuide
        key={guideKey}
        isOpen={showFirstGuide}
        onComplete={() => {
          setShowFirstGuide(false);
          const curTips = loadTipsPrefs();
          saveTipsPrefs({ guideCompleted: true, tipsEnabled: true });
          if (!curTips.zoomTipShown) {
            saveTipsPrefs({ zoomTipShown: true });
            setZoomGuideTipAt(Date.now());
          }
        }}
        onSkip={() => {
          setShowFirstGuide(false);
          saveTipsPrefs({ guideCompleted: true });
        }}
        onTurnTipsOff={() => {
          setShowFirstGuide(false);
          setTipsEnabled(false);
          saveTipsPrefs({ tipsEnabled: false, guideCompleted: true, zoomTipShown: true });
          showGlobalNotice('🔕 Tips turned off. You can turn them back on anytime in Volume settings.');
        }}
      />
    </div>
  );
}
