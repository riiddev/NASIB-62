import { calculateAIReserve, evaluatePropertyPurchase, evaluateHouseInvestment } from '../ai/strategy.js';

export function bootLegacyApp() {
'use strict';
if (window.__nasibBooted) return;
window.__nasibBooted = true;
/* =========================================================
   1. CONFIGURATION & DATA
   Game numbers, board, and cards are copied unchanged from the
   original NASIB +62 source. Only presentation data is added.
   ========================================================= */
const STARTING_MONEY = 15_000_000;
const START_SALARY = 2_000_000;
const JAIL_BAIL = 1_000_000;
const HOUSE_COST = 1_000_000;
const MAX_HOUSES = 3;               // canBuildAtCurrent() allows building while houses < 3
const SEIZED_TOLL = 500_000;        // fee at a seized (toll) tile, from resolveSpace()
const PUNGLI_FEE = 500_000;         // hard-coded in resolveSpace() for 'pungli'
const SEIZE_FALLBACK_FEE = 500_000; // fee when a "land seized" card hits a player with no land

const PLAYER_COLORS = [
  { token: '🧑🏽‍💼', color: '#ef4444', name: 'Merah' },
  { token: '🧕🏻', color: '#3b82f6', name: 'Biru' },
  { token: '🧑🏾‍🎓', color: '#16a34a', name: 'Hijau' },
  { token: '🧑🏻‍🍳', color: '#f59e0b', name: 'Kuning' },
];
const DEFAULT_NAMES = ['Budi', 'Siti', 'Raka', 'Dewi'];

const BOARD = [
  { type: 'start', name: 'START', subtitle: 'Ambil gajian', icon: '💼' },
  { type: 'property', name: 'Sorong', region: 'Papua', price: 1_500_000, rent: 300_000, color: '#20a4a8' },
  { type: 'fate', name: 'KARTU TAKDIR', icon: '✨' },
  { type: 'property', name: 'Jayapura', region: 'Papua', price: 1_800_000, rent: 350_000, color: '#20a4a8' },
  { type: 'property', name: 'Pontianak', region: 'Kalimantan', price: 2_000_000, rent: 400_000, color: '#54a56b' },
  { type: 'mishap', name: 'KARTU MUSIBAH', icon: '🌧️' },
  { type: 'property', name: 'Balikpapan', region: 'Kalimantan', price: 2_300_000, rent: 450_000, color: '#54a56b' },
  { type: 'pungli', name: 'PUNGLI', subtitle: 'Ada yang minta', icon: '🫴' },
  { type: 'property', name: 'Makassar', region: 'Sulawesi', price: 2_500_000, rent: 500_000, color: '#a177cf' },
  { type: 'fate', name: 'KARTU TAKDIR', icon: '✨' },
  { type: 'property', name: 'Manado', region: 'Sulawesi', price: 2_800_000, rent: 550_000, color: '#a177cf' },
  { type: 'property', name: 'Kendari', region: 'Sulawesi', price: 3_000_000, rent: 600_000, color: '#a177cf' },
  { type: 'jail', name: 'LAPAS', subtitle: 'Rehat sejenak', icon: '🔒' },
  { type: 'property', name: 'Medan', region: 'Sumatra', price: 3_200_000, rent: 650_000, color: '#e0a13b' },
  { type: 'property', name: 'Padang', region: 'Sumatra', price: 3_400_000, rent: 700_000, color: '#e0a13b' },
  { type: 'tax', name: 'PAJAK', subtitle: 'Tahunan', icon: '🧾', amount: 1_000_000 },
  { type: 'property', name: 'Surabaya', region: 'Jawa', price: 4_000_000, rent: 800_000, color: '#de6d54' },
  { type: 'mishap', name: 'KARTU MUSIBAH', icon: '🌧️' },
  { type: 'property', name: 'Yogyakarta', region: 'Jawa', price: 4_400_000, rent: 900_000, color: '#de6d54' },
  { type: 'property', name: 'Jakarta', region: 'Jawa', price: 5_000_000, rent: 1_100_000, color: '#de6d54' },
  { type: 'court', name: 'PENGADILAN', subtitle: 'Urus berkas', icon: '⚖️', amount: 500_000 },
  { type: 'property', name: 'Palembang', region: 'Sumatra', price: 3_700_000, rent: 750_000, color: '#e0a13b' },
  { type: 'toll', name: 'JALAN TOL', subtitle: 'Bayar lewat', icon: '🛣️', amount: 300_000 },
  { type: 'tilang', name: 'TILANG', subtitle: 'Surat cinta', icon: '🚨', amount: 700_000 },
  { type: 'property', name: 'Manokwari', region: 'Papua', price: 2_000_000, rent: 400_000, color: '#20a4a8' },
  { type: 'property', name: 'Banjarmasin', region: 'Kalimantan', price: 2_600_000, rent: 500_000, color: '#54a56b' },
  { type: 'fate', name: 'KARTU TAKDIR', icon: '✨' },
  { type: 'mishap', name: 'KARTU MUSIBAH', icon: '🌧️' },
];

const FATE_CARDS = [
  { title: 'THR TURUN!', text: 'Atasan akhirnya ingat kalau kamu juga manusia. Terima bonus.', kind: 'gain', amount: 1_000_000, icon: '💸' },
  { title: 'REZEKI ANAK SOLEH', text: 'Dapat cashback dari belanja bulanan.', kind: 'gain', amount: 500_000, icon: '🪙' },
  { title: 'PROYEK SAMPINGAN', text: 'Ada pekerjaan freelance yang cair tepat waktu.', kind: 'gain', amount: 800_000, icon: '💻' },
  { title: 'DISKON ONGKIR', text: 'Pengeluaran bulan ini sedikit lebih ringan.', kind: 'gain', amount: 250_000, icon: '📦' },
  { title: 'KETEMU ORANG DALAM', text: 'Urusan administrasi jadi lebih cepat. Hemat biaya.', kind: 'gain', amount: 600_000, icon: '🤝' },
  { title: 'BONUS PRODUKTIF', text: 'Kerja keras terbayar dengan bonus kecil.', kind: 'gain', amount: 750_000, icon: '⭐' },
  { title: 'TAGIHAN LUPA', text: 'Ada tagihan lama yang baru ketahuan.', kind: 'lose', amount: 500_000, icon: '📨' },
  { title: 'SALAH TRANSFER', text: 'Uang terkirim ke rekening yang salah. Semoga balik.', kind: 'lose', amount: 400_000, icon: '📱' },
  { title: 'DANA DARURAT', text: 'Keluarga butuh bantuan mendadak.', kind: 'lose', amount: 700_000, icon: '🩹' },
  { title: 'CUTI DISETUJUI', text: 'Kamu bisa rehat dari hiruk-pikuk. Maju 2 langkah.', kind: 'move', amount: 2, icon: '🏖️' },
  { title: 'ANTRIAN BERKAS', text: 'Berkasmu tertahan. Masuk lapas administrasi.', kind: 'jail', icon: '🗃️' },
  { title: 'BONUS KOLABORASI', text: 'Teman tim membayar bagianmu yang tertunda.', kind: 'gain', amount: 400_000, icon: '🙌' },
];

const MISHAP_CARDS = [
  { title: 'BAN KENA PAKU', text: 'Tambal ban, beli kopi, tetap senyum.', kind: 'lose', amount: 350_000, icon: '🛵' },
  { title: 'PAJAK MENDADAK', text: 'Ada kewajiban administrasi yang terlupakan.', kind: 'lose', amount: 900_000, icon: '🧾' },
  { title: 'AC KANTOR RUSAK', text: 'Patungan perbaikan, katanya demi kenyamanan.', kind: 'lose', amount: 300_000, icon: '🥵' },
  { title: 'KENA TILANG', text: 'Dokumen kendaraan kurang lengkap. Bayar denda.', kind: 'lose', amount: 700_000, icon: '🚨' },
  { title: 'DOMPET TERTINGGAL', text: 'Balik arah dulu, ongkos jalan tetap jalan.', kind: 'lose', amount: 250_000, icon: '👛' },
  { title: 'UNDANGAN NIKAH', text: 'Amplop kondangan datang bertubi-tubi.', kind: 'lose', amount: 500_000, icon: '💌' },
  { title: 'TERJEBAK MACET', text: 'Makan di jalan dan isi bensin lebih banyak.', kind: 'lose', amount: 300_000, icon: '🚗' },
  { title: 'RAZIA ADMINISTRASI', text: 'Kamu harus ikut pemeriksaan tambahan.', kind: 'jail', icon: '🚓' },
  { title: 'BARANG PROMO', text: 'Beli karena diskon, padahal tidak perlu.', kind: 'lose', amount: 450_000, icon: '🛍️' },
  { title: 'KELUARGA DATANG', text: 'Traktir makan satu rombongan.', kind: 'lose', amount: 650_000, icon: '🍲' },
  { title: 'GAJI TELAT', text: 'Potong pengeluaran dan bayar biaya keterlambatan.', kind: 'lose', amount: 600_000, icon: '⏰' },
  { title: 'SANKSI BERKAS', text: 'Masuk ruang tunggu administrasi sampai urusan selesai.', kind: 'jail', icon: '📂' },
  { title: 'TANAH DISITA NEGARA', text: 'Lahanmu masuk jalur proyek tol. Jika punya properti, yang termahal disita dan berubah jadi kotak tol.', kind: 'seize', icon: '🛣️' },
];

/* ---- Presentation data (new) ---- */

// Embedded illustration crops from the project's own hero artwork (data URLs, no external dependency).
const IMG = {
  hero: './assets/nasib-art-02.webp',
  monas: './assets/nasib-art-03.webp', toll: './assets/nasib-art-04.webp', houses: './assets/nasib-art-05.webp', docs: './assets/nasib-art-06.webp',
  traffic: './assets/nasib-art-07.webp', money: './assets/nasib-art-01.webp', dice: './assets/nasib-art-08.webp', vendor: './assets/nasib-art-09.webp',
  man: './assets/nasib-art-10.webp', calc: './assets/nasib-art-11.webp',
  cover: './assets/nasib-art-12.webp', cards: './assets/nasib-art-13.webp', pawn: './assets/nasib-art-14.webp', board: './assets/nasib-art-15.webp', card: './assets/nasib-art-16.webp',
};

// Which embedded crop represents each special tile type.
const SPECIAL_TILE_IMG = { start: 'money', pungli: 'man', tax: 'calc', court: 'docs', toll: 'toll', tilang: 'traffic' };

/* Photo registry: tile name -> licensed photograph loaded from Wikimedia Commons.
   Only files whose license was verified are listed. If a photo fails to load (offline,
   blocked, moved), the tile automatically keeps its illustrated art. To add more photos,
   add one entry here with the file's Commons page, author and license. */
const CITY_PHOTOS = {
  Jakarta: {
    src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jakarta_Panorama.jpg?width=640',
    page: 'https://commons.wikimedia.org/wiki/File:Jakarta_Panorama.jpg',
    title: 'Jakarta Panorama (Monas dan pusat kota dari Masjid Istiqlal)',
    author: 'Gunawan Kartapranata', license: 'CC BY-SA 3.0',
  },
};

const REGION_ORDER = ['Papua', 'Kalimantan', 'Sulawesi', 'Sumatra', 'Jawa'];
const REGION_COLORS = { Papua: '#20a4a8', Kalimantan: '#54a56b', Sulawesi: '#a177cf', Sumatra: '#e0a13b', Jawa: '#de6d54' };

const TICKER_TEXT = ['Gaji numpang lewat', 'Tanah adalah aset', 'Musibah tak pernah cuti', 'Doa dan dadu', 'Antri dulu, urusan belakangan'];

/* =========================================================
   2. MOTION SYSTEM
   One small set of durations/easings and promise-based helpers on top of
   the Web Animations API. GSAP (if the CDN loaded) only enhances the hero
   intro; nothing in gameplay depends on it. Reduced-motion collapses
   every animation to an instant state change.
   ========================================================= */
const EASE = {
  out: 'cubic-bezier(.22,1,.36,1)', inOut: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.34,1.56,.64,1)',
  in: 'cubic-bezier(.64,0,.78,0)', linear: 'linear',
};
const DUR = { fast: 160, mid: 320, slow: 640, xl: 900 };

const Motion = {
  reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
  hasGsap() { return typeof window.gsap !== 'undefined' && window.gsap && typeof window.gsap.timeline === 'function'; },
  /** Animate and resolve when finished (or cancelled). Returns { anim, done }. */
  play(el, keyframes, opts = {}) {
    if (!el || typeof el.animate !== 'function') return { anim: null, done: Promise.resolve() };
    const o = { fill: 'both', easing: EASE.out, duration: DUR.mid, ...opts };
    if (Motion.reduced()) { o.duration = 1; o.delay = 0; }
    const anim = el.animate(keyframes, o);
    const done = anim.finished.then(() => anim, () => anim);
    return { anim, done };
  },
  /** Animate, then commit the end state into inline style and drop the animation layer. */
  async commit(el, keyframes, opts) {
    const { anim, done } = Motion.play(el, keyframes, opts);
    await done;
    if (anim && anim.playState === 'finished') { try { anim.commitStyles(); } catch (e) { /* element detached */ } anim.cancel(); }
  },
  sleep(ms) { return new Promise((resolve) => setTimeout(resolve, Motion.reduced() ? Math.min(ms, 30) : ms)); },
  /** Tween a number with rAF; returns a cancel function. */
  tween(from, to, ms, onUpdate, onDone) {
    if (Motion.reduced() || from === to) { onUpdate(to); if (onDone) onDone(); return () => {}; }
    const t0 = performance.now(); let raf = 0; let dead = false;
    const tick = (now) => {
      if (dead) return;
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      onUpdate(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else if (onDone) onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => { dead = true; cancelAnimationFrame(raf); };
  },
};

/* =========================================================
   3. ART — inline SVG generators (no external icon libraries)
   ========================================================= */
const INK = '#12162a';

/** Acrylic-standee style pawn, like the physical game's standing characters. */
function standeeSVG(i, color) {
  const skin = ['#b9774b', '#ecc6a4', '#a5683e', '#ecc6a4'][i % 4];
  const darker = shade(color, -28);
  let top = '';
  if (i % 4 === 0) top = `<path d="M10.5 17.5c-.5-8 5-12 10-12s10 3.8 9.5 12c-2-4-5-5.5-9.5-5.5s-7 1.5-10 5.5z" fill="#17120f" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (i % 4 === 1) top = `<path d="M6 36c0-13 3-30 14-30s14 17 14 30c-3-3-6-5-14-5s-11 2-14 5z" fill="#1b1b24" stroke="${INK}" stroke-width="1.2"/><ellipse cx="20" cy="20" rx="8.2" ry="9.4" fill="${skin}" stroke="${INK}" stroke-width="1.2"/>`;
  if (i % 4 === 2) top = `<path d="M10.5 16c0-6 4.5-9 9.5-9s9.5 3 9.5 9c-3-2.5-6-3-9.5-3s-6.5.5-9.5 3z" fill="#17120f" stroke="${INK}" stroke-width="1.2"/><path d="M4 11 20 5l16 6-16 6z" fill="#1c1c2a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M33 12v8" stroke="#f4c430" stroke-width="1.6" stroke-linecap="round"/>`;
  if (i % 4 === 3) top = `<path d="M10.5 15c0-4 3.5-6.5 9.5-6.5s9.5 2.5 9.5 6.5c-3-1.8-6-2.2-9.5-2.2s-6.5.4-9.5 2.2z" fill="#2a1a10" stroke="${INK}" stroke-width="1.2"/><path d="M10 12c-3.4-1.2-3-6.2.8-6.4C12 .8 17 1 18.2 4c2-2.6 6-2 6.6.8 3.6-.8 5.6 3.6 2.4 5.6.6 1-.2 2-1.2 2H10z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round" transform="translate(2 -1)"/>`;
  const face = i % 4 === 1 ? '' : `<circle cx="20" cy="20" r="9.6" fill="${skin}" stroke="${INK}" stroke-width="1.2"/>`;
  const faceDetail = `<circle cx="16.4" cy="20.4" r="1.15" fill="${INK}"/><circle cx="23.6" cy="20.4" r="1.15" fill="${INK}"/><path d="M17.4 24.2q2.6 1.6 5.2 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/><circle cx="14.4" cy="23" r="1.5" fill="#e87d7d" opacity=".5"/><circle cx="25.6" cy="23" r="1.5" fill="#e87d7d" opacity=".5"/>`;
  return `<svg viewBox="0 0 40 74" aria-hidden="true" focusable="false">
    <ellipse cx="20" cy="69" rx="17" ry="4.2" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.9)" stroke-width="1"/>
    <rect x="12" y="49" width="6.4" height="17" rx="2" fill="#2f4a7a" stroke="${INK}" stroke-width="1.2"/><rect x="21.6" y="49" width="6.4" height="17" rx="2" fill="#2f4a7a" stroke="${INK}" stroke-width="1.2"/>
    <rect x="11" y="63" width="8.6" height="4.4" rx="2" fill="#f5f5f0" stroke="${INK}" stroke-width="1.1"/><rect x="20.4" y="63" width="8.6" height="4.4" rx="2" fill="#f5f5f0" stroke="${INK}" stroke-width="1.1"/>
    <path d="M9 52V36c0-4 3-6.4 7-6.4h8c4 0 7 2.4 7 6.4v16z" fill="${color}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M14 30c1 4 4 5.2 6 5.2s5-1.2 6-5.2" fill="${darker}" stroke="${INK}" stroke-width="1.1"/>
    <path d="M13 46h14v5H13z" fill="${darker}" opacity=".55"/>
    <rect x="4" y="34" width="6" height="15" rx="3" fill="${color}" stroke="${INK}" stroke-width="1.2"/><rect x="30" y="34" width="6" height="15" rx="3" fill="${color}" stroke="${INK}" stroke-width="1.2"/>
    ${i % 4 === 1 ? top : ''}${face}${faceDetail}${i % 4 === 1 ? '' : top}
  </svg>`;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

/* ---- Property landmark illustrations (flat color + ink outline, matching the hero art) ---- */
const SKY = {
  Papua: ['#7fcfd2', '#d9f3ee', '#1b8f95'], Kalimantan: ['#a9dba3', '#eef6cc', '#3f8c57'], Sulawesi: ['#bba6ea', '#efe4ff', '#7a58b8'],
  Sumatra: ['#f3cf7e', '#fff0c6', '#c9871f'], Jawa: ['#f19a85', '#ffe3d2', '#c4503a'],
};
const LM_STROKE = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const LANDMARKS = {
  Jakarta: () => `<g ${LM_STROKE}><rect x="16" y="46" width="14" height="30" fill="#8aa0c8"/><rect x="32" y="36" width="12" height="40" fill="#a7b8d8"/><rect x="152" y="40" width="16" height="36" fill="#8aa0c8"/><rect x="170" y="52" width="14" height="24" fill="#a7b8d8"/><rect x="84" y="71" width="32" height="5" fill="#d9d4c4"/><polygon points="92,72 96,26 104,26 108,72" fill="#f3efe4"/><path d="M100 8c5 5 6 10 0 18-6-8-5-13 0-18z" fill="#f4c430"/></g>`,
  Yogyakarta: () => `<g ${LM_STROKE}><polygon points="10,76 62,28 116,76" fill="#8f8a9c"/><polygon points="44,50 62,28 70,38" fill="#b9b4c6" stroke="none"/><rect x="132" y="68" width="40" height="8" fill="#e9e1cf"/><polygon points="140,68 146,34 152,68" fill="#f4efe0"/><polygon points="152,68 158,24 164,68" fill="#f4efe0"/><rect x="92" y="64" width="12" height="12" fill="#f4efe0"/><polygon points="90,64 98,46 106,64" fill="#f4c430"/></g>`,
  Surabaya: () => `<g ${LM_STROKE}><rect x="14" y="48" width="18" height="28" fill="#9fb0d0"/><rect x="34" y="56" width="14" height="20" fill="#b9c6e0"/><rect x="156" y="44" width="16" height="32" fill="#9fb0d0"/><rect x="82" y="70" width="36" height="6" fill="#e6dfce"/><rect x="88" y="64" width="24" height="6" fill="#d9d1bc"/><path d="M93 64 96 20h8l3 44z" fill="#efe9d8"/><path d="M96 20l4-9 4 9z" fill="#d8352a"/></g>`,
  Padang: () => `<g ${LM_STROKE}><rect x="90" y="32" width="20" height="44" fill="#efe3c2"/><path d="M86 32 100 12l14 20z" fill="#d8352a"/><circle cx="100" cy="42" r="6" fill="#fff"/><path d="M100 42v-4m0 4 3 2" stroke-width="1.2"/><path d="M12 76V60c0-8 8-12 20-14-4-6 2-12 8-8 2-6 10-4 10 2 8 2 10 10 10 20v16z" fill="#c86a2a" transform="translate(110 0) scale(.82) translate(-6 8)"/><rect x="20" y="62" width="50" height="14" fill="#a64d1e"/><path d="M12 62c10 0 14-14 22-18 8 4 12 18 24 18z" fill="#d8352a"/></g>`,
  Medan: () => `<g ${LM_STROKE}><rect x="66" y="52" width="68" height="24" fill="#f1e8d2"/><path d="M76 52a24 24 0 0 1 48 0z" fill="#3e8e6b"/><path d="M100 22v8" /><circle cx="100" cy="20" r="2.4" fill="#f4c430"/><rect x="44" y="36" width="9" height="40" fill="#f1e8d2"/><path d="M42 36a6.5 6.5 0 0 1 13 0z" fill="#3e8e6b"/><rect x="147" y="36" width="9" height="40" fill="#f1e8d2"/><path d="M145 36a6.5 6.5 0 0 1 13 0z" fill="#3e8e6b"/><rect x="92" y="62" width="16" height="14" rx="8" fill="#12162a" stroke="none" opacity=".55"/></g>`,
  Palembang: () => `<g ${LM_STROKE}><rect x="0" y="70" width="200" height="30" fill="#5a7fb0" stroke="none"/><rect x="52" y="30" width="10" height="42" fill="#d8352a"/><rect x="138" y="30" width="10" height="42" fill="#d8352a"/><rect x="40" y="62" width="120" height="6" fill="#4b4f63"/><path d="M57 32Q100 70 143 32M57 32 40 62M143 32 160 62M57 32 78 62M143 32 122 62" fill="none" stroke-width="1.6"/></g>`,
  Makassar: () => `<g ${LM_STROKE}><rect x="0" y="66" width="200" height="34" fill="#4aa0b8" stroke="none"/><circle cx="150" cy="40" r="14" fill="#ffd95e" stroke="none"/><path d="M40 68h70l-8 8H48z" fill="#7a4a24"/><path d="M76 66V18l24 44z" fill="#f4efe0"/><path d="M72 66V28L48 62z" fill="#f4efe0"/><path d="M76 66V12" stroke-width="1.6"/><path d="M126 70h40l-5 6h-30z" fill="#7a4a24"/><path d="M146 69V44l14 24z" fill="#d8352a"/></g>`,
  Manado: () => `<g ${LM_STROKE}><rect x="0" y="68" width="200" height="32" fill="#2f95b8" stroke="none"/><path d="M40 68 92 22l52 46z" fill="#4e7a52"/><path d="M82 32 92 22l10 10z" fill="#e7e4d6" stroke="none"/><path d="M26 74c0-14 2-24 6-34m0 0c-8 0-12 4-14 8m14-8c6-2 11 0 13 4m-13-4c-2-5 0-9 4-10m-4 10c-5-3-10-2-14 2" fill="none" stroke-width="1.8"/><path d="M168 74c0-12 1-22 4-30m0 0c-7 0-10 3-12 7m12-7c5-2 9 0 11 3" fill="none" stroke-width="1.8"/></g>`,
  Kendari: () => `<g ${LM_STROKE}><rect x="0" y="70" width="200" height="30" fill="#5bb0c9" stroke="none"/><path d="M0 70 30 44l30 26zM140 70l24-30 36 30z" fill="#6e9b6a"/><path d="M52 72Q100 18 148 72" fill="none" stroke="#d8352a" stroke-width="4"/><path d="M52 72Q100 18 148 72" fill="none" stroke-width="1.2"/><path d="M62 62v10M76 49v23M92 41v31M108 41v31M124 49v23M138 62v10" stroke-width="1.1"/><rect x="40" y="71" width="120" height="4" fill="#4b4f63"/></g>`,
  Pontianak: () => `<g ${LM_STROKE}><path d="M0 74h200" stroke-width="1.4"/><path d="M0 74h200" stroke="#d8352a" stroke-width="3" opacity=".6" stroke-dasharray="6 5"/><rect x="88" y="42" width="24" height="32" fill="#efe6cf"/><circle cx="100" cy="36" r="13" fill="#4a8fd0"/><path d="M87 36h26M100 23c-6 6-6 20 0 26M100 23c6 6 6 20 0 26" fill="none" stroke-width="1.1"/><path d="M100 10v8m-4-4 4-4 4 4" fill="none" stroke-width="1.6"/></g>`,
  Balikpapan: () => `<g ${LM_STROKE}><rect x="0" y="70" width="200" height="30" fill="#3f9fb0" stroke="none"/><rect x="30" y="48" width="14" height="28" fill="#c9ccd6"/><rect x="50" y="36" width="10" height="40" fill="#e1e3ea"/><path d="M55 36c-4-6 0-9 0-14 5 4 5 9 0 14z" fill="#f4a62a"/><rect x="74" y="56" width="30" height="20" rx="4" fill="#e1e3ea"/><rect x="108" y="56" width="30" height="20" rx="4" fill="#d3d6df"/><path d="M146 76V46h6v30m0-24h14m-8 0v24" fill="none"/><rect x="164" y="40" width="22" height="8" fill="#d8352a"/></g>`,
  Banjarmasin: () => `<g ${LM_STROKE}><rect x="0" y="58" width="200" height="42" fill="#7a6a3a" stroke="none"/><path d="M14 74h60q-8 9-22 9H28q-10 0-14-9z" fill="#8a4b22"/><path d="M92 70h70q-8 9-26 9h-20q-16 0-24-9z" fill="#a8602c"/><path d="M34 54l12-14 12 14z" fill="#f2d46a"/><path d="M114 50l14-16 14 16z" fill="#f2d46a"/><path d="M118 70c0-8 2-12 6-14M52 74c0-8 2-12 6-14" fill="none"/><circle cx="168" cy="28" r="10" fill="#ffd95e" stroke="none"/></g>`,
  Sorong: () => `<g ${LM_STROKE}><rect x="0" y="62" width="200" height="38" fill="#2bb6bd" stroke="none"/><path d="M24 66c-8 0-10-6-4-10 0-8 10-10 14-4 6-4 14 0 12 8 4 2 2 6-2 6z" fill="#5f8a4b"/><path d="M92 68c-10 0-12-8-5-12 0-10 12-12 16-5 8-4 16 2 13 10 4 2 2 7-3 7z" fill="#5f8a4b"/><path d="M148 66c-7 0-9-5-4-8 0-7 8-8 11-3 5-3 11 1 9 7 3 1 1 4-2 4z" fill="#5f8a4b"/><path d="M16 66h46M88 68h44M140 66h44" stroke="#e8fffb" stroke-width="1.6" opacity=".7" fill="none"/></g>`,
  Jayapura: () => `<g ${LM_STROKE}><rect x="0" y="72" width="200" height="28" fill="#2e9ec2" stroke="none"/><path d="M0 74 34 38l24 22 30-34 34 36 24-18 54 30z" fill="#4f7d5b"/><path d="M80 34 88 26l8 10z" fill="#e7e4d6" stroke="none"/><path d="M50 78Q100 40 150 78" fill="none" stroke="#d8352a" stroke-width="3.4"/><rect x="44" y="76" width="112" height="3" fill="#4b4f63"/></g>`,
  Manokwari: () => `<g ${LM_STROKE}><path d="M0 76 40 44l40 32 40-36 40 36 40-20v40H0z" fill="#4d8456"/><circle cx="160" cy="26" r="9" fill="#ffd95e" stroke="none"/><path d="M52 64c10-10 26-6 34-14 2 4-2 10-8 12 8 0 14-4 18-10 0 8-6 14-14 16 8 4 18 2 24-4-2 8-10 12-20 12-10 2-22 0-34-12z" fill="#d8352a" transform="translate(-10 -6) scale(.95)"/><circle cx="53" cy="55" r="3.4" fill="#f4c430"/><path d="M92 52c8 6 22 6 34 2" fill="none" stroke="#f4c430" stroke-width="2"/></g>`,
};
function propertyArtSVG(tile) {
  const [s1, s2, ground] = SKY[tile.region] || SKY.Jawa;
  const lm = (LANDMARKS[tile.name] || (() => ''))();
  return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="200" height="100" fill="${s1}"/><rect y="40" width="200" height="60" fill="${s2}" opacity=".75"/>
    <ellipse cx="38" cy="22" rx="16" ry="5" fill="#fff" opacity=".8"/><ellipse cx="170" cy="14" rx="14" ry="4" fill="#fff" opacity=".7"/>
    <rect y="76" width="200" height="24" fill="${ground}"/>${lm}
  </svg>`;
}
function cardArtSVG(type) {
  if (type === 'fate') return `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="200" height="120" fill="#1e4c9d"/>
    <g fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" opacity=".95"><g transform="translate(46 30) rotate(-12 28 28)"><rect width="56" height="56" rx="10"/><circle cx="16" cy="16" r="3.4" fill="#fff"/><circle cx="40" cy="40" r="3.4" fill="#fff"/><circle cx="28" cy="28" r="3.4" fill="#fff"/></g><g transform="translate(112 44) rotate(14 24 24)"><rect width="48" height="48" rx="9"/><circle cx="14" cy="14" r="3" fill="#fff"/><circle cx="34" cy="14" r="3" fill="#fff"/><circle cx="14" cy="34" r="3" fill="#fff"/><circle cx="34" cy="34" r="3" fill="#fff"/></g></g>
    <g fill="#ffd95e"><path d="M20 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M176 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M168 96l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g></svg>`;
  return `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="200" height="120" fill="#e0572a"/>
    <g fill="none" stroke="#ffb15a" stroke-width="2" opacity=".75"><circle cx="100" cy="62" r="54"/><circle cx="100" cy="62" r="44"/><circle cx="100" cy="62" r="34"/></g>
    <circle cx="100" cy="62" r="30" fill="#ff8a2a" stroke="#fff3b0" stroke-width="2.4"/>
    <circle cx="89" cy="56" r="6.5" fill="#fff6c2"/><circle cx="111" cy="56" r="6.5" fill="#fff6c2"/><circle cx="89" cy="56" r="2.6" fill="#c4331f"/><circle cx="111" cy="56" r="2.6" fill="#c4331f"/>
    <path d="M90 76q10 7 20 0" fill="none" stroke="#fff3b0" stroke-width="2.4" stroke-linecap="round"/></svg>`;
}
function jailArtSVG() {
  return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="200" height="100" fill="#4a5070"/><rect width="200" height="100" fill="#8a90ad" opacity=".25"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${12 + i * 21}" y="0" width="8" height="100" fill="#1a1d30"/><rect x="${12 + i * 21}" y="0" width="2.6" height="100" fill="#6d7498"/>`).join('')}<rect y="40" width="200" height="8" fill="#1a1d30"/></svg>`;
}
function startArtSVG() {
  return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="200" height="100" fill="#ffd95e"/><path d="M0 70 200 30v70H0z" fill="#f4a62a"/><g fill="#12162a"><path d="M30 50h120l-18-18m18 18-18 18" fill="none" stroke="#12162a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}
const TILE_ICON_PATHS = { // tiny 24x24 icons for compact tile mode and legends
  house: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z', coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m-3-7h5a2 2 0 0 1 0 4H9',
};
function houseIcon(color = '#d8352a') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 11.5 12 3l9.5 8.5H19V21H5v-9.5z" fill="${color}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="7" fill="#fff" stroke="${INK}" stroke-width="1.4"/></svg>`;
}

/** Thumbnail markup for a tile: illustrated art, or an embedded crop, plus an optional licensed photo layer. */
function tileThumbHTML(tile) {
  let base = '';
  if (tile.type === 'property') base = propertyArtSVG(tile);
  else if (tile.type === 'fate' || tile.type === 'mishap') base = cardArtSVG(tile.type);
  else if (tile.type === 'jail') base = jailArtSVG();
  else if (tile.type === 'start') base = startArtSVG();
  else if (SPECIAL_TILE_IMG[tile.type]) base = `<img src="${IMG[SPECIAL_TILE_IMG[tile.type]]}" alt="" loading="lazy" decoding="async" draggable="false">`;
  const photo = tile.type === 'property' && CITY_PHOTOS[tile.name]
    ? `<img data-photo src="${CITY_PHOTOS[tile.name].src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false">` : '';
  return base + photo;
}

/* ---- Dice markup ---- */
const PIP_COUNTS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
function dieHTML() {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => `<div class="die-face f${n}">${'<i></i>'.repeat(PIP_COUNTS[n])}</div>`).join('');
  return `<div class="die"><div class="die-shadow"></div><div class="die-cube">${faces}</div></div>`;
}

/* =========================================================
   4. GAME STATE
   ========================================================= */
const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value).replace('IDR', 'Rp').replace(/\u00a0/g, '');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function formatShort(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return String(value);
}

const state = {
  players: [], current: 0, turnCount: 0, round: 1, assets: [],
  awaiting: false, busy: false, ended: false, extraTurn: false,
  doubleStreak: 0, pendingBuy: null, cardOpen: false, dice: [0, 0],
  log: [], lastRollText: 'Giliranmu, lempar dadu.', started: false, stateSeized: new Set(),
  runId: 0, // bumped on every new game; async work from an older game checks it and stops
};

/* The engine never touches the DOM. Everything visual goes through these hooks,
   which the UI layer (sections 6-9) replaces at startup. */
const Hooks = {
  render() {}, animateDice: async () => {}, step: async () => {}, showCard() {}, gameOver() {},
  gameStarted() {}, announce() {}, flashTile() {},
};

/* =========================================================
   5. GAME RULES & ENGINE
   (same rules as the original; DOM calls replaced by Hooks)
   ========================================================= */
function getCurrentPlayer() { return state.players[state.current]; }
function alivePlayers() { return state.players.filter((player) => player.alive); }
function activePropertyCount(playerId) { return state.assets.filter((asset) => asset && asset.ownerId === playerId).length; }
function addLog(message, type = 'normal') {
  state.log.unshift({ message, type, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) });
  state.log = state.log.slice(0, 7);
}
function regionComplete(playerId, region) {
  const members = BOARD.map((tile, index) => ({ tile, index })).filter(({ tile }) => tile.type === 'property' && tile.region === region);
  return members.length > 0 && members.every(({ index }) => state.assets[index]?.ownerId === playerId);
}
function canBuildAtCurrent() {
  const player = getCurrentPlayer();
  const tile = BOARD[player?.pos];
  const asset = state.assets[player?.pos];
  return Boolean(player?.alive && tile?.type === 'property' && asset?.ownerId === player.id && regionComplete(player.id, tile.region) && asset.houses < MAX_HOUSES);
}
function rentFor(index) {
  const tile = BOARD[index]; const asset = state.assets[index];
  return Math.round(tile.rent * (1 + (asset ? asset.houses : 0) * 1.2));
}

function payAmount(player, amount, receiver = null, reason = 'pembayaran') {
  if (!player?.alive || amount <= 0) return false;
  window.NasibAudio?.play('cash-out');
  if (player.money < amount) {
    bankrupt(player, `${reason} sebesar ${money(amount)} tak terbayar`);
    return false;
  }
  player.money -= amount;
  const receiverPlayer = receiver ? state.players.find((p) => p.id === receiver && p.alive) : null;
  if (receiverPlayer) receiverPlayer.money += amount;
  addLog(`${player.name} membayar ${money(amount)} untuk ${reason}${receiverPlayer ? ` ke ${receiverPlayer.name}` : ''}.`, 'bad');
  return true;
}
function bankrupt(player, reason) {
  player.money = 0;
  player.alive = false;
  player.jailed = false;
  player.jailTurns = 0;
  state.assets.forEach((asset) => { if (asset?.ownerId === player.id) { asset.ownerId = null; asset.houses = 0; } });
  addLog(`${player.name} bangkrut: ${reason}. Semua propertinya kembali ke bank.`, 'bad');
  Hooks.announce(`${player.name} bangkrut.`);
}
function collectAmount(player, amount, reason) {
  if (!player?.alive) return;
  window.NasibAudio?.play('cash-in');
  player.money += amount;
  addLog(`${player.name} menerima ${money(amount)} (${reason}).`, 'good');
}
function sendToJail(player, reason = 'urusan administrasi') {
  window.NasibAudio?.play('jail');
  player.jailed = true; player.jailTurns = 0; player.pos = BOARD.findIndex((tile) => tile.type === 'jail'); state.doubleStreak = 0; state.extraTurn = false;
  addLog(`${player.name} masuk lapas karena ${reason}.`, 'bad');
  Hooks.announce(`${player.name} masuk lapas.`);
}
/** Moves one tile at a time. Salary is paid exactly when the pawn wraps onto START, as in the original. */
async function movePlayer(player, steps) {
  const run = state.runId;
  for (let step = 0; step < steps; step++) {
    if (!player.alive || run !== state.runId) break;
    const previous = player.pos;
    player.pos = (player.pos + 1) % BOARD.length;
    const paidSalary = player.pos === 0 && previous !== 0;
    if (paidSalary) collectAmount(player, START_SALARY, 'gajian lewat START');
    await Hooks.step(player, player.pos, { paidSalary });
  }
}
function drawCard(type) {
  const deck = type === 'fate' ? FATE_CARDS : MISHAP_CARDS;
  return deck[Math.floor(Math.random() * deck.length)];
}
function applyCard(player, card, type) {
  const cardType = type === 'fate' ? 'TAKDIR' : 'MUSIBAH';
  let specialImpact = null;
  if (card.kind === 'gain') collectAmount(player, card.amount, card.title);
  else if (card.kind === 'lose') payAmount(player, card.amount, null, card.title);
  else if (card.kind === 'move') {
    const oldPos = player.pos;
    player.pos = (player.pos + card.amount) % BOARD.length;
    if (player.pos < oldPos) collectAmount(player, START_SALARY, 'gajian dari START');
    addLog(`${player.name} maju ${card.amount} langkah dari kartu takdir.`, 'good');
  } else if (card.kind === 'jail') sendToJail(player, card.title);
  else if (card.kind === 'seize') {
    const ownedTiles = BOARD.map((tile, index) => ({ tile, index, asset: state.assets[index] }))
      .filter(({ tile, index, asset }) => tile.type === 'property' && asset?.ownerId === player.id && !state.stateSeized.has(index))
      .sort((a, b) => b.tile.price - a.tile.price);
    if (ownedTiles.length) {
      const seized = ownedTiles[0];
      seized.asset.ownerId = null; seized.asset.houses = 0; state.stateSeized.add(seized.index);
      addLog(`Negara menyita ${seized.tile.name} milik ${player.name} untuk proyek tol.`, 'bad');
      specialImpact = 'SATU LAHAN DISITA NEGARA';
      Hooks.flashTile(seized.index);
    } else {
      payAmount(player, SEIZE_FALLBACK_FEE, null, 'biaya proyek tol');
      specialImpact = 'BAYAR BIAYA PROYEK TOL';
    }
  }
  let impact; let impactClass = '';
  if (card.kind === 'gain') { impact = `+ ${money(card.amount)}`; impactClass = 'pos'; }
  else if (card.kind === 'lose') { impact = `− ${money(card.amount)}`; impactClass = 'neg'; }
  else if (card.kind === 'move') { impact = `MAJU ${card.amount} LANGKAH`; impactClass = 'pos'; }
  else if (card.kind === 'seize') { impact = specialImpact || 'LAHAN DISITA NEGARA'; impactClass = 'neg'; }
  else { impact = 'MASUK LAPAS'; impactClass = 'neg'; }
  addLog(`${player.name} menarik kartu ${cardType.toLowerCase()}: ${card.title}.`, type === 'fate' ? 'good' : 'bad');
  state.awaiting = true;
  state.cardOpen = true;
  Hooks.showCard({ card, type, cardType, impact, impactClass });
}
function resolveSpace(player) {
  if (!player.alive) { state.awaiting = true; return; }
  const index = player.pos;
  const tile = BOARD[index];
  const asset = state.assets[index];
  state.pendingBuy = null;
  if (tile.type === 'start') {
    addLog(`${player.name} berhenti di START. Gaji sudah dihitung saat melintasi kotak ini.`, 'good');
  } else if (tile.type === 'property' && state.stateSeized.has(index)) {
    payAmount(player, SEIZED_TOLL, null, 'biaya jalur tol di lahan sitaan');
    addLog(`${player.name} melewati lahan yang diambil alih negara.`, 'bad');
  } else if (tile.type === 'property') {
    if (!asset.ownerId) {
      if (player.money >= tile.price) {
        state.pendingBuy = index;
        state.awaiting = true;
        addLog(`${player.name} tiba di ${tile.name}. Tanah ini masih kosong.`, 'normal');
        return;
      }
      addLog(`${player.name} tidak punya cukup saldo untuk membeli ${tile.name}.`, 'bad');
    } else if (asset.ownerId === player.id) {
      addLog(`${player.name} mampir ke tanah sendiri di ${tile.name}.`, 'normal');
    } else {
      const owner = state.players.find((p) => p.id === asset.ownerId);
      const rent = Math.round(tile.rent * (1 + asset.houses * 1.2));
      const receiver = owner?.alive && !owner.jailed ? owner.id : null;
      payAmount(player, rent, receiver, `sewa ${tile.name}${asset.houses ? ` (${asset.houses} rumah)` : ''}`);
    }
  } else if (tile.type === 'fate' || tile.type === 'mishap') {
    const card = drawCard(tile.type);
    applyCard(player, card, tile.type);
    Hooks.render();
    return;
  } else if (tile.type === 'jail') {
    sendToJail(player, 'mendarat di kotak lapas');
  } else if (tile.type === 'tax') payAmount(player, tile.amount, null, 'pajak tahunan');
  else if (tile.type === 'pungli') payAmount(player, PUNGLI_FEE, null, 'biaya pungli');
  else if (tile.type === 'toll') payAmount(player, tile.amount, null, 'tarif jalan tol');
  else if (tile.type === 'tilang') payAmount(player, tile.amount, null, 'denda tilang');
  else if (tile.type === 'court') payAmount(player, tile.amount, null, 'biaya pengadilan');
  state.awaiting = true;
  addLog(`${player.name} berhenti di kotak ${tile.name}.`, 'normal');
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);

/** One full roll. `busy` stays true until the whole movement + resolution has finished,
    so a second click (or a duplicated callback) can never start another roll mid-turn. */
async function rollDice() {
  const player = getCurrentPlayer();
  if (state.busy || state.awaiting || state.ended || state.cardOpen || !player?.alive) return;
  const run = state.runId;
  state.busy = true;
  Hooks.render();
  try {
    window.NasibAudio?.play('dice');
    const one = rollDie();
    const two = rollDie();                       // the real result comes from game logic...
    await Hooks.animateDice(one, two);           // ...and the animation is told where to land.
    if (run !== state.runId) return;
    state.dice = [one, two];
    const total = one + two;
    state.lastRollText = `${one} + ${two} = ${total}`;
    Hooks.announce(`${player.name} melempar dadu: ${one} dan ${two}, total ${total}.`);
    addLog(`${player.name} melempar dadu: ${one} + ${two}.`, 'normal');
    Hooks.render();

    if (player.jailed) {
      if (one === two) {
        player.jailed = false; player.jailTurns = 0;
        addLog(`${player.name} mendapat angka kembar dan bebas dari lapas!`, 'good');
        await movePlayer(player, total);
        if (run !== state.runId) return;
        resolveSpace(player);
      } else {
        player.jailTurns += 1;
        state.awaiting = true;
        state.lastRollText = `Belum beruntung. Percobaan ${player.jailTurns}/3.`;
        addLog(`${player.name} gagal mendapat angka kembar.`, 'bad');
        if (player.jailTurns >= 3) {
          if (player.money >= JAIL_BAIL) {
            player.money -= JAIL_BAIL; player.jailed = false; player.jailTurns = 0;
            addLog(`${player.name} membayar jaminan ${money(JAIL_BAIL)} setelah tiga percobaan.`, 'bad');
          } else bankrupt(player, 'tidak mampu membayar jaminan lapas');
        }
      }
    } else {
      if (one === two) state.doubleStreak += 1; else state.doubleStreak = 0;
      if (state.doubleStreak >= 3) {
        state.lastRollText = 'Tiga kali kembar. Langsung lapas!';
        sendToJail(player, 'tiga kali mendapat angka kembar berturut-turut');
        state.awaiting = true;
      } else {
        state.extraTurn = one === two;
        await movePlayer(player, total);
        if (run !== state.runId) return;
        resolveSpace(player);
      }
    }
    state.awaiting = true;
    if (!player.alive) state.extraTurn = false;
  } finally {
    if (run === state.runId) { state.busy = false; Hooks.render(); }
  }
}
function buyProperty() {
  const player = getCurrentPlayer();
  const index = state.pendingBuy;
  if (state.busy || !player?.alive || index === null) return;
  const tile = BOARD[index];
  if (player.money < tile.price) return;
  player.money -= tile.price;
  window.NasibAudio?.play('purchase');
  state.assets[index].ownerId = player.id;
  addLog(`${player.name} membeli ${tile.name} seharga ${money(tile.price)}.`, 'good');
  state.pendingBuy = null;
  Hooks.flashTile(index);
  Hooks.announce(`${player.name} membeli ${tile.name} seharga ${money(tile.price)}.`);
  Hooks.render();
}
function buildHouse() {
  const player = getCurrentPlayer();
  if (state.busy || !player?.alive || !canBuildAtCurrent() || player.money < HOUSE_COST) return;
  const tile = BOARD[player.pos];
  player.money -= HOUSE_COST;
  window.NasibAudio?.play('build');
  state.assets[player.pos].houses += 1;
  addLog(`${player.name} membangun rumah di ${tile.name} seharga ${money(HOUSE_COST)}.`, 'good');
  Hooks.flashTile(player.pos);
  Hooks.announce(`${player.name} membangun rumah di ${tile.name}.`);
  Hooks.render();
}
function continueTurn() {
  if (!state.awaiting || state.cardOpen || state.busy || state.ended) return;
  state.awaiting = false;
  state.pendingBuy = null;
  const current = getCurrentPlayer();
  if (checkGameOver()) return;
  if (current?.alive && state.extraTurn) {
    state.extraTurn = false;
    state.round = Math.floor(state.turnCount / Math.max(1, state.players.length)) + 1;
    state.lastRollText = 'Giliran bonus! Lempar dadu lagi.';
    Hooks.render();
    scheduleComputerTurn(360);
    return;
  }
  state.extraTurn = false;
  state.doubleStreak = 0;
  let next = state.current;
  for (let attempt = 0; attempt < state.players.length; attempt++) {
    next = (next + 1) % state.players.length;
    if (state.players[next].alive) break;
  }
  state.current = next;
  state.turnCount += 1;
  state.round = Math.floor(state.turnCount / Math.max(1, state.players.length)) + 1;
  state.lastRollText = state.players[next].jailed ? 'Kamu di lapas. Coba lempar angka kembar.' : 'Giliranmu, lempar dadu.';
  Hooks.announce(`Giliran ${state.players[next].name}.`);
  Hooks.render();
  checkGameOver();
  scheduleComputerTurn(420);
}
function checkGameOver() {
  if (!state.started || state.ended) return state.ended;
  const active = alivePlayers();
  if (active.length > 1) return false;
  state.ended = true;
  state.busy = false;
  state.awaiting = true;
  Hooks.gameOver(active[0] || null);
  Hooks.render();
  return true;
}
function resetGame(names) {
  state.runId += 1;
  state.players = names.map((name, index) => ({
    id: `p${index + 1}`, name: name.slice(0, 18), token: PLAYER_COLORS[index].token,
    color: PLAYER_COLORS[index].color, money: STARTING_MONEY, pos: 0,
    jailed: false, jailTurns: 0, alive: true, isAI: index > 0, aiDifficulty: setupState.difficulty,
  }));
  state.current = 0; state.turnCount = 0; state.round = 1;
  state.assets = BOARD.map((tile) => tile.type === 'property' ? { ownerId: null, houses: 0 } : null);
  state.stateSeized = new Set();
  state.awaiting = false; state.busy = false; state.ended = false;
  state.extraTurn = false; state.doubleStreak = 0; state.pendingBuy = null;
  state.cardOpen = false; state.dice = [0, 0]; state.log = []; state.started = true;
  state.lastRollText = 'Giliranmu, lempar dadu.';
  addLog(`Permainan dimulai. ${state.players[0].name} mendapat giliran pertama.`, 'good');
}
function payBail() {
  const player = getCurrentPlayer();
  if (state.busy || !player?.alive || !player.jailed || player.money < JAIL_BAIL || state.awaiting) return;
  player.money -= JAIL_BAIL; player.jailed = false; player.jailTurns = 0;
  addLog(`${player.name} membayar jaminan ${money(JAIL_BAIL)} dan bebas dari lapas.`, 'bad');
  state.lastRollText = 'Bebas! Giliranmu masih berjalan.';
  state.awaiting = true;
  Hooks.render();
}
function handleAction(action) {
  if (action === 'roll') rollDice();
  else if (action === 'buy') buyProperty();
  else if (action === 'skip-buy') { if (!state.busy) { state.pendingBuy = null; Hooks.render(); } }
  else if (action === 'build') buildHouse();
  else if (action === 'continue') continueTurn();
  else if (action === 'bail') payBail();
}

/* Computer opponents: use the same local game actions/rules; never control dice outcome. */
const AI_THINKING_LINES={staff:['Meninjau berkas pengadaan...','Menghitung anggaran dasar...','Menunggu arahan fraksi...'],cabinet:['Menganalisis kelayakan aset...','Menjaga disiplin likuiditas...','Mengevaluasi potensi pendapatan sewa...'],oligarch:['Menghitung konsentrasi aset...','Memetakan risiko pasar...','Menetapkan strategi akuisisi...']};
const waitAI=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function aiReserve(p) {
  return calculateAIReserve(p, AI_LEVELS[p.aiDifficulty] || AI_LEVELS.cabinet);
}
function aiPurchaseDecision(p, i) {
  return evaluatePropertyPurchase({
    player: p,
    tile: BOARD[i],
    index: i,
    board: BOARD,
    assets: state.assets,
    profile: AI_LEVELS[p.aiDifficulty] || AI_LEVELS.cabinet,
    difficulty: p.aiDifficulty,
    reserve: aiReserve(p),
  });
}
function aiShouldBuy(p, i) { return aiPurchaseDecision(p, i).shouldBuy; }
function aiShouldBuild(p) {
  if (!canBuildAtCurrent()) return false;
  const index = p?.pos;
  const tile = BOARD[index];
  const asset = state.assets[index];
  return evaluateHouseInvestment({
    player: p,
    tile,
    asset,
    profile: AI_LEVELS[p.aiDifficulty] || AI_LEVELS.cabinet,
    difficulty: p.aiDifficulty,
    reserve: aiReserve(p),
    houseCost: HOUSE_COST,
    maxHouses: MAX_HOUSES,
    completeRegion: Boolean(tile?.region && regionComplete(p.id, tile.region)),
    round: state.round,
  }).shouldBuild;
}
function scheduleComputerTurn(delay=420){if(aiTimer)clearTimeout(aiTimer);const token=++aiScheduleToken,runId=state.runId,p=getCurrentPlayer();if(!state.started||state.ended||!p?.alive||!p.isAI)return;aiTimer=setTimeout(()=>runComputerTurn(token,runId),delay);}
async function runComputerTurn(token,runId){if(aiRunning||token!==aiScheduleToken||runId!==state.runId)return;const p=getCurrentPlayer();if(!state.started||state.ended||!p?.alive||!p.isAI)return;if(state.busy||state.cardOpen){scheduleComputerTurn(300);return;}aiRunning=true;try{const l=AI_LEVELS[p.aiDifficulty]||AI_LEVELS.cabinet;if(!state.awaiting){const arr=AI_THINKING_LINES[p.aiDifficulty]||AI_THINKING_LINES.cabinet,line=arr[(state.turnCount+p.pos+p.id.length)%arr.length];state.lastRollText=line;Hooks.render();window.NasibAudio?.speak(line,p.aiDifficulty);await waitAI(l.think);if(token!==aiScheduleToken||runId!==state.runId||getCurrentPlayer()?.id!==p.id)return;if(p.jailed&&p.money-JAIL_BAIL>=Math.max(500000,aiReserve(p)))payBail();else await rollDice();}if(token!==aiScheduleToken||runId!==state.runId||getCurrentPlayer()?.id!==p.id)return;if(state.cardOpen||state.busy||state.ended)return;if(state.pendingBuy!==null){const i=state.pendingBuy;const decision=aiPurchaseDecision(p,i);if(decision.shouldBuy){addLog(p.name+' menyetujui akuisisi '+BOARD[i].name+': '+decision.reason+' ('+l.label+').','good');buyProperty();}else{addLog(p.name+' melewatkan akuisisi '+BOARD[i].name+': '+decision.reason+'.','normal');state.pendingBuy=null;Hooks.render();}await waitAI(260);}if(state.awaiting&&!state.pendingBuy&&!state.cardOpen&&!state.busy&&!state.ended){if(aiShouldBuild(p)){addLog(p.name+' memutuskan investasi rumah berdasarkan nilai sewa.','good');buildHouse();await waitAI(260);}if(state.awaiting&&!state.cardOpen&&!state.busy&&!state.ended)continueTurn();}}catch(err){console.error('NASIB +62 AI turn error:',err);if(runId===state.runId&&getCurrentPlayer()?.id===p.id&&state.awaiting&&!state.busy&&!state.cardOpen&&!state.ended)continueTurn();}finally{aiRunning=false;if(runId===state.runId&&state.started&&!state.ended&&getCurrentPlayer()?.isAI&&!state.cardOpen&&!state.busy)scheduleComputerTurn(360);}}

/* =========================================================
   6. RENDERING — board, pawns, panels
   ========================================================= */
const ui = {
  shownMoney: {},          // balance currently displayed per player (tweens toward the real balance)
  tweenCancel: {},
  pawnPos: {},             // tile index each pawn is drawn at
  inspected: null,         // tile index shown in the inspector (null = follow current player)
  lastCurrent: -1,
  boardBuilt: false,
  moveChain: Promise.resolve(),
};
const BOARD_COORDS = (() => {
  const c = [];
  for (let col = 1; col <= 8; col++) c.push([1, col]);
  for (let row = 2; row <= 8; row++) c.push([row, 8]);
  for (let col = 7; col >= 1; col--) c.push([8, col]);
  for (let row = 7; row >= 2; row--) c.push([row, 1]);
  return c;
})();
const tileAccent = (type) => ({ start: '#e3ad2f', fate: '#2b63c4', mishap: '#e0572a', jail: '#686d7e', tax: '#c6a15b', toll: '#c6a15b', tilang: '#d86c55', pungli: '#c6a15b', court: '#c6a15b', property: '#58a273' })[type] || '#d7cdb7';
const tileLabel = (tile) => (tile.type === 'fate' || tile.type === 'mishap') ? tile.name.replace('KARTU ', '') : tile.name;
const tileEl = (index) => document.querySelector(`[data-tile="${index}"]`);
const playerById = (id) => state.players.find((p) => p.id === id);
const playerIndex = (id) => state.players.findIndex((p) => p.id === id);
const standeeHTML = (index, color) => `<span class="standee">${standeeSVG(index, color)}</span>`;

function buildBoard() {
  const board = $('#board');
  $$('.tile', board).forEach((n) => n.remove());
  const frag = document.createDocumentFragment();
  BOARD.forEach((tile, index) => {
    const [row, col] = BOARD_COORDS[index];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tile ${tile.type === 'property' ? 'prop' : 'special'} ${tile.type}`;
    el.dataset.tile = String(index);
    el.style.gridRow = String(row); el.style.gridColumn = String(col);
    el.setAttribute('aria-label', `${tile.name}${tile.region ? ', ' + tile.region : ''}. Ketuk untuk melihat detail.`);
    el.innerHTML = `<span class="band" style="background:${tile.color || tileAccent(tile.type)}"></span>
      <span class="thumb">${tileThumbHTML(tile)}</span>
      <span class="meta"><span class="nm">${escapeHTML(tileLabel(tile))}</span><span class="sub">${escapeHTML(tile.region || tile.subtitle || '')}</span><span class="pr"></span></span>
      <span class="own"></span>`;
    frag.appendChild(el);
  });
  board.insertBefore(frag, $('#boardCore'));
  ui.boardBuilt = true;
}

function renderBoard() {
  const cur = getCurrentPlayer();
  BOARD.forEach((tile, index) => {
    const node = tileEl(index);
    if (!node) return;
    const asset = state.assets[index];
    const seized = state.stateSeized.has(index);
    node.classList.toggle('is-current', Boolean(cur?.alive && cur.pos === index));
    node.classList.toggle('is-seized', seized);
    const band = $('.band', node);
    const owner = asset?.ownerId ? playerById(asset.ownerId) : null;
    band.style.background = seized ? '' : (owner ? owner.color : (tile.color || tileAccent(tile.type)));
    $('.nm', node).textContent = seized ? 'LAHAN DISITA' : tileLabel(tile);
    $('.sub', node).textContent = seized ? 'Jalur tol' : (tile.region || tile.subtitle || '');
    $('.pr', node).textContent = seized ? formatShort(SEIZED_TOLL) : (tile.type === 'property' ? formatShort(tile.price) : (tile.type === 'start' ? `+${formatShort(START_SALARY)}` : (tile.amount ? formatShort(tile.amount) : (tile.type === 'pungli' ? formatShort(PUNGLI_FEE) : ''))));
    const own = $('.own', node);
    if (tile.type === 'property' && owner && !seized) {
      const houses = asset.houses ? `<span class="hs">${houseIcon('#d8352a').repeat(asset.houses)}</span>` : '';
      const key = `${owner.id}:${asset.houses}`;
      if (own.dataset.key !== key) { own.dataset.key = key; own.innerHTML = `<span class="dot" style="background:${owner.color}"></span>${houses}`; }
    } else if (own.dataset.key) { own.dataset.key = ''; own.innerHTML = ''; }
  });
}

/* ---- Pawns: one persistent element per player, positioned over the board grid ---- */
function tileCenter(index, slot = 0, count = 1) {
  const board = $('#board'); const node = tileEl(index);
  if (!node) return { x: 0, y: 0 };
  const w = $('.pawn')?.offsetWidth || 30;
  const cx = node.offsetLeft + node.offsetWidth / 2;
  const cy = node.offsetTop + node.offsetHeight * 0.86;
  const spread = Math.min(node.offsetWidth * 0.34, w * 0.62);
  const angle = (slot / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  const ox = count > 1 ? Math.cos(angle) * spread : 0;
  const oy = count > 1 ? Math.sin(angle) * spread * 0.45 : 0;
  return { x: cx + ox - w / 2, y: cy + oy - w * 1.9 + (board ? 0 : 0) };
}
function ensurePawns() {
  const layer = $('#pawnLayer');
  state.players.forEach((p, i) => {
    let el = $(`#pawn-${p.id}`, layer);
    if (!el) {
      el = document.createElement('div');
      el.className = 'pawn'; el.id = `pawn-${p.id}`;
      el.innerHTML = standeeSVG(i, p.color);
      layer.appendChild(el);
    }
  });
  $$('.pawn', layer).forEach((el) => { if (!state.players.some((p) => `pawn-${p.id}` === el.id)) el.remove(); });
}
function slotsFor(index) {
  // players sharing a tile get distinct offsets (stable by player order)
  const here = state.players.filter((p) => p.alive && ui.pawnPos[p.id] === index);
  return here.map((p) => p.id);
}
function placePawn(player, index, { instant = true } = {}) {
  const el = $(`#pawn-${player.id}`);
  if (!el) return;
  const ids = slotsFor(index); if (!ids.includes(player.id)) ids.push(player.id);
  const { x, y } = tileCenter(index, ids.indexOf(player.id), ids.length);
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.dataset.x = x; el.dataset.y = y;
  if (instant) ui.pawnPos[player.id] = index;
}
function layoutPawns() {
  state.players.forEach((p) => placePawn(p, ui.pawnPos[p.id] ?? p.pos));
  // second pass so shared tiles spread correctly once all positions are known
  state.players.forEach((p) => placePawn(p, ui.pawnPos[p.id] ?? p.pos));
  state.players.forEach((p) => {
    const el = $(`#pawn-${p.id}`);
    if (!el) return;
    el.classList.toggle('out', !p.alive);
    el.classList.toggle('active', p.alive && p.id === getCurrentPlayer()?.id && !state.ended);
    el.style.zIndex = p.id === getCurrentPlayer()?.id ? 3 : 1;
  });
}
/** One-tile hop (arc) used for every step of dice movement. */
async function hopPawn(player, toIndex) {
  const el = $(`#pawn-${player.id}`);
  if (!el) return;
  const fromX = parseFloat(el.dataset.x || 0); const fromY = parseFloat(el.dataset.y || 0);
  ui.pawnPos[player.id] = toIndex;
  const ids = slotsFor(toIndex);
  const { x, y } = tileCenter(toIndex, Math.max(0, ids.indexOf(player.id)), ids.length);
  el.dataset.x = x; el.dataset.y = y;
  const lift = Math.max(16, (el.offsetWidth || 30) * 0.6);
  const run = state.runId;
  await Motion.commit(el, [
    { transform: `translate(${fromX}px, ${fromY}px) scale(1,1)` },
    { transform: `translate(${(fromX + x) / 2}px, ${Math.min(fromY, y) - lift}px) scale(.94,1.1)`, offset: .5 },
    { transform: `translate(${x}px, ${y}px) scale(1.1,.88)`, offset: .86 },
    { transform: `translate(${x}px, ${y}px) scale(1,1)` },
  ], { duration: 150, easing: EASE.out });
  if (run !== state.runId) return;
  const tn = tileEl(toIndex); if (tn) { tn.classList.remove('flash'); void tn.offsetWidth; tn.classList.add('flash'); }
}
/** Straight glide for long jumps (jail) and for resyncing after a card moves a pawn. */
async function glidePawn(player, toIndex) {
  const el = $(`#pawn-${player.id}`);
  if (!el) return;
  const fromX = parseFloat(el.dataset.x || 0); const fromY = parseFloat(el.dataset.y || 0);
  ui.pawnPos[player.id] = toIndex;
  const ids = slotsFor(toIndex);
  const { x, y } = tileCenter(toIndex, Math.max(0, ids.indexOf(player.id)), ids.length);
  el.dataset.x = x; el.dataset.y = y;
  await Motion.commit(el, [
    { transform: `translate(${fromX}px, ${fromY}px) scale(1)` },
    { transform: `translate(${(fromX + x) / 2}px, ${Math.min(fromY, y) - 60}px) scale(1.15)`, offset: .5 },
    { transform: `translate(${x}px, ${y}px) scale(1)` },
  ], { duration: 520, easing: EASE.inOut });
}
/** After state changes outside the dice flow (cards, jail), animate any pawn that is not where it should be. */
function syncPawnsAnimated() {
  if (state.cardOpen) return;
  ui.moveChain = ui.moveChain.then(async () => {
    const run = state.runId;
    for (const p of state.players) {
      if (run !== state.runId) return;
      if (!p.alive) continue;
      const shown = ui.pawnPos[p.id];
      if (shown === undefined || shown === p.pos) continue;
      const forward = (p.pos - shown + BOARD.length) % BOARD.length;
      if (forward > 0 && forward <= 4 && !p.jailed) { // short forward moves (e.g. the +2 card) walk tile by tile
        for (let k = 1; k <= forward; k++) await hopPawn(p, (shown + k) % BOARD.length);
      } else await glidePawn(p, p.pos);
    }
    if (run === state.runId) layoutPawns();
  });
}

/* ---- Player list, money counters, floating chips ---- */
function renderPlayers() {
  $('#roundLabel').textContent = `Ronde ${state.round}`;
  const cur = getCurrentPlayer();
  const html = state.players.map((player, index) => {
    const owned = BOARD.map((t, i) => ({ t, i })).filter(({ i }) => state.assets[i]?.ownerId === player.id);
    const dots = owned.map(({ t, i }) => `<i title="${escapeHTML(t.name)}${state.assets[i].houses ? ` (${state.assets[i].houses} rumah)` : ''}" style="background:${t.color}"></i>`).join('');
    return `<div class="prow ${player === cur && !state.ended ? 'active' : ''} ${player.alive ? '' : 'out'}" style="--pc:${player.color}" data-player="${player.id}">
      ${standeeHTML(index, player.color)}
      <div><strong>${escapeHTML(player.name)}<span class="badge ${player.isAI ? 'ai' : 'human'}">${player.isAI ? 'KOMPUTER' : 'KAMU'}</span>${player.jailed ? '<span class="badge jail">LAPAS</span>' : ''}${player.alive ? '' : '<span class="badge ko">BANGKRUT</span>'}</strong>
        <small>${player.alive ? `${player.isAI ? AI_LEVELS[player.aiDifficulty]?.label || 'KOMPUTER' : 'PEMAIN MANUSIA'} · ${activePropertyCount(player.id)} properti` : 'Keluar dari permainan'}</small>
        <div class="owned-dots">${dots}</div></div>
      <div class="bal"><span data-bal="${player.id}">${money(ui.shownMoney[player.id] ?? player.money)}</span><small>${player.jailed ? `Percobaan ${player.jailTurns}/3` : player.alive ? `Kotak ${player.pos + 1}/${BOARD.length}` : ''}</small></div>
    </div>`;
  }).join('');
  const list = $('#playersList');
  if (list.dataset.sig !== html) { list.innerHTML = html; list.dataset.sig = html; }
}
function floatChip(playerId, delta) {
  if (Motion.reduced()) return;
  const row = document.querySelector(`[data-bal="${playerId}"]`);
  if (!row) return;
  const r = row.getBoundingClientRect();
  if (!r.width) return;
  const chip = document.createElement('div');
  chip.className = `float-chip ${delta > 0 ? 'pos' : 'neg'}`;
  chip.textContent = `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}`;
  chip.style.left = `${Math.max(8, Math.min(window.innerWidth - 190, r.left - 60))}px`; chip.style.top = `${r.top - 6}px`;
  document.body.appendChild(chip);
  Motion.play(chip, [{ opacity: 0, transform: 'translateY(8px) scale(.8)' }, { opacity: 1, transform: 'translateY(-10px) scale(1)', offset: .25 }, { opacity: 1, transform: 'translateY(-34px)', offset: .75 }, { opacity: 0, transform: 'translateY(-52px)' }], { duration: 1500, easing: EASE.out }).done.then(() => chip.remove());
}
/** Balances shown on screen always tween toward the real state. Held while a card is face-up so the card is revealed first. */
function syncMoney() {
  if (state.cardOpen) return;
  state.players.forEach((p) => {
    const from = ui.shownMoney[p.id];
    if (from === undefined) { ui.shownMoney[p.id] = p.money; return; }
    if (from === p.money) return;
    if (ui.tweenCancel[p.id]) ui.tweenCancel[p.id]();
    const delta = p.money - from;
    floatChip(p.id, delta);
    ui.tweenCancel[p.id] = Motion.tween(from, p.money, 800, (v) => {
      ui.shownMoney[p.id] = v;
      $$(`[data-bal="${p.id}"]`).forEach((n) => { n.textContent = money(v); });
      if (p.id === getCurrentPlayer()?.id) { const cm = $('#coreMoney'); if (cm) cm.textContent = money(v); const dm = $('#dockMoney'); if (dm) dm.textContent = money(v); }
    }, () => { ui.shownMoney[p.id] = p.money; });
  });
}

function renderLog() {
  const log = $('#gameLog');
  const sig = state.log.map((e) => e.time + e.message).join('|');
  if (log.dataset.sig === sig) return;
  log.dataset.sig = sig;
  log.textContent = '';
  if (!state.log.length) { const p = document.createElement('p'); p.style.cssText = 'font-size:13px;color:rgba(255,255,255,.55);margin:0'; p.textContent = 'Belum ada drama. Lempar dadu dulu.'; log.appendChild(p); return; }
  state.log.forEach((entry, i) => {
    const row = document.createElement('div'); row.className = 'log-item';
    if (i > 0) row.style.animation = 'none';
    const dot = document.createElement('i'); dot.style.background = entry.type === 'bad' ? '#ef5a4c' : entry.type === 'good' ? '#4fc08a' : '#f4c430';
    const text = document.createElement('div'); const t = document.createElement('span'); t.textContent = entry.time;
    text.append(t, ` · ${entry.message}`);
    row.append(dot, text); log.appendChild(row);
  });
}

/* ---- Control deck (center of the board on desktop, docked under the board on phones) ---- */
function renderControl() {
  const player = getCurrentPlayer();
  if (!player) return;
  const idx = playerIndex(player.id);
  const pc = $('#turnDot'); pc.style.setProperty('--pc', player.color);
  $('#turnPill').textContent = state.ended ? 'Permainan selesai' : (player.alive ? `Giliran ${player.name}` : `${player.name} tersingkir`);
  const status = !player.alive ? 'Tersingkir dari permainan.' : player.jailed ? `Di lapas · percobaan ${player.jailTurns}/3` : state.lastRollText;
  $('#coreTurn').innerHTML = `${standeeHTML(idx, player.color)}<span>${escapeHTML(player.name)}</span>`;
  $('#coreMoney').textContent = money(ui.shownMoney[player.id] ?? player.money);
  $('#coreStatus').textContent = status;
  renderActions();
  renderDock(player, idx, status);
}
function renderActions() {
  const panel = $('#actionPanel');
  const player = getCurrentPlayer();
  let html = '';
  if (state.ended) html = '<p class="note-line">Permainan selesai.</p>';
  else if (state.busy) html = '<p class="note-line">Nasib sedang berputar…</p>';
  else if (state.cardOpen) html = '<p class="note-line">Baca kartunya dulu.</p>';
  else if (!player.alive) html = '<button class="btn btn-primary" data-action="continue" type="button">Lanjutkan permainan</button>';
  else if (!state.awaiting) {
    if (player.jailed) html = `<button class="btn btn-primary" data-action="roll" type="button">Coba lolos: lempar dadu</button>
      <button class="btn btn-quiet" data-action="bail" type="button" ${player.money < JAIL_BAIL ? 'disabled' : ''}>Bayar jaminan ${money(JAIL_BAIL)}</button>
      <p class="note-line">Angka kembar membebaskanmu. Kalau tidak, giliranmu lewat.</p>`;
    else html = '<button class="btn btn-primary" data-action="roll" type="button"><svg><use href="#i-dice"/></svg> Lempar dadu</button>';
  } else if (state.pendingBuy !== null) {
    const tile = BOARD[state.pendingBuy]; const can = player.money >= tile.price;
    html = `<button class="btn btn-primary" data-action="buy" type="button" ${can ? '' : 'disabled'}>Beli ${escapeHTML(tile.name)} · ${money(tile.price)}</button>
      <button class="btn btn-quiet" data-action="skip-buy" type="button">Lewati</button>`;
  } else {
    const build = canBuildAtCurrent();
    html = `${build ? `<button class="btn btn-quiet" data-action="build" type="button" ${player.money < HOUSE_COST ? 'disabled' : ''}>Bangun rumah · ${money(HOUSE_COST)}</button>` : ''}
      <button class="btn btn-primary" data-action="continue" type="button">${state.extraTurn ? 'Giliran bonus: lanjutkan' : 'Akhiri giliran'}</button>
      ${state.extraTurn ? '<p class="note-line">Angka kembar! Satu giliran tambahan.</p>' : ''}`;
  }
  if (panel.dataset.sig !== html) { panel.innerHTML = html; panel.dataset.sig = html; }
}
function renderDock(player, idx, status) {
  const dock = $('#dock');
  if (!dock || dock.classList.contains('hidden')) return;
  dock.querySelector('.dock-top').innerHTML = `${standeeHTML(idx, player.color)}<div class="who">${escapeHTML(player.name)}<small>${escapeHTML(status)}</small></div><div class="core-money" id="dockMoney">${money(ui.shownMoney[player.id] ?? player.money)}</div>`;
}

/* ---- Property / tile inspector ---- */
function renderInspector() {
  const cur = getCurrentPlayer();
  const index = ui.inspected ?? (cur?.alive ? cur.pos : 0);
  const tile = BOARD[index];
  const asset = state.assets[index];
  const seized = state.stateSeized.has(index);
  const box = $('#inspector');
  const owner = asset?.ownerId ? playerById(asset.ownerId) : null;
  const photo = tile.type === 'property' ? CITY_PHOTOS[tile.name] : null;
  let rows = '';
  if (tile.type === 'property') {
    rows = `<dt>Harga tanah</dt><dd>${money(tile.price)}</dd><dt>Sewa tanpa rumah</dt><dd>${money(tile.rent)}</dd>` +
      [1, 2, 3].map((h) => `<dt>Sewa ${h} rumah</dt><dd>${money(Math.round(tile.rent * (1 + h * 1.2)))}</dd>`).join('') +
      `<dt>Biaya rumah</dt><dd>${money(HOUSE_COST)}</dd><dt>Pemilik</dt><dd>${seized ? 'Disita negara' : owner ? escapeHTML(owner.name) : 'Belum ada'}</dd>` +
      (asset && owner ? `<dt>Rumah</dt><dd>${asset.houses} dari ${MAX_HOUSES}</dd>` : '');
    if (seized) rows = `<dt>Status</dt><dd>Jalur tol</dd><dt>Biaya lewat</dt><dd>${money(SEIZED_TOLL)}</dd>`;
  } else if (tile.type === 'start') rows = `<dt>Gaji lewat START</dt><dd>${money(START_SALARY)}</dd>`;
  else if (tile.type === 'pungli') rows = `<dt>Biaya</dt><dd>${money(PUNGLI_FEE)}</dd>`;
  else if (tile.amount) rows = `<dt>Biaya</dt><dd>${money(tile.amount)}</dd>`;
  else if (tile.type === 'jail') rows = `<dt>Jaminan</dt><dd>${money(JAIL_BAIL)}</dd><dt>Bebas dengan</dt><dd>Angka kembar</dd>`;
  else if (tile.type === 'fate') rows = `<dt>Isi tumpukan</dt><dd>${FATE_CARDS.length} kartu</dd>`;
  else if (tile.type === 'mishap') rows = `<dt>Isi tumpukan</dt><dd>${MISHAP_CARDS.length} kartu</dd>`;
  const player = cur;
  let acts = '';
  if (!state.busy && !state.cardOpen && !state.ended && player?.alive && player.pos === index) {
    if (state.pendingBuy === index) acts = `<button class="btn btn-primary" data-action="buy" type="button" ${player.money >= tile.price ? '' : 'disabled'}>Beli · ${money(tile.price)}</button><button class="btn btn-quiet" data-action="skip-buy" type="button">Lewati</button>`;
    else if (state.awaiting && canBuildAtCurrent()) acts = `<button class="btn btn-quiet" data-action="build" type="button" ${player.money < HOUSE_COST ? 'disabled' : ''}>Bangun rumah · ${money(HOUSE_COST)}</button>`;
  }
  const hint = tile.type === 'property' && !owner && !seized && !acts ? '<p class="hint">Tanah ini bisa dibeli oleh pemain yang mendarat di sini dan punya saldo cukup.</p>' : '';
  const html = `<div class="art">${tileThumbHTML(tile)}</div><div class="band" style="background:${seized ? '#c6a15b' : owner ? owner.color : (tile.color || tileAccent(tile.type))}"></div>
    <div class="body"><h3>${escapeHTML(seized ? 'Lahan disita' : tile.name)}</h3><div class="rg">${escapeHTML(tile.region || tile.subtitle || '')}${photo ? ` · foto: ${escapeHTML(photo.author)}, ${escapeHTML(photo.license)}` : ''}</div>
    <dl>${rows}</dl><div class="acts">${acts}</div>${hint}</div>`;
  if (box.dataset.sig !== html) { box.innerHTML = html; box.dataset.sig = html; }
}

function renderAll() {
  if (!state.started) return;
  ensurePawns();
  renderBoard(); renderPlayers(); renderLog(); renderControl(); renderInspector();
  const changedCurrent = ui.lastCurrent !== state.current;
  if (changedCurrent) { ui.lastCurrent = state.current; if (ui.inspected !== null) ui.inspected = null; renderInspector(); }
  syncMoney();
  if (!state.busy) syncPawnsAnimated();
  layoutPawnsStatic();
}
function layoutPawnsStatic() {
  // active halo + z-order only; positions are owned by hop/glide animations
  state.players.forEach((p) => {
    const el = $(`#pawn-${p.id}`); if (!el) return;
    el.classList.toggle('out', !p.alive);
    el.classList.toggle('active', p.alive && p.id === getCurrentPlayer()?.id && !state.ended);
    el.style.zIndex = p.id === getCurrentPlayer()?.id ? 3 : 1;
    if (ui.pawnPos[p.id] === undefined) placePawn(p, p.pos);
  });
}

/* =========================================================
   7. DICE & PAWN MOVEMENT (hooks into the engine)
   ========================================================= */
// Orientation that brings value v to the front (toward the viewer), per the face layout in the CSS.
const DIE_REST = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] }; // [rotateX, rotateY]
function dieTransform(v, tumbleX = 0, tumbleY = 0, tilt = 0) {
  const [rx, ry] = DIE_REST[v];
  return `rotateZ(${tilt}deg) rotateX(${rx + tumbleX * 360}deg) rotateY(${ry + tumbleY * 360}deg)`;
}
const diceCtl = { rolling: false };
function mountDice(container, count = 2) {
  container.innerHTML = '';
  const dice = [];
  for (let i = 0; i < count; i++) {
    const wrap = document.createElement('div'); wrap.innerHTML = dieHTML();
    const die = wrap.firstElementChild; container.appendChild(die);
    const cube = $('.die-cube', die);
    cube.style.transform = dieTransform(i % 2 ? 4 : 2, 0, 0, i ? 6 : -8); // arbitrary resting pose before the first roll
    dice.push({ die, cube, value: null });
  }
  return dice;
}
/** Throw animation: anticipation -> toss with tumbling -> bounce -> settle on the exact face for `value`. */
async function rollDiceVisual(dice, values, { spread = 1 } = {}) {
  if (diceCtl.rolling) return;
  diceCtl.rolling = true;
  try {
    await Promise.all(dice.map(async (d, i) => {
      const v = values[i];
      const dir = i % 2 ? 1 : -1;
      const tx = 2 + i + (Math.random() > .5 ? 1 : 0); const ty = 2 + (1 - i) + (Math.random() > .5 ? 1 : 0);
      const tilt = (Math.random() * 14 - 7);
      const from = d.cube.style.transform || dieTransform(2);
      const dist = 22 * spread;
      const el = d.die;
      const big = Math.max(34, el.offsetWidth || 50);
      const anim = [
        Motion.play(el, [
          { transform: 'translate3d(0,0,0) scale(1)' },
          { transform: `translate3d(${-dir * 6}px,${6}px,0) scale(.94)`, offset: .12 },
          { transform: `translate3d(${dir * dist * .5}px,${-big * 1.3}px,${70 * spread}px) scale(1.22)`, offset: .42 },
          { transform: `translate3d(${dir * dist}px,0,0) scale(.98)`, offset: .66 },
          { transform: `translate3d(${dir * dist * .85}px,${-big * .3}px,20px) scale(1.04)`, offset: .8 },
          { transform: `translate3d(${dir * dist * .8}px,0,0) scale(1)`, offset: .92 },
          { transform: `translate3d(${dir * dist * .8}px,0,0) scale(1)` },
        ], { duration: 1050, easing: EASE.inOut }),
        Motion.play(d.cube, [
          { transform: from },
          { transform: dieTransform(v, tx * .45, ty * .45, tilt * 2), offset: .55 },
          { transform: dieTransform(v, tx, ty, tilt) },
        ], { duration: 1050, easing: 'cubic-bezier(.2,.7,.25,1)' }),
      ];
      await Promise.all(anim.map((a) => a.done));
      // commit final orientation (normalised, so later rolls start from a clean pose)
      anim[1].anim?.cancel(); anim[0].anim?.cancel();
      d.cube.style.transform = dieTransform(v, 0, 0, tilt);
      el.style.transform = `translate3d(${dir * dist * .8}px,0,0)`;
      d.value = v;
    }));
  } finally { diceCtl.rolling = false; }
}
function mountBoardDice() { ui.dice = mountDice($('#diceStage'), 2); }

Hooks.animateDice = async (one, two) => {
  if (!ui.dice) mountBoardDice();
  const run = state.runId;
  await rollDiceVisual(ui.dice, [one, two], { spread: window.innerWidth < 700 ? .6 : 1 });
  if (run !== state.runId) return;
  // verification: the face now pointing at the viewer must equal the engine's value
  ui.dice.forEach((d, i) => d.die.setAttribute('data-value', String([one, two][i])));
};
Hooks.step = async (player, index) => {
  await hopPawn(player, index);
  // keep balance / list in sync as salary is collected mid-move
  renderPlayers(); syncMoney();
};
Hooks.render = renderAll;
Hooks.announce = (msg) => { const r = $('#liveRegion'); if (r) { r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 30); } window.NasibAudio?.announce(msg, getCurrentPlayer()?.aiDifficulty); };
Hooks.flashTile = (index) => { const tn = tileEl(index); if (tn) { tn.classList.remove('flash'); void tn.offsetWidth; tn.classList.add('flash'); } };

/* ---- Event card modal (3D flip reveal) ---- */
Hooks.showCard = ({ card, type, cardType, impact, impactClass }) => {
  const ec = $('#eventCard');
  ec.getAnimations().forEach((a) => a.cancel());
  ec.className = `event-card ${type}`;
  $('#eventBack').innerHTML = cardBackHTML(type);
  $('#cardArt').innerHTML = cardArtSVG(type);
  $('#cardType').textContent = `KARTU ${cardType}`;
  $('#cardTitle').textContent = card.title;
  $('#cardText').textContent = card.text;
  const imp = $('#cardImpact'); imp.textContent = impact; imp.className = `ev-impact ${impactClass}`;
  openModal('cardModal', { focus: '#cardContinue', closable: false });
  Hooks.announce(`Kartu ${cardType.toLowerCase()}: ${card.title}. ${card.text} ${impact}`);
  $('#cardContinue').disabled = true;
  Motion.play(ec, [{ transform: 'translateY(60px) rotateX(18deg) scale(.82)', opacity: 0 }, { transform: 'translateY(0) rotateX(0) scale(1)', opacity: 1 }], { duration: 520, easing: EASE.out }).done
    .then((a) => { if (a) a.cancel(); return Motion.play(ec, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg) scale(1.06)', offset: .5 }, { transform: 'rotateY(180deg)' }], { duration: 760, delay: 280, easing: EASE.inOut }).done; })
    .then(() => { $('#cardContinue').disabled = false; const p = getCurrentPlayer(); if (p?.isAI) { const runId = state.runId; const playerId = p.id; setTimeout(() => { if (runId !== state.runId || getCurrentPlayer()?.id !== playerId || !state.cardOpen) return; const button = $('#cardContinue'); if (button && !button.disabled) button.click(); }, Motion.reduced() ? 120 : 620); } else $('#cardContinue').focus(); });
};
function cardBackHTML(type) {
  const fate = type === 'fate';
  return `<svg viewBox="0 0 200 288" width="100%" height="100%" aria-hidden="true"><rect width="200" height="288" fill="${fate ? '#1e4c9d' : '#e0572a'}"/><rect x="10" y="10" width="180" height="268" rx="12" fill="none" stroke="${fate ? '#9fc0ff' : '#ffd0a0'}" stroke-width="2" stroke-dasharray="3 5"/>
  <g transform="translate(0 70)">${fate
    ? '<g fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><rect x="40" y="40" width="64" height="64" rx="12" transform="rotate(-14 72 72)"/><rect x="100" y="64" width="56" height="56" rx="11" transform="rotate(16 128 92)"/></g><g fill="#fff"><circle cx="58" cy="58" r="4" transform="rotate(-14 72 72)"/><circle cx="86" cy="86" r="4" transform="rotate(-14 72 72)"/></g>'
    : '<g fill="none" stroke="#ffb15a" stroke-width="2.4"><circle cx="100" cy="76" r="62"/><circle cx="100" cy="76" r="50"/><circle cx="100" cy="76" r="38"/></g><circle cx="100" cy="76" r="30" fill="#ff8a2a" stroke="#fff3b0" stroke-width="3"/><circle cx="89" cy="70" r="6" fill="#fff6c2"/><circle cx="111" cy="70" r="6" fill="#fff6c2"/>'}</g>
  <text x="100" y="236" text-anchor="middle" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="30" fill="#fff" letter-spacing="2">${fate ? 'TAKDIR' : 'MUSIBAH'}</text></svg>`;
}

/* ---- Game over ---- */
Hooks.gameOver = (winner) => {
  window.NasibAudio?.play('victory');
  if (winner) window.NasibAudio?.speak(winner.name + ' memenangkan permainan. Strategi terbaik bertahan.', winner.aiDifficulty);
  const idx = winner ? playerIndex(winner.id) : 0;
  $('#winnerStandee').innerHTML = winner ? standeeSVG(idx, winner.color) : '';
  $('#winnerName').textContent = winner?.name || 'Tidak ada pemenang';
  $('#winnerMoney').textContent = winner ? money(winner.money) : 'Semua warga tumbang.';
  $('#gameOverTitle').textContent = winner ? 'Pemenang bertahan hidup' : 'Semua warga tumbang';
  const box = $('#confetti'); box.textContent = '';
  if (winner && !Motion.reduced()) {
    const cols = ['#f4c430', '#d8352a', '#3e8e6b', '#ffffff'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i'); s.style.left = `${Math.random() * 100}%`; s.style.background = cols[i % cols.length]; box.appendChild(s);
      Motion.play(s, [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${520 + Math.random() * 120}px) translateX(${Math.random() * 80 - 40}px) rotate(${Math.random() * 540}deg)`, opacity: .9 }], { duration: 2600 + Math.random() * 1600, delay: 300 + Math.random() * 900, easing: EASE.in });
    }
  }
  // delay so the final transaction animation can be seen first
  setTimeout(() => { if (state.ended) openModal('gameOverModal', { focus: '#playAgain', closable: false }); }, Motion.reduced() ? 0 : 900);
};

/* ---- Compact (phone) layout: move the control deck below the board ---- */
function placeControlDeck() {
  const deck = $('#controlDeck');
  const phone = window.matchMedia('(max-width:700px)').matches;
  const dock = $('#dock');
  if (phone) {
    dock.classList.remove('hidden');
    if (!dock.querySelector('.dock-top')) dock.innerHTML = '<div class="dock-top"></div><div class="deck-slot"></div>';
    const slot = $('.deck-slot', dock);
    if (deck.parentElement !== slot) slot.appendChild(deck);
  } else {
    const ui_ = $('#coreUi');
    if (deck.parentElement !== ui_) ui_.appendChild(deck);
    dock.classList.add('hidden');
  }
  if (state.started) renderAll();
}

/* =========================================================
   8. GUIDEBOOK — content built from the real game data, plus a 3D page-turn book
   ========================================================= */
const GUIDE_CHAPTERS = [
  { id: 'tujuan', no: 1, title: 'Tujuan permainan' },
  { id: 'papan', no: 2, title: 'Mengenal papan' },
  { id: 'setup', no: 3, title: 'Persiapan pemain' },
  { id: 'giliran', no: 4, title: 'Giliran dan dadu' },
  { id: 'beli', no: 5, title: 'Membeli properti' },
  { id: 'sewa', no: 6, title: 'Sewa dan rumah' },
  { id: 'kartu', no: 7, title: 'Kartu Takdir dan Musibah' },
  { id: 'biaya', no: 8, title: 'Pajak, tol, dan denda' },
  { id: 'lapas', no: 9, title: 'Lapas' },
  { id: 'akhir', no: 10, title: 'Bangkrut dan menang' },
];
const rowsHTML = (rows) => `<table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
const cardKindLabel = (c) => c.kind === 'gain' ? `+ ${money(c.amount)}` : c.kind === 'lose' ? `− ${money(c.amount)}` : c.kind === 'move' ? `Maju ${c.amount} langkah` : c.kind === 'jail' ? 'Masuk lapas' : 'Lahan termahal disita';
const chapterHead = (no, title) => `<span class="no">BAB ${no}</span><h2>${escapeHTML(title)}</h2>`;

function guidePageHTML(key) {
  const props = BOARD.filter((t) => t.type === 'property');
  switch (key) {
    case 'cover': return `<div class="cover-face face-in"><div><small>PANDUAN RESMI PROTOTIPE</small></div><div class="ct">Nasib<br><b>+62</b></div><div><div class="stripe"></div><small style="display:block;margin-top:12px">BUKU PANDUAN · ${props.length} KOTA · ${BOARD.length} KOTAK</small></div></div>`;
    case 'toc': return `<div class="page">${`<span class="no">ISI BUKU</span><h2>Daftar isi</h2>`}<p>Ketuk judul bab untuk langsung ke halamannya.</p><ul class="toc">${GUIDE_CHAPTERS.map((c) => `<li><button type="button" data-goto="${c.id}"><b>${c.no}</b><span>${escapeHTML(c.title)}</span></button></li>`).join('')}</ul></div>`;
    case 'tujuan': return `<div class="page">${chapterHead(1, 'Tujuan permainan')}<p>Kamu dan 1–3 teman berkeliling papan, membeli tanah, memungut sewa, dan menghadapi kartu yang tidak selalu ramah. Pemain yang uangnya habis dan tidak mampu membayar tagihan <strong>bangkrut</strong> dan keluar dari permainan.</p><div class="callout"><strong>Menang</strong> berarti menjadi pemain terakhir yang belum bangkrut.</div><p>Tidak ada batas ronde. Permainan berhenti tepat ketika tinggal satu pemain yang bertahan.</p><h3>Satu perangkat, bergantian</h3><p>Versi web ini dimainkan bergantian di satu layar. Setiap pemain memakai warna dan pion sendiri.</p></div>`;
    case 'papan': return `<div class="page">${chapterHead(2, 'Mengenal papan')}<p>Papan berbentuk bingkai berisi <strong>${BOARD.length} kotak</strong> yang dijalani searah jarum jam, dimulai dari START di pojok kiri atas.</p><img class="fig" src="${IMG.board}" alt="Foto papan boardgame fisik dari atas, berisi kartu, dadu, dan pion" loading="lazy"><h3>${props.length} kota dalam 5 wilayah</h3>${rowsHTML(REGION_ORDER.map((r) => [escapeHTML(r), props.filter((t) => t.region === r).map((t) => escapeHTML(t.name)).join(', ')]))}<h3>Kotak khusus</h3>${rowsHTML([['START', 'Gaji lewat'], ['Kartu Takdir ×3', 'Ambil kartu'], ['Kartu Musibah ×3', 'Ambil kartu'], ['Pungli, Pajak, Pengadilan, Tol, Tilang', 'Bayar biaya'], ['Lapas', 'Masuk lapas']])}</div>`;
    case 'setup': return `<div class="page">${chapterHead(3, 'Persiapan pemain')}<ul><li>Pilih <strong>2, 3, atau 4 pemain</strong> dan isi nama panggilan (maksimal 18 huruf).</li><li>Setiap pemain mulai di START dengan <strong>${money(STARTING_MONEY)}</strong>.</li><li>Pemain pertama adalah pemain nomor 1. Giliran berjalan berurutan.</li></ul><img class="fig" src="${IMG.pawn}" alt="Foto tangan memegang pion akrilik di atas papan" loading="lazy" style="max-height:200px"><h3>Warna pion</h3>${rowsHTML(PLAYER_COLORS.map((p, i) => [`Pemain ${i + 1}`, p.name]))}</div>`;
    case 'giliran': return `<div class="page">${chapterHead(4, 'Giliran dan dadu')}<ol style="padding-left:20px"><li>Lempar <strong>dua dadu</strong>.</li><li>Pionmu maju sejumlah total dadu, kotak demi kotak.</li><li>Kotak tempatmu berhenti diselesaikan: beli, bayar, ambil kartu, atau kena biaya.</li><li>Jika kamu mau dan syaratnya terpenuhi, bangun rumah.</li><li>Tekan <em>Akhiri giliran</em>.</li></ol><h3>Gajian</h3><p>Setiap kali pionmu sampai di START, kamu menerima <strong>${money(START_SALARY)}</strong>. Ini berlaku juga jika kamu berhenti tepat di START.</p><h3>Angka kembar</h3><p>Jika kedua dadu sama, kamu mendapat <strong>satu giliran tambahan</strong>. Tiga kali kembar berturut-turut mengirimmu langsung ke lapas.</p></div>`;
    case 'beli': return `<div class="page">${chapterHead(5, 'Membeli properti')}<p>Jika kamu berhenti di tanah yang masih kosong dan saldomu cukup, kamu boleh <strong>membelinya</strong> seharga yang tertera atau <strong>melewatinya</strong>.</p><img class="fig" src="${IMG.cards}" alt="Foto tangan memegang kartu properti berwarna-warni" loading="lazy" style="max-height:200px;object-position:center 30%"><ul><li>Jika saldo kurang, tanah tidak bisa dibeli.</li><li>Tanah yang dilewati tetap kosong untuk pemain berikutnya.</li><li>Tanah milikmu ditandai titik warna pionmu di papan.</li></ul>${rowsHTML([['Termurah', `${escapeHTML('Sorong')} · ${money(1_500_000)}`], ['Termahal', `Jakarta · ${money(5_000_000)}`]])}</div>`;
    case 'sewa': return `<div class="page">${chapterHead(6, 'Sewa dan rumah')}<p>Jika kamu berhenti di tanah milik lawan, kamu membayar <strong>sewa</strong> kepadanya. Jika pemiliknya sedang di lapas atau sudah bangkrut, sewa tetap dibayar tetapi tidak diterima siapa pun.</p><h3>Membangun rumah</h3><ul><li>Kamu harus memiliki <strong>semua kota di satu wilayah</strong>.</li><li>Bangun hanya di kota tempat pionmu sedang berhenti.</li><li>Biaya satu rumah <strong>${money(HOUSE_COST)}</strong>, maksimal ${MAX_HOUSES} rumah per kota.</li></ul><h3>Rumus sewa</h3><p>Sewa dasar × (1 + 1,2 × jumlah rumah), dibulatkan.</p>${rowsHTML([['Sewa dasar', 'Jakarta'], ['0 rumah', money(1_100_000)], ['1 rumah', money(Math.round(1_100_000 * 2.2))], ['2 rumah', money(Math.round(1_100_000 * 3.4))], ['3 rumah', money(Math.round(1_100_000 * 4.6))]])}</div>`;
    case 'kartu': return `<div class="page">${chapterHead(7, 'Kartu Takdir dan Musibah')}<p>Berhenti di kotak kartu berarti mengambil satu kartu secara acak dari tumpukannya dan menjalankan isinya.</p><h3>Takdir · ${FATE_CARDS.length} kartu</h3><p>Sebagian besar membawa uang. Ada juga tagihan, langkah bonus, dan satu jalan menuju lapas.</p><h3>Musibah · ${MISHAP_CARDS.length} kartu</h3><p>Hampir semuanya biaya. Dua kartu mengirimmu ke lapas, dan satu menyita tanahmu.</p><div class="callout"><strong>Tanah disita negara.</strong> Properti termahalmu kembali ke bank dan berubah menjadi jalur tol. Siapa pun yang berhenti di sana, termasuk kamu, membayar ${money(SEIZED_TOLL)}. Jika kamu tidak punya tanah, kamu membayar ${money(SEIZE_FALLBACK_FEE)}.</div><img class="fig" src="${IMG.card}" alt="Foto kartu Musibah bergambar wajah matahari oranye" loading="lazy" style="max-height:150px;object-fit:contain;background:#e0572a"></div>`;
    case 'kartu2': return `<div class="page"><span class="no">BAB 7 · LANJUTAN</span><h2>Isi tumpukan</h2><h3>Takdir</h3>${rowsHTML(FATE_CARDS.map((c) => [escapeHTML(c.title), cardKindLabel(c)]))}<h3>Musibah</h3>${rowsHTML(MISHAP_CARDS.map((c) => [escapeHTML(c.title), cardKindLabel(c)]))}</div>`;
    case 'biaya': return `<div class="page">${chapterHead(8, 'Pajak, tol, dan denda')}<p>Kotak berikut meminta bayaran ke bank. Jika saldomu tidak cukup, kamu bangkrut.</p>${rowsHTML([['Pajak tahunan', money(BOARD.find((t) => t.type === 'tax').amount)], ['Pengadilan', money(BOARD.find((t) => t.type === 'court').amount)], ['Jalan tol', money(BOARD.find((t) => t.type === 'toll').amount)], ['Tilang', money(BOARD.find((t) => t.type === 'tilang').amount)], ['Pungli', money(PUNGLI_FEE)], ['Lahan sitaan (jalur tol)', money(SEIZED_TOLL)]])}<div class="callout">Semua biaya ini dibayar ke bank, bukan ke pemain lain. Hanya sewa yang berpindah ke pemilik tanah.</div></div>`;
    case 'lapas': return `<div class="page">${chapterHead(9, 'Lapas')}<p>Kamu masuk lapas jika berhenti di kotak Lapas, mengambil kartu yang mengirimmu ke sana, atau melempar kembar tiga kali berturut-turut.</p><h3>Cara keluar</h3><ul><li><strong>Angka kembar</strong>: kamu bebas dan langsung berjalan sejauh total dadu.</li><li><strong>Bayar jaminan ${money(JAIL_BAIL)}</strong> sebelum melempar. Setelah membayar, giliranmu berakhir.</li><li><strong>Tiga percobaan gagal</strong>: jaminan ${money(JAIL_BAIL)} dibayar otomatis. Jika saldo kurang, kamu bangkrut.</li></ul><p>Setiap lemparan tanpa kembar menghabiskan satu percobaan dan giliranmu lewat.</p></div>`;
    case 'akhir': return `<div class="page">${chapterHead(10, 'Bangkrut dan menang')}<p>Kamu bangkrut jika harus membayar lebih dari saldomu. Saldo menjadi nol, semua tanah dan rumahmu <strong>kembali ke bank</strong>, dan kamu keluar dari permainan.</p><p>Permainan berakhir ketika tinggal satu pemain yang belum bangkrut. Dia adalah pemenangnya.</p><div class="callout">Ini prototipe digital dengan angka yang disederhanakan agar gampang dimainkan di browser. Aturan di buku ini sama persis dengan aturan yang dijalankan permainan.</div><h3>Tips singkat</h3><ul><li>Simpan saldo untuk sewa dan biaya dadakan sebelum membeli tanah ketiga.</li><li>Kuasai satu wilayah penuh lebih dulu, lalu bangun rumah.</li></ul></div>`;
    case 'catatan': return `<div class="page"><span class="no">CATATAN</span><h2>Sampai ketemu di papan</h2><p>Buku ini bisa dibuka lagi kapan saja dari tombol <em>Panduan</em> di ruang permainan.</p><h3>Kredit gambar</h3><p>Ilustrasi dan potongan adegan: aset asli proyek. Foto papan, kartu, dan pion: boardgame fisik <em>WNI Simulator</em>, materi unggahan pemilik proyek. Foto Jakarta: Gunawan Kartapranata, CC BY-SA 3.0, Wikimedia Commons.</p></div>`;
    case 'endpaper': return '<div class="endpaper face-in"><div style="font-family:var(--font-display);font-size:34px;color:#8a7a50;text-transform:uppercase;letter-spacing:.06em">Nasib +62</div></div>';
    case 'back': return `<div class="cover-face face-in"><div></div><div class="ct" style="font-size:clamp(32px,5vw,64px)">Selamat<br>bermain.</div><div class="stripe"></div></div>`;
    default: return '';
  }
}

const Guide = {
  faces: [], pageOfChapter: {}, mode: 'spread', s: 0, n: 0, leaves: [], isOpen: false, lastFocus: null, token: 0, running: new Set(),
  buildFaces() {
    const order = ['cover', 'toc', 'tujuan', 'papan', 'setup', 'giliran', 'beli', 'sewa', 'kartu', 'kartu2', 'biaya', 'lapas', 'akhir', 'catatan'];
    if ((order.length + 1) % 2 !== 0) order.push('endpaper');
    order.push('back');
    this.faces = order;
    this.pageOfChapter = {};
    GUIDE_CHAPTERS.forEach((c) => { this.pageOfChapter[c.id] = order.indexOf(c.id); });
  },
  wantedMode() { return window.matchMedia('(max-width:760px)').matches ? 'single' : 'spread'; },
  maxS() { return this.mode === 'spread' ? this.n : this.faces.length - 1; },
  mount(mode) {
    this.mode = mode; const book = $('#book'); book.textContent = '';
    $('#guide').classList.toggle('single', mode === 'single');
    this.n = mode === 'spread' ? this.faces.length / 2 : this.faces.length;
    this.leaves = [];
    for (let i = 0; i < this.n; i++) {
      const leaf = document.createElement('div'); leaf.className = 'leaf';
      const frontKey = mode === 'spread' ? this.faces[2 * i] : this.faces[i];
      const backKey = mode === 'spread' ? this.faces[2 * i + 1] : null;
      const wrap = (key, cls) => `<div class="face ${cls}">${guidePageHTML(key)}${key !== 'cover' && key !== 'back' && key !== 'endpaper' ? `<div class="page-no folio-slot"></div>` : ''}<div class="shade"></div></div>`;
      leaf.innerHTML = wrap(frontKey, 'front') + (backKey ? wrap(backKey, 'back') : '');
      book.appendChild(leaf); this.leaves.push(leaf);
    }
    // page numbers
    this.leaves.forEach((leaf, i) => {
      const fNo = mode === 'spread' ? 2 * i : i; const bNo = 2 * i + 1;
      const f = $('.face.front .folio-slot', leaf); if (f) { f.className = 'folio'; f.textContent = String(fNo); f.style.cssText = 'position:absolute;bottom:12px;left:0;right:0;text-align:center;font:700 12px var(--font-ui);color:#8a7a50'; }
      const b = $('.face.back .folio-slot', leaf); if (b) { b.className = 'folio'; b.textContent = String(bNo); b.style.cssText = 'position:absolute;bottom:12px;left:0;right:0;text-align:center;font:700 12px var(--font-ui);color:#8a7a50'; }
    });
    this.applyStatic();
  },
  applyStatic() {
    this.leaves.forEach((leaf, i) => {
      const flipped = i < this.s;
      leaf.style.transform = `translateZ(${flipped ? i : this.n - i}px) rotateY(${flipped ? -180 : 0}deg)`;
      leaf.style.zIndex = flipped ? i : this.n - i;
      const near = this.mode === 'spread' ? (i >= this.s - 2 && i <= this.s + 1) : (i >= this.s - 1 && i <= this.s + 1);
      leaf.style.visibility = near ? 'visible' : 'hidden';
      leaf.inert = !(this.mode === 'spread' ? (i === this.s || i === this.s - 1) : i === this.s);
    });
    const book = $('#book');
    book.style.transform = this.mode === 'spread' ? (this.s === 0 ? 'translateX(-25%)' : this.s === this.n ? 'translateX(25%)' : 'translateX(0)') : 'translateX(0)';
    this.updateChrome();
  },
  updateChrome() {
    const total = this.faces.length - 2;
    let label;
    if (this.s === 0) label = 'Sampul';
    else if (this.s === this.maxS() && (this.mode === 'spread' || this.s === this.faces.length - 1)) label = 'Sampul belakang';
    else label = this.mode === 'spread' ? `Halaman ${2 * this.s - 1}–${2 * this.s} dari ${total}` : `Halaman ${this.s} dari ${total}`;
    $('#guideCounter').textContent = label;
    $('#guidePrev').disabled = this.s <= 0;
    $('#guideNext').disabled = this.s >= this.maxS();
  },
  async flipLeaf(i, toFlipped, { duration = 950, delay = 0 } = {}) {
    const leaf = this.leaves[i]; if (!leaf) return;
    if (this.running.has(i)) return;
    this.running.add(i);
    const token = this.token;
    const flippedZ = i; const flatZ = this.n - i;
    const fromDeg = toFlipped ? 0 : -180; const toDeg = toFlipped ? -180 : 0;
    const startZ = toFlipped ? flatZ : flippedZ; const endZ = toFlipped ? flippedZ : flatZ;
    leaf.style.visibility = 'visible'; leaf.style.zIndex = 1000;
    const front = $('.face.front .shade', leaf); const back = $('.face.back .shade', leaf);
    const plays = [Motion.play(leaf, [
      { transform: `translateZ(${startZ}px) rotateY(${fromDeg}deg)` },
      { transform: `translateZ(${40 + this.n}px) rotateY(-90deg) skewY(${toFlipped ? -2 : 2}deg)`, offset: .5 },
      { transform: `translateZ(${endZ}px) rotateY(${toDeg}deg)` },
    ], { duration, delay, easing: EASE.inOut })];
    if (front) plays.push(Motion.play(front, toFlipped ? [{ opacity: 0 }, { opacity: .55, offset: .5 }, { opacity: .55 }] : [{ opacity: .55 }, { opacity: .55, offset: .5 }, { opacity: 0 }], { duration, delay, easing: EASE.inOut }));
    if (back) plays.push(Motion.play(back, toFlipped ? [{ opacity: .55 }, { opacity: .55, offset: .5 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: .55, offset: .5 }, { opacity: .55 }], { duration, delay, easing: EASE.inOut }));
    await Promise.all(plays.map((p) => p.done));
    plays.forEach((p) => p.anim?.cancel());
    this.running.delete(i);
    if (token !== this.token) return;
    leaf.style.transform = `translateZ(${endZ}px) rotateY(${toDeg}deg)`;
    this.applyStatic();
  },
  next() { if (this.s >= this.maxS() || this.running.has(this.s)) return; const i = this.s; this.s += 1; this.afterMove(); this.flipLeaf(i, true); },
  prev() { if (this.s <= 0 || this.running.has(this.s - 1)) return; this.s -= 1; this.afterMove(); this.flipLeaf(this.s, false); },
  afterMove() {
    // update static neighbours right away so the page underneath is already there
    this.leaves.forEach((leaf, i) => {
      const near = this.mode === 'spread' ? (i >= this.s - 3 && i <= this.s + 2) : (i >= this.s - 2 && i <= this.s + 2);
      if (near && !this.running.has(i)) leaf.style.visibility = 'visible';
      leaf.inert = !(this.mode === 'spread' ? (i === this.s || i === this.s - 1) : i === this.s);
    });
    const book = $('#book');
    book.style.transform = this.mode === 'spread' ? (this.s === 0 ? 'translateX(-25%)' : this.s === this.n ? 'translateX(25%)' : 'translateX(0)') : 'translateX(0)';
    this.updateChrome();
    Hooks.announce($('#guideCounter').textContent);
  },
  /** Jump to a spread/page by flipping every leaf in between, staggered. */
  async goTo(target) {
    target = Math.max(0, Math.min(this.maxS(), target));
    if (target === this.s) return;
    const forward = target > this.s; const from = this.s; this.s = target; this.afterMove();
    const ids = [];
    if (forward) for (let i = from; i < target; i++) ids.push(i); else for (let i = from - 1; i >= target; i--) ids.push(i);
    const dur = ids.length > 1 ? 620 : 950;
    await Promise.all(ids.map((i, k) => this.flipLeaf(i, forward, { duration: dur, delay: k * 110 })));
  },
  sFromFace(f) { return this.mode === 'single' ? f : (f % 2 === 0 ? f / 2 : (f + 1) / 2); },
  goToChapter(id) { const f = this.pageOfChapter[id]; if (f >= 0) this.goTo(this.sFromFace(f)); },
  async open() {
    if (this.isOpen) return;
    if (!this.faces.length) this.buildFaces();
    this.isOpen = true; const token = ++this.token;
    this.lastFocus = document.activeElement;
    this.s = 0; this.mount(this.wantedMode());
    const g = $('#guide'); g.classList.remove('hidden'); document.body.classList.add('locked');
    $('#guideClose').focus({ preventScroll: true });
    const stage = $('#bookStage');
    stage.getAnimations().forEach((a) => a.cancel());
    Motion.play($('#guideBackdrop'), [{ opacity: 0 }, { opacity: 1 }], { duration: 420 });
    await Motion.play(stage, [{ opacity: 0, transform: 'translateY(80px) rotateX(26deg) scale(.8)' }, { opacity: 1, transform: 'translateY(0) rotateX(0) scale(1)' }], { duration: 950, easing: EASE.out }).done;
    if (token !== this.token || !this.isOpen) return;
    await Motion.sleep(260);
    if (token !== this.token || !this.isOpen) return;
    this.next(); // open the cover
  },
  async close() {
    if (!this.isOpen) return;
    this.isOpen = false; const token = ++this.token;
    const stage = $('#bookStage');
    await Promise.all([Motion.play(stage, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(50px) rotateX(18deg) scale(.88)' }], { duration: 380, easing: EASE.in }).done, Motion.play($('#guideBackdrop'), [{ opacity: 1 }, { opacity: 0 }], { duration: 380 }).done]);
    if (token !== this.token) return; // reopened meanwhile
    $('#guide').classList.add('hidden'); document.body.classList.remove('locked');
    stage.getAnimations().forEach((a) => a.cancel()); $('#guideBackdrop').getAnimations().forEach((a) => a.cancel());
    this.running.clear(); this.leaves.forEach((l) => l.getAnimations().forEach((a) => a.cancel()));
    if (this.lastFocus && this.lastFocus.focus && document.contains(this.lastFocus)) this.lastFocus.focus({ preventScroll: true });
  },
  onResize() {
    if (!this.isOpen) return;
    const want = this.wantedMode(); if (want === this.mode) return;
    const face = this.mode === 'spread' ? Math.min(this.faces.length - 1, this.s === 0 ? 0 : 2 * this.s - 1) : this.s;
    this.token += 1; this.running.clear();
    this.s = want === 'single' ? face : this.sFromFace(face); this.mount(want);
  },
};

/* =========================================================
   9. MODALS, TRANSITIONS, LANDING PAGE
   ========================================================= */
const modalStack = [];
function focusables(root) {
  return $$('a[href],button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])', root).filter((n) => n.offsetParent !== null && !n.closest('[inert]'));
}
function openModal(id, { focus = null, closable = true } = {}) {
  const m = $(`#${id}`); if (!m) return;
  if (!modalStack.find((x) => x.id === id)) modalStack.push({ id, closable, last: document.activeElement });
  m.classList.remove('hidden');
  // entrance animations are released when finished so no animation layer lingers (it would flatten 3D children)
  [[$('.modal-panel', m), [{ opacity: 0, transform: 'translateY(24px) scale(.97)' }, { opacity: 1, transform: 'none' }], 360], [$('.modal-backdrop', m), [{ opacity: 0 }, { opacity: 1 }], 300]]
    .forEach(([el, kf, ms]) => { el.getAnimations().forEach((a) => a.cancel()); Motion.play(el, kf, { duration: ms, easing: EASE.out }).done.then((a) => { if (a) a.cancel(); }); });
  const f = focus ? $(focus, m) : focusables(m)[0];
  if (f && !f.disabled) f.focus({ preventScroll: true });
}
function closeModal(id) {
  const m = $(`#${id}`); if (!m || m.classList.contains('hidden')) return;
  const idx = modalStack.findIndex((x) => x.id === id);
  const entry = idx >= 0 ? modalStack.splice(idx, 1)[0] : null;
  m.classList.add('hidden');
  if (entry?.last && document.contains(entry.last) && entry.last.focus) entry.last.focus({ preventScroll: true });
}

/** Toll-barrier curtain: closes, runs `mid` while covered, opens. */
async function curtainThrough(label, mid) {
  const c = $('#curtain'); $('#curtainLabel').textContent = label;
  if (Motion.reduced()) { mid(); return; }
  c.classList.add('on');
  const top = $('.top', c); const bot = $('.bot', c);
  await Promise.all([Motion.play(top, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 480, easing: EASE.inOut }).done, Motion.play(bot, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 480, easing: EASE.inOut }).done]);
  mid();
  await Motion.sleep(260);
  await Promise.all([Motion.play(top, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 560, easing: EASE.inOut }).done, Motion.play(bot, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 560, easing: EASE.inOut }).done]);
  [top, bot].forEach((n) => n.getAnimations().forEach((a) => a.cancel()));
  c.classList.remove('on');
}

/* ---- Landing: hero intro, parallax, ticker ---- */
function heroIntro() {
  const lines = $$('.hero h1 .ln > span'); const rest = $$('[data-hero-in]');
  if (Motion.reduced()) return;
  if (Motion.hasGsap()) {
    const tl = window.gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(lines, { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: .14 }).fromTo(rest, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .1 }, '-=.5');
    return;
  }
  lines.forEach((l, i) => Motion.play(l, [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], { duration: 900, delay: 150 + i * 140, easing: EASE.out }));
  rest.forEach((r, i) => Motion.play(r, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 650 + i * 110, easing: EASE.out }));
}
function initParallax() {
  const hero = $('#beranda'); const layers = $$('[data-depth]', hero);
  let mx = 0; let my = 0; let ticking = false;
  const apply = () => {
    ticking = false;
    const sy = Math.min(window.scrollY, window.innerHeight);
    layers.forEach((el) => {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${(mx * d * 120).toFixed(1)}px, ${(my * d * 80 + sy * d * -2.4).toFixed(1)}px, 0)`;
    });
    $('#siteHeader').classList.toggle('solid', window.scrollY > 40);
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  window.addEventListener('scroll', req, { passive: true });
  if (!Motion.reduced()) hero.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); }, { passive: true });
  req();
}
function initTicker() {
  const unit = TICKER_TEXT.map((t) => `<span>${escapeHTML(t)}</span>`).join('');
  $('#tickerTrack').innerHTML = unit + unit + unit + unit;
}
function initHeroDice() {
  const wrap = $('#heroDice'); const dice = mountDice(wrap, 2);
  const roll = () => rollDiceVisual(dice, [rollDie(), rollDie()]);
  wrap.addEventListener('click', roll);
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); roll(); } });
}

/* ---- Landing: feature showcase (built from real game data) ---- */
function miniProp(name) {
  const t = BOARD.find((x) => x.name === name);
  return `<div class="mini-prop"><div class="art">${tileThumbHTML(t)}</div><div class="band" style="background:${t.color}"></div><div class="body"><h4>${escapeHTML(t.name)}</h4><small>${escapeHTML(t.region)}</small><dl><dt>Harga tanah</dt><dd>${money(t.price)}</dd><dt>Sewa</dt><dd>${money(t.rent)}</dd><dt>Biaya rumah</dt><dd>${money(HOUSE_COST)}</dd></dl></div></div>`;
}
function miniEvent(type, card) {
  return `<div style="width:min(200px,42%);aspect-ratio:5/7;border-radius:14px;overflow:hidden;background:${type === 'fate' ? 'linear-gradient(160deg,#2b63c4,#173a82)' : 'linear-gradient(160deg,#f07a2a,#c4331f)'};padding:12px;display:flex;flex-direction:column;box-shadow:0 18px 30px rgba(0,0,0,.4)"><div style="flex:0 0 40%;border-radius:8px;overflow:hidden">${cardArtSVG(type).replace('<svg ', '<svg style="width:100%;height:100%" ')}</div><div style="font:800 11px var(--font-ui);letter-spacing:.14em;margin-top:10px;opacity:.85">${type === 'fate' ? 'KARTU TAKDIR' : 'KARTU MUSIBAH'}</div><div style="font:900 24px/1 var(--font-display);text-transform:uppercase;margin:3px 0 6px">${escapeHTML(card.title)}</div><div style="margin-top:auto;font:800 24px var(--font-display);background:rgba(0,0,0,.3);border-radius:6px;text-align:center;padding:4px">${cardKindLabel(card)}</div></div>`;
}
const FEATURES = [
  { id: 'tanah', title: 'Beli tanah', blurb: 'Berhenti di kota yang masih kosong, lalu putuskan: beli atau lewati.', cap: 'Harga dan sewa sama persis dengan papan permainan.',
    pane: () => `${miniProp('Jakarta')}<div class="mini-photo"><img src="${IMG.cards}" alt="Foto tangan memegang kartu properti" loading="lazy"></div>` },
  { id: 'uang', title: 'Gaji dan sewa', blurb: 'Lewat START dapat gaji. Mampir di tanah lawan, bayar sewa.', cap: 'Contoh: Jakarta tanpa rumah, dikunjungi pemain lain.',
    pane: () => `<div class="mini-bill"><div class="bill-row plus">Gaji lewat START<b>+${money(START_SALARY)}</b></div><div class="bill-row minus">Sewa Jakarta<b>−${money(1_100_000)}</b></div><div class="bill-row minus">Sewa Sorong<b>−${money(300_000)}</b></div><div class="bill-row">Saldo awal<b>${money(STARTING_MONEY)}</b></div></div>` },
  { id: 'kartu', title: 'Takdir dan Musibah', blurb: 'Setiap kartu dihitung langsung ke saldomu. Tidak ada yang disimpan.', cap: `${FATE_CARDS.length} kartu Takdir dan ${MISHAP_CARDS.length} kartu Musibah.`,
    pane: () => `${miniEvent('fate', FATE_CARDS[0])}${miniEvent('mishap', MISHAP_CARDS[0])}` },
  { id: 'rumah', title: 'Rumah', blurb: 'Kuasai satu wilayah penuh, lalu bangun sampai tiga rumah per kota.', cap: `Biaya ${money(HOUSE_COST)} per rumah. Contoh sewa Surabaya.`,
    pane: () => `<div style="text-align:center"><div class="house-stack" style="justify-content:center">${[1, 2, 3].map(() => `<img class="house" src="${IMG.houses}" alt="" loading="lazy" style="height:110px;width:auto;border-radius:6px;object-fit:cover">`).join('')}</div></div><div class="rent-ladder">${[0, 1, 2, 3].map((h) => `<div><span>${h} rumah</span><b>${money(Math.round(800_000 * (1 + h * 1.2)))}</b></div>`).join('')}</div>` },
  { id: 'biaya', title: 'Biaya dadakan', blurb: 'Pajak, pengadilan, tol, tilang, dan pungli selalu menunggu.', cap: 'Semua dibayar ke bank, bukan ke pemain lain.',
    pane: () => `<div class="mini-bill" style="width:min(380px,90%)">${['tax', 'court', 'toll', 'tilang', 'pungli'].map((ty) => { const t = BOARD.find((x) => x.type === ty); return `<div class="bill-row minus"><span style="display:flex;align-items:center;gap:10px"><img src="${IMG[SPECIAL_TILE_IMG[ty]]}" alt="" loading="lazy" style="width:42px;height:30px;object-fit:cover;border-radius:4px">${escapeHTML(t.name)}</span><b>−${money(t.amount || PUNGLI_FEE)}</b></div>`; }).join('')}</div>` },
  { id: 'lapas', title: 'Lapas', blurb: 'Kembar untuk bebas, atau bayar jaminan. Tiga kali gagal, jaminan dibayar otomatis.', cap: `Jaminan ${money(JAIL_BAIL)}. Tiga kembar beruntun langsung masuk lapas.`,
    pane: () => `<div class="mini-prop" style="width:min(230px,44%)"><div class="art">${jailArtSVG()}</div><div class="band" style="background:#686d7e"></div><div class="body"><h4>Lapas</h4><small>Rehat sejenak</small><dl><dt>Bebas dengan</dt><dd>Angka kembar</dd><dt>Jaminan</dt><dd>${money(JAIL_BAIL)}</dd><dt>Percobaan</dt><dd>3 kali</dd></dl></div></div><div class="mini-photo" style="width:min(220px,40%)"><img src="${IMG.pawn}" alt="Foto pion akrilik di atas papan" loading="lazy"></div>` },
  { id: 'saingan', title: 'Persaingan', blurb: 'Dua sampai empat pemain. Yang terakhir bertahan, menang.', cap: 'Pemain bangkrut keluar, semua tanahnya kembali ke bank.',
    pane: () => `<div class="photo-duo"><div class="mini-photo" style="width:min(270px,48%)"><img src="${IMG.board}" alt="Foto papan boardgame fisik dari atas" loading="lazy" style="aspect-ratio:4/5"></div><div class="mini-bill" style="width:min(240px,46%)">${[0, 1, 2, 3].map((i) => `<div class="bill-row" style="border-left:5px solid ${PLAYER_COLORS[i].color}${i === 3 ? ';opacity:.45' : ''}"><span style="display:flex;align-items:center;gap:8px"><span style="width:20px">${standeeSVG(i, PLAYER_COLORS[i].color)}</span>${DEFAULT_NAMES[i]}</span>${i === 3 ? '<b style="font-size:16px">KELUAR</b>' : '<b style="font-size:18px">' + formatShort([STARTING_MONEY, 9_400_000, 21_300_000][i]) + '</b>'}</div>`).join('')}</div></div>` },
];
function initShowcase() {
  const list = $('#featList'); const stage = $('#featStage');
  list.innerHTML = FEATURES.map((f, i) => `<button class="feat-btn" role="tab" id="tab-${f.id}" aria-controls="pane-${f.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" type="button" data-feat="${i}"><strong>${escapeHTML(f.title)}</strong><i class="tick" aria-hidden="true"></i><span>${escapeHTML(f.blurb)}</span></button>`).join('');
  stage.innerHTML = FEATURES.map((f, i) => `<div class="stage-pane ${i === 0 ? 'on' : ''}" id="pane-${f.id}" role="presentation" data-pane="${i}">${f.pane()}<div class="stage-cap">${escapeHTML(f.cap)}</div></div>`).join('');
  const select = (i, focus) => {
    $$('.feat-btn', list).forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    $$('.stage-pane', stage).forEach((p, k) => p.classList.toggle('on', k === i));
    stage.setAttribute('aria-labelledby', `tab-${FEATURES[i].id}`);
    if (focus) $$('.feat-btn', list)[i].focus();
  };
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-feat]'); if (b) select(Number(b.dataset.feat)); });
  list.addEventListener('keydown', (e) => {
    const cur = $$('.feat-btn', list).findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((cur + 1) % FEATURES.length, true); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((cur - 1 + FEATURES.length) % FEATURES.length, true); }
  });
  stage.setAttribute('aria-labelledby', `tab-${FEATURES[0].id}`);
}

/* ---- Landing: animated how-to-play example ---- */
const demo = { token: 0, dice: null, started: false };
function initDemo() {
  const track = $('#demoTrack');
  track.innerHTML = BOARD.slice(0, 8).map((t, i) => `<div class="demo-tile" data-d="${i}"><i style="background:${t.color || tileAccent(t.type)}"></i><b>${escapeHTML(t.name)}</b><small>${t.type === 'property' ? formatShort(t.price) : escapeHTML(t.subtitle || '')}</small></div>`).join('') + `<div class="demo-pawn" id="demoPawn">${standeeSVG(0, PLAYER_COLORS[0].color)}</div>`;
  demo.dice = mountDice($('#demoDice'), 2);
  $('#demoReplay').addEventListener('click', runDemo);
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting) && !demo.started) { demo.started = true; runDemo(); } }, { threshold: .45 });
  io.observe($('#howDemo'));
}
function demoPawnTo(i) {
  const tile = $(`[data-d="${i}"]`); const pawn = $('#demoPawn'); const track = $('#demoTrack');
  const x = tile.offsetLeft + tile.offsetWidth / 2 - pawn.offsetWidth / 2; const y = tile.offsetTop - pawn.offsetHeight * .55;
  return Motion.commit(pawn, [{ transform: pawn.style.transform || 'translate(0,0)' }, { transform: `translate(${x}px, ${y - 14}px)`, offset: .5 }, { transform: `translate(${x}px, ${y}px)` }], { duration: 300, easing: EASE.out });
}
async function runDemo() {
  const token = ++demo.token; const say = (t) => { if (token === demo.token) $('#demoSay').textContent = t; };
  const alive = () => token === demo.token;
  $$('.demo-tile').forEach((t) => t.classList.remove('owned'));
  const pawn = $('#demoPawn'); pawn.getAnimations().forEach((a) => a.cancel()); pawn.style.transform = ''; await demoPawnTo(0);
  say('Giliranmu. Lempar dua dadu.'); await Motion.sleep(900); if (!alive()) return;
  diceCtl.rolling = false; await rollDiceVisual(demo.dice, [1, 3], { spread: .5 }); if (!alive()) return;
  say('1 + 3 = 4. Pion maju empat kotak.'); await Motion.sleep(500);
  for (let i = 1; i <= 4; i++) { if (!alive()) return; await demoPawnTo(i); await Motion.sleep(80); }
  const t = BOARD[4]; say(`${t.name} masih kosong. Harganya ${money(t.price)}.`); await Motion.sleep(1700); if (!alive()) return;
  $('[data-d="4"]').classList.add('owned');
  say(`Dibeli. Saldo ${money(STARTING_MONEY)} menjadi ${money(STARTING_MONEY - t.price)}.`);
}

function initRegions() {
  $('#regionGrid').innerHTML = REGION_ORDER.map((r) => `<article class="region"><div class="region-top" style="background:${REGION_COLORS[r]}"><h3>${escapeHTML(r)}</h3><span>${BOARD.filter((t) => t.region === r).length} kota</span></div><ul>${BOARD.filter((t) => t.region === r).map((t) => `<li><strong>${escapeHTML(t.name)}</strong><span>${money(t.price)} · sewa ${formatShort(t.rent)}</span></li>`).join('')}</ul></article>`).join('');
  $('#photoCredits').innerHTML = Object.entries(CITY_PHOTOS).map(([n, p]) => `<p><a href="${p.page}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.title)}</a>, ${escapeHTML(p.author)}, ${escapeHTML(p.license)}. Dipakai untuk kotak ${escapeHTML(n)}.</p>`).join('') + '<p>Jika foto tidak termuat (misalnya tanpa internet), kotak otomatis memakai ilustrasi bawaan.</p>';
}
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || Motion.reduced()) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  els.forEach((e) => io.observe(e));
}

/* =========================================================
   10. UI EVENTS & GAME FLOW
   ========================================================= */
const setupState = { count: 4, difficulty: 'cabinet' };
const AI_LEVELS = {staff:{label:'STAF FRAKSI',subtitle:'Analisis dasar · adaptasi terbatas',reserve:650000,threshold:.072,buildRate:.08,think:520,voice:{rate:1.02,pitch:1.1}},cabinet:{label:'ELIT KABINET',subtitle:'Disiplin anggaran · strategi aset',reserve:1600000,threshold:.056,buildRate:.28,think:680,voice:{rate:.94,pitch:.94}},oligarch:{label:'OLIGARKI NASIONAL',subtitle:'Dominasi aset · kalkulasi risiko',reserve:550000,threshold:.036,buildRate:.58,think:820,voice:{rate:.89,pitch:.78}}};
const AI_NAMES={staff:['Staf Anggaran','Birokrat Muda','Komite Daerah'],cabinet:['Sekretaris Kabinet','Komisaris Utama','Menteri Aset'],oligarch:['Konsorsium Utama','Pemodal Nasional','Pengendali Pasar']};
let aiTimer=null, aiScheduleToken=0, aiRunning=false;
function setupNameFields(prefill = null) {
  $$('#playerCountSeg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === setupState.count)));
  $$('#aiDifficultySeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.difficulty === setupState.difficulty)));
  const humanName = (prefill && prefill[0]) || ($('#playerName0') && $('#playerName0').value) || DEFAULT_NAMES[0];
  $('#nameFields').innerHTML = '<div class="name-field"><label class="field-label" for="playerName0">NAMA PEMAIN · KAMU</label><div class="name-row">' + standeeHTML(0, PLAYER_COLORS[0].color) + '<input class="input name-input" id="playerName0" maxlength="18" value="' + escapeHTML(humanName) + '" placeholder="Nama panggilan" autocomplete="off"></div></div>';
  const profile = AI_LEVELS[setupState.difficulty];
  $('#aiRosterPreview').innerHTML = Array.from({length:setupState.count-1},(_,i)=>'<div class="ai-preview-row"><span class="ai-preview-number">0'+(i+1)+'</span><span class="ai-preview-name">'+escapeHTML(AI_NAMES[setupState.difficulty][i])+'<small>Peserta komputer</small></span><strong>'+profile.label+'</strong></div>').join('');
  $('#aiLevelSummary').textContent = profile.subtitle;
}
function openSetup(prefill = null) { if (prefill) setupState.count = Math.max(2, Math.min(4, prefill.length)); setupNameFields(prefill); openModal('setupModal', { focus: '.name-input' }); }

function showScreen(game) {
  $('#landing').classList.toggle('hidden', game);
  $('#siteHeader').classList.toggle('hidden', game);
  $('#game').classList.toggle('hidden', !game);
  window.scrollTo({ top: 0, behavior: 'auto' });
}
function startGameFromSetup() {
 const human=(($('#playerName0')&&$('#playerName0').value.trim())||DEFAULT_NAMES[0]).slice(0,18);
 const names=[human].concat(AI_NAMES[setupState.difficulty].slice(0,setupState.count-1));
 closeModal('setupModal');curtainThrough('Buka palang',()=>beginGame(names));
}
function beginGame(names) {
  resetGame(names);
  Object.values(ui.tweenCancel).forEach((c) => c && c()); ui.tweenCancel = {}; ui.shownMoney = {}; ui.pawnPos = {}; ui.inspected = null; ui.lastCurrent = -1; ui.moveChain = Promise.resolve();
  $$('#pawnLayer .pawn').forEach((n) => n.remove());
  ['cardModal', 'gameOverModal'].forEach(closeModal);
  showScreen(true);
  if (!ui.boardBuilt) buildBoard();
  mountBoardDice(); ui.dice.forEach((d) => d.die.removeAttribute('data-value'));
  state.players.forEach((p) => { ui.shownMoney[p.id] = p.money; });
  setCorePhoto();
  placeControlDeck();
  ensurePawns();
  requestAnimationFrame(() => { state.players.forEach((p) => placePawn(p, p.pos)); renderAll(); layoutPawns(); Hooks.announce(`Permainan dimulai. Giliran ${state.players[0].name}.`); });
}
function setCorePhoto() {
  const el = $('#corePhoto'); el.style.backgroundImage = `url('${IMG.monas}')`;
  const p = CITY_PHOTOS.Jakarta; if (!p) return;
  const img = new Image(); img.referrerPolicy = 'no-referrer'; img.onload = () => { el.style.backgroundImage = `url('${p.src}')`; }; img.src = p.src;
}
function leaveGame() {
  state.runId += 1; state.started = false; state.busy = false;
  ['cardModal', 'gameOverModal'].forEach(closeModal);
  curtainThrough('Kembali', () => showScreen(false));
}

function initEvents() {
  // landing
  ['heroPlay', 'navPlay', 'howPlay'].forEach((id) => $(`#${id}`).addEventListener('click', () => openSetup()));
  ['heroGuide', 'navGuide', 'openRules'].forEach((id) => $(`#${id}`).addEventListener('click', () => Guide.open()));
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: Motion.reduced() ? 'auto' : 'smooth' }));
  // setup modal
  $('#playerCountSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-n]'); if (!b) return; setupState.count = Number(b.dataset.n); setupNameFields(); });
  $('#aiDifficultySeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-difficulty]'); if (!b) return; setupState.difficulty = b.dataset.difficulty; setupNameFields(); });
  $('#startGame').addEventListener('click', startGameFromSetup);
  $('#nameFields').addEventListener('keydown', (e) => { if (e.key === 'Enter') startGameFromSetup(); });
  // game room
  $('#backHome').addEventListener('click', () => { if (state.started && !state.ended && !window.confirm('Keluar dari permainan? Progres ronde ini akan hilang.')) return; leaveGame(); });
  $('#cardContinue').addEventListener('click', () => { closeModal('cardModal'); state.cardOpen = false; renderAll(); if (getCurrentPlayer()?.isAI) scheduleComputerTurn(360); });
  $('#playAgain').addEventListener('click', () => { const names = state.players.map((p) => p.name); closeModal('gameOverModal'); openSetup(names); });
  $('#homeAgain').addEventListener('click', () => { closeModal('gameOverModal'); leaveGame(); });
  // guide
  $('#guideClose').addEventListener('click', () => Guide.close());
  $('#guideBackdrop').addEventListener('click', () => Guide.close());
  $('#guideNext').addEventListener('click', () => Guide.next());
  $('#guidePrev').addEventListener('click', () => Guide.prev());
  $('#guideToc').addEventListener('click', () => Guide.goTo(1));
  $('#book').addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) Guide.goToChapter(g.dataset.goto); });
  let sx = 0; let sy = 0; let tracking = false;
  const stage = $('#bookStage');
  stage.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; tracking = true; });
  stage.addEventListener('pointerup', (e) => { if (!tracking) return; tracking = false; const dx = e.clientX - sx; const dy = e.clientY - sy; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) Guide.next(); else Guide.prev(); } });
  stage.addEventListener('pointercancel', () => { tracking = false; });
  // one delegated listener for actions, close buttons, and tile inspection
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action) { if (!action.disabled) handleAction(action.dataset.action); return; }
    const close = e.target.closest('[data-close]');
    if (close) { const m = modalStack.find((x) => x.id === close.dataset.close); if (!m || m.closable) closeModal(close.dataset.close); return; }
    const tile = e.target.closest('.tile[data-tile]');
    if (tile && state.started) {
      ui.inspected = Number(tile.dataset.tile); renderInspector();
      if (window.matchMedia('(max-width:1100px)').matches) $('#inspector').scrollIntoView({ block: 'nearest', behavior: Motion.reduced() ? 'auto' : 'smooth' });
    }
  });
  // keyboard: one handler for Esc, guide arrows, and focus trapping
  document.addEventListener('keydown', (e) => {
    if (Guide.isOpen) {
      if (e.key === 'Escape') { e.preventDefault(); Guide.close(); return; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); Guide.next(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); Guide.prev(); return; }
      if (e.key === 'Home') { e.preventDefault(); Guide.goTo(0); return; }
      if (e.key === 'End') { e.preventDefault(); Guide.goTo(Guide.maxS()); return; }
      if (e.key === 'Tab') { const f = focusables($('#guide')); if (!f.length) return; const first = f[0]; const last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      return;
    }
    const top = modalStack[modalStack.length - 1];
    if (!top) return;
    if (e.key === 'Escape' && top.closable) { closeModal(top.id); return; }
    if (e.key === 'Tab') { const f = focusables($(`#${top.id}`)); if (!f.length) return; const first = f[0]; const last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  // external images that fail are removed so the illustrated art underneath shows
  document.addEventListener('error', (e) => { if (e.target && e.target.matches && e.target.matches('img[data-photo]')) e.target.remove(); }, true);
  // responsive
  const mq = window.matchMedia('(max-width:700px)'); (mq.addEventListener ? mq.addEventListener('change', placeControlDeck) : mq.addListener(placeControlDeck));
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { Guide.onResize(); if (state.started) { ui.pawnPos && state.players.forEach((p) => placePawn(p, ui.pawnPos[p.id] ?? p.pos)); layoutPawnsStatic(); } }, 120); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (state.started && !state.busy) state.players.forEach((p) => placePawn(p, ui.pawnPos[p.id] ?? p.pos)); }).observe($('#board'));
}

/* =========================================================
   11. INITIALISATION & ERROR HANDLING
   ========================================================= */
function init() {
  initTicker(); initShowcase(); initRegions(); initDemo(); initHeroDice(); initReveal(); initParallax(); initEvents();
  Guide.buildFaces();
  heroIntro();
  window.__nasib = { state, ui, Guide, BOARD }; // read-only handle for debugging in the console
}
window.addEventListener('error', (e) => { console.error('NASIB +62 error:', e.message); });
window.addEventListener('unhandledrejection', (e) => { console.error('NASIB +62 unhandled promise:', e.reason); });
init();

}
