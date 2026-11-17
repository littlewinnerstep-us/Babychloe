import React, { useEffect, useMemo, useState } from 'react';
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
import { INITIAL_MEMORIALS } from './data/memorialData';
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
} from './utils/soundEngine';

const STORAGE_MEMORIALS_KEY = 'evergreen_paws_memorials_v1';
const STORAGE_USER_KEY = 'evergreen_paws_user_v1';
const STORAGE_VIEWMODE_KEY = 'evergreen_paws_viewmode_v1';
const STORAGE_MUSIC_URL_KEY = 'evergreen_paws_music_url_v1';

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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore corrupted storage
  }
  return INITIAL_MEMORIALS;
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [musicUrl, setMusicUrl] = useState(loadSavedMusicUrl);
  const [musicInput, setMusicInput] = useState(loadSavedMusicUrl);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tombstone'); // 'tombstone' | 'ash-room' | 'sanctuary'
  const [activeRoom, setActiveRoom] = useState('tombstone'); // 'tombstone' | 'ash-room'
  const [viewMode, setViewMode] = useState(loadSavedViewMode); // 'world3d' | 'world2d' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');

  const [selectedMemorialId, setSelectedMemorialId] = useState(null);
  const [pendingMemorialId, setPendingMemorialId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MUSIC_URL_KEY, musicUrl);
    } catch {
      // ignore storage errors
    }
  }, [musicUrl]);

  useEffect(() => {
    setSoundState({ enabled: soundEnabled, musicUrl, weather });
  }, [soundEnabled, musicUrl, weather]);

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

  useEffect(() => {
    if (!soundEnabled) return undefined;
    if (weather !== 'clear' && weather !== 'windy' && weather !== 'rain') return undefined;
    playDogBarkAndHowl();
    const barkTimer = setInterval(() => {
      playDogBarkAndHowl();
    }, 8500);
    return () => clearInterval(barkTimer);
  }, [soundEnabled, weather]);

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

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMusicUrl(reader.result);
        setMusicInput('Uploaded audio track');
        setSoundEnabled(true);
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

  const filteredMemorials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const userEmail = currentUser?.email?.toLowerCase() || '';
    return visibleMemorials.filter((m) => {
      if (activeTab === 'tombstone' && m.space !== 'tombstone') return false;
      if (activeTab === 'ash-room' && m.space !== 'ash-room') return false;
      if (activeTab === 'sanctuary') {
        if (!userEmail || m.ownerEmail.toLowerCase() !== userEmail) return false;
      }
      if (speciesFilter !== 'All' && m.species !== speciesFilter) return false;
      if (q) {
        const hay = `${m.name} ${m.breed} ${m.species} ${m.ownerName} ${m.locationCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleMemorials, activeTab, speciesFilter, searchQuery, currentUser]);

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

  const handleLogin = (user) => {
    setCurrentUser(user);
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

  const handlePerformOffering = (memorialId, offering) => {
    const visitorName = currentUser?.name || 'Kind Visitor';
    setMemorials((prev) =>
      prev.map((m) => {
        if (m.id !== memorialId) return m;
        const nextActive = [
          offering.emoji,
          ...(m.activeOfferings || []).filter((e, i) => i < 5 || e !== offering.emoji),
        ].slice(0, 6);
        return {
          ...m,
          candlesCount: offering.category === 'candle' ? m.candlesCount + 1 : m.candlesCount,
          incenseCount: offering.category === 'incense' ? m.incenseCount + 1 : m.incenseCount,
          flowersCount: offering.category === 'flower' ? m.flowersCount + 1 : m.flowersCount,
          treatsCount: offering.category === 'treat' ? m.treatsCount + 1 : m.treatsCount,
          activeOfferings: nextActive,
          offeringsLog: [
            {
              id: `o-${Date.now()}`,
              emoji: offering.emoji,
              label: offering.label,
              visitor: visitorName,
              time: 'Just now',
            },
            ...(m.offeringsLog || []),
          ],
        };
      })
    );
  };

  const handleAddTribute = (memorialId, message) => {
    const author = currentUser?.name || 'Kind Visitor';
    setMemorials((prev) =>
      prev.map((m) =>
        m.id === memorialId
          ? {
              ...m,
              tributes: [
                { id: `t-${Date.now()}`, author, message, date: 'Just now' },
                ...(m.tributes || []),
              ],
            }
          : m
      )
    );
  };

  const handleAddMemory = (memorialId, memory) => {
    setMemorials((prev) =>
      prev.map((m) =>
        m.id === memorialId
          ? {
              ...m,
              memories: [{ id: `m-${Date.now()}`, ...memory }, ...(m.memories || [])],
            }
          : m
      )
    );
  };

  const handleUpdateMemorial = (memorialId, patch) => {
    setMemorials((prev) =>
      prev.map((m) => (m.id === memorialId ? { ...m, ...patch } : m))
    );
  };

  const handleCreateMemorial = (newMemorial) => {
    setMemorials((prev) => [newMemorial, ...prev]);
    setShowCreateModal(false);
    setActiveTab(newMemorial.space === 'ash-room' ? 'ash-room' : 'tombstone');
    setActiveRoom(newMemorial.space === 'ash-room' ? 'ash-room' : 'tombstone');
    setSelectedMemorialId(newMemorial.id);
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
              className="btn-ghost"
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? 'Turn music & weather sound off' : 'Turn music & weather sound on'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{soundEnabled ? 'Music On' : 'Music Off'}</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowMusicModal(true)}
              title="Background music link or upload"
            >
              <Music size={15} />
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
                <span className="user-avatar-dot">{currentUser.name[0]?.toUpperCase()}</span>
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
                  padding: 10,
                  minWidth: 210,
                  boxShadow: 'var(--shadow-card)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ padding: '4px 6px', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    {currentUser.email}
                  </div>
                </div>
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
              className="env-pill"
              onClick={() => {
                if (!soundEnabled) setSoundEnabled(true);
                setTimeout(() => playDogBarkAndHowl(), 60);
              }}
              title="Hear distant dog bark & moonlight howl"
            >
              🐕 Bark/Howl
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
            {['All', 'Dog', 'Cat', 'Rabbit', 'Bird'].map((sp) => (
              <button
                key={sp}
                type="button"
                className={`chip ${speciesFilter === sp ? 'active' : ''}`}
                onClick={() => setSpeciesFilter(sp)}
              >
                {sp}
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
            memorials={visibleMemorials}
            currentUser={currentUser}
            atmosphere={atmosphere}
            season={season}
            weather={weather}
            activeRoom={activeRoom}
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
            memorials={visibleMemorials}
            currentUser={currentUser}
            atmosphere={atmosphere}
            season={season}
            weather={weather}
            activeRoom={activeRoom}
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
          existingCount={memorials.length}
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
                  onClick={() => setSoundEnabled((s) => !s)}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMusicUrl(musicInput.trim());
                  setSoundEnabled(true);
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
