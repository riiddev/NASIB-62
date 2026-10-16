import React, { useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import NasibIntro from '../remotion/NasibIntro.jsx';

export default function IntroOverlay({ onComplete }) {
 const playerRef = useRef(null);
 useEffect(() => {
  const player = playerRef.current;
  if (!player) return undefined;
  const handleEnded = () => onComplete?.();
  player.addEventListener('ended', handleEnded);
  player.play();
  const handleKey = (event) => { if (event.key === 'Escape') onComplete?.(); };
  window.addEventListener('keydown', handleKey);
  return () => { player.removeEventListener('ended', handleEnded); player.pause(); window.removeEventListener('keydown', handleKey); };
 }, [onComplete]);
 return <section className="nasib-intro" role="dialog" aria-label="Intro NASIB +62" aria-modal="true"><Player ref={playerRef} component={NasibIntro} durationInFrames={150} fps={30} compositionWidth={1920} compositionHeight={1080} controls={false} autoPlay loop={false} initiallyMuted clickToPlay={false} doubleClickToFullscreen={false} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} /><button type="button" className="intro-skip" onClick={onComplete} aria-label="Lewati intro">Lewati intro ↗</button><div className="intro-grain"/></section>;
}
