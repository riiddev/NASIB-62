import { gsap } from 'gsap';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Small UI-only motion layer. It observes state already rendered by the legacy
 * engine and never changes board coordinates or game rules.
 */
export function initGameMotion() {
  const game = document.getElementById('game');
  if (!game || window.__nasibGameMotion || prefersReducedMotion()) return () => {};

  const turn = game.querySelector('#turnPillWrap');
  const turnText = game.querySelector('#turnPill');
  const actions = game.querySelector('#actionPanel');
  const board = game.querySelector('#board');
  if (!turn || !turnText || !actions || !board) return () => {};

  window.__nasibGameMotion = true;
  let lastTurn = turnText.textContent;
  let lastActions = actions.innerHTML;
  const activeAnimations = new Set();

  const animateTurn = () => {
    const nextTurn = turnText.textContent;
    if (!nextTurn || nextTurn === lastTurn) return;
    lastTurn = nextTurn;
    gsap.killTweensOf(turn);
    const tween = gsap.fromTo(turn,
      { boxShadow: '0 0 0 0 rgba(248,207,67,0)' },
      { boxShadow: '0 0 0 6px rgba(248,207,67,.2)', duration: .17, repeat: 1, yoyo: true, ease: 'power2.out', clearProps: 'boxShadow' }
    );
    activeAnimations.add(tween);
    tween.eventCallback('onComplete', () => activeAnimations.delete(tween));
  };

  const animateActions = () => {
    const signature = actions.innerHTML;
    if (signature === lastActions) return;
    lastActions = signature;
    const children = Array.from(actions.children);
    if (!children.length) return;
    gsap.killTweensOf(children);
    const tween = gsap.fromTo(children,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: .22, stagger: .025, ease: 'power2.out', clearProps: 'opacity,visibility,transform' }
    );
    activeAnimations.add(tween);
    tween.eventCallback('onComplete', () => activeAnimations.delete(tween));
  };

  const turnObserver = new MutationObserver(animateTurn);
  turnObserver.observe(turnText, { childList: true, characterData: true, subtree: true });

  const actionObserver = new MutationObserver(animateActions);
  actionObserver.observe(actions, { childList: true, subtree: true, characterData: true });

  const boardObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'class') continue;
      const tile = record.target;
      if (!(tile instanceof HTMLElement) || !tile.classList.contains('tile') || !tile.classList.contains('is-current')) continue;
      const previousClasses = record.oldValue || '';
      if (previousClasses.split(/\s+/).includes('is-current')) continue;
      gsap.killTweensOf(tile);
      const tween = gsap.fromTo(tile,
        { filter: 'brightness(1.14)' },
        { filter: 'brightness(1.04)', duration: .24, ease: 'power2.out', clearProps: 'filter' }
      );
      activeAnimations.add(tween);
      tween.eventCallback('onComplete', () => activeAnimations.delete(tween));
    }
  });
  boardObserver.observe(board, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  return () => {
    turnObserver.disconnect();
    actionObserver.disconnect();
    boardObserver.disconnect();
    for (const tween of activeAnimations) tween.kill();
    gsap.killTweensOf([turn, ...Array.from(actions.children), ...Array.from(board.querySelectorAll('.tile'))]);
    window.__nasibGameMotion = false;
  };
}
