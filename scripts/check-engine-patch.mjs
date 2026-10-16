import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyPatch } from 'diff';

const source = readFileSync('src/legacy/engine.js', 'utf8');
const patch = readFileSync('src/online/engine.patch', 'utf8');
const transformed = applyPatch(source, patch);
if (typeof transformed !== 'string') throw new Error('Could not apply src/online/engine.patch to src/legacy/engine.js');
for (const [label, valid] of [
  ['START salary is Rp1,000,000', transformed.includes('const START_SALARY = 1_000_000;')],
  ['pentagonal board geometry exists', transformed.includes('const BOARD_LAYOUT = (() =>')],
  ['photo registry covers 15 cities', (transformed.match(/license: '/g) || []).length >= 15],
  ['online snapshot bridge is exposed', transformed.includes('window.NasibEngine = {')],
]) if (!valid) throw new Error(`Engine patch check failed: ${label}`);

const temp = join(tmpdir(), `nasib-engine-check-${process.pid}.mjs`);
try {
  writeFileSync(temp, transformed);
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'node --check failed');
} finally { try { unlinkSync(temp); } catch { /* temp file may already be removed */ } }
console.log('Engine patch valid: syntax, Rp1M salary, pentagon layout, 15 city photos, realtime bridge.');
