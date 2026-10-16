import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const EASE_OUT = 'power3.out';

function splitWords(element) {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);

  const parts = text.split(/\s+/);
  const nodes = [];
  parts.forEach((word, index) => {
    if (index) nodes.push(document.createTextNode(' '));
    const outer = document.createElement('span');
    outer.className = 'w';
    outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = word;
    outer.append(inner);
    nodes.push(outer);
  });
  element.replaceChildren(...nodes);
  return element.querySelectorAll('.w > span');
}

function visibleOverlay() {
  return Array.from(document.querySelectorAll('.modal, #guide, .online-modal-backdrop')).some((element) => {
    const hiddenClass = element.classList.contains('hidden') || element.classList.contains('online-hidden');
    return !hiddenClass && getComputedStyle(element).display !== 'none';
  });
}

export function initLandingMotion() {
  if (window.__nasibMotion) return () => {};
  const landing = document.getElementById('landing');
  if (!landing) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  window.__nasibMotion = true;
  gsap.registerPlugin(ScrollTrigger);

  // 1. Smooth wheel scrolling. Touch scroll remains native.
  const lenis = new Lenis({
    duration: 1.15,
    easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
    smoothWheel: true,
    smoothTouch: false,
    prevent: (node) => Boolean(node.closest('.modal, .online-modal-backdrop, .guide, #game')),
  });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const game = document.getElementById('game');
  const guide = document.getElementById('guide');
  const isScrollLocked = () => (
    document.body.classList.contains('locked') ||
    landing.classList.contains('hidden') ||
    (game && !game.classList.contains('hidden')) ||
    visibleOverlay()
  );
  const syncLenis = () => {
    if (isScrollLocked()) lenis.stop();
    else lenis.start();
  };
  let wasHidden = landing.classList.contains('hidden');
  const observer = new MutationObserver(() => {
    syncLenis();
    const hidden = landing.classList.contains('hidden');
    if (wasHidden && !hidden) requestAnimationFrame(() => ScrollTrigger.refresh());
    wasHidden = hidden;
  });
  // Watch only the overlay roots, not every class change across the whole game board.
  [document.body, landing, game, guide, ...document.querySelectorAll('.modal, .online-modal-backdrop')]
    .filter(Boolean)
    .forEach((element) => observer.observe(element, { attributes: true, attributeFilter: ['class'] }));
  syncLenis();

  // Internal anchors and the footer's back-to-top button use Lenis.
  const onClick = (event) => {
    const targetNode = event.target;
    if (!(targetNode instanceof Element)) return;

    const topButton = targetNode.closest('#toTop');
    if (topButton) {
      event.preventDefault();
      event.stopPropagation();
      lenis.scrollTo(0, { duration: 1.6 });
      return;
    }

    const anchor = targetNode.closest('a[href^="#"]');
    if (!anchor || anchor.getAttribute('href') === '#') return;
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target || isScrollLocked()) return;
    event.preventDefault();
    lenis.scrollTo(target, {
      offset: anchor.getAttribute('href') === '#beranda' ? 0 : -8,
      duration: 1.4,
    });
  };
  document.addEventListener('click', onClick, true);

  const context = gsap.context(() => {
    const $ = (selector, root = landing) => root.querySelector(selector);
    const $$ = (selector, root = landing) => Array.from(root.querySelectorAll(selector));

    // 2. Header tucks away on downward scroll and returns on upward scroll.
    const header = document.getElementById('siteHeader');
    if (header) {
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (trigger) => {
          const y = trigger.scroll();
          if (y > 480 && trigger.direction === 1) header.classList.add('is-away');
          else if (trigger.direction === -1 || y <= 480) header.classList.remove('is-away');
        },
      });
    }

    // 3. The hero illustration moves more slowly than the copy.
    const hero = $('#beranda');
    if (hero) {
      const art = $('.hero-art', hero);
      const copy = $('.hero-copy', hero);
      if (art) {
        gsap.to(art, {
          yPercent: 9,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
      }
      if (copy) {
        gsap.to(copy, {
          y: -56,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true },
        });
      }
    }

    // 4. Section headings reveal word by word. The text remains accessible as one label.
    $$('.sec-head').forEach((head) => {
      const heading = $('h2', head);
      const description = $('p', head);
      if (!heading) return;
      const words = splitWords(heading);
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: head, start: 'top 86%', once: true },
        defaults: { ease: 'power4.out' },
      });
      timeline.from(words, { yPercent: 115, duration: 1, stagger: 0.07 });
      if (description) timeline.from(description, { y: 18, opacity: 0, duration: 0.8, ease: EASE_OUT }, 0.25);
    });

    // 5a. Feature list, clipping frame, and a gentle vertical drift for the stage.
    const featureList = $('#featList');
    const stage = $('#featStage');
    if (featureList && stage) {
      gsap.from($$('.feat-btn', featureList), {
        x: -28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: EASE_OUT,
        scrollTrigger: { trigger: featureList, start: 'top 82%', once: true },
      });
      gsap.from(stage, {
        clipPath: 'inset(14% 7% 14% 7% round 20px)',
        opacity: 0,
        duration: 1.1,
        ease: 'power4.out',
        scrollTrigger: { trigger: stage, start: 'top 85%', once: true },
        clearProps: 'clipPath',
      });
      gsap.fromTo(stage, { y: 36 }, {
        y: -36,
        ease: 'none',
        scrollTrigger: { trigger: '.showcase', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }

    // 5b. Demo scene, progress rule, instruction cards, and CTA.
    const demo = $('#howDemo');
    if (demo) {
      gsap.from(demo, {
        y: 48,
        opacity: 0,
        duration: 1,
        ease: EASE_OUT,
        scrollTrigger: { trigger: demo, start: 'top 88%', once: true },
      });
    }
    const steps = $('.steps');
    if (steps) {
      gsap.fromTo(steps, { '--p': 0 }, {
        '--p': 1,
        duration: 1.3,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: steps, start: 'top 90%', once: true },
      });
      gsap.from($$('.step', steps), {
        y: 28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: EASE_OUT,
        scrollTrigger: { trigger: steps, start: 'top 88%', once: true },
      });
    }
    const cta = $('.how-cta');
    if (cta) {
      gsap.from(cta, {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: EASE_OUT,
        scrollTrigger: { trigger: cta, start: 'top 94%', once: true },
      });
    }

    // 5c. Region cards enter in batches.
    const regions = $$('.region');
    if (regions.length) {
      gsap.set(regions, { y: 44, opacity: 0 });
      ScrollTrigger.batch(regions, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.09,
          ease: EASE_OUT,
          overwrite: true,
        }),
      });
    }

    // 6. Footer wordmark and credit columns.
    const wordmark = $('.footer .big');
    if (wordmark) {
      gsap.from(wordmark, {
        y: 48,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.footer', start: 'top 80%', once: true },
      });
      gsap.from($$('.credits > div'), {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: EASE_OUT,
        scrollTrigger: { trigger: '.credits', start: 'top 92%', once: true },
      });
    }
  }, landing);

  let disposed = false;
  const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
  window.addEventListener('load', refresh);
  if (document.fonts?.ready) document.fonts.ready.then(refresh);

  // 7. Remove the ticker, triggers, Lenis and observers cleanly on unmount/HMR.
  return () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('load', refresh);
    document.removeEventListener('click', onClick, true);
    observer.disconnect();
    gsap.ticker.remove(tick);
    context.revert();
    lenis.destroy();
    delete window.__nasibMotion;
  };
}
