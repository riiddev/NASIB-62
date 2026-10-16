import React, { useEffect } from 'react';
import { Player } from '@remotion/player';
import NasibIntro from '../remotion/NasibIntro.jsx';
export default function IntroOverlay({ onComplete }) {
 useEffect(() => { const key = (event) => { if (event.key === 'Escape') onComplete?.(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onComplete]);
 return <section className="nasib-intro" role="dialog" aria-label="Intro NASIB +62" aria-modal="true"><Player component={NasibIntro} durationInFrames={150} fps={30} compositionWidth={1920} compositionHeight={1080} controls={false} autoPlay loop={false} clickToPlay={false} doubleClickToFullscreen={false} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} onEnded={onComplete}/><button type="button" className="intro-skip" onClick={onComplete} aria-label="Lewati intro">Lewati intro ↗</button><div className="intro-grain"/></section>;
}
