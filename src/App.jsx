import React, { useEffect, useState } from 'react';
import SharedMarkup from './legacy/markup/shared.html?raw';
import LandingMarkup from './legacy/markup/landing.html?raw';
import GameRoomMarkup from './legacy/markup/game-room.html?raw';
import ModalsMarkup from './legacy/markup/modals.html?raw';
import GuidebookMarkup from './legacy/markup/guidebook.html?raw';
import { bootLegacyApp } from './legacy/engine.js';
import { registerGSAP } from './animation/gsap.js';
import { NasibAudio } from './audio/audio.js';
import IntroOverlay from './components/IntroOverlay.jsx';
import SoundDock from './components/SoundDock.jsx';
function LegacyFragment({ html, name }) { return <div className={'legacy-fragment legacy-fragment--' + name} dangerouslySetInnerHTML={{ __html: html }} />; }
export default function App() {
 const [introVisible, setIntroVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(() => { registerGSAP(); window.NasibAudio = NasibAudio; NasibAudio.mount(); bootLegacyApp(); }, []);
 return <><LegacyFragment html={SharedMarkup} name="shared"/><LegacyFragment html={LandingMarkup} name="landing"/><LegacyFragment html={GameRoomMarkup} name="game-room"/><LegacyFragment html={ModalsMarkup} name="modals"/><LegacyFragment html={GuidebookMarkup} name="guidebook"/><SoundDock/>{introVisible && <IntroOverlay onComplete={() => setIntroVisible(false)} />}</>;
}
