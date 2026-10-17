import { test, expect } from '@playwright/test';

async function bootApp(page, viewport) {
  if (viewport) await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.NasibEngine?.performAction), null, { timeout: 15_000 });
  await page.evaluate(() => {
    // Keep browser tests deterministic and independent of audio hardware.
    if (window.NasibAudio) {
      window.NasibAudio.play = () => {};
      window.NasibAudio.speak = () => {};
    }
  });
}

async function startLocalMatch(page) {
  await page.evaluate(async () => {
    await window.NasibEngine.startOnlineGame(['Riid', 'Teman'], 0);
  });
  await expect(page.locator('#game')).not.toHaveClass(/\bhidden\b/);
}

async function rollWithFaces(page, faces) {
  await page.evaluate(async (values) => {
    const originalRandom = Math.random;
    const rolls = values.map((face) => (face - 1) / 6 + 0.001);
    let index = 0;
    Math.random = () => index < rolls.length ? rolls[index++] : 0.45;
    try {
      await window.NasibEngine.performAction('roll');
    } finally {
      Math.random = originalRandom;
    }
  }, faces);
}

test('real game loop: dice, buy property, build a house, bankruptcy, and winner', async ({ page }) => {
  await bootApp(page, { width: 1280, height: 900 });
  await startLocalMatch(page);

  let state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.started).toBe(true);
  expect(state.players).toHaveLength(2);
  expect(state.players.map((player) => player.money)).toEqual([10_000_000, 10_000_000]);

  // 1 + 2 moves the first player from START to Jayapura (tile index 3).
  await rollWithFaces(page, [1, 2]);
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.dice).toEqual([1, 2]);
  expect(state.players[0].pos).toBe(3);
  expect(state.pendingBuy).toBe(3);

  // Buy with the production action handler, not a mocked rule function.
  await page.evaluate(() => window.NasibEngine.performAction('buy'));
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.assets[3].ownerId).toBe(state.players[0].id);
  expect(state.players[0].money).toBe(8_200_000);
  expect(state.log.some((entry) => /membeli Jayapura/.test(entry.message))).toBe(true);

  await page.evaluate(() => window.NasibEngine.performAction('continue'));
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.current).toBe(1);

  // Arrange a legitimate completed Jawa region so the live house action can be tested.
  state.players[0].money = 8_200_000;
  state.players[0].pos = 19; // Jakarta
  state.players[0].alive = true;
  for (const index of [16, 18, 19]) {
    state.assets[index] = { ownerId: state.players[0].id, houses: 0 };
  }
  state.current = 0;
  state.awaiting = true;
  state.busy = false;
  state.ended = false;
  state.extraTurn = false;
  state.pendingBuy = null;
  state.cardOpen = false;
  expect(await page.evaluate((snapshot) => window.NasibEngine.applySnapshot(snapshot), state)).toBe(true);

  await page.evaluate(() => window.NasibEngine.performAction('build', 19));
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.assets[19].houses).toBe(1);
  expect(state.players[0].money).toBe(7_200_000);
  expect(state.log.some((entry) => /membangun rumah di Jakarta/.test(entry.message))).toBe(true);

  // Force a valid turn snapshot where the second player cannot cover the actual
  // rent due on a house-upgraded Jakarta property; resolution still uses the real engine.
  state.players[1].money = 100_000;
  state.players[1].pos = 17;
  state.players[1].alive = true;
  state.players[1].jailed = false;
  state.current = 1;
  state.awaiting = false;
  state.busy = false;
  state.ended = false;
  state.extraTurn = false;
  state.doubleStreak = 0;
  state.pendingBuy = null;
  state.cardOpen = false;
  expect(await page.evaluate((snapshot) => window.NasibEngine.applySnapshot(snapshot), state)).toBe(true);

  // Two ones move the opponent from tile 17 to Jakarta, triggering real rent logic.
  await rollWithFaces(page, [1, 1]);
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.players[1].alive).toBe(false);
  expect(state.players[1].money).toBe(0);
  expect(state.log.some((entry) => /bangkrut/.test(entry.message))).toBe(true);

  await page.evaluate(() => window.NasibEngine.performAction('continue'));
  state = await page.evaluate(() => window.NasibEngine.getSnapshot());
  expect(state.ended).toBe(true);
  expect(state.players.filter((player) => player.alive).map((player) => player.name)).toEqual(['Riid']);
  await expect(page.locator('#gameOverModal')).not.toHaveClass(/\bhidden\b/);
});

test('mobile gameplay fits the screen and keeps the roll action thumb-friendly', async ({ page }) => {
  await bootApp(page, { width: 360, height: 780 });
  await startLocalMatch(page);

  const measurements = await page.evaluate(() => {
    const board = document.querySelector('#game .board-wrap')?.getBoundingClientRect();
    const dock = document.querySelector('#game .dock')?.getBoundingClientRect();
    const roll = document.querySelector('#game .dock [data-action="roll"]')?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      boardWidth: board?.width ?? 0,
      boardRight: board?.right ?? 0,
      dockHeight: dock?.height ?? 0,
      dockBottom: dock?.bottom ?? 0,
      rollHeight: roll?.height ?? 0,
      rollVisible: Boolean(roll && roll.width > 0 && roll.height > 0),
    };
  });

  expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.viewportWidth + 1);
  expect(measurements.boardWidth).toBeGreaterThan(280);
  expect(measurements.boardRight).toBeLessThanOrEqual(measurements.viewportWidth + 1);
  expect(measurements.dockHeight).toBeGreaterThan(0);
  expect(measurements.dockBottom).toBeLessThanOrEqual(780);
  expect(measurements.rollVisible).toBe(true);
  expect(measurements.rollHeight).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#game .dock [data-action="roll"]')).toBeVisible();
});
