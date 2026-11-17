import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Trees,
  Flame,
  Sparkles,
  Search,
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
  Upload,
  X,
} from 'lucide-react';
import {
  INITIAL_MEMORIALS,
  SPECIES_LIST,
  normalizeAndDeduplicateMemorials,
} from './data/memorialData';
import MonumentVisual from './components/MonumentVisual';
import ParkWorld2D from './components/ParkWorld2D';
import ParkWorld3D from './components/ParkWorld3D';
import VisitMemorialModal from './components/VisitMemorialModal';
import CreateMemorialModal from './components/CreateMemorialModal';
import AuthModal from './components/AuthModal';
import {
  setSoundState,
  playThunderSound,
  playDogBarkAndHowl,
  playOwlHoot,
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
  setMeetupRoom,
  getMeetupRoom,
  setMeetupNickname,
  getMeetupNickname,
  isMultiplayerOnline,
  setMultiplayerOnline,
  updateAccountProfile,
} from './utils/multiplayerEngine';

const STORAGE_MEMORIALS_KEY = 'evergreen_paws_memorials_v1';
const STORAGE_USER_KEY = 'evergreen_paws_user_v1';
const STORAGE_VIEWMODE_KEY = 'evergreen_paws_viewmode_v1';
const STORAGE_MUSIC_URL_KEY = 'evergreen_paws_music_url_v1';
const STORAGE_FAVORITES_KEY = 'evergreen_paws_favorites_v1';
const STORAGE_FRIENDS_KEY = 'evergreen_paws_friends_v1';
const STORAGE_WEATHER_FX_KEY = 'evergreen_paws_weather_fx_v1';
const STORAGE_WEATHER_SOUND_KEY = 'evergreen_paws_weather_sound_v1';

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
    if (raw) return JSON.parse(raw);
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
  const [musicUrl, setMusicUrl] = useState(loadSavedMusicUrl);
  const [musicInput, setMusicInput] = useState(loadSavedMusicUrl);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tombstone'); // 'tombstone' | 'ash-room' | 'sanctuary'
  const [activeRoom, setActiveRoom] = useState('tombstone'); // 'tombstone' | 'ash-room'
  const [activeSpecies, setActiveSpecies] = useState('Dog');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState(loadSavedViewMode); // 'world3d' | 'world2d' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => loadArrayPref(STORAGE_FAVORITES_KEY));
  const [friends, setFriends] = useState(() => loadArrayPref(STORAGE_FRIENDS_KEY));
  const [mpOnline, setMpOnline] = useState(isMultiplayerOnline);

  const [selectedMemorialId, setSelectedMemorialId] = useState(null);
  const [pendingMemorialId, setPendingMemorialId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editAccountName, setEditAccountName] = useState(() => currentUser?.name || '');

  useEffect(() => {
    setEditAccountName(currentUser?.name || '');
  }, [currentUser]);

  const [mpPeers, setMpPeers] = useState([]);
  const [mpStatus, setMpStatus] = useState('connecting');
  const [mpRoomCode, setMpRoomCode] = useState(getMeetupRoom);
  const [mpNickname, setMpNickname] = useState(
    () => getMeetupNickname() || currentUser?.name?.split(' ')[0] || 'Visitor'
  );
  const [mpChatLog, setMpChatLog] = useState([]);
  const [remoteWorldEvent, setRemoteWorldEvent] = useState(null);
  const memorialsRef = useRef(memorials);

  useEffect(() => {
    memorialsRef.current = memorials;
    syncAllLocalMemorials(memorials);
  }, [memorials]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MUSIC_URL_KEY, musicUrl);
    } catch {
      // ignore storage errors
    }
  }, [musicUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WEATHER_FX_KEY, String(weatherEffectsEnabled));
      localStorage.setItem(STORAGE_WEATHER_SOUND_KEY, String(weatherSoundEnabled));
    } catch {
      // ignore
    }
  }, [weatherEffectsEnabled, weatherSoundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(friends));
    } catch {
      // ignore
    }
  }, [friends]);

  useEffect(() => {
    setSoundState({
      enabled: soundEnabled,
      weatherSoundEnabled: weatherEffectsEnabled && weatherSoundEnabled,
      musicUrl,
      weather: weatherEffectsEnabled ? weather : 'clear',
      room: activeRoom,
    });
  }, [soundEnabled, weatherEffectsEnabled, weatherSoundEnabled, musicUrl, weather, activeRoom]);

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

  const handleToggleSound = () => {
    const statePayload = (enabled) => ({
      enabled,
      weatherSoundEnabled: weatherEffectsEnabled && weatherSoundEnabled,
      musicUrl,
      weather: weatherEffectsEnabled ? weather : 'clear',
      room: activeRoom,
    });
    if (soundEnabled && (!isAudioUnlocked() || wasRecentlyUnlockedInGesture(350))) {
      setSoundState(statePayload(true));
      unlockAudioFromGesture();
      playDogBarkAndHowl(true);
      return;
    }
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundState(statePayload(next));
    if (next) {
      unlockAudioFromGesture();
    }
  };

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSoundState({ enabled: true, musicUrl, weather });
    unlockAudioFromGesture();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMusicUrl(reader.result);
        setMusicInput('Uploaded audio track');
        setSoundEnabled(true);
        setSoundState({ enabled: true, musicUrl: reader.result, weather });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEWMODE_KEY, viewMode);
    } catch {
      // ignore storage errors
    }
  }, [viewMode]);

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
    const userEmail = currentUser?.email?.toLowerCase() || '';
    return memorials.filter((m) => {
      const isOwner = userEmail && m.ownerEmail.toLowerCase() === userEmail;
      if (m.visibility === 'private' && !isOwner) return false;
      return true;
    });
  }, [memorials, currentUser]);

  const speciesMemorials = useMemo(
    () => visibleMemorials.filter((m) => (m.species || 'Dog') === activeSpecies),
    [visibleMemorials, activeSpecies]
  );

  const filteredMemorials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const userEmail = currentUser?.email?.toLowerCase() || '';
    const userName = currentUser?.username?.toLowerCase() || '';
    return visibleMemorials.filter((m) => {
      if (activeTab === 'tombstone' && m.space !== 'tombstone') return false;
      if (activeTab === 'ash-room' && m.space !== 'ash-room') return false;
      if (activeTab === 'sanctuary') {
        const matchUser =
          (userName && (m.ownerUsername || '').toLowerCase() === userName) ||
          (userEmail && m.ownerEmail.toLowerCase() === userEmail);
        if (!matchUser) return false;
      } else {
        if ((m.species || 'Dog') !== activeSpecies) return false;
      }
      if (showOnlyFavorites && !favorites.includes(m.id)) return false;
      if (q) {
        const hay = `${m.name} ${m.breed} ${m.species} ${m.ownerName} ${m.ownerUsername || ''} ${m.locationCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleMemorials, activeTab, activeSpecies, showOnlyFavorites, favorites, searchQuery, currentUser]);

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
    setSelectedMemorialId(memorialId);
  };

  const handleOpenCreate = () => {
    if (!currentUser) {
      setPendingCreate(true);
      setShowAuthModal(true);
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

  const handleChangeCharacterGender = (nextGender) => {
    const clean = nextGender === 'boy' ? 'boy' : 'girl';
    setCurrentUser((prev) => (prev ? { ...prev, gender: clean } : prev));
    if (currentUser) {
      updateAccountProfile(currentUser.username || currentUser.email, { gender: clean });
    }
    syncAvatarGenderToStorage(clean, false);
  };

  const handleSaveAccountName = (e) => {
    e.preventDefault();
    const clean = editAccountName.trim();
    if (!clean) return;
    setCurrentUser((prev) => (prev ? { ...prev, name: clean } : prev));
    if (currentUser) {
      updateAccountProfile(currentUser.username || currentUser.email, { name: clean });
    }
    if (!getMeetupNickname()) {
      setMpNickname(clean.split(' ')[0] || 'Visitor');
    }
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

  const handleToggleFriend = (friendName) => {
    const clean = String(friendName || '').trim();
    if (!clean) return;
    setFriends((prev) =>
      prev.some((f) => f.toLowerCase() === clean.toLowerCase())
        ? prev.filter((f) => f.toLowerCase() !== clean.toLowerCase())
        : [...prev, clean]
    );
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
    if (!getMeetupNickname()) {
      setMpNickname(enriched.name.split(' ')[0] || 'Visitor');
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
    const nextActive = [
      offering.emoji,
      ...(m.activeOfferings || []).filter((e, i) => i < 5 || e !== offering.emoji),
    ].slice(0, 6);
    return {
      ...m,
      updatedAt: Date.now(),
      candlesCount: offering.category === 'candle' ? m.candlesCount + 1 : m.candlesCount,
      incenseCount: offering.category === 'incense' ? m.incenseCount + 1 : m.incenseCount,
      flowersCount: offering.category === 'flower' ? m.flowersCount + 1 : m.flowersCount,
      treatsCount: offering.category === 'treat' ? m.treatsCount + 1 : m.treatsCount,
      activeOfferings: nextActive,
      offeringsLog: [
        {
          id: `o-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          emoji: offering.emoji,
          label: offering.label,
          visitor: visitorName,
          time: 'Just now',
        },
        ...(m.offeringsLog || []),
      ],
    };
  };

  const buildWithTribute = (m, message, author) => ({
    ...m,
    updatedAt: Date.now(),
    tributes: [
      {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        author,
        message,
        date: 'Just now',
      },
      ...(m.tributes || []),
    ],
  });

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
        setMpChatLog((prev) => [...prev, msg].slice(-40));
      },
      onSyncMemorial: (memorial) => {
        setMemorials((prev) => mergeIncomingMemorial(prev, memorial));
      },
      onRemoteEvent: (evt) => {
        if (!evt) return;
        if (evt.kind === 'offering' && evt.memorialId && evt.offering) {
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
            nx: evt.nx,
            nz: evt.nz,
            emoji: evt.emoji || '✨',
            text: `${evt.senderName}: ${evt.label || evt.emoji}`,
          });
        }
      },
    });
    syncAllLocalMemorials(memorialsRef.current, true);
  }, []);

  const handleSendMpChat = (text) => {
    const msg = sendMultiplayerChat(text);
    if (msg) {
      setMpChatLog((prev) => [...prev, msg].slice(-40));
    }
  };

  const handleChangeMpRoom = (nextRoom) => {
    const clean = setMeetupRoom(nextRoom);
    setMpRoomCode(clean);
    setMpChatLog([]);
  };

  const handleChangeMpNickname = (nextName) => {
    const saved = setMeetupNickname(nextName);
    setMpNickname(saved || currentUser?.name?.split(' ')[0] || 'Visitor');
  };

  const handlePerformOffering = (memorialId, offering) => {
    const visitorName = mpNickname || currentUser?.name || 'Kind Visitor';
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
    const author = mpNickname || currentUser?.name || 'Kind Visitor';
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
    const current = memorialsRef.current.find((m) => m.id === memorialId);
    if (!current) return;
    const updated = { ...current, ...patch, updatedAt: Date.now() };
    setMemorials((prev) => prev.map((m) => (m.id === memorialId ? updated : m)));
    publishSharedMemorial(updated);
  };

  const handleCreateMemorial = (newMemorial) => {
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

  const handleSelectNavTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'tombstone' || tab === 'ash-room') {
      setActiveRoom(tab);
    }
  };

  const sectionMeta = {
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
  }[activeTab];

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
              className={`top-music-btn ${soundEnabled ? 'is-on' : 'is-off'}`}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Music & Sound ON (Tap to turn off)' : 'Music & Sound OFF (Tap to turn on)'}
              aria-label={soundEnabled ? 'Music On' : 'Music Off'}
            >
              <span className="music-icon-wrap">
                <Music size={16} />
                {!soundEnabled && <span className="music-slash" aria-hidden="true" />}
              </span>
            </button>
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={15} /> Enshrine Pet
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
                <span>{currentUser.name.split(' ')[0]}</span>
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
                    {currentUser.email}
                  </div>
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 4 }}>
                    Edit Character
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className={currentUser.gender !== 'boy' ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={() => handleChangeCharacterGender('girl')}
                    >
                      👩 Girl
                    </button>
                    <button
                      type="button"
                      className={currentUser.gender === 'boy' ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={() => handleChangeCharacterGender('boy')}
                    >
                      👦 Boy
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveAccountName} style={{ display: 'flex', gap: 5 }}>
                  <input
                    type="text"
                    className="input-control"
                    maxLength={32}
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    placeholder="Display name"
                    style={{ padding: '5px 8px', fontSize: '0.76rem' }}
                  />
                  <button
                    type="submit"
                    className="btn-ghost"
                    style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                  >
                    Save
                  </button>
                </form>

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

                <button
                  type="button"
                  className="btn-ghost"
                  style={{ borderRadius: 10, justifyContent: 'flex-start' }}
                  onClick={handleResetDemo}
                >
                  <RotateCcw size={14} /> Reset Demo Data
                </button>
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

            <div className="atmosphere-picker" role="group" aria-label="Park atmosphere">
              <button
                type="button"
                className={`atm-btn ${atmosphere === 'morning' ? 'active' : ''}`}
                onClick={() => setAtmosphere('morning')}
              >
                <Sun size={13} /> Morning
              </button>
              <button
                type="button"
                className={`atm-btn ${atmosphere === 'dusk' ? 'active' : ''}`}
                onClick={() => setAtmosphere('dusk')}
              >
                <Sunset size={13} /> Dusk
              </button>
              <button
                type="button"
                className={`atm-btn ${atmosphere === 'night' ? 'active' : ''}`}
                onClick={() => setAtmosphere('night')}
              >
                <Moon size={13} /> Night
              </button>
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
          </div>
        </section>

        {/* 4 Seasons, Weather & Sound Controls */}
        <div className="env-weather-bar">
          <div className="env-group">
            <span className="env-label">Season:</span>
            {SEASONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`env-pill ${season === s.id ? 'active' : ''}`}
                onClick={() => handleSelectSeason(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="env-group">
            <span className="env-label">Weather:</span>
            {WEATHERS.filter((w) => (SEASON_WEATHER_WEIGHTS[season]?.[w.id] || 0) > 0).map((w) => (
              <button
                key={w.id}
                type="button"
                className={`env-pill ${weather === w.id ? 'active' : ''}`}
                onClick={() => setWeather(w.id)}
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
            <button
              type="button"
              className="env-pill"
              onClick={() => {
                if (!soundEnabled) {
                  setSoundEnabled(true);
                }
                setSoundState({
                  enabled: true,
                  weatherSoundEnabled: weatherEffectsEnabled && weatherSoundEnabled,
                  musicUrl,
                  weather: weatherEffectsEnabled ? weather : 'clear',
                  room: activeRoom,
                });
                unlockAudioFromGesture();
                playDogBarkAndHowl(true);
              }}
              title="Hear distant dog bark & moonlight howl"
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
                setSoundState({
                  enabled: true,
                  weatherSoundEnabled: weatherEffectsEnabled && weatherSoundEnabled,
                  musicUrl,
                  weather: weatherEffectsEnabled ? weather : 'clear',
                  room: activeRoom,
                });
                unlockAudioFromGesture();
                playOwlHoot(true);
              }}
              title="Hear distant owl hoot"
            >
              🦉 Owl
            </button>
            <button
              type="button"
              className="env-pill"
              onClick={() => setShowMusicModal(true)}
              title="Change background music link or upload audio"
            >
              <Music size={12} /> Music Track
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="controls-row">
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search pet name, breed, plot or niche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="species-chips">
            <button
              type="button"
              className={`chip ${showOnlyFavorites ? 'active' : ''}`}
              onClick={() => setShowOnlyFavorites((v) => !v)}
            >
              💖 Favorites ({favorites.length})
            </button>
            {SPECIES_LIST.map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`chip ${activeSpecies === sp.id ? 'active' : ''}`}
                onClick={() => setActiveSpecies(sp.id)}
              >
                {sp.emoji} {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header + View Mode Switch */}
        <div className="section-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h3 className="section-title">{sectionMeta.title}</h3>
            <p className="section-subtitle">{sectionMeta.subtitle}</p>
          </div>

          {activeTab !== 'sanctuary' && (
            <div className="view-mode-switch" role="group" aria-label="View mode">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'world3d' ? 'active' : ''}`}
                onClick={() => setViewMode('world3d')}
              >
                <Box size={14} /> 3D World
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'world2d' ? 'active' : ''}`}
                onClick={() => setViewMode('world2d')}
              >
                <Footprints size={14} /> 2D World
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>
          )}
        </div>

        {/* 3D Walkable Park, 2D Walkable Park, or Cards Directory */}
        {viewMode === 'world3d' && activeTab !== 'sanctuary' ? (
          <ParkWorld3D
            memorials={speciesMemorials}
            allMemorials={visibleMemorials}
            activeSpecies={activeSpecies}
            onSelectSpecies={setActiveSpecies}
            currentUser={currentUser}
            characterGender={currentUser?.gender}
            onChangeCharacterGender={handleChangeCharacterGender}
            atmosphere={atmosphere}
            season={season}
            weather={weatherEffectsEnabled ? weather : 'clear'}
            activeRoom={activeRoom}
            mpPeers={mpPeers}
            mpStatus={mpStatus}
            mpOnline={mpOnline}
            mpRoomCode={mpRoomCode}
            mpNickname={mpNickname}
            mpChatLog={mpChatLog}
            favorites={favorites}
            friends={friends}
            remoteWorldEvent={remoteWorldEvent}
            onToggleMpOnline={handleToggleMpOnline}
            onToggleFavorite={handleToggleFavorite}
            onToggleFriend={handleToggleFriend}
            onSendChat={handleSendMpChat}
            onSendEmote={sendMultiplayerEmote}
            onChangeMpRoom={handleChangeMpRoom}
            onChangeMpNickname={handleChangeMpNickname}
            onChangeRoom={(r) => {
              setActiveRoom(r);
              setActiveTab(r);
            }}
            onSelectMemorial={handleOpenVisit}
            onPerformOffering={handlePerformOffering}
            onLightningStrike={playThunderSound}
            onRequireLogin={() => setShowAuthModal(true)}
          />
        ) : viewMode === 'world2d' && activeTab !== 'sanctuary' ? (
          <ParkWorld2D
            memorials={speciesMemorials}
            allMemorials={visibleMemorials}
            activeSpecies={activeSpecies}
            onSelectSpecies={setActiveSpecies}
            currentUser={currentUser}
            characterGender={currentUser?.gender}
            onChangeCharacterGender={handleChangeCharacterGender}
            atmosphere={atmosphere}
            season={season}
            weather={weatherEffectsEnabled ? weather : 'clear'}
            activeRoom={activeRoom}
            mpPeers={mpPeers}
            mpStatus={mpStatus}
            mpOnline={mpOnline}
            mpRoomCode={mpRoomCode}
            mpNickname={mpNickname}
            mpChatLog={mpChatLog}
            favorites={favorites}
            friends={friends}
            remoteWorldEvent={remoteWorldEvent}
            onToggleMpOnline={handleToggleMpOnline}
            onToggleFavorite={handleToggleFavorite}
            onToggleFriend={handleToggleFriend}
            onSendChat={handleSendMpChat}
            onSendEmote={sendMultiplayerEmote}
            onChangeMpRoom={handleChangeMpRoom}
            onChangeMpNickname={handleChangeMpNickname}
            onChangeRoom={(r) => {
              setActiveRoom(r);
              setActiveTab(r);
            }}
            onSelectMemorial={handleOpenVisit}
            onPerformOffering={handlePerformOffering}
            onLightningStrike={playThunderSound}
            onRequireLogin={() => setShowAuthModal(true)}
          />
        ) : activeTab === 'sanctuary' && !currentUser ? (
          <div className="empty-state">
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: '0 0 8px' }}>
              Sign In to Enter Your Personal Sanctuary
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem' }}>
              Log in with your email or try the 1-tap demo account to visit Barnaby’s Tombstone and
              Mochi’s Ash Niche, or enshrine your own beloved pet.
            </p>
            <button type="button" className="btn-primary" onClick={() => setShowAuthModal(true)}>
              <LogIn size={15} /> Sign In / Instant Demo
            </button>
          </div>
        ) : filteredMemorials.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: '0 0 6px' }}>
              No memorials match this view yet
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '0.86rem' }}>
              Try clearing your filter or enshrine a new companion in this space.
            </p>
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={15} /> Enshrine a Pet
            </button>
          </div>
        ) : (
          <section className="memorial-grid">
            {filteredMemorials.map((m) => {
              const isOwner =
                currentUser && m.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
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
            (f) => f.toLowerCase() === (selectedMemorial.ownerName || '').toLowerCase()
          )}
          onToggleFriend={handleToggleFriend}
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
          onClose={() => {
            setShowAuthModal(false);
            setPendingMemorialId(null);
            setPendingCreate(false);
          }}
          onLogin={handleLogin}
        />
      )}

      {showMusicModal && (
        <div className="modal-backdrop" onClick={() => setShowMusicModal(false)}>
          <div className="modal-panel narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: 0 }}>
                  Sanctuary Background Music
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Paste a music link, upload an audio file, or use the built-in harp melody
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowMusicModal(false)}
                aria-label="Close music settings"
              >
                <X size={16} />
              </button>
            </div>

            <div className="form-grid">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  Music &amp; Weather Sound
                </span>
                <button
                  type="button"
                  className={soundEnabled ? 'btn-primary' : 'btn-ghost'}
                  onClick={handleToggleSound}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const nextUrl = musicInput.trim();
                  setMusicUrl(nextUrl);
                  setSoundEnabled(true);
                  setSoundState({ enabled: true, musicUrl: nextUrl, weather });
                  unlockAudioFromGesture();
                  setShowMusicModal(false);
                }}
              >
                <div>
                  <label className="field-label">Music Link (MP3 / OGG / Audio URL)</label>
                  <input
                    type="url"
                    className="input-control"
                    placeholder="https://example.com/peaceful-piano.mp3"
                    value={musicInput.startsWith('data:') ? '' : musicInput}
                    onChange={(e) => setMusicInput(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                  <Music size={14} /> Save Link &amp; Play
                </button>
              </form>

              <div>
                <label className="field-label">Or Upload Audio File from Device</label>
                <label className="btn-ghost" style={{ cursor: 'pointer', justifyContent: 'center', width: '100%' }}>
                  <Upload size={14} /> Choose Audio File (.mp3, .wav, .m4a, .ogg)
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={handleAudioFileUpload}
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn-ghost"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  setMusicUrl('');
                  setMusicInput('');
                  setSoundEnabled(true);
                  setSoundState({ enabled: true, musicUrl: '', weather });
                  unlockAudioFromGesture();
                  setShowMusicModal(false);
                }}
              >
                Use Built-in Sanctuary Harp Melody
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
