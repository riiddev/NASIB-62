import React, { Suspense, lazy, useEffect, useState } from 'react';
import SharedMarkup from './legacy/markup/shared.html?raw';
import LandingMarkup from './legacy/markup/landing.html?raw';
import GameRoomMarkup from './legacy/markup/game-room.html?raw';
import ModalsMarkup from './legacy/markup/modals.html?raw';
import GuidebookMarkup from './legacy/markup/guidebook.html?raw';
import { bootLegacyApp } from './legacy/engine.js';
import { registerGSAP } from './animation/gsap.js';
import { NasibAudio } from './audio/audio.js';
const IntroOverlay = lazy(() => import('./components/IntroOverlay.jsx'));
import SoundDock from './components/SoundDock.jsx';
import OnlineLobby from './components/OnlineLobby.jsx';
function LegacyFragment({ html, name }) { return <div className={'legacy-fragment legacy-fragment--' + name} dangerouslySetInnerHTML={{ __html: html }} />; }
export default function App() {
 const [introVisible, setIntroVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(() => {
  registerGSAP();
  window.NasibAudio = NasibAudio;
  NasibAudio.mount();
  bootLegacyApp();

  // Keep optional motion layers lazy so a failed animation never blocks gameplay.
  let cancelled = false;
  let stopMotion = () => {};
  let stopDashboardPreview = () => {};
  let stopGameMotion = () => {};
  let stopSceneMotion = () => {};
  import('./animation/landing-motion.js')
    .then(({ initLandingMotion }) => {
      if (cancelled) return;
      stopMotion = initLandingMotion();
    })
    .catch((error) => {
      console.error('[NASIB +62] Landing motion failed to initialize; static layout remains available.', error);
    });
  import('./animation/dashboard-preview.js')
    .then(({ initDashboardPreview }) => {
      if (cancelled) return;
      stopDashboardPreview = initDashboardPreview();
    })
    .catch((error) => {
      console.error('[NASIB +62] Button previews failed to initialize; controls remain usable.', error);
    });
  import('./animation/game-motion.js')
    .then(({ initGameMotion }) => {
      if (cancelled) return;
      stopGameMotion = initGameMotion();
    })
    .catch((error) => {
      console.error('[NASIB +62] Gameplay motion failed to initialize; controls remain usable.', error);
    });
  import('./animation/scene-motion.js')
    .then(({ initSceneMotion }) => {
      if (cancelled) return;
      stopSceneMotion = initSceneMotion();
    })
    .catch((error) => {
      console.error('[NASIB +62] Scene motion failed to initialize; static art remains available.', error);
    });

  return () => {
    cancelled = true;
    stopMotion();
    stopDashboardPreview();
    stopGameMotion();
    stopSceneMotion();
  };
 }, []);
 return <><LegacyFragment html={SharedMarkup} name="shared"/><LegacyFragment html={LandingMarkup} name="landing"/><LegacyFragment html={GameRoomMarkup} name="game-room"/><LegacyFragment html={ModalsMarkup} name="modals"/><LegacyFragment html={GuidebookMarkup} name="guidebook"/><SoundDock/><OnlineLobby/>{introVisible && <Suspense fallback={<div className="nasib-intro intro-loading" role="status"><span>NASIB <b>+62</b></span></div>}><IntroOverlay onComplete={() => setIntroVisible(false)} /></Suspense>}</>;
}
