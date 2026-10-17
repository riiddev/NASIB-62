import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAIReserve, evaluatePropertyPurchase, evaluateHouseInvestment } from './strategy.js';

const board = [
  { type: 'property', name: 'Sorong', region: 'Papua', price: 1_500_000, rent: 300_000 },
  { type: 'property', name: 'Jayapura', region: 'Papua', price: 1_800_000, rent: 350_000 },
  { type: 'property', name: 'Manokwari', region: 'Papua', price: 2_000_000, rent: 400_000 },
  { type: 'property', name: 'Jakarta', region: 'Jawa', price: 5_000_000, rent: 1_100_000 },
  { type: 'fate', name: 'KARTU TAKDIR' },
];
const levels = {
  staff: { reserve: 650_000, threshold: 0.072 },
  cabinet: { reserve: 1_600_000, threshold: 0.056 },
  oligarch: { reserve: 550_000, threshold: 0.036 },
};
const player = (id, money = 10_000_000) => ({ id, money });

test('cash reserve adapts to available cash and profile cap', () => {
  assert.equal(calculateAIReserve(player('ai', 10_000_000), levels.cabinet), 1_600_000);
  assert.equal(calculateAIReserve(player('ai', 1_000_000), levels.cabinet), 300_000);
});

test('property evaluator rejects invalid, already-owned, and unaffordable purchases', () => {
  assert.equal(evaluatePropertyPurchase({ player: player('ai'), tile: board[4], index: 4, board, assets: [], profile: levels.cabinet }).shouldBuy, false);
  assert.equal(evaluatePropertyPurchase({ player: player('ai'), tile: board[0], index: 0, board, assets: [{ ownerId: 'other' }], profile: levels.oligarch, difficulty: 'oligarch' }).shouldBuy, false);
  const poor = evaluatePropertyPurchase({ player: player('ai', 1_000_000), tile: board[3], index: 3, board, assets: [], profile: levels.oligarch, difficulty: 'oligarch' });
  assert.equal(poor.shouldBuy, false);
  assert.match(poor.reason, /dana cadangan/);
});

test('difficulty profiles produce distinct levels of purchase aggression', () => {
  const args = { player: player('ai', 8_000_000), tile: board[0], index: 0, board, assets: [], profile: levels.staff, difficulty: 'staff' };
  const staff = evaluatePropertyPurchase(args);
  const cabinet = evaluatePropertyPurchase({ ...args, profile: levels.cabinet, difficulty: 'cabinet' });
  const oligarch = evaluatePropertyPurchase({ ...args, profile: levels.oligarch, difficulty: 'oligarch' });
  assert.equal(staff.shouldBuy, false);
  assert.equal(cabinet.shouldBuy, true);
  assert.equal(oligarch.shouldBuy, true);
  assert.ok(staff.reason.length > 0);
});

test('completing a region increases the strategic score', () => {
  const assets = [{ ownerId: 'ai' }, null, { ownerId: 'ai' }, null, null];
  const decision = evaluatePropertyPurchase({ player: player('ai'), tile: board[1], index: 1, board, assets, profile: levels.staff, difficulty: 'staff' });
  const empty = evaluatePropertyPurchase({ player: player('ai'), tile: board[1], index: 1, board, assets: [], profile: levels.staff, difficulty: 'staff' });
  assert.ok(decision.score > empty.score);
  assert.equal(decision.completesRegion, true);
  assert.match(decision.reason, /melengkapi wilayah/);
});

test('buying the last missing tile can block an opponent from completing a region', () => {
  const assets = [{ ownerId: 'rival' }, { ownerId: 'rival' }, null, null, null];
  const decision = evaluatePropertyPurchase({ player: player('ai'), tile: board[2], index: 2, board, assets, profile: levels.oligarch, difficulty: 'oligarch' });
  assert.equal(decision.blocksRivalSet, true);
  assert.match(decision.reason, /menghalangi lawan/);
});

test('house investment requires a full region, cash safety and worthwhile rent uplift', () => {
  const args = { player: player('ai'), tile: board[0], asset: { ownerId: 'ai', houses: 0 }, profile: levels.cabinet, difficulty: 'cabinet', reserve: 1_600_000, houseCost: 1_000_000, completeRegion: false, round: 3 };
  assert.equal(evaluateHouseInvestment(args).shouldBuild, false);
  assert.equal(evaluateHouseInvestment({ ...args, completeRegion: true }).shouldBuild, false);
  assert.equal(evaluateHouseInvestment({ ...args, tile: board[3], completeRegion: true }).shouldBuild, true);
  assert.equal(evaluateHouseInvestment({ ...args, player: player('ai', 1_500_000), completeRegion: true }).shouldBuild, false);
});
