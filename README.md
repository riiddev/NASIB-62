# NASIB +62 — Simulasi Warga

Boardgame ekonomi satir tentang uang, tanah, dan kejutan hidup sehari-hari. UI mulai dipindah ke React + Vite; engine lama dipertahankan sebagai modul kompatibilitas agar aturan dan interaksi yang ada tidak hilang selama migrasi.

## Stack
- React + Vite untuk komposisi UI.
- GSAP via npm untuk animasi.
- Remotion Player untuk intro deterministik 5 detik (150 frame @ 30 fps) di browser, bukan MP4 terpisah.
- Web Audio API untuk SFX dadu/transaksi/kartu/kemenangan, dan Speech Synthesis jika voice Indonesia tersedia.
- CSS responsif dan ilustrasi lokal di `public/assets/`.

## Mulai
Gunakan Node.js 20+.
```sh
npm install
npm run dev
```
Build `npm run build`; pemeriksaan sintaks `npm run check`.

## Struktur
```text
index.html
public/assets/                  gambar WebP yang dipisah dari HTML asli
src/App.jsx                    shell React
src/animation/gsap.js          GSAP bootstrap
src/audio/audio.js             SFX, ambience, voice fallback
src/components/                intro & audio controls
src/remotion/NasibIntro.jsx    intro 5s @ 30fps
src/legacy/engine.js           engine kompatibilitas game
src/legacy/markup/             landing, board, modal, panduan
src/styles/                    CSS game & intro
```

## Lawan komputer
Satu pemain manusia melawan 1–3 AI. Pilih **STAF FRAKSI**, **ELIT KABINET**, atau **OLIGARKI NASIONAL**. Semua memulai dengan saldo setara; level mengubah heuristik strategi, bukan dadu atau bonus uang.

## Catatan Remotion

Intro 5 detik menggunakan Remotion Player dalam browser. Sebelum rilis publik atau penggunaan komersial, tinjau ketentuan lisensi Remotion yang berlaku untuk skala penggunaan proyek ini. Render MP4 belum termasuk dalam repo.

## Audio
Efek lokal berbasis Web Audio API; ambience kota opsional. Voice memanfaatkan `SpeechSynthesis` ID jika ada di perangkat. Browser memerlukan interaksi pertama sebelum audio boleh aktif.

## Referensi
[Video referensi 1](https://youtu.be/OEyiAVH1OaU), [video 2](https://youtu.be/uhV_9ZpYpV4), [WNI Simulator](https://wnisimulator.hecticholic.id/#reasons). NASIB +62 adalah proyek independen dan bukan produk resmi WNI Simulator/Hecticholic.

## Batasan migrasi
Untuk menghindari rewrite berisiko, engine game masih menggunakan DOM selector yang ada. Markup dipisah menjadi beberapa fragment HTML dan di-compose oleh React; ini adalah tahap migrasi, belum konversi penuh semua interaksi ke komponen/state React.
