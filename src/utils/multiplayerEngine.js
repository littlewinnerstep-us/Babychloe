// Zero-setup real-time multiplayer engine using MQTT 3.1.1 over WSS dual brokers
// plus BroadcastChannel for instant local tab sync and retained per-memorial/account persistence.
import { prepareMemorialForSync } from './imageCompressor';
import { DEMO_USER } from '../data/memorialData';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const TOPIC_PREFIX = 'evergreen-paws-park/v2/room/';
const ACCOUNTS_TOPIC_PREFIX = 'evergreen-paws-park/v2/accounts/';
const ADMIN_CONFIG_TOPIC = 'evergreen-paws-park/v2/admin/config';
const ADMIN_NOTIF_TOPIC_PREFIX = 'evergreen-paws-park/v2/admin/notif/';
const GROUP_TOPIC_PREFIX = 'evergreen-paws-park/v2/group/';
const GROUP_INVITE_TOPIC_PREFIX = 'evergreen-paws-park/v2/group-invite/';
const FRIEND_REQ_TOPIC_PREFIX = 'evergreen-paws-park/v2/friend-req/';
const STORAGE_ROOM_KEY = 'evergreen_paws_meetup_room_v1';
const STORAGE_NICKNAME_KEY = 'evergreen_paws_nickname_v1';
const STORAGE_ONLINE_KEY = 'evergreen_paws_mp_online_v1';
const STORAGE_ACCOUNTS_KEY = 'evergreen_paws_accounts_v1';
const STORAGE_ADMIN_CONFIG_KEY = 'evergreen_paws_admin_config_v1';
const STORAGE_ADMIN_NOTIFS_KEY = 'evergreen_paws_admin_notifs_v1';
const STORAGE_GROUP_KEY = 'evergreen_paws_group_v1';
const STORAGE_GROUP_CHAT_KEY = 'evergreen_paws_group_chat_v1';
const STORAGE_GROUP_INVITES_KEY = 'evergreen_paws_group_invites_v1';
const STORAGE_FRIEND_REQS_IN_KEY = 'evergreen_paws_friend_reqs_in_v1';
const STORAGE_FRIEND_REQS_OUT_KEY = 'evergreen_paws_friend_reqs_out_v1';
const PEER_TIMEOUT_MS = 45000;
export const GROUP_MSG_TTL_MS = 23 * 60 * 1000;
export const GROUP_INVITE_TTL_MS = 30 * 60 * 1000;
export const FRIEND_REQ_TTL_MS = 24 * 60 * 60 * 1000;
const STARTER_IDS = new Set(['mem-barnaby', 'mem-mochi', 'mem-koda', 'mem-clover', 'mem-luna', 'mem-yuzu', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']);

const myPeerId = `mp_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const mySpawnOffset = (() => {
  let hash = 0;
  for (let i = 0; i < myPeerId.length; i += 1) {
    hash = (hash * 31 + myPeerId.charCodeAt(i)) | 0;
  }
  const slots = [-28, -14, 0, 14, 28];
  return slots[Math.abs(hash) % slots.length];
})();

export function getLocalSpawnOffset() {
  return mySpawnOffset;
}
let seqCounter = 0;

function readInitialRoom() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ROOM_KEY, 'PUBLIC');
    }
  } catch {
    // ignore storage errors
  }
  return 'PUBLIC';
}

function readInitialNickname() {
  return '';
}

function sanitizeRoomCode(raw) {
  const clean = (raw || 'PUBLIC')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
  return clean || 'PUBLIC';
}

function encodeWireRoom(room, species) {
  const r = room || 'tombstone';
  const sp = species || 'Dog';
  return sp === 'Dog' ? r : `${r}:${sp}`;
}

function decodeWireRoom(rawRoom, rawSpecies) {
  const str = String(rawRoom || 'tombstone');
  if (str.includes(':')) {
    const [r, sp] = str.split(':');
    return {
      room: r || 'tombstone',
      species: rawSpecies || sp || 'Dog',
    };
  }
  return {
    room: str || 'tombstone',
    species: rawSpecies || 'Dog',
  };
}

let currentRoomCode = readInitialRoom();
let customNickname = readInitialNickname();
let isOnlineMode = (() => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_ONLINE_KEY);
      if (saved === 'false') return false;
    }
  } catch {
    // ignore
  }
  return true;
})();

const accountsMap = new Map(); // usernameLower -> accountObj

export function normalizeAccountNameFix(acc) {
  if (!acc || typeof acc !== 'object') return acc;
  const uLower = String(acc.usernameLower || acc.username || '').trim().toLowerCase();
  const nLower = String(acc.name || '').trim().toLowerCase();
  if (uLower === 'fdfd' || nLower === 'fdfd') {
    return {
      ...acc,
      name: 'baby',
      updatedAt: Math.max(Number(acc.updatedAt) || 0, 1763400000000),
    };
  }
  return acc;
}

function loadAccountsRegistry() {
  const seedDemo = {
    username: DEMO_USER.username || 'alex',
    usernameLower: (DEMO_USER.username || 'alex').toLowerCase(),
    password: DEMO_USER.password || 'demo123',
    name: DEMO_USER.name || 'Alex Rivera',
    email: DEMO_USER.email || 'demo@evergreenpaws.com',
    gender: DEMO_USER.gender || 'boy',
    role: 'user',
    avatar: null,
  };
  const seedAdmin = {
    username: 'admin',
    usernameLower: 'admin',
    password: 'admin123',
    name: 'Sanctuary Admin',
    email: 'admin@evergreenpaws.com',
    gender: 'girl',
    role: 'admin',
    avatar: null,
  };
  accountsMap.set(seedDemo.usernameLower, seedDemo);
  accountsMap.set(seedAdmin.usernameLower, seedAdmin);
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((acc) => {
            if (acc && acc.usernameLower) {
              accountsMap.set(acc.usernameLower, normalizeAccountNameFix(acc));
            }
          });
        }
      }
    }
  } catch {
    // ignore
  }
}

function persistAccountsRegistry() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_ACCOUNTS_KEY,
        JSON.stringify(Array.from(accountsMap.values()))
      );
    }
  } catch {
    // ignore
  }
}

loadAccountsRegistry();

let adminConfig = (() => {
  const fallback = { globalMusicUrl: '', showDemoLogin: false, updatedAt: 0 };
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_ADMIN_CONFIG_KEY);
      if (raw) return { ...fallback, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return fallback;
})();

const notificationsMap = new Map(); // id -> notification
(() => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_ADMIN_NOTIFS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((n) => {
            if (n && n.id) notificationsMap.set(n.id, n);
          });
        }
      }
    }
  } catch {
    // ignore
  }
})();

let activeGroup = (() => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_GROUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
})();

let groupChatMessages = (() => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_GROUP_CHAT_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const cutoff = Date.now() - GROUP_MSG_TTL_MS;
          return arr.filter((m) => m && m.time > cutoff);
        }
      }
    }
  } catch {
    // ignore
  }
  return [];
})();

let currentUserIdentity = { username: '', name: '' };
const groupInvitesMap = new Map(); // id -> invite
const incomingFriendReqsMap = new Map(); // id -> friend request
const outgoingFriendReqsMap = new Map(); // id -> friend request
const handledFriendRespIds = new Set();

(() => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_GROUP_INVITES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const now = Date.now();
          arr.forEach((inv) => {
            if (inv && inv.id && Number(inv.expiresAt) > now) {
              groupInvitesMap.set(inv.id, inv);
            }
          });
        }
      }
      const rawIn = localStorage.getItem(STORAGE_FRIEND_REQS_IN_KEY);
      if (rawIn) {
        const arrIn = JSON.parse(rawIn);
        if (Array.isArray(arrIn)) {
          const now = Date.now();
          arrIn.forEach((req) => {
            if (req && req.id && Number(req.expiresAt) > now) {
              incomingFriendReqsMap.set(req.id, req);
            }
          });
        }
      }
      const rawOut = localStorage.getItem(STORAGE_FRIEND_REQS_OUT_KEY);
      if (rawOut) {
        const arrOut = JSON.parse(rawOut);
        if (Array.isArray(arrOut)) {
          const now = Date.now();
          arrOut.forEach((req) => {
            if (req && req.id && Number(req.expiresAt) > now) {
              outgoingFriendReqsMap.set(req.id, req);
            }
          });
        }
      }
    }
  } catch {
    // ignore
  }
})();

let callbacks = {
  onPeersChange: null,
  onChatMessage: null,
  onRemoteEvent: null,
  onSyncMemorial: null,
  onStatusChange: null,
  onAdminConfigChange: null,
  onNotificationsChange: null,
  onGroupChatChange: null,
  onGroupChange: null,
  onAccountsChange: null,
  onGroupInvitesChange: null,
  onFriendRequestsChange: null,
  onFriendRequestAccepted: null,
};

const peersMap = new Map(); // peerId -> peer state
const seenMessages = new Map(); // msgId -> timestamp
const sockets = new Map(); // brokerUrl -> { ws, ready, pingTimer, reconnectTimer, buf }
const touchedMemorialIds = new Set();
let localMemorialsList = [];
let lastFullSyncAt = 0;
let broadcastChan = null;
let pruneTimer = null;
let heartbeatTimer = null;
let initialized = false;

let localState = {
  name: customNickname || 'Visitor',
  room: 'tombstone',
  species: 'Dog',
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
    if (!isOnlineMode) {
      callbacks.onStatusChange('offline');
      return;
    }
    let anyReady = false;
    sockets.forEach((s) => {
      if (s.ready) anyReady = true;
    });
    callbacks.onStatusChange(anyReady ? 'connected' : 'connecting');
  }
}

function publishPacket(payloadObj) {
  if (!isOnlineMode && payloadObj.type !== 'leave') return;
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

function saveAdminConfig(nextCfg) {
  adminConfig = nextCfg;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ADMIN_CONFIG_KEY, JSON.stringify(adminConfig));
    }
  } catch {
    // ignore
  }
  if (typeof callbacks.onAdminConfigChange === 'function') {
    callbacks.onAdminConfigChange({ ...adminConfig });
  }
}

function saveNotifications() {
  const list = Array.from(notificationsMap.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ADMIN_NOTIFS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
  if (typeof callbacks.onNotificationsChange === 'function') {
    callbacks.onNotificationsChange(list);
  }
}

function persistGroupChat() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GROUP_CHAT_KEY, JSON.stringify(groupChatMessages));
    }
  } catch {
    // ignore
  }
}

export function pruneExpiredGroupMessages() {
  const cutoff = Date.now() - GROUP_MSG_TTL_MS;
  const filtered = groupChatMessages.filter(
    (m) => m && m.time > cutoff && (!activeGroup || m.groupId === activeGroup.id)
  );
  if (filtered.length !== groupChatMessages.length) {
    groupChatMessages = filtered;
    persistGroupChat();
    if (typeof callbacks.onGroupChatChange === 'function') {
      callbacks.onGroupChatChange([...groupChatMessages]);
    }
  }
  return groupChatMessages;
}

function broadcastGlobalTopic(topic, payloadObj, retain = false) {
  if (broadcastChan) {
    try {
      broadcastChan.postMessage(payloadObj);
    } catch {
      // ignore
    }
  }
  const pkt = buildMqttPublish(topic, payloadObj, retain);
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(pkt);
      } catch {
        // ignore
      }
    }
  });
}

function handleIncomingPayload(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (!msg.peerId || msg.peerId === myPeerId) return;
  if (msg.msgId && markSeen(msg.msgId)) return;

  if (msg.type === 'register_account' && msg.account && msg.account.usernameLower) {
    const incomingFixed = normalizeAccountNameFix(msg.account);
    const existing = accountsMap.get(incomingFixed.usernameLower);
    if (!existing || (incomingFixed.updatedAt || 0) >= (existing.updatedAt || 0)) {
      accountsMap.set(incomingFixed.usernameLower, incomingFixed);
      persistAccountsRegistry();
      notifyAccountsChanged();
      if (msg.account.name !== incomingFixed.name) {
        broadcastAccountRecord(incomingFixed);
      }
    }
    return;
  }

  if (msg.type === 'admin_config' && msg.config) {
    if ((msg.config.updatedAt || 0) >= (adminConfig.updatedAt || 0)) {
      saveAdminConfig({ ...adminConfig, ...msg.config });
    }
    return;
  }

  if (msg.type === 'admin_notification' && msg.notification && msg.notification.id) {
    if (msg.deleted) {
      notificationsMap.delete(msg.notification.id);
    } else {
      notificationsMap.set(msg.notification.id, msg.notification);
    }
    saveNotifications();
    return;
  }

  if (msg.type === 'group_invite' && msg.invite && msg.invite.id) {
    const inv = msg.invite;
    const now = Date.now();
    if (!Number.isFinite(inv.expiresAt) || inv.expiresAt <= now) return;
    if (!isInviteTargetedToMe(inv)) return;
    groupInvitesMap.set(inv.id, inv);
    persistGroupInvites();
    notifyGroupInvitesChanged();
    return;
  }

  if (msg.type === 'friend_request' && msg.request && msg.request.id) {
    const req = msg.request;
    const now = Date.now();
    if (!Number.isFinite(req.expiresAt) || req.expiresAt <= now) {
      incomingFriendReqsMap.delete(req.id);
      outgoingFriendReqsMap.delete(req.id);
      persistFriendRequests();
      notifyFriendRequestsChanged();
      return;
    }
    if (!isInviteTargetedToMe(req)) return;
    if (handledFriendRespIds.has(req.id)) return;
    incomingFriendReqsMap.set(req.id, req);
    persistFriendRequests();
    notifyFriendRequestsChanged();
    return;
  }

  if (msg.type === 'friend_request_response' && msg.requestId) {
    const req = msg.request || outgoingFriendReqsMap.get(msg.requestId) || incomingFriendReqsMap.get(msg.requestId);
    const hadOutgoing = outgoingFriendReqsMap.delete(msg.requestId);
    const hadIncoming = incomingFriendReqsMap.delete(msg.requestId);
    if (hadOutgoing || hadIncoming) {
      persistFriendRequests();
      notifyFriendRequestsChanged();
    }
    if (msg.status === 'accepted' && req && (hadOutgoing || isInviteFromMe(req)) && !handledFriendRespIds.has(msg.requestId)) {
      handledFriendRespIds.add(msg.requestId);
      if (typeof callbacks.onFriendRequestAccepted === 'function') {
        callbacks.onFriendRequestAccepted(req);
      }
    } else if (msg.status === 'ignored' || msg.status === 'cancelled' || msg.status === 'expired') {
      handledFriendRespIds.add(msg.requestId);
    }
    return;
  }

  if (msg.type === 'group_chat') {
    if (!activeGroup || !msg.groupId || msg.groupId !== activeGroup.id) return;
    if (!isOnlineMode) return;
    const now = Date.now();
    const text = String(msg.text || '').trim().slice(0, 240);
    if (!text) return;
    const entryMsg = {
      id: msg.msgId || `${msg.peerId}_${now}`,
      groupId: msg.groupId,
      groupName: msg.groupName || activeGroup.name,
      peerId: msg.peerId,
      senderName: msg.senderName || peersMap.get(msg.peerId)?.name || 'Visitor',
      text,
      room: msg.room || 'tombstone',
      time: msg.ts || now,
      isLocal: false,
      isGroup: true,
    };
    const peer = peersMap.get(msg.peerId);
    if (peer) {
      peer.chatText = text;
      peer.chatExpiresAt = now + 7000;
      peer.chatIsGroup = true;
      peer.lastSeen = now;
    }
    groupChatMessages = [...pruneExpiredGroupMessages(), entryMsg];
    persistGroupChat();
    if (typeof callbacks.onGroupChatChange === 'function') {
      callbacks.onGroupChatChange([...groupChatMessages]);
    }
    return;
  }

  if (msg.roomCode && msg.roomCode !== currentRoomCode) return;

  const now = Date.now();

  if (msg.type === 'sync_memorial' && msg.memorial && typeof callbacks.onSyncMemorial === 'function') {
    if (msg.memorial.visibility !== 'private') {
      callbacks.onSyncMemorial(msg.memorial, msg.senderName || 'Visitor');
    }
    return;
  }

  if (!isOnlineMode) return;

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
    const { room: cleanRoom, species: cleanSpecies } = decodeWireRoom(msg.room, msg.species);

    if (existing) {
      const roomChanged = existing.room !== cleanRoom;
      const speciesChanged = (existing.species || 'Dog') !== cleanSpecies;
      const groupChanged = (existing.groupId || '') !== (msg.groupId || '');
      existing.name = msg.name || existing.name || 'Visitor';
      existing.room = cleanRoom;
      existing.species = cleanSpecies;
      existing.groupId = msg.groupId || '';
      existing.nx = nx;
      existing.nz = nz;
      if (roomChanged || speciesChanged) {
        existing.rx = nx;
        existing.rz = nz;
        existing.chatText = '';
        existing.chatExpiresAt = 0;
      }
      existing.facingX = Number.isFinite(msg.facingX) ? msg.facingX : existing.facingX;
      existing.facingZ = Number.isFinite(msg.facingZ) ? msg.facingZ : existing.facingZ;
      existing.moving = Boolean(msg.moving);
      if (msg.avatar) existing.avatar = msg.avatar;
      existing.lastSeen = now;
      if (roomChanged || speciesChanged || groupChanged || existing.name !== msg.name) {
        notifyPeersChanged();
      }
    } else {
      peersMap.set(msg.peerId, {
        peerId: msg.peerId,
        name: msg.name || 'Visitor',
        room: cleanRoom,
        species: cleanSpecies,
        groupId: msg.groupId || '',
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
        chatIsGroup: false,
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
      peer.chatIsGroup = false;
      peer.lastSeen = now;
    }
    if (typeof callbacks.onChatMessage === 'function') {
      const { room: chatRoom, species: chatSpecies } = decodeWireRoom(
        msg.room || peer?.room || 'tombstone',
        msg.species || peer?.species || 'Dog'
      );
      callbacks.onChatMessage({
        id: msg.msgId || `${msg.peerId}_${now}`,
        peerId: msg.peerId,
        senderName: msg.senderName || peer?.name || 'Visitor',
        text,
        room: chatRoom,
        species: chatSpecies,
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
        entry.ws.send(buildMqttSubscribe(4, `${ACCOUNTS_TOPIC_PREFIX}+`));
        entry.ws.send(buildMqttSubscribe(5, ADMIN_CONFIG_TOPIC));
        entry.ws.send(buildMqttSubscribe(6, `${ADMIN_NOTIF_TOPIC_PREFIX}+`));
        entry.ws.send(buildMqttSubscribe(8, `${GROUP_INVITE_TOPIC_PREFIX}+`));
        entry.ws.send(buildMqttSubscribe(9, `${FRIEND_REQ_TOPIC_PREFIX}+`));
        if (activeGroup?.id) {
          entry.ws.send(buildMqttSubscribe(7, `${GROUP_TOPIC_PREFIX}${activeGroup.id}`));
        }
        if (isOnlineMode) {
          publishPacket({ type: 'request_presence' });
          updateLocalPresence({ ...localState, force: true });
        }
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
      pruneExpiredGroupMessages();
      pruneExpiredGroupInvites();
      pruneExpiredFriendRequests();
    }, 3000);
  }

  // Keep player online in backgrounded/alt-tabbed browser tabs
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      if (isOnlineMode) {
        updateLocalPresence({ ...localState, force: true });
      }
    }, 4000);
  }

  if (typeof window !== 'undefined') {
    const sendLeave = () => {
      publishPacket({ type: 'leave' });
    };
    window.addEventListener('beforeunload', sendLeave);
  }
}

export function isMultiplayerOnline() {
  return isOnlineMode;
}

export function setMultiplayerOnline(nextOnline) {
  const next = Boolean(nextOnline);
  isOnlineMode = next;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ONLINE_KEY, next ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
  if (!next) {
    publishPacket({ type: 'leave' });
    peersMap.clear();
    notifyPeersChanged();
    notifyStatusChanged();
  } else {
    notifyStatusChanged();
    publishPacket({ type: 'request_presence' });
    updateLocalPresence({ ...localState, force: true });
    syncAllLocalMemorials(localMemorialsList, true);
  }
  return isOnlineMode;
}

function notifyAccountsChanged() {
  if (typeof callbacks.onAccountsChange === 'function') {
    callbacks.onAccountsChange(getRegisteredAccounts());
  }
}

export function isModerationActive(until) {
  return until === -1 || (Number.isFinite(until) && until > Date.now());
}

export function formatModerationRemaining(until) {
  if (until === -1) return 'Permanent';
  if (!Number.isFinite(until) || until <= Date.now()) return '';
  const diffMs = until - Date.now();
  const totalMins = Math.max(1, Math.ceil(diffMs / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function findRegisteredAccount(usernameOrEmail) {
  const key = String(usernameOrEmail || '').trim().toLowerCase();
  if (!key) return null;
  const direct = accountsMap.get(key);
  if (direct) return direct;
  for (const acc of accountsMap.values()) {
    if ((acc.email || '').toLowerCase() === key) {
      return acc;
    }
  }
  return null;
}

export function getUserRestrictionStatus(user) {
  if (!user) {
    return {
      account: null,
      vigilPaused: false,
      vigilLabel: '',
      muted: false,
      muteLabel: '',
      loginBanned: false,
      loginBanLabel: '',
    };
  }
  const latest = findRegisteredAccount(user.username || user.email) || user;
  const mod = latest.moderation || {};
  const vigilPaused = isModerationActive(mod.vigilPausedUntil);
  const muted = isModerationActive(mod.mutedUntil);
  const loginBanned = isModerationActive(mod.loginBannedUntil);
  return {
    account: latest,
    vigilPaused,
    vigilLabel: vigilPaused ? formatModerationRemaining(mod.vigilPausedUntil) : '',
    muted,
    muteLabel: muted ? formatModerationRemaining(mod.mutedUntil) : '',
    loginBanned,
    loginBanLabel: loginBanned ? formatModerationRemaining(mod.loginBannedUntil) : '',
  };
}

export function updateUserModeration(usernameOrEmail, moderationPatch) {
  const found = findRegisteredAccount(usernameOrEmail);
  if (!found) {
    return { ok: false, error: 'Account not found.' };
  }
  const prevMod = found.moderation || {};
  const nextMod = {
    vigilPausedUntil: 0,
    mutedUntil: 0,
    loginBannedUntil: 0,
    ...prevMod,
    ...moderationPatch,
  };
  const updated = {
    ...found,
    moderation: nextMod,
    updatedAt: Date.now(),
  };
  accountsMap.set(found.usernameLower, updated);
  persistAccountsRegistry();
  broadcastAccountRecord(updated);
  notifyAccountsChanged();
  return { ok: true, user: updated };
}

export function getRegisteredAccounts() {
  return Array.from(accountsMap.values())
    .filter((a) => a && typeof a === 'object')
    .sort((a, b) =>
      String(a.name || a.username || '').localeCompare(String(b.name || b.username || ''))
    );
}

export function isUsernameTaken(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return false;
  return accountsMap.has(clean);
}

export function validateTextOnlyDisplayName(rawName) {
  const collapsed = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!collapsed || collapsed.length < 2) {
    return { ok: false, clean: collapsed, error: 'Display name must be at least 2 characters.' };
  }
  if (collapsed.length > 32) {
    return { ok: false, clean: collapsed, error: 'Display name must be 32 characters or fewer.' };
  }
  if (!/^[\p{L} ]+$/u.test(collapsed)) {
    return {
      ok: false,
      clean: collapsed,
      error: 'Display name must be text only (letters and spaces only — no numbers, symbols, or emojis).',
    };
  }
  return { ok: true, clean: collapsed, error: '' };
}

export function isDisplayNameTaken(displayName, excludeUsernameLower = '') {
  const cleanLower = String(displayName || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const excl = String(excludeUsernameLower || '').trim().toLowerCase();
  if (!cleanLower) return false;
  for (const acc of accountsMap.values()) {
    if (excl && acc.usernameLower === excl) continue;
    if ((acc.name || '').trim().replace(/\s+/g, ' ').toLowerCase() === cleanLower) {
      return true;
    }
  }
  return false;
}

function broadcastAccountRecord(account) {
  seqCounter += 1;
  const msg = {
    type: 'register_account',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    account,
  };
  markSeen(msg.msgId);
  broadcastGlobalTopic(`${ACCOUNTS_TOPIC_PREFIX}${account.usernameLower}`, msg, true);
}

export function registerAccount({ username, password, name, email = '', gender = 'girl', avatar = null }) {
  const cleanUser = String(username || '').trim();
  const cleanLower = cleanUser.toLowerCase();
  if (!cleanUser || cleanUser.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
    return { ok: false, error: 'Username may only use letters, numbers, dots, underscores, or hyphens.' };
  }
  if (accountsMap.has(cleanLower)) {
    return { ok: false, error: `Username "${cleanUser}" is already taken. Please pick another.` };
  }
  const dnCheck = validateTextOnlyDisplayName(name);
  if (!dnCheck.ok) {
    return { ok: false, error: dnCheck.error };
  }
  if (isDisplayNameTaken(dnCheck.clean)) {
    return { ok: false, error: `Display name "${dnCheck.clean}" is already taken. Please choose another.` };
  }
  if (!password || String(password).length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const cleanEmail = String(email || '').trim().toLowerCase() || `${cleanLower}@evergreenpaws.local`;
  const account = {
    username: cleanUser,
    usernameLower: cleanLower,
    password: String(password),
    name: dnCheck.clean,
    email: cleanEmail,
    gender: gender === 'boy' ? 'boy' : 'girl',
    role: 'user',
    avatar: avatar || null,
    updatedAt: Date.now(),
  };

  accountsMap.set(cleanLower, account);
  persistAccountsRegistry();
  broadcastAccountRecord(account);
  notifyAccountsChanged();

  return { ok: true, user: account };
}

export function authenticateAccount(usernameOrEmail, password) {
  const input = String(usernameOrEmail || '').trim().toLowerCase();
  if (!input || !password) {
    return { ok: false, error: 'Please enter both username and password.' };
  }
  const found = findRegisteredAccount(input);
  if (!found) {
    return { ok: false, error: 'Account not found. Check your username or create a new account.' };
  }
  if (found.password !== String(password)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }
  const loginBannedUntil = found.moderation?.loginBannedUntil;
  if (isModerationActive(loginBannedUntil)) {
    return {
      ok: false,
      error: `Account banned from logging in (${formatModerationRemaining(loginBannedUntil)}). Contact Admin for assistance.`,
    };
  }
  return { ok: true, user: found };
}

export function verifyAdminCredentials(username, password) {
  const res = authenticateAccount(username, password);
  if (!res.ok) return res;
  if (res.user.role !== 'admin' && res.user.usernameLower !== 'admin') {
    return { ok: false, error: 'This account does not have Administrator privileges.' };
  }
  return { ok: true, user: res.user };
}

export function updateAccountDisplayName() {
  return {
    ok: false,
    error: 'Name and display name are permanent and cannot be changed.',
  };
}

export function updateAccountProfile(usernameOrEmail, patch) {
  const found = findRegisteredAccount(usernameOrEmail);
  if (!found) return null;
  // Enforce immutable username, display name, role, and gender on existing accounts
  const safePatch = { ...patch };
  delete safePatch.username;
  delete safePatch.usernameLower;
  delete safePatch.name;
  delete safePatch.gender;
  delete safePatch.role;
  const updated = { ...found, ...safePatch, updatedAt: Date.now() };
  accountsMap.set(found.usernameLower, updated);
  persistAccountsRegistry();
  broadcastAccountRecord(updated);
  notifyAccountsChanged();
  return updated;
}

export function getAdminConfig() {
  return { ...adminConfig };
}

export function publishAdminConfig(patch) {
  const next = {
    ...adminConfig,
    ...patch,
    updatedAt: Date.now(),
  };
  saveAdminConfig(next);
  seqCounter += 1;
  const msg = {
    type: 'admin_config',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    config: next,
  };
  markSeen(msg.msgId);
  broadcastGlobalTopic(ADMIN_CONFIG_TOPIC, msg, true);
  return next;
}

export function getAdminNotifications() {
  return Array.from(notificationsMap.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
}

export function publishAdminNotification({ category = 'News', title = '', message = '' }) {
  const cleanTitle = String(title || '').trim();
  const cleanMsg = String(message || '').trim();
  if (!cleanTitle || !cleanMsg) {
    return { ok: false, error: 'Title and message are required.' };
  }
  const cleanCat = category === 'Update' ? 'Update' : 'News';
  const notif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: cleanCat,
    title: cleanTitle,
    message: cleanMsg,
    time: Date.now(),
  };
  notificationsMap.set(notif.id, notif);
  saveNotifications();

  seqCounter += 1;
  const pktPayload = {
    type: 'admin_notification',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    notification: notif,
  };
  markSeen(pktPayload.msgId);
  broadcastGlobalTopic(`${ADMIN_NOTIF_TOPIC_PREFIX}${notif.id}`, pktPayload, true);
  return { ok: true, notification: notif };
}

export function deleteAdminNotification(id) {
  const existing = notificationsMap.get(id);
  if (!existing) return;
  notificationsMap.delete(id);
  saveNotifications();

  seqCounter += 1;
  const pktPayload = {
    type: 'admin_notification',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    deleted: true,
    notification: { id },
  };
  markSeen(pktPayload.msgId);
  broadcastGlobalTopic(`${ADMIN_NOTIF_TOPIC_PREFIX}${id}`, pktPayload, true);
}

export function getActiveGroup() {
  return activeGroup ? { ...activeGroup } : null;
}

export function getGroupChatHistory() {
  return [...pruneExpiredGroupMessages()];
}

function persistGroupInvites() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_GROUP_INVITES_KEY,
        JSON.stringify(Array.from(groupInvitesMap.values()))
      );
    }
  } catch {
    // ignore
  }
}

function pruneExpiredGroupInvites() {
  const now = Date.now();
  let removed = false;
  for (const [id, inv] of groupInvitesMap.entries()) {
    if (!inv || !Number.isFinite(inv.expiresAt) || inv.expiresAt <= now) {
      groupInvitesMap.delete(id);
      removed = true;
    }
  }
  if (removed) {
    persistGroupInvites();
    notifyGroupInvitesChanged();
  }
}

function notifyGroupInvitesChanged() {
  if (typeof callbacks.onGroupInvitesChange === 'function') {
    callbacks.onGroupInvitesChange(getPendingGroupInvites());
  }
}

function isInviteTargetedToMe(inv) {
  if (!inv) return false;
  if (inv.toPeerId && inv.toPeerId === myPeerId) return true;
  const toUser = String(inv.toUsername || '').trim().toLowerCase();
  const toName = String(inv.toName || '').trim().toLowerCase();
  const myUser = String(currentUserIdentity.username || '').trim().toLowerCase();
  const myFull = String(currentUserIdentity.name || '').trim().toLowerCase();
  const myFirst = myFull.split(/\s+/)[0] || '';
  const localFirst = String(localState.name || '').trim().toLowerCase();
  if (myUser && (toUser === myUser || toName === myUser)) return true;
  if (myFull && (toName === myFull || toName === myFirst || toUser === myFull)) return true;
  if (!myUser && !myFull && localFirst && localFirst !== 'visitor' && toName === localFirst) return true;
  return false;
}

function isInviteFromMe(inv) {
  if (!inv) return false;
  if (inv.fromPeerId && inv.fromPeerId === myPeerId) return true;
  const fromUser = String(inv.fromUsername || '').trim().toLowerCase();
  const fromName = String(inv.fromName || '').trim().toLowerCase();
  const myUser = String(currentUserIdentity.username || '').trim().toLowerCase();
  const myFull = String(currentUserIdentity.name || '').trim().toLowerCase();
  const myFirst = myFull.split(/\s+/)[0] || '';
  const localFirst = String(localState.name || '').trim().toLowerCase();
  if (myUser && (fromUser === myUser || fromName === myUser)) return true;
  if (myFull && (fromName === myFull || fromName === myFirst || fromUser === myFull)) return true;
  if (!myUser && !myFull && localFirst && localFirst !== 'visitor' && fromName === localFirst) return true;
  return false;
}

export function setCurrentUserIdentity(user) {
  currentUserIdentity = {
    username: String(user?.username || '').trim(),
    name: String(user?.name || '').trim(),
  };
  pruneExpiredGroupInvites();
  notifyGroupInvitesChanged();
  pruneExpiredFriendRequests();
  notifyFriendRequestsChanged();
}

export function getPendingGroupInvites() {
  pruneExpiredGroupInvites();
  const now = Date.now();
  return Array.from(groupInvitesMap.values())
    .filter((inv) => inv && inv.expiresAt > now)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function sendGroupInvite({
  toName = '',
  toUsername = '',
  toPeerId = '',
  fromName = '',
  fromUsername = '',
  groupName = '',
} = {}) {
  const cleanTargetName = String(toName || toUsername || '').trim();
  if (!cleanTargetName && !toPeerId) {
    return { ok: false, error: 'Friend name or username is required.' };
  }
  const senderLabel = String(fromName || localState.name || 'Friend').trim() || 'Friend';
  let targetGroup = activeGroup;
  if (!targetGroup || !targetGroup.id) {
    targetGroup = createGroupChat(groupName || `${senderLabel.split(' ')[0]}'s Circle`);
  }
  const now = Date.now();
  seqCounter += 1;
  const id = `ginv-${now}-${myPeerId}-${seqCounter}`;
  const invite = {
    id,
    groupId: targetGroup.id,
    groupName: targetGroup.name,
    fromName: senderLabel,
    fromUsername: String(fromUsername || currentUserIdentity.username || '').trim(),
    fromPeerId: myPeerId,
    toName: cleanTargetName,
    toUsername: String(toUsername || '').trim(),
    toPeerId: String(toPeerId || '').trim(),
    createdAt: now,
    expiresAt: now + GROUP_INVITE_TTL_MS,
  };
  const payload = {
    type: 'group_invite',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: now,
    invite,
  };
  markSeen(payload.msgId);
  broadcastGlobalTopic(`${GROUP_INVITE_TOPIC_PREFIX}${id}`, payload, false);
  return { ok: true, invite, group: targetGroup };
}

export function acceptGroupInvite(inviteId) {
  const inv = groupInvitesMap.get(inviteId);
  if (!inv || inv.expiresAt <= Date.now()) {
    groupInvitesMap.delete(inviteId);
    persistGroupInvites();
    notifyGroupInvitesChanged();
    return null;
  }
  groupInvitesMap.delete(inviteId);
  persistGroupInvites();
  notifyGroupInvitesChanged();
  return joinGroupChat(inv.groupId, inv.groupName);
}

export function ignoreGroupInvite(inviteId) {
  if (groupInvitesMap.delete(inviteId)) {
    persistGroupInvites();
    notifyGroupInvitesChanged();
  }
}

function persistFriendRequests() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_FRIEND_REQS_IN_KEY,
        JSON.stringify(Array.from(incomingFriendReqsMap.values()))
      );
      localStorage.setItem(
        STORAGE_FRIEND_REQS_OUT_KEY,
        JSON.stringify(Array.from(outgoingFriendReqsMap.values()))
      );
    }
  } catch {
    // ignore
  }
}

function notifyFriendRequestsChanged() {
  if (typeof callbacks.onFriendRequestsChange === 'function') {
    const now = Date.now();
    const incoming = Array.from(incomingFriendReqsMap.values())
      .filter((r) => r && r.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const outgoing = Array.from(outgoingFriendReqsMap.values())
      .filter((r) => r && r.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callbacks.onFriendRequestsChange({ incoming, outgoing });
  }
}

export function pruneExpiredFriendRequests() {
  const now = Date.now();
  let removed = false;
  for (const [id, req] of incomingFriendReqsMap.entries()) {
    if (!req || !Number.isFinite(req.expiresAt) || req.expiresAt <= now) {
      incomingFriendReqsMap.delete(id);
      removed = true;
    }
  }
  for (const [id, req] of outgoingFriendReqsMap.entries()) {
    if (!req || !Number.isFinite(req.expiresAt) || req.expiresAt <= now) {
      outgoingFriendReqsMap.delete(id);
      removed = true;
    }
  }
  if (removed) {
    persistFriendRequests();
    notifyFriendRequestsChanged();
  }
}

export function getPendingFriendRequests() {
  pruneExpiredFriendRequests();
  const now = Date.now();
  return {
    incoming: Array.from(incomingFriendReqsMap.values())
      .filter((r) => r && r.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    outgoing: Array.from(outgoingFriendReqsMap.values())
      .filter((r) => r && r.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  };
}

export function sendFriendRequest({
  toName = '',
  toUsername = '',
  toPeerId = '',
  fromName = '',
  fromUsername = '',
} = {}) {
  const cleanTargetName = String(toName || toUsername || '').trim();
  const cleanTargetUser = String(toUsername || '').trim();
  if (!cleanTargetName && !toPeerId) {
    return { ok: false, error: 'Friend name or username is required.' };
  }
  const senderLabel = String(fromName || localState.name || 'Visitor').trim() || 'Visitor';
  const senderUser = String(fromUsername || currentUserIdentity.username || '').trim();
  const targetKey = (cleanTargetUser || cleanTargetName).toLowerCase();

  for (const [existingId, existingReq] of outgoingFriendReqsMap.entries()) {
    const exName = String(existingReq?.toName || '').trim().toLowerCase();
    const exUser = String(existingReq?.toUsername || '').trim().toLowerCase();
    if (exName === cleanTargetName.toLowerCase() || (targetKey && (exUser === targetKey || exName === targetKey))) {
      outgoingFriendReqsMap.delete(existingId);
    }
  }

  const now = Date.now();
  seqCounter += 1;
  const id = `freq-${now}-${myPeerId}-${seqCounter}`;
  const request = {
    id,
    fromName: senderLabel,
    fromUsername: senderUser,
    fromPeerId: myPeerId,
    toName: cleanTargetName,
    toUsername: cleanTargetUser,
    toPeerId: String(toPeerId || '').trim(),
    createdAt: now,
    expiresAt: now + FRIEND_REQ_TTL_MS,
  };

  outgoingFriendReqsMap.set(id, request);
  persistFriendRequests();
  notifyFriendRequestsChanged();

  const payload = {
    type: 'friend_request',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: now,
    request,
  };
  markSeen(payload.msgId);
  broadcastGlobalTopic(`${FRIEND_REQ_TOPIC_PREFIX}${id}`, payload, true);
  return { ok: true, request };
}

export function acceptFriendRequest(reqId) {
  const req = incomingFriendReqsMap.get(reqId);
  if (!req || req.expiresAt <= Date.now()) {
    incomingFriendReqsMap.delete(reqId);
    persistFriendRequests();
    notifyFriendRequestsChanged();
    return null;
  }
  incomingFriendReqsMap.delete(reqId);
  handledFriendRespIds.add(reqId);
  persistFriendRequests();
  notifyFriendRequestsChanged();

  seqCounter += 1;
  const payload = {
    type: 'friend_request_response',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    requestId: reqId,
    status: 'accepted',
    request: req,
  };
  markSeen(payload.msgId);
  broadcastGlobalTopic(`${FRIEND_REQ_TOPIC_PREFIX}${reqId}`, payload, true);
  return req;
}

export function ignoreFriendRequest(reqId) {
  const req = incomingFriendReqsMap.get(reqId);
  const deleted = incomingFriendReqsMap.delete(reqId);
  handledFriendRespIds.add(reqId);
  if (deleted) {
    persistFriendRequests();
    notifyFriendRequestsChanged();
  }
  seqCounter += 1;
  const payload = {
    type: 'friend_request_response',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    requestId: reqId,
    status: 'ignored',
    request: req || { id: reqId },
  };
  markSeen(payload.msgId);
  broadcastGlobalTopic(`${FRIEND_REQ_TOPIC_PREFIX}${reqId}`, payload, true);
}

export function cancelOutgoingFriendRequest(reqIdOrName) {
  const clean = String(reqIdOrName || '').trim();
  if (!clean) return false;
  let targetReq = outgoingFriendReqsMap.get(clean);
  if (!targetReq) {
    const cleanLower = clean.toLowerCase();
    for (const req of outgoingFriendReqsMap.values()) {
      if (
        (req.toName || '').trim().toLowerCase() === cleanLower ||
        (req.toUsername || '').trim().toLowerCase() === cleanLower
      ) {
        targetReq = req;
        break;
      }
    }
  }
  if (!targetReq) return false;
  outgoingFriendReqsMap.delete(targetReq.id);
  handledFriendRespIds.add(targetReq.id);
  persistFriendRequests();
  notifyFriendRequestsChanged();

  seqCounter += 1;
  const payload = {
    type: 'friend_request_response',
    peerId: myPeerId,
    msgId: `${myPeerId}_${seqCounter}`,
    ts: Date.now(),
    requestId: targetReq.id,
    status: 'cancelled',
    request: targetReq,
  };
  markSeen(payload.msgId);
  broadcastGlobalTopic(`${FRIEND_REQ_TOPIC_PREFIX}${targetReq.id}`, payload, true);
  return true;
}

function subscribeGroupTopic(groupId) {
  if (!groupId) return;
  const topic = `${GROUP_TOPIC_PREFIX}${groupId}`;
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(buildMqttSubscribe(7, topic));
      } catch {
        // ignore
      }
    }
  });
}

function unsubscribeGroupTopic(groupId) {
  if (!groupId) return;
  const topic = `${GROUP_TOPIC_PREFIX}${groupId}`;
  sockets.forEach((entry) => {
    if (entry.ready && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(buildMqttUnsubscribe(8, topic));
      } catch {
        // ignore
      }
    }
  });
}

export function createGroupChat(groupNameInput) {
  const raw = String(groupNameInput || '').trim() || 'Sanctuary Group';
  const code = sanitizeRoomCode(`GRP-${raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || 'CHAT'}-${Math.random().toString(36).slice(2, 6)}`);
  return joinGroupChat(code, raw);
}

export function joinGroupChat(groupCodeInput, groupNameInput = '') {
  const cleanId = sanitizeRoomCode(groupCodeInput);
  if (!cleanId) return null;
  if (activeGroup && activeGroup.id !== cleanId) {
    unsubscribeGroupTopic(activeGroup.id);
  }
  const nextGroup = {
    id: cleanId,
    name: String(groupNameInput || '').trim() || cleanId,
    joinedAt: Date.now(),
  };
  activeGroup = nextGroup;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GROUP_KEY, JSON.stringify(activeGroup));
    }
  } catch {
    // ignore
  }
  groupChatMessages = pruneExpiredGroupMessages().filter((m) => m.groupId === activeGroup.id);
  persistGroupChat();
  subscribeGroupTopic(activeGroup.id);
  if (typeof callbacks.onGroupChange === 'function') callbacks.onGroupChange({ ...activeGroup });
  if (typeof callbacks.onGroupChatChange === 'function') callbacks.onGroupChatChange([...groupChatMessages]);
  updateLocalPresence({ ...localState, force: true });
  return { ...activeGroup };
}

export function exitGroupChat() {
  if (!activeGroup) return;
  const oldId = activeGroup.id;
  unsubscribeGroupTopic(oldId);
  activeGroup = null;
  groupChatMessages = [];
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_GROUP_KEY);
      localStorage.removeItem(STORAGE_GROUP_CHAT_KEY);
    }
  } catch {
    // ignore
  }
  if (typeof callbacks.onGroupChange === 'function') callbacks.onGroupChange(null);
  if (typeof callbacks.onGroupChatChange === 'function') callbacks.onGroupChatChange([]);
  updateLocalPresence({ ...localState, force: true });
}

export function sendGroupChatMessage(text) {
  if (!activeGroup || !activeGroup.id) return null;
  const clean = String(text || '').trim().slice(0, 240);
  if (!clean) return null;
  const now = Date.now();
  localChatBubble = { text: clean, expiresAt: now + 7000, isGroup: true };

  seqCounter += 1;
  const msgId = `${myPeerId}_${seqCounter}`;
  const payload = {
    type: 'group_chat',
    groupId: activeGroup.id,
    groupName: activeGroup.name,
    peerId: myPeerId,
    senderName: localState.name,
    room: localState.room,
    text: clean,
    msgId,
    ts: now,
  };
  markSeen(msgId);
  broadcastGlobalTopic(`${GROUP_TOPIC_PREFIX}${activeGroup.id}`, payload, false);

  const localEntry = {
    id: msgId,
    groupId: activeGroup.id,
    groupName: activeGroup.name,
    peerId: myPeerId,
    senderName: localState.name,
    text: clean,
    room: localState.room,
    time: now,
    isLocal: true,
    isGroup: true,
  };
  groupChatMessages = [...pruneExpiredGroupMessages(), localEntry];
  persistGroupChat();
  if (typeof callbacks.onGroupChatChange === 'function') {
    callbacks.onGroupChatChange([...groupChatMessages]);
  }
  return localEntry;
}

export function updateLocalPresence({
  name,
  room,
  species,
  nx,
  nz,
  facingX = 0,
  facingZ = -1,
  moving = false,
  avatar = null,
  force = false,
}) {
  const effectiveName = (name || 'Visitor').trim() || 'Visitor';
  const curGroupId = activeGroup?.id || '';
  const { room: prevRoom, species: prevSpecies } = decodeWireRoom(localState.room, localState.species);
  const { room: nextRoom, species: nextSpecies } = decodeWireRoom(
    room || prevRoom || 'tombstone',
    species || prevSpecies || 'Dog'
  );
  const placeChanged = prevRoom !== nextRoom || prevSpecies !== nextSpecies;

  localState = {
    name: effectiveName,
    room: nextRoom,
    species: nextSpecies,
    groupId: curGroupId,
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
    localState.species,
    localState.groupId,
    localState.nx,
    localState.nz,
    localState.moving,
    localState.avatar,
  ]);
  const changed = snapshot !== lastPresenceSnapshot;
  const elapsed = now - lastPresenceSentAt;

  // Send immediately on room/gate transitions, ~11Hz while moving, or heartbeat every 3.5s
  if (force || placeChanged || (changed && elapsed >= 90) || elapsed >= 3500) {
    lastPresenceSentAt = now;
    lastPresenceSnapshot = snapshot;
    publishPacket({
      type: 'presence',
      name: localState.name,
      room: encodeWireRoom(localState.room, localState.species),
      species: localState.species,
      groupId: localState.groupId,
      nx: localState.nx,
      nz: localState.nz,
      facingX: localState.facingX,
      facingZ: localState.facingZ,
      moving: localState.moving,
      avatar: localState.avatar,
    });
    if (placeChanged) {
      publishPacket({ type: 'request_presence' });
    }
  }
}

export function sendMultiplayerChat(text) {
  const clean = String(text || '').trim().slice(0, 140);
  if (!clean) return null;
  const now = Date.now();
  localChatBubble = { text: clean, expiresAt: now + 7000, isGroup: false };

  publishPacket({
    type: 'chat',
    senderName: localState.name,
    room: localState.room,
    species: localState.species,
    text: clean,
  });

  return {
    id: `local_${now}`,
    peerId: myPeerId,
    senderName: localState.name,
    text: clean,
    room: localState.room,
    species: localState.species,
    time: now,
    isLocal: true,
    isGroup: false,
  };
}

export function sendMultiplayerEmote(emoji, label) {
  publishPacket({
    type: 'action',
    senderName: localState.name,
    payload: {
      kind: 'emote',
      room: localState.room,
      species: localState.species,
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
      species: localState.species,
      nx: localState.nx,
      nz: localState.nz,
      ...payload,
    },
  });
}

export function setMeetupRoom() {
  currentRoomCode = 'PUBLIC';
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ROOM_KEY, 'PUBLIC');
    }
  } catch {
    // ignore
  }
  return 'PUBLIC';
}

export function getMeetupRoom() {
  return currentRoomCode;
}

export function setMeetupNickname() {
  customNickname = '';
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_NICKNAME_KEY);
    }
  } catch {
    // ignore
  }
  return '';
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
