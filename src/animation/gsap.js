import gsap from 'gsap';
export function registerGSAP() { if (typeof window !== 'undefined' && !window.gsap) window.gsap = gsap; return gsap; }
export { gsap };
