import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidActionPayload,
  sanitizeGameSnapshot,
  sanitizeIncomingChat,
  sanitizeRoster,
} from './security.js';

const PROPERTY_INDICES = [1, 3, 4, 6, 8, 10, 11, 13, 14, 16, 18, 19, 21, 24, 25];

function validSnapshot() {
  const assets = Array.from({ length: 28 }, (_, index) =>
    PROPERTY_INDICES.includes(index) ? { ownerId: null, houses: 0 } : null
  );
  assets[3] = { ownerId: 'p1', houses: 0 };
  return {
    players: [
      { id: 'p1', name: 'Riid', token: '🧑🏽‍💼', color: '#ef4444', money: 8_200_000, pos: 3, jailed: false, jailTurns: 0, alive: true, isAI: false, aiDifficulty: 'cabinet' },
      { id: 'p2', name: 'Teman', token: '🧕🏻', color: '#3b82f6', money: 10_000_000, pos: 0, jailed: false, jailTurns: 0, alive: true, isAI: false, aiDifficulty: 'cabinet' },
    ],
    current: 0, turnCount: 0, round: 1, assets,
    awaiting: true, busy: false, ended: false, extraTurn: false, doubleStreak: 0,
    pendingBuy: null, cardOpen: false, dice: [1, 2],
    log: [{ time: '10.30', message: 'Riid membeli Jayapura.', type: 'good' }],
    lastRollText: '1 + 2 = 3', started: true, stateSeized: [], liveCard: null,
  };
}

test('accepts a valid game snapshot and returns only the allowlisted schema', () => {
  const incoming = validSnapshot();
  incoming.injectedProperty = '<img src=x onerror=alert(1)>';
  const normalized = sanitizeGameSnapshot(incoming);
  assert.ok(normalized);
  assert.equal(normalized.assets.length, 28);
  assert.equal(normalized.assets[3].ownerId, 'p1');
  assert.equal(Object.hasOwn(normalized, 'injectedProperty'), false);
});

test('rejects malformed or oversized snapshots before they reach engine state', () => {
  const invalidAssets = validSnapshot();
  invalidAssets.assets.pop();
  assert.equal(sanitizeGameSnapshot(invalidAssets), null);

  const invalidMoney = validSnapshot();
  invalidMoney.players[0].money = Number.POSITIVE_INFINITY;
  assert.equal(sanitizeGameSnapshot(invalidMoney), null);

  const invalidPosition = validSnapshot();
  invalidPosition.players[0].pos = 9999;
  assert.equal(sanitizeGameSnapshot(invalidPosition), null);
});

test('rejects forged asset owners and impossible house state', () => {
  const forgedOwner = validSnapshot();
  forgedOwner.assets[3].ownerId = 'p5';
  assert.equal(sanitizeGameSnapshot(forgedOwner), null);

  const invalidHouses = validSnapshot();
  invalidHouses.assets[3] = { ownerId: null, houses: 2 };
  assert.equal(sanitizeGameSnapshot(invalidHouses), null);
});

test('normalizes host identity and rejects duplicate or missing roster identities', () => {
  const roster = sanitizeRoster([
    { clientId: 'guest-1', name: '<Teman>', isHost: true, joinedAt: 20 },
    { clientId: 'host-1', name: 'Riid', isHost: false, joinedAt: 10 },
  ], 'host-1');
  assert.deepEqual(roster.map((person) => [person.clientId, person.isHost, person.slot]), [
    ['host-1', true, 0],
    ['guest-1', false, 1],
  ]);
  assert.equal(roster[1].name, 'Teman');

  assert.equal(sanitizeRoster([
    { clientId: 'host-1', name: 'Riid', joinedAt: 1 },
    { clientId: 'host-1', name: 'Duplicate', joinedAt: 2 },
  ], 'host-1'), null);
  assert.equal(sanitizeRoster([{ clientId: 'guest-1', name: 'Teman', joinedAt: 1 }], 'host-1'), null);
});

test('normalizes incoming chat to a room member identity and bounds the text', () => {
  const roster = [
    { clientId: 'host-1', name: 'Riid', isHost: true, slot: 0 },
    { clientId: 'guest-1', name: 'Teman', isHost: false, slot: 1 },
  ];
  const message = sanitizeIncomingChat({
    code: 'AB12CD34',
    clientId: 'guest-1',
    message: {
      id: 'msg-1', name: 'Palsu', text: '<img src=x onerror=alert(1)>',
      time: new Date().toISOString(),
    },
  }, 'AB12CD34', roster);
  assert.ok(message);
  assert.equal(message.name, 'Teman');
  assert.equal(message.text, '<img src=x onerror=alert(1)>');
  assert.equal(message.text.length <= 240, true);

  const longMessage = sanitizeIncomingChat({
    code: 'AB12CD34', clientId: 'guest-1',
    message: { id: 'msg-2', name: 'Teman', text: 'x'.repeat(4000), time: new Date().toISOString() },
  }, 'AB12CD34', roster);
  assert.equal(longMessage.text.length, 240);
});

test('rejects chat from an unknown room member, wrong room, or invalid timestamp', () => {
  const roster = [{ clientId: 'host-1', name: 'Riid', isHost: true, slot: 0 }];
  const packet = { code: 'AB12CD34', clientId: 'other-1', message: { id: 'm1', name: 'other', text: 'hi', time: new Date().toISOString() } };
  assert.equal(sanitizeIncomingChat(packet, 'AB12CD34', roster), null);
  assert.equal(sanitizeIncomingChat({ ...packet, clientId: 'host-1' }, 'DIFFERENT', roster), null);
  assert.equal(sanitizeIncomingChat({
    code: 'AB12CD34', clientId: 'host-1', message: { ...packet.message, time: 'not-a-date' },
  }, 'AB12CD34', roster), null);
});

test('allows only known realtime actions and only property indices for house actions', () => {
  assert.equal(isValidActionPayload('roll', undefined), true);
  assert.equal(isValidActionPayload('build', 19), true);
  assert.equal(isValidActionPayload('build', 2), false);
  assert.equal(isValidActionPayload('build', 99), false);
  assert.equal(isValidActionPayload('delete-room', undefined), false);
  assert.equal(isValidActionPayload('buy', { price: 0 }), false);
});
