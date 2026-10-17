import { gsap } from 'gsap';

/**
 * Gentle ambient camera drift for the existing illustration. It does not move
 * game pieces or mutate board state; reduced-motion preferences disable motion,
 * but do not disable the phone orientation gate.
 */
export function initSceneMotion() {
  if (window.__nasibSceneMotion) return () => {};
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const landing = document.getElementById('landing');
  const hero = landing?.querySelector('.hero');
  const art = hero?.querySelector('.hero-art');
  const game = document.getElementById('game');
  if (!art && !game) return () => {};

  window.__nasibSceneMotion = true;

  // Resolve the original asset from the image URL so Vercel and GitHub Pages
  // (including a project subpath) use the same, already-optimized illustration.
  if (art && game) {
    try {
      const resolvedArt = new URL(art.getAttribute('src') || art.src, window.location.href).href;
      game.style.setProperty('--nasib-world-art', 'url("' + resolvedArt + '")');
    } catch {
      // The foreground artwork remains available if URL resolution fails.
    }
  }

  // Hero camera travel lives in CSS so it also works if GSAP is delayed or fails.

  let backgroundDrift = null;
  const orientationMedia = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
  const orientationGuard = game?.querySelector('#orientationGuard');

  const syncOrientationGate = () => {
    if (!game) return;
    const blocked = !game.classList.contains('hidden') && orientationMedia.matches;
    orientationGuard?.setAttribute('aria-hidden', String(!blocked));
    const roots = [
      game.querySelector('.topbar'),
      game.querySelector('.room'),
      document.querySelector('.sound-dock'),
      document.querySelector('.online-game-dock'),
    ].filter(Boolean);
    roots.forEach((element) => { element.inert = blocked; });
  };

  const syncGameMotion = () => {
    if (!game) return;
    const active = !game.classList.contains('hidden');
    if (active && !backgroundDrift && !reducedMotion) {
      gsap.set(game, { '--nasib-scene-y': '0%' });
      backgroundDrift = gsap.to(game, {
        '--nasib-scene-y': '-1.35%',
        duration: 18,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    } else if ((!active || reducedMotion) && backgroundDrift) {
      backgroundDrift.kill();
      backgroundDrift = null;
      gsap.set(game, { '--nasib-scene-y': '0%' });
    }
    syncOrientationGate();
  };

  const gameObserver = game ? new MutationObserver(syncGameMotion) : null;
  gameObserver?.observe(game, { attributes: true, attributeFilter: ['class'] });
  orientationMedia.addEventListener?.('change', syncOrientationGate);
  window.addEventListener('orientationchange', syncOrientationGate);
  window.addEventListener('resize', syncOrientationGate);
  syncGameMotion();
  syncOrientationGate();

  return () => {
    gameObserver?.disconnect();
    orientationMedia.removeEventListener?.('change', syncOrientationGate);
    window.removeEventListener('orientationchange', syncOrientationGate);
    window.removeEventListener('resize', syncOrientationGate);
    backgroundDrift?.kill();
    if (game) {
      gsap.set(game, { '--nasib-scene-y': '0%' });
      game.style.removeProperty('--nasib-world-art');
    }
    delete window.__nasibSceneMotion;
  };
}
