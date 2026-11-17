// Zero-setup real-time multiplayer engine using MQTT 3.1.1 over WSS dual brokers
// plus BroadcastChannel for instant local tab sync and retained per-memorial persistence.
import { prepareMemorialForSync } from './imageCompressor';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const TOPIC_PREFIX = 'evergreen-paws-park/v2/room/';
const STORAGE_ROOM_KEY = 'evergreen_paws_meetup_room_v1';
const STORAGE_NICKNAME_KEY = 'evergreen_paws_nickname_v1';
const PEER_TIMEOUT_MS = 12000;
const STARTER_IDS = new Set(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);

const myPeerId = `mp_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
let seqCounter = 0;

function readInitialRoom() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('meetup')?.trim();
      if (fromUrl) {
        const clean = sanitizeRoomCode(fromUrl);
        localStorage.setItem(STORAGE_ROOM_KEY, clean);
        return clean;
      }
      const saved = localStorage.getItem(STORAGE_ROOM_KEY);
      if (saved) return sanitizeRoomCode(saved);
    }
  } catch {
    // ignore storage errors
  }
  return 'PUBLIC';
}

function readInitialNickname() {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_NICKNAME_KEY) || '';
    }
  } catch {
    // ignore storage errors
  }
  return '';
}

function sanitizeRoomCode(raw) {
  const clean = (raw || 'PUBLIC')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
  return clean || 'PUBLIC';
}

let currentRoomCode = readInitialRoom();
let customNickname = readInitialNickname();

let callbacks = {
  onPeersChange: null,
  onChatMessage: null,
  onRemoteEvent: null,
  onSyncMemorial: null,
  onStatusChange: null,
};

const peersMap = new Map(); // peerId -> peer state
const seenMessages = new Map(); // msgId -> timestamp
const sockets = new Map(); // brokerUrl -> { ws, ready, pingTimer, reconnectTimer, buf }
const touchedMemorialIds = new Set();
let localMemorialsList = [];
let lastFullSyncAt = 0;
let broadcastChan = null;
let pruneTimer = null;
let initialized = false;

let localState = {
  name: customNickname || 'Visitor',
  room: 'tombstone',
  nx: 0,
  nz: 190,
  facingX: 0,
  facingZ: -1,
  moving: false,
  avatar: null,
};
let lastPresenceSentAt = 0;
let lastPresenceSnapshot = '';
let localChatBubble = null; // { text, expiresAt }

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeVarLen(len) {
  const bytes = [];
  let x = len;
  do {
    let encoded = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) encoded |= 128;
    bytes.push(encoded);
  } while (x > 0);
  return bytes;
}

function encodeUtf8Field(str) {
  const b = encoder.encode(str);
  return [(b.length >> 8) & 0xff, b.length & 0xff, ...b];
}

function buildMqttConnect(clientId) {
  const vh = [...encodeUtf8Field('MQTT'), 0x04, 0x02, 0x00, 60];
  const pl = encodeUtf8Field(clientId);
  const rem = [...vh, ...pl];
  return new Uint8Array([0x10, ...encodeVarLen(rem.length), ...rem]);
}

function buildMqttSubscribe(packetId, topic) {
  const vh = [(packetId >> 8) & 0xff, packetId & 0xff];
  const pl = [...encodeUtf8Field(topic), 0x00];
  const rem = [...vh, ...pl];
  return new Uint8Array([0x82, ...encodeVarLen(rem.length), ...rem]);
}

function buildMqttUnsubscribe(packetId, topic) {
  const vh = [(packetId >> 8) & 0xff, packetId & 0xff];
  const pl = encodeUtf8Field(topic);
  const rem = [...vh, ...pl];
  return new Uint8Array([0xa2, ...encodeVarLen(rem.length), ...rem]);
}

function buildMqttPublish(topic, payloadObj, retain = false) {
  const vh = encodeUtf8Field(topic);
  const pl = encoder.encode(JSON.stringify(payloadObj));
  const remLen = vh.length + pl.length;
  const header = [retain ? 0x31 : 0x30, ...encodeVarLen(remLen)];
  const out = new Uint8Array(header.length + remLen);
  out.set(header, 0);
  out.set(vh, header.length);
  out.set(pl, header.length + vh.length);
  return out;
}

function buildMqttPingReq() {
  return new Uint8Array([0xc0, 0x00]);
}

function concatBytes(a, b) {
  if (!a || a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function currentTopic() {
  return `${TOPIC_PREFIX}${currentRoomCode}/#`;
}

function liveTopic() {
  return `${TOPIC_PREFIX}${currentRoomCode}/live`;
}

function memorialTopic(memorialId) {
  return `${TOPIC_PREFIX}${currentRoomCode}/memorial/${String(memorialId || 'unknown')}`;
}

function notifyPeersChanged() {
  if (typeof callbacks.onPeersChange === 'function') {
    const arr = Array.from(peersMap.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
    callbacks.onPeersChange(arr);
  }
}

function notifyStatusChanged() {
  if (typeof callbacks.onStatusChange === 'function') {
    let anyReady = false;
    sockets.forEach((s) => {
      if (s.ready) anyReady = true;
    });
    callbacks.onStatusChange(anyReady ? 'connected' : 'connecting');
  }
}

function publishPacket(payloadObj) {
  seqCounter += 1;
  const msg = {
    ...payloadObj,
    peerId: myPeerId,
    roomCode: currentRoomCode,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
  };

  // Mark self message seen so echo doesn't trigger twice
  markSeen(msg.msgId);

  if (broadcastChan) {
    try {
      broadcastChan.postMessage(msg);
    } catch {
      // ignore
    }
  }

  const pkt = buildMqttPublish(liveTopic(), msg, false);
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(pkt);
      } catch {
        // ignore transient send errors
      }
    }
  });
}

export async function publishSharedMemorial(memorial) {
  if (!memorial || !memorial.id || memorial.visibility === 'private') return;
  touchedMemorialIds.add(memorial.id);
  const compact = await prepareMemorialForSync(memorial);

  seqCounter += 1;
  const msg = {
    type: 'sync_memorial',
    peerId: myPeerId,
    senderName: localState.name,
    roomCode: currentRoomCode,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    memorial: compact,
  };
  markSeen(msg.msgId);

  if (broadcastChan) {
    try {
      broadcastChan.postMessage(msg);
    } catch {
      // ignore
    }
  }

  const pkt = buildMqttPublish(memorialTopic(compact.id), msg, true);
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(pkt);
      } catch {
        // ignore transient send errors
      }
    }
  });
}

export function syncAllLocalMemorials(memorialsList, forceSync = false) {
  if (Array.isArray(memorialsList)) {
    localMemorialsList = memorialsList;
  }
  if (!Array.isArray(localMemorialsList) || localMemorialsList.length === 0) return;

  const now = Date.now();
  if (!forceSync && now - lastFullSyncAt < 4000) return;
  lastFullSyncAt = now;

  localMemorialsList.forEach((m) => {
    if (!m || m.visibility === 'private') return;
    const isCustom = !STARTER_IDS.has(m.id);
    if (isCustom || touchedMemorialIds.has(m.id)) {
      publishSharedMemorial(m);
    }
  });
}

function markSeen(msgId) {
  if (!msgId) return false;
  if (seenMessages.has(msgId)) return true;
  seenMessages.set(msgId, Date.now());
  if (seenMessages.size > 400) {
    const cutoff = Date.now() - 30000;
    for (const [k, t] of seenMessages.entries()) {
      if (t < cutoff || seenMessages.size > 320) {
        seenMessages.delete(k);
      }
    }
  }
  return false;
}

function handleIncomingPayload(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (!msg.peerId || msg.peerId === myPeerId) return;
  if (msg.roomCode && msg.roomCode !== currentRoomCode) return;
  if (msg.msgId && markSeen(msg.msgId)) return;

  const now = Date.now();

  if (msg.type === 'leave') {
    if (peersMap.delete(msg.peerId)) {
      notifyPeersChanged();
    }
    return;
  }

  if (msg.type === 'request_presence') {
    updateLocalPresence({ ...localState, force: true });
    syncAllLocalMemorials(localMemorialsList, false);
    return;
  }

  if (msg.type === 'sync_memorial' && msg.memorial && typeof callbacks.onSyncMemorial === 'function') {
    if (msg.memorial.visibility !== 'private') {
      callbacks.onSyncMemorial(msg.memorial, msg.senderName || 'Visitor');
    }
    return;
  }

  if (msg.type === 'presence') {
    const existing = peersMap.get(msg.peerId);
    const nx = Number.isFinite(msg.nx) ? msg.nx : 0;
    const nz = Number.isFinite(msg.nz) ? msg.nz : 0;

    if (existing) {
      const roomChanged = existing.room !== msg.room;
      existing.name = msg.name || existing.name || 'Visitor';
      existing.room = msg.room || 'tombstone';
      existing.nx = nx;
      existing.nz = nz;
      if (roomChanged) {
        existing.rx = nx;
        existing.rz = nz;
      }
      existing.facingX = Number.isFinite(msg.facingX) ? msg.facingX : existing.facingX;
      existing.facingZ = Number.isFinite(msg.facingZ) ? msg.facingZ : existing.facingZ;
      existing.moving = Boolean(msg.moving);
      if (msg.avatar) existing.avatar = msg.avatar;
      existing.lastSeen = now;
      if (roomChanged || existing.name !== msg.name) {
        notifyPeersChanged();
      }
    } else {
      peersMap.set(msg.peerId, {
        peerId: msg.peerId,
        name: msg.name || 'Visitor',
        room: msg.room || 'tombstone',
        nx,
        nz,
        rx: nx,
        rz: nz,
        facingX: Number.isFinite(msg.facingX) ? msg.facingX : 0,
        facingZ: Number.isFinite(msg.facingZ) ? msg.facingZ : 1,
        moving: Boolean(msg.moving),
        bob: 0,
        avatar: msg.avatar || {
          cloakColor: '#4a7c59',
          hairColor: '#2c221e',
          companion: 'dog',
          carryingLantern: true,
        },
        chatText: '',
        chatExpiresAt: 0,
        lastSeen: now,
      });
      notifyPeersChanged();
    }
    return;
  }

  if (msg.type === 'chat') {
    const text = String(msg.text || '').trim().slice(0, 140);
    if (!text) return;
    const peer = peersMap.get(msg.peerId);
    if (peer) {
      peer.chatText = text;
      peer.chatExpiresAt = now + 7000;
      peer.lastSeen = now;
    }
    if (typeof callbacks.onChatMessage === 'function') {
      callbacks.onChatMessage({
        id: msg.msgId || `${msg.peerId}_${now}`,
        peerId: msg.peerId,
        senderName: msg.senderName || peer?.name || 'Visitor',
        text,
        room: msg.room || peer?.room || 'tombstone',
        time: now,
      });
    }
    return;
  }

  if (msg.type === 'action' && typeof callbacks.onRemoteEvent === 'function') {
    callbacks.onRemoteEvent({
      id: msg.msgId || `${msg.peerId}_${now}`,
      peerId: msg.peerId,
      senderName: msg.senderName || peersMap.get(msg.peerId)?.name || 'Visitor',
      ...msg.payload,
    });
  }
}

function processMqttBuffer(entry) {
  let buf = entry.buf;
  while (buf.length >= 2) {
    const byte0 = buf[0];
    let multiplier = 1;
    let remLen = 0;
    let idx = 1;
    let encodedByte;
    let incomplete = false;
    do {
      if (idx >= buf.length) {
        incomplete = true;
        break;
      }
      encodedByte = buf[idx++];
      remLen += (encodedByte & 127) * multiplier;
      multiplier *= 128;
      if (multiplier > 128 * 128 * 128) break;
    } while ((encodedByte & 128) !== 0);

    if (incomplete || buf.length < idx + remLen) break;

    const pktType = byte0 & 0xf0;
    const payloadStart = idx;
    const payloadEnd = idx + remLen;

    if (pktType === 0x20) {
      // CONNACK
      entry.ready = true;
      notifyStatusChanged();
      try {
        entry.ws.send(buildMqttSubscribe(1, currentTopic()));
        publishPacket({ type: 'request_presence' });
        updateLocalPresence({ ...localState, force: true });
        syncAllLocalMemorials(localMemorialsList, false);
      } catch {
        // ignore
      }
    } else if (pktType === 0x30) {
      // PUBLISH
      const qos = (byte0 & 0x06) >> 1;
      if (payloadEnd >= payloadStart + 2) {
        const topicLen = (buf[payloadStart] << 8) | buf[payloadStart + 1];
        let bodyOffset = payloadStart + 2 + topicLen;
        if (qos > 0) bodyOffset += 2;
        if (bodyOffset <= payloadEnd) {
          const jsonStr = decoder.decode(buf.subarray(bodyOffset, payloadEnd));
          try {
            const parsed = JSON.parse(jsonStr);
            handleIncomingPayload(parsed);
          } catch {
            // ignore non-JSON payload
          }
        }
      }
    }

    buf = buf.subarray(payloadEnd);
  }
  entry.buf = buf;
}

function connectBroker(url) {
  if (typeof WebSocket === 'undefined') return;
  let entry = sockets.get(url);
  if (entry?.reconnectTimer) {
    clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = null;
  }
  if (!entry) {
    entry = { ws: null, ready: false, pingTimer: null, reconnectTimer: null, buf: new Uint8Array(0) };
    sockets.set(url, entry);
  }

  try {
    const ws = new WebSocket(url, 'mqtt');
    ws.binaryType = 'arraybuffer';
    entry.ws = ws;
    entry.ready = false;
    entry.buf = new Uint8Array(0);

    ws.onopen = () => {
      try {
        const clientId = `${myPeerId}_${url.includes('emqx') ? 'e' : 'h'}`;
        ws.send(buildMqttConnect(clientId));
        if (entry.pingTimer) clearInterval(entry.pingTimer);
        entry.pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(buildMqttPingReq());
            } catch {
              // ignore
            }
          }
        }, 25000);
      } catch {
        // ignore
      }
    };

    ws.onmessage = (evt) => {
      if (evt.data instanceof ArrayBuffer) {
        entry.buf = concatBytes(entry.buf, new Uint8Array(evt.data));
        processMqttBuffer(entry);
      }
    };

    const scheduleReconnect = () => {
      entry.ready = false;
      if (entry.pingTimer) {
        clearInterval(entry.pingTimer);
        entry.pingTimer = null;
      }
      notifyStatusChanged();
      if (!entry.reconnectTimer && initialized) {
        entry.reconnectTimer = setTimeout(() => {
          entry.reconnectTimer = null;
          connectBroker(url);
        }, 3500);
      }
    };

    ws.onclose = scheduleReconnect;
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  } catch {
    notifyStatusChanged();
  }
}

export function initMultiplayer(nextCallbacks = {}) {
  callbacks = { ...callbacks, ...nextCallbacks };
  if (initialized) {
    notifyPeersChanged();
    notifyStatusChanged();
    return;
  }
  initialized = true;

  if (typeof BroadcastChannel !== 'undefined' && !broadcastChan) {
    try {
      broadcastChan = new BroadcastChannel('evergreen_paws_mp_v1');
      broadcastChan.onmessage = (e) => handleIncomingPayload(e.data);
    } catch {
      // ignore
    }
  }

  BROKERS.forEach((url) => connectBroker(url));

  if (!pruneTimer) {
    pruneTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, peer] of peersMap.entries()) {
        if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
          peersMap.delete(id);
          changed = true;
        }
      }
      if (changed) notifyPeersChanged();
    }, 2500);
  }

  if (typeof window !== 'undefined') {
    const sendLeave = () => {
      publishPacket({ type: 'leave' });
    };
    window.addEventListener('pagehide', sendLeave);
    window.addEventListener('beforeunload', sendLeave);
  }
}

export function updateLocalPresence({
  name,
  room,
  nx,
  nz,
  facingX = 0,
  facingZ = -1,
  moving = false,
  avatar = null,
  force = false,
}) {
  const effectiveName = (customNickname || name || 'Visitor').trim() || 'Visitor';
  localState = {
    name: effectiveName,
    room: room || 'tombstone',
    nx: Math.round(nx || 0),
    nz: Math.round(nz || 0),
    facingX: Number((facingX || 0).toFixed(2)),
    facingZ: Number((facingZ || -1).toFixed(2)),
    moving: Boolean(moving),
    avatar: avatar || localState.avatar,
  };

  const now = Date.now();
  const snapshot = JSON.stringify([
    localState.name,
    localState.room,
    localState.nx,
    localState.nz,
    localState.moving,
    localState.avatar,
  ]);
  const changed = snapshot !== lastPresenceSnapshot;
  const elapsed = now - lastPresenceSentAt;

  // Send at ~11Hz while moving/changing, or heartbeat every 3.5s when standing still
  if (force || (changed && elapsed >= 90) || elapsed >= 3500) {
    lastPresenceSentAt = now;
    lastPresenceSnapshot = snapshot;
    publishPacket({
      type: 'presence',
      name: localState.name,
      room: localState.room,
      nx: localState.nx,
      nz: localState.nz,
      facingX: localState.facingX,
      facingZ: localState.facingZ,
      moving: localState.moving,
      avatar: localState.avatar,
    });
  }
}

export function sendMultiplayerChat(text) {
  const clean = String(text || '').trim().slice(0, 140);
  if (!clean) return null;
  const now = Date.now();
  localChatBubble = { text: clean, expiresAt: now + 7000 };

  publishPacket({
    type: 'chat',
    senderName: localState.name,
    room: localState.room,
    text: clean,
  });

  return {
    id: `local_${now}`,
    peerId: myPeerId,
    senderName: localState.name,
    text: clean,
    room: localState.room,
    time: now,
    isLocal: true,
  };
}

export function sendMultiplayerEmote(emoji, label) {
  publishPacket({
    type: 'action',
    senderName: localState.name,
    payload: {
      kind: 'emote',
      room: localState.room,
      nx: localState.nx,
      nz: localState.nz,
      emoji,
      label,
    },
  });
}

export function sendMultiplayerAction(payload) {
  publishPacket({
    type: 'action',
    senderName: localState.name,
    payload: {
      room: localState.room,
      nx: localState.nx,
      nz: localState.nz,
      ...payload,
    },
  });
}

export function setMeetupRoom(nextCode) {
  const clean = sanitizeRoomCode(nextCode);
  if (clean === currentRoomCode) return clean;

  // Leave old topic gracefully
  const oldTopic = currentTopic();
  publishPacket({ type: 'leave' });
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(buildMqttUnsubscribe(2, oldTopic));
      } catch {
        // ignore
      }
    }
  });

  currentRoomCode = clean;
  try {
    localStorage.setItem(STORAGE_ROOM_KEY, clean);
  } catch {
    // ignore
  }

  peersMap.clear();
  notifyPeersChanged();

  const newTopic = currentTopic();
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(buildMqttSubscribe(3, newTopic));
      } catch {
        // ignore
      }
    }
  });

  publishPacket({ type: 'request_presence' });
  updateLocalPresence({ ...localState, force: true });
  syncAllLocalMemorials(localMemorialsList, true);
  return clean;
}

export function getMeetupRoom() {
  return currentRoomCode;
}

export function setMeetupNickname(name) {
  const clean = String(name || '').trim().slice(0, 20);
  customNickname = clean;
  try {
    if (clean) localStorage.setItem(STORAGE_NICKNAME_KEY, clean);
    else localStorage.removeItem(STORAGE_NICKNAME_KEY);
  } catch {
    // ignore
  }
  updateLocalPresence({ ...localState, name: clean || localState.name, force: true });
  return customNickname;
}

export function getMeetupNickname() {
  return customNickname;
}

export function getPeersMap() {
  return peersMap;
}

export function getLocalChatBubble() {
  if (localChatBubble && Date.now() < localChatBubble.expiresAt) {
    return localChatBubble.text;
  }
  return '';
}

export function getLocalPeerId() {
  return myPeerId;
}
