import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
const GOLD = '#f4c430';
const PIPS = [0, 2, 4, 6, 8];
export default function NasibIntro() {
 const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig();
 const enter = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 120, mass: .75 } });
 const y = interpolate(enter, [0, 1], [100, 0]);
 const city = interpolate(frame, [0, 14, 135, 149], [0, .68, .5, .36], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
 const move = interpolate(frame, [0, 149], [width * .035, -width * .03]);
 const spin = interpolate(frame, [0, 150], [-38, 700]);
 const dice = spring({ frame: frame - 68, fps, config: { damping: 12, stiffness: 115, mass: .5 } });
 const progress = interpolate(frame, [0, 149], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
 return <AbsoluteFill style={{ background: '#101426', color: '#f7f5ef', fontFamily: 'Public Sans, sans-serif', overflow: 'hidden' }}>
  <AbsoluteFill style={{ opacity: city, transform: 'translateX(' + move + 'px) scale(1.12)' }}><img src="./assets/nasib-art-02.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% center', filter: 'saturate(.74) contrast(1.18)' }}/></AbsoluteFill>
  <AbsoluteFill style={{ background: 'linear-gradient(90deg,#101426 0%,rgba(16,20,38,.88) 34%,rgba(16,20,38,.22) 100%),linear-gradient(0deg,#101426 0%,transparent 60%)' }}/>
  <div style={{ position: 'absolute', top: height * .07, left: width * .065, right: width * .065, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(247,245,239,.55)' }}><span>SIMULASI WARGA / 001</span><span style={{ color: GOLD }}>INDONESIA · +62</span></div>
  <div style={{ position: 'absolute', left: width * .08, top: height * .31, width: width * .66, transform: 'translateY(' + y + 'px)', opacity: enter }}><div style={{ color: GOLD, fontSize: 12, fontWeight: 800, letterSpacing: '.24em', marginBottom: 24 }}>UANG · TANAH · NASIB</div><div style={{ fontFamily: 'Big Shoulders Display, Impact, sans-serif', fontWeight: 900, letterSpacing: '-.05em', fontSize: width * .145, lineHeight: '.76' }}><div>NASIB</div><div style={{ color: GOLD }}>+62</div></div><div style={{ marginTop: 28, fontSize: 15, lineHeight: 1.45, color: 'rgba(247,245,239,.72)', maxWidth: 410 }}>Bukan sekadar lempar dadu. Ini soal siapa yang mampu bertahan.</div></div>
  <div style={{ position: 'absolute', right: width * .13, bottom: height * .2, width: width * .15, height: width * .15, transform: 'rotate(' + spin + 'deg) scale(' + (.6 + dice * .4) + ')', opacity: interpolate(frame, [58, 74, 149], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}><div style={{ display: 'grid', width: '100%', height: '100%', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: '7%', padding: '17%', borderRadius: '20%', background: 'linear-gradient(145deg,#fff7d6,#f4c430 63%,#bb8a10)', border: '2px solid rgba(255,255,255,.7)', boxShadow: 'inset -14px -16px 0 rgba(99,65,0,.16),0 25px 45px rgba(0,0,0,.35)' }}>{Array.from({ length: 9 }, (_, i) => <div key={i} style={{ borderRadius: '50%', background: PIPS.includes(i) ? '#12162a' : 'transparent' }}/>)}</div></div>
  <div style={{ position: 'absolute', left: width * .08, right: width * .08, bottom: height * .1, height: 1, background: 'rgba(255,255,255,.2)' }}><div style={{ width: progress + '%', height: 3, marginTop: -1, background: GOLD }}/></div>
  <AbsoluteFill style={{ background: GOLD, transform: 'scaleX(' + interpolate(frame, [0, 8, 18, 24], [0, 0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + ')', transformOrigin: 'left center', opacity: frame < 25 ? .16 : 0, mixBlendMode: 'screen', pointerEvents: 'none' }}/>
  <div style={{ position: 'absolute', right: width * .065, bottom: height * .035, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(255,255,255,.45)' }}>SETIAP LANGKAH ADA HARGANYA</div>
 </AbsoluteFill>;
}
