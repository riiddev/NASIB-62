const BOARD_TILE_COUNT = 28;
const MAX_PLAYERS = 4;
const MAX_CHAT_LENGTH = 240;
const PROPERTY_INDICES = new Set([1, 3, 4, 6, 8, 10, 11, 13, 14, 16, 18, 19, 21, 24, 25]);
const PLAYER_IDS = new Set(['p1', 'p2', 'p3', 'p4']);
const AI_DIFFICULTIES = new Set(['staff', 'cabinet', 'oligarch']);
const ACTIONS = new Set(['roll', 'buy', 'skip-buy', 'build', 'continue', 'bail', 'card-continue']);

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
export function isSafeClientId(value, maxLength = 100) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9_-]+$/.test(value);
}
function isBoundedInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
function cleanName(value) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, 18) || 'Pemain';
}

/** Normalize an untrusted room roster before it influences player slots or UI. */
export function sanitizeRoster(input, hostId) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_PLAYERS || !isSafeClientId(hostId)) return null;
  const seen = new Set();
  const roster = [];
  for (const entry of input) {
    if (!isRecord(entry) || !isSafeClientId(entry.clientId) || seen.has(entry.clientId)) return null;
    seen.add(entry.clientId);
    const joinedAt = Number(entry.joinedAt);
    roster.push({
      clientId: entry.clientId,
      name: cleanName(entry.name),
      isHost: entry.clientId === hostId,
      joinedAt: Number.isFinite(joinedAt) && joinedAt >= 0 ? Math.floor(joinedAt) : 0,
    });
  }
  const host = roster.find((person) => person.clientId === hostId);
  if (!host) return null;
  return [host, ...roster.filter((person) => person.clientId !== hostId)]
    .map((person, slot) => ({ ...person, slot, isHost: person.clientId === hostId }));
}

/**
 * Validate and rebuild only known fields from an untrusted Realtime snapshot.
 * Returns null instead of partially applying malformed or oversized game state.
 */
export function sanitizeGameSnapshot(snapshot) {
  if (!isRecord(snapshot)) return null;
  if (!Array.isArray(snapshot.players) || snapshot.players.length < 2 || snapshot.players.length > MAX_PLAYERS) return null;
  if (!Array.isArray(snapshot.assets) || snapshot.assets.length !== BOARD_TILE_COUNT) return null;
  if (!Array.isArray(snapshot.dice) || snapshot.dice.length !== 2 || !snapshot.dice.every((n) => isBoundedInteger(n, 0, 6))) return null;
  if (!Array.isArray(snapshot.log) || snapshot.log.length > 7 || !Array.isArray(snapshot.stateSeized) || snapshot.stateSeized.length > BOARD_TILE_COUNT) return null;
  if (!isBoundedInteger(snapshot.current, 0, snapshot.players.length - 1)) return null;
  if (!isBoundedInteger(snapshot.turnCount, 0, 10_000_000) || !isBoundedInteger(snapshot.round, 1, 10_000_000)) return null;
  for (const key of ['awaiting', 'busy', 'ended', 'extraTurn', 'cardOpen', 'started']) {
    if (typeof snapshot[key] !== 'boolean') return null;
  }
  if (snapshot.started !== true) return null;
  if (!isBoundedInteger(snapshot.doubleStreak, 0, 2)) return null;
  if (snapshot.pendingBuy !== null && !PROPERTY_INDICES.has(snapshot.pendingBuy)) return null;

  const players = [];
  const ids = new Set();
  for (const player of snapshot.players) {
    if (!isRecord(player) || !PLAYER_IDS.has(player.id) || ids.has(player.id)) return null;
    if (typeof player.name !== 'string' || typeof player.token !== 'string' || player.token.length > 24) return null;
    if (typeof player.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(player.color)) return null;
    if (!Number.isFinite(player.money) || player.money < 0 || player.money > 1_000_000_000_000) return null;
    if (!isBoundedInteger(player.pos, 0, BOARD_TILE_COUNT - 1)) return null;
    if (typeof player.jailed !== 'boolean' || !isBoundedInteger(player.jailTurns, 0, 3)) return null;
    if (typeof player.alive !== 'boolean' || typeof player.isAI !== 'boolean' || !AI_DIFFICULTIES.has(player.aiDifficulty)) return null;
    if (!player.alive && player.money !== 0) return null;
    ids.add(player.id);
    players.push({
      id: player.id,
      name: cleanName(player.name),
      token: player.token,
      color: player.color,
      money: Math.floor(player.money),
      pos: player.pos,
      jailed: player.jailed,
      jailTurns: player.jailTurns,
      alive: player.alive,
      isAI: player.isAI,
      aiDifficulty: player.aiDifficulty,
    });
  }

  const assets = [];
  for (let index = 0; index < BOARD_TILE_COUNT; index += 1) {
    const asset = snapshot.assets[index];
    if (!PROPERTY_INDICES.has(index)) {
      if (asset !== null) return null;
      assets.push(null);
      continue;
    }
    if (!isRecord(asset)) return null;
    if (asset.ownerId !== null && (!PLAYER_IDS.has(asset.ownerId) || !ids.has(asset.ownerId))) return null;
    if (!isBoundedInteger(asset.houses, 0, 3)) return null;
    if (asset.ownerId === null && asset.houses !== 0) return null;
    assets.push({ ownerId: asset.ownerId, houses: asset.houses });
  }

  const log = [];
  for (const entry of snapshot.log) {
    if (!isRecord(entry) || typeof entry.time !== 'string' || typeof entry.message !== 'string') return null;
    if (entry.time.length > 32 || entry.message.length > 500 || !['normal', 'good', 'bad'].includes(entry.type)) return null;
    log.push({ time: entry.time, message: entry.message, type: entry.type });
  }

  const stateSeized = [];
  const seizedSeen = new Set();
  for (const index of snapshot.stateSeized) {
    if (!PROPERTY_INDICES.has(index) || seizedSeen.has(index)) return null;
    seizedSeen.add(index);
    stateSeized.push(index);
  }

  let liveCard = null;
  if (snapshot.liveCard !== null) {
    const live = snapshot.liveCard;
    if (!isRecord(live) || !isSafeClientId(live.id) || !isRecord(live.data)) return null;
    const data = live.data;
    if (!isRecord(data.card) || !['fate', 'mishap'].includes(data.type)) return null;
    const card = data.card;
    if (typeof card.title !== 'string' || card.title.length > 100 ||
        typeof card.text !== 'string' || card.text.length > 400 ||
        !['gain', 'lose', 'move', 'jail', 'seize'].includes(card.kind)) return null;
    if (card.amount !== undefined && (!Number.isFinite(card.amount) || card.amount < 0 || card.amount > 1_000_000_000)) return null;
    if (card.icon !== undefined && (typeof card.icon !== 'string' || card.icon.length > 24)) return null;
    if (!['pos', 'neg', ''].includes(data.impactClass) || typeof data.impact !== 'string' || data.impact.length > 120) return null;
    const expectedCardType = data.type === 'fate' ? 'TAKDIR' : 'MUSIBAH';
    if (data.cardType !== expectedCardType) return null;
    liveCard = {
      id: live.id,
      data: {
        card: {
          title: card.title,
          text: card.text,
          kind: card.kind,
          ...(card.amount === undefined ? {} : { amount: card.amount }),
          ...(card.icon === undefined ? {} : { icon: card.icon }),
        },
        type: data.type,
        cardType: expectedCardType,
        impact: data.impact,
        impactClass: data.impactClass,
      },
    };
  }

  if (typeof snapshot.lastRollText !== 'string' || snapshot.lastRollText.length > 180) return null;
  return {
    players,
    current: snapshot.current,
    turnCount: snapshot.turnCount,
    round: snapshot.round,
    assets,
    awaiting: snapshot.awaiting,
    busy: snapshot.busy,
    ended: snapshot.ended,
    extraTurn: snapshot.extraTurn,
    doubleStreak: snapshot.doubleStreak,
    pendingBuy: snapshot.pendingBuy,
    cardOpen: snapshot.cardOpen,
    dice: [...snapshot.dice],
    log,
    lastRollText: snapshot.lastRollText,
    started: snapshot.started,
    stateSeized,
    liveCard,
  };
}

/** Validate the packet and use the host's roster name rather than trusting payload.name. */
export function sanitizeIncomingChat(payload, roomCode, roster = []) {
  if (!isRecord(payload) || payload.code !== roomCode || !isSafeClientId(payload.clientId)) return null;
  if (!isRecord(payload.message)) return null;
  const message = payload.message;
  if (!isSafeClientId(message.id) || typeof message.name !== 'string' ||
      typeof message.text !== 'string' || typeof message.time !== 'string') return null;
  if (!Array.isArray(roster) || roster.length === 0) return null;
  const sender = roster.find((person) => person?.clientId === payload.clientId);
  if (!sender) return null;
  const text = message.text.trim().slice(0, MAX_CHAT_LENGTH);
  const timestamp = Date.parse(message.time);
  if (!text || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 24 * 60 * 60 * 1000) return null;
  return {
    id: message.id,
    name: cleanName(sender.name),
    text,
    time: new Date(timestamp).toISOString(),
  };
}

export function isValidActionPayload(action, payload) {
  if (!ACTIONS.has(action)) return false;
  if (action === 'build') return payload === undefined || payload === null || PROPERTY_INDICES.has(payload);
  return payload === undefined || payload === null;
}
