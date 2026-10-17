import { test, expect } from '@playwright/test';

test('an active phone game requires landscape orientation and unlocks when rotated', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.NasibEngine?.performAction), null, { timeout: 15_000 });

  await page.evaluate(async () => {
    await window.NasibEngine.startOnlineGame(['Riid', 'Teman'], 0);
  });

  const guard = page.locator('#orientationGuard');
  await expect(page.locator('#game')).not.toHaveClass(/\bhidden\b/);
  await expect(guard).toBeVisible();
  await expect(page.locator('#orientationTitle')).toHaveText('Putar HP ke posisi lanskap');
  await expect.poll(() => page.locator('#game .room').evaluate((element) => element.inert)).toBe(true);

  await page.setViewportSize({ width: 667, height: 375 });
  await expect(guard).toBeHidden();
  await expect.poll(() => page.locator('#game .room').evaluate((element) => element.inert)).toBe(false);

  const board = await page.locator('#game .board-wrap').boundingBox();
  expect(board).not.toBeNull();
  expect(board.width).toBeGreaterThan(250);
  expect(board.right).toBeLessThanOrEqual(668);
});
