import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyPatch } from 'diff';

const source = readFileSync('src/legacy/engine.js', 'utf8');
const patch = readFileSync('src/online/engine.patch', 'utf8');
const transformed = applyPatch(source, patch);
if (typeof transformed !== 'string') {
  throw new Error('Could not apply src/online/engine.patch to src/legacy/engine.js');
}

const checks = [
  ['starting capital is Rp10,000,000', transformed.includes('const STARTING_MONEY = 10_000_000;')],
  ['START salary is Rp1,000,000', transformed.includes('const START_SALARY = 1_000_000;')],
  ['selected-property house construction is available', transformed.includes('function canBuildOn(index, player = getCurrentPlayer())') && transformed.includes('buildHouse(Number.isInteger(payload) ? payload : undefined)')],
  ['illustrated story cards are enabled', transformed.includes("function sceneArtSVG(scene, type = 'mishap')")],
  ['live leaderboard is rendered', transformed.includes('function renderLeaderboard()')],
  ['pentagonal board geometry exists', transformed.includes('const BOARD_LAYOUT = (() =>')],
  ['photo registry covers at least 15 cities', (transformed.match(/license: '/g) || []).length >= 15],
  ['online snapshot bridge is exposed', transformed.includes('window.NasibEngine = {')],
  ['AI strategy uses the standalone evaluator', source.includes("from '../ai/strategy.js'") && transformed.includes('function aiPurchaseDecision(p, i)')],
  ['computer purchase logs explain decisions', transformed.includes('decision.reason')],
];

for (const [label, valid] of checks) {
  if (!valid) throw new Error(`Engine patch check failed: ${label}`);
}

const temp = join(tmpdir(), `nasib-engine-check-${process.pid}.mjs`);
try {
  writeFileSync(temp, transformed);
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'node --check failed');
} finally {
  try { unlinkSync(temp); } catch { /* temp file may already be removed */ }
}

console.log(`Engine patch valid: ${checks.length} invariants checked; source syntax passed.`);
