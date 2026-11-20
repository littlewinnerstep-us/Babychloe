import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Heart,
  BookOpen,
  MessageSquareHeart,
  Settings,
  Lock,
  Globe,
  Plus,
  Bell,
} from 'lucide-react';
import MonumentVisual from './MonumentVisual';
import {
  MONUMENT_STYLES,
  OFFERING_TYPES,
  getAllPetTraits,
  formatTimeAgo,
  getUserIdentityKey,
  isMemorialOwner,
} from '../data/memorialData';
import {
  hasGivenToday,
  recordGivenToday,
  getDailyLimitNotice,
} from '../utils/dailyLimits';
import { compressImageFile } from '../utils/imageCompressor';
import {
  CUSTOMER_FLOWER_PRESETS,
  makeOfferingToken,
  normalizeHex,
} from '../utils/customAssets';

const EMOTICONS = [
  '🐾', '❤️', '🕯️', '🌸', '🌈', '🙏', '🐶', '🐱',
  '🐰', '🕊️', '✨', '😢', '🤍', '🦴', '🐟', '🌟',
];

export default function VisitMemorialModal({
  memorial,
  currentUser,
  initialOpenMessagePopup = false,
  isFavorite = false,
  onToggleFavorite,
  isFriend = false,
  friendRequests = { incoming: [], outgoing: [] },
  onToggleFriend,
  onAcceptFriendRequest,
  onClose,
  onPerformOffering,
  onAddTribute,
  onAddMemory,
  onUpdateMemorial,
  onRequireLogin,
  adminAssets = [],
  customTraits = [],
  customerHold = { flowerEmoji: '🌸', flowerColor: '#ff7eb6', glowOn: true },
  onUpdateCustomerHold,
  onHoldFlowerEmote,
}) {
  const [activeTab, setActiveTab] = useState(initialOpenMessagePopup ? 'tributes' : 'sanctuary');
  const [pickerOpen, setPickerOpen] = useState(null); // 'flowers' | 'treats' | null
  const [showMessagePopup, setShowMessagePopup] = useState(Boolean(initialOpenMessagePopup));
  const [blessingText, setBlessingText] = useState('');
  const [armtipText, setArmtipText] = useState('');
  const [tributeText, setTributeText] = useState('');

  // Add memory state (owner only)
  const [memoryCaption, setMemoryCaption] = useState('');
  const [memoryPhoto, setMemoryPhoto] = useState('');

  // Customize form state (owner only)
  const [editSpace, setEditSpace] = useState(memorial.space);
  const [editStyleId, setEditStyleId] = useState(memorial.styleId);
  const [editEpitaph, setEditEpitaph] = useState(memorial.epitaph);
  const [editStory, setEditStory] = useState(memorial.story);
  const [editTraits, setEditTraits] = useState(Array.isArray(memorial.traits) ? memorial.traits : []);
  const [editVisibility, setEditVisibility] = useState(memorial.visibility);
  const [savedNotice, setSavedNotice] = useState(false);
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const userKey = getUserIdentityKey(currentUser);
  const isOwner = isMemorialOwner(memorial, currentUser);

  const showArmtip = (msg) => {
    setArmtipText(msg);
    setTimeout(() => setArmtipText(''), 3400);
  };

  const triggerOffering = (offering) => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (hasGivenToday(userKey, memorial.id, offering.category)) {
      showArmtip(getDailyLimitNotice(offering.category, memorial.name || 'this pet'));
      setPickerOpen(null);
      return;
    }
    recordGivenToday(userKey, memorial.id, offering.category);
    onPerformOffering(memorial.id, offering);
    setBlessingText(`You ${offering.blessing} for ${memorial.name || 'this pet'}.`);
    setPickerOpen(null);
  };

  const handleOpenMessageComposer = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (hasGivenToday(userKey, memorial.id, 'message')) {
      showArmtip(getDailyLimitNotice('message', memorial.name || 'this pet'));
      return;
    }
    setShowMessagePopup(true);
  };

  const handleTributeSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (hasGivenToday(userKey, memorial.id, 'message')) {
      showArmtip(getDailyLimitNotice('message', memorial.name || 'this pet'));
      setShowMessagePopup(false);
      return;
    }
    const clean = tributeText.trim();
    if (!clean) return;
    recordGivenToday(userKey, memorial.id, 'message');
    onAddTribute(memorial.id, clean);
    setTributeText('');
    setShowMessagePopup(false);
    setActiveTab('tributes');
    setBlessingText(`Your heartfelt message was posted for ${memorial.name || 'this pet'}.`);
  };

  const handleMemoryFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedUrl = await compressImageFile(file, 220, 0.72);
    if (compressedUrl) {
      setMemoryPhoto(compressedUrl);
    }
  };

  const handleAddMemorySubmit = (e) => {
    e.preventDefault();
    const caption = memoryCaption.trim();
    if (!caption) return;
    onAddMemory(memorial.id, {
      photo: memoryPhoto || memorial.photo,
      caption,
      date: new Date().toISOString().slice(0, 10),
    });
    setMemoryCaption('');
    setMemoryPhoto('');
  };

  const handleSpaceSwitch = (nextSpace) => {
    setEditSpace(nextSpace);
    const defaultStyle = MONUMENT_STYLES[nextSpace][0].id;
    setEditStyleId(defaultStyle);
  };

  const handleSaveCustomization = (e) => {
    e.preventDefault();
    onUpdateMemorial(memorial.id, {
      space: editSpace,
      styleId: editStyleId,
      zoneName: editSpace === 'ash-room' ? 'Hall of Serenity' : 'Whispering Meadow',
      locationCode:
        editSpace === 'ash-room'
          ? (memorial.locationCode || 'Plot G-1').replace('Plot G-', 'Niche A-')
          : (memorial.locationCode || 'Niche A-1').replace('Niche A-', 'Plot G-').replace('Niche B-', 'Plot G-'),
      epitaph: editEpitaph.trim() || memorial.epitaph,
      story: editStory.trim() || memorial.story,
      traits: editTraits,
      visibility: editVisibility,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const locationIcon = memorial.space === 'ash-room' ? '🏛️' : '🌿';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span className="location-badge">
                {locationIcon} {memorial.zoneName} • {memorial.locationCode}
              </span>
              {isOwner && (
                <span className="owner-pill">
                  <Sparkles size={12} /> Your Beloved Pet
                </span>
              )}
              <span className="trait-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {memorial.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                {memorial.visibility === 'private' ? 'Private Sanctuary' : 'Public Park'}
              </span>
              <span className="trait-tag" title="Total visits to this pet vigil">
                👣 {memorial.visitsCount || 0} {Number(memorial.visitsCount || 0) === 1 ? 'Visit' : 'Visits'}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', margin: 0 }}>
              {memorial.name}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {memorial.species} • {memorial.breed} • Caretaker: {memorial.ownerName}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {onToggleFavorite && (
                <button
                  type="button"
                  className={isFavorite ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => onToggleFavorite(memorial.id)}
                >
                  {isFavorite ? '💖 Favorited' : '🤍 Favorite Pet'}
                </button>
              )}
              {!isOwner && onToggleFriend && memorial.ownerName && (() => {
                const ownerLower = String(memorial.ownerName || '').trim().toLowerCase();
                const ownerUserLower = String(memorial.ownerUsername || '').trim().toLowerCase();
                const pendingIn = (friendRequests?.incoming || []).find(
                  (r) =>
                    (r.fromName || '').trim().toLowerCase() === ownerLower ||
                    (ownerUserLower && (r.fromUsername || '').trim().toLowerCase() === ownerUserLower)
                );
                const pendingOut = (friendRequests?.outgoing || []).find(
                  (r) =>
                    (r.toName || '').trim().toLowerCase() === ownerLower ||
                    (ownerUserLower && (r.toUsername || '').trim().toLowerCase() === ownerUserLower)
                );
                return (
                  <button
                    type="button"
                    className={isFriend || pendingIn ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => {
                      if (pendingIn && onAcceptFriendRequest) {
                        onAcceptFriendRequest(pendingIn.id);
                        showArmtip(`🤝 Accepted friend request from ${memorial.ownerName}!`);
                      } else {
                        const outcome = onToggleFriend(memorial.ownerName);
                        if (outcome === 'confirm_remove') {
                          showArmtip(`⚠️ Tap again within 3s to confirm removing ${memorial.ownerName} from friends.`);
                        } else if (outcome === 'removed') {
                          showArmtip(`Removed ${memorial.ownerName} from friends.`);
                        } else if (!isFriend && !pendingOut) {
                          showArmtip(`📨 Friend request sent to ${memorial.ownerName} (24h countdown).`);
                        } else if (pendingOut) {
                          showArmtip(`✖️ Cancelled friend request to ${memorial.ownerName}.`);
                        }
                      }
                    }}
                  >
                    {isFriend
                      ? '🤝 Friend Added'
                      : pendingIn
                        ? '✅ Accept Friend Request'
                        : pendingOut
                          ? '⏳ Friend Req Sent (24h)'
                          : `🤝 Add ${(memorial.ownerName || 'Friend').split(' ')[0]} as Friend`}
                  </button>
                );
              })()}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close visit">
            <X size={18} />
          </button>
        </div>

        {/* Visual Stage */}
        <MonumentVisual memorial={memorial} mode="full" adminAssets={adminAssets} />

        {/* Interactive Ritual Controls */}
        {armtipText && <div className="armtip-notif" style={{ marginTop: 12 }}>{armtipText}</div>}
        <div className="ritual-bar">
          <button
            type="button"
            className={`ritual-btn ${
              userKey && hasGivenToday(userKey, memorial.id, 'candle')
                ? 'btn-given-today'
                : ''
            }`}
            onClick={() => triggerOffering(OFFERING_TYPES.candle)}
          >
            <span style={{ fontSize: '1.25rem' }}>🕯️</span>
            <span>
              Light Candle ({memorial.candlesCount || 0})
              {userKey && hasGivenToday(userKey, memorial.id, 'candle') ? ' ✓' : ''}
            </span>
          </button>
          <button
            type="button"
            className={`ritual-btn ${
              userKey && hasGivenToday(userKey, memorial.id, 'incense')
                ? 'btn-given-today'
                : ''
            }`}
            onClick={() => triggerOffering(OFFERING_TYPES.incense)}
          >
            <span style={{ fontSize: '1.25rem' }}>🪔</span>
            <span>
              Burn Incense ({memorial.incenseCount || 0})
              {userKey && hasGivenToday(userKey, memorial.id, 'incense') ? ' ✓' : ''}
            </span>
          </button>
          <button
            type="button"
            className={`ritual-btn ${pickerOpen === 'flowers' ? 'active' : ''} ${
              userKey && hasGivenToday(userKey, memorial.id, 'flower')
                ? 'btn-given-today'
                : ''
            }`}
            onClick={() => {
              if (userKey && hasGivenToday(userKey, memorial.id, 'flower')) {
                showArmtip(getDailyLimitNotice('flower', memorial.name || 'this pet'));
                return;
              }
              setPickerOpen(pickerOpen === 'flowers' ? null : 'flowers');
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🌸</span>
            <span>
              Lay Flowers ({memorial.flowersCount || 0})
              {userKey && hasGivenToday(userKey, memorial.id, 'flower') ? ' ✓' : ''}
            </span>
          </button>
          <button
            type="button"
            className={`ritual-btn ${pickerOpen === 'treats' ? 'active' : ''} ${
              userKey && hasGivenToday(userKey, memorial.id, 'treat')
                ? 'btn-given-today'
                : ''
            }`}
            onClick={() => {
              if (userKey && hasGivenToday(userKey, memorial.id, 'treat')) {
                showArmtip(getDailyLimitNotice('treat', memorial.name || 'this pet'));
                return;
              }
              setPickerOpen(pickerOpen === 'treats' ? null : 'treats');
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🦴</span>
            <span>
              Offer Treat ({memorial.treatsCount || 0})
              {userKey && hasGivenToday(userKey, memorial.id, 'treat') ? ' ✓' : ''}
            </span>
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`btn-primary ${
              userKey && hasGivenToday(userKey, memorial.id, 'message')
                ? 'btn-given-today'
                : ''
            }`}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
            onClick={handleOpenMessageComposer}
          >
            <MessageSquareHeart size={16} /> 💌 Leave Message &amp; Emoticon
            {userKey && hasGivenToday(userKey, memorial.id, 'message') ? ' ✓' : ''}
          </button>
        </div>

        {pickerOpen === 'flowers' && (
          <div className="picker-popover" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {OFFERING_TYPES.flowers.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="picker-item"
                  onClick={() => triggerOffering(f)}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
              {adminAssets
                .filter((a) => a && !a.deletedAt && a.kind === 'flower')
                .map((af) => (
                  <button
                    key={af.id}
                    type="button"
                    className="picker-item"
                    style={{
                      borderColor: af.accentColor || '#f3d98b',
                      boxShadow: af.glowOn ? `0 0 8px ${af.glowColor || af.accentColor}` : undefined,
                    }}
                    onClick={() =>
                      triggerOffering({
                        id: af.id,
                        category: 'flower',
                        emoji: af.emoji || '🌸',
                        label: af.name,
                        color: af.primaryColor,
                        token: makeOfferingToken({ asset: af }),
                        blessing: `offered glowing ${af.name}`,
                      })
                    }
                  >
                    {af.imageUrl ? (
                      <img src={af.imageUrl} alt={af.name} style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover', verticalAlign: 'middle', marginRight: 4 }} />
                    ) : (
                      <span>{af.emoji} </span>
                    )}
                    {af.name}
                  </button>
                ))}
            </div>

            {/* Customer Flower & Hex Color Menu (Available to Regular Visitors) */}
            <div
              style={{
                borderTop: '1px solid rgba(154,184,159,0.2)',
                paddingTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <strong style={{ fontSize: '0.78rem', color: '#f3d98b' }}>
                🎨 Customer Flower &amp; Hex Color Menu
              </strong>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {CUSTOMER_FLOWER_PRESETS.map((cf) => (
                  <button
                    key={cf.emoji}
                    type="button"
                    className={`chip-btn ${customerHold?.flowerEmoji === cf.emoji ? 'active' : ''}`}
                    style={{ padding: '3px 8px' }}
                    onClick={() => onUpdateCustomerHold?.({ flowerEmoji: cf.emoji })}
                    title={cf.label}
                  >
                    {cf.emoji}
                  </button>
                ))}
                <input
                  type="color"
                  value={normalizeHex(customerHold?.flowerColor, '#ff7eb6')}
                  onChange={(e) => onUpdateCustomerHold?.({ flowerColor: e.target.value })}
                  style={{ width: 30, height: 26, borderRadius: 6, cursor: 'pointer' }}
                  title="Pick flower hex color"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={customerHold?.flowerColor || '#ff7eb6'}
                  onChange={(e) => onUpdateCustomerHold?.({ flowerColor: e.target.value })}
                  onBlur={() =>
                    onUpdateCustomerHold?.({
                      flowerColor: normalizeHex(customerHold?.flowerColor, '#ff7eb6'),
                    })
                  }
                  className="input-control"
                  style={{ width: 88, fontFamily: 'monospace', padding: '3px 6px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                  onClick={() => {
                    const hex = normalizeHex(customerHold?.flowerColor, '#ff7eb6');
                    const em = customerHold?.flowerEmoji || '🌸';
                    triggerOffering({
                      id: `cust-flower-${em}`,
                      category: 'flower',
                      emoji: em,
                      label: `Custom Flower (${hex})`,
                      color: hex,
                      token: makeOfferingToken({ emoji: em, color: hex }),
                      blessing: `offered a radiant ${hex} flower`,
                    });
                  }}
                >
                  💐 Offer Customer Flower ({customerHold?.flowerEmoji || '🌸'})
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                  onClick={() => {
                    onHoldFlowerEmote?.();
                    showArmtip(`✋ Now holding ${customerHold?.flowerEmoji || '🌸'} (${normalizeHex(customerHold?.flowerColor, '#ff7eb6')}) in park view!`);
                  }}
                >
                  ✋ Hold Flower in World
                </button>
              </div>
            </div>
          </div>
        )}

        {pickerOpen === 'treats' && (
          <div className="picker-popover">
            {OFFERING_TYPES.treats.map((t) => (
              <button
                key={t.id}
                type="button"
                className="picker-item"
                onClick={() => triggerOffering(t)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
            {adminAssets
              .filter((a) => a && !a.deletedAt && a.kind === 'toy')
              .map((at) => (
                <button
                  key={at.id}
                  type="button"
                  className="picker-item"
                  style={{
                    borderColor: at.accentColor || '#f3d98b',
                    boxShadow: at.glowOn ? `0 0 8px ${at.glowColor || at.accentColor}` : undefined,
                  }}
                  onClick={() =>
                    triggerOffering({
                      id: at.id,
                      category: 'treat',
                      emoji: at.emoji || '🧸',
                      label: at.name,
                      color: at.primaryColor,
                      token: makeOfferingToken({ asset: at }),
                      blessing: `left ${at.name}`,
                    })
                  }
                >
                  {at.imageUrl ? (
                    <img src={at.imageUrl} alt={at.name} style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover', verticalAlign: 'middle', marginRight: 4 }} />
                  ) : (
                    <span>{at.emoji} </span>
                  )}
                  {at.name}
                </button>
              ))}
          </div>
        )}

        {blessingText && (
          <div className="blessing-banner">
            <Bell size={16} />
            <span>{blessingText}</span>
          </div>
        )}

        {/* Content Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'sanctuary' ? 'active' : ''}`}
            onClick={() => setActiveTab('sanctuary')}
          >
            🕊️ Sanctuary & Offerings
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'story' ? 'active' : ''}`}
            onClick={() => setActiveTab('story')}
          >
            <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Life Story & Photos ({memorial.memories?.length || 0})
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'tributes' ? 'active' : ''}`}
            onClick={() => setActiveTab('tributes')}
          >
            <MessageSquareHeart size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Guestbook ({memorial.tributes?.length || 0})
          </button>
          {isOwner && (
            <button
              type="button"
              className={`modal-tab ${activeTab === 'customize' ? 'active' : ''}`}
              onClick={() => setActiveTab('customize')}
            >
              <Settings size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Customize
            </button>
          )}
        </div>

        {activeTab === 'sanctuary' && (
          <div>
            <blockquote
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.22rem',
                fontStyle: 'italic',
                margin: '0 0 10px',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                borderRadius: 10,
              }}
            >
              “{memorial.epitaph}”
            </blockquote>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              <strong>Born:</strong> {memorial.birthDate || '—'} &nbsp;•&nbsp;{' '}
              <strong>At Peace:</strong> {memorial.passedDate || '—'} &nbsp;•&nbsp;{' '}
              <strong>Favorite Treat:</strong> {memorial.favoriteTreat || 'Warm biscuits'}
            </div>
            <div className="trait-row">
              {(memorial.traits || []).map((trait) => (
                <span key={trait} className="trait-tag">
                  ✨ {trait}
                </span>
              ))}
            </div>
            <h4 style={{ margin: '14px 0 8px', fontSize: '0.9rem' }}>Recent Offerings Left Here</h4>
            <div className="log-list">
              {(memorial.offeringsLog || []).map((item) => (
                <div key={item.id} className="log-item">
                  <span>
                    <strong>
                      {item.emoji} {item.label}
                    </strong>{' '}
                    by {item.visitor}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    {formatTimeAgo(item.createdAt, item.time, item.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'story' && (
          <div>
            <p style={{ lineHeight: 1.65, fontSize: '0.92rem', marginTop: 0 }}>{memorial.story}</p>
            <div className="memories-grid">
              {(memorial.memories || []).map((m) => (
                <div key={m.id} className="memory-card">
                  <img src={m.photo} alt={m.caption} />
                  <div className="memory-caption">
                    <div>{m.caption}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {m.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isOwner && (
              <form
                onSubmit={handleAddMemorySubmit}
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 14,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>
                  Add a Cherished Photo Memory
                </div>
                <div className="form-grid">
                  <input
                    type="file"
                    accept="image/*"
                    className="input-control"
                    onChange={handleMemoryFile}
                  />
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Write a short memory caption..."
                    value={memoryCaption}
                    onChange={(e) => setMemoryCaption(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ justifySelf: 'start' }}>
                    <Plus size={15} /> Add Memory
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'tributes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Comforting notes &amp; prayers from visitors
              </span>
              <button type="button" className="btn-primary" onClick={handleOpenMessageComposer}>
                <Heart size={14} /> 💌 Leave Message
              </button>
            </div>
            <div className="log-list">
              {(memorial.tributes || []).map((t) => (
                <div key={t.id} className="log-item" style={{ flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <strong>{t.author}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {formatTimeAgo(t.createdAt, t.date, t.id)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {t.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'customize' && isOwner && (
          <form onSubmit={handleSaveCustomization} className="form-grid">
            <div>
              <label className="field-label">Memorial Space</label>
              <div className="form-row-2">
                <button
                  type="button"
                  className={`style-option ${editSpace === 'tombstone' ? 'active' : ''}`}
                  onClick={() => handleSpaceSwitch('tombstone')}
                >
                  <strong>🌿 Outdoor Tombstone</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Garden plot under open skies
                  </div>
                </button>
                <button
                  type="button"
                  className={`style-option ${editSpace === 'ash-room' ? 'active' : ''}`}
                  onClick={() => handleSpaceSwitch('ash-room')}
                >
                  <strong>🏛️ Indoor Ash Room</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Warm lit columbarium niche
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">
                {editSpace === 'ash-room' ? 'Urn Vessel Style' : 'Tombstone Monument Style'}
              </label>
              <div className="style-grid">
                {MONUMENT_STYLES[editSpace].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`style-option ${editStyleId === st.id ? 'active' : ''}`}
                    onClick={() => setEditStyleId(st.id)}
                  >
                    <strong style={{ fontSize: '0.84rem' }}>{st.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {st.subtitle}
                    </div>
                  </button>
                ))}
                {adminAssets
                  .filter((a) => a && !a.deletedAt && a.kind === (editSpace === 'ash-room' ? 'niche-style' : 'plot-style'))
                  .map((cs) => (
                    <button
                      key={cs.id}
                      type="button"
                      className={`style-option ${editStyleId === `custom:${cs.id}` ? 'active' : ''}`}
                      onClick={() => setEditStyleId(`custom:${cs.id}`)}
                    >
                      <strong style={{ fontSize: '0.84rem' }}>{cs.emoji} {cs.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Admin Custom {cs.glowOn ? '• ✨ Glow' : ''}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="field-label">Carved Epitaph</label>
              <input
                type="text"
                className="input-control"
                value={editEpitaph}
                onChange={(e) => setEditEpitaph(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Life Story</label>
              <textarea
                rows={3}
                className="input-control"
                value={editStory}
                onChange={(e) => setEditStory(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                Pet Trait Badges ({editTraits.length}/5 selected)
              </label>
              <div className="trait-row">
                {getAllPetTraits(customTraits).map((trait) => {
                  const active = editTraits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      aria-pressed={active}
                      className="trait-tag"
                      style={{
                        cursor: 'pointer',
                        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
                        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: active ? '#fff' : 'var(--text-primary)',
                      }}
                      onClick={() =>
                        setEditTraits((prev) =>
                          prev.includes(trait)
                            ? prev.filter((t) => t !== trait)
                            : prev.length >= 5
                              ? prev
                              : [...prev, trait]
                        )
                      }
                    >
                      {active ? '✓ ' : ''}✨ {trait}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="field-label">Visibility</label>
              <select
                className="input-control"
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
              >
                <option value="public">Public Community Park (Everyone logged in can visit)</option>
                <option value="private">Private Sanctuary (Only you can visit)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              {savedNotice && (
                <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>
                  Saved to sanctuary!
                </span>
              )}
            </div>
          </form>
        )}

        {showMessagePopup && (
          <div className="message-popup-backdrop" onClick={() => setShowMessagePopup(false)}>
            <div className="message-popup-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: 0 }}>
                    Leave a Message for {memorial.name}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Tap emoticons to add them to your comforting tribute note
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  style={{ width: 30, height: 30 }}
                  onClick={() => setShowMessagePopup(false)}
                  aria-label="Close message composer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="emoticon-bar" role="group" aria-label="Emoticon picker">
                {EMOTICONS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    className="emoticon-btn"
                    onClick={() => setTributeText((prev) => `${prev}${emo}`)}
                  >
                    {emo}
                  </button>
                ))}
              </div>

              <form onSubmit={handleTributeSubmit} className="form-grid" style={{ gap: 10 }}>
                <textarea
                  rows={4}
                  autoFocus
                  className="input-control message-textarea"
                  placeholder={`Write your heartfelt tribute for ${memorial.name}...`}
                  value={tributeText}
                  onChange={(e) => setTributeText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowMessagePopup(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Heart size={14} /> Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
