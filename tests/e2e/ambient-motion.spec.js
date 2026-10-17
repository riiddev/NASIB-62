import { test, expect } from '@playwright/test';

test('ambient camera animation is visibly enabled on the landing and game background', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.NasibEngine?.performAction), null, { timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__nasibSceneMotion), null, { timeout: 8_000 });

  const hero = page.locator('#landing .hero-art');
  const heroAnimation = await hero.evaluate((image) => {
    const style = getComputedStyle(image);
    return { name: style.animationName, duration: style.animationDuration, position: style.objectPosition };
  });
  expect(heroAnimation.name).toContain('nasib-hero-camera');
  expect(heroAnimation.duration).toBe('9s');

  await page.waitForTimeout(700);
  const laterPosition = await hero.evaluate((image) => getComputedStyle(image).objectPosition);
  expect(laterPosition).not.toBe(heroAnimation.position);

  await page.evaluate(async () => {
    await window.NasibEngine.startOnlineGame(['Riid', 'Teman'], 0);
  });
  await expect(page.locator('#game')).not.toHaveClass(/\bhidden\b/);

  const gameBackground = await page.locator('#game').evaluate((game) => {
    const style = getComputedStyle(game, '::before');
    return {
      animationName: style.animationName,
      duration: style.animationDuration,
      image: getComputedStyle(game).getPropertyValue('--nasib-world-art').trim(),
    };
  });
  expect(gameBackground.animationName).toContain('nasib-game-camera');
  expect(gameBackground.duration).toBe('12s');
  expect(gameBackground.image).toContain('nasib-art-02.webp');
});
