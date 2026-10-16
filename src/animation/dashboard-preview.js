// The mini-window belongs only to the actual game dashboard. Landing-page
// navigation (Fitur, Cara main, Wilayah, Panduan, Mabar) keeps normal behavior.
const TARGET_SELECTOR = [
  '#game button',
  '#game .tile[data-tile]',
].join(',');

const ACTION_PREVIEWS = {
  roll: {
    eyebrow: 'AKSI GILIRAN', title: 'Lempar dadu', icon: '🎲', stat: '2 DADU',
    description: 'Lempar dua dadu untuk menentukan langkah pionmu di papan.',
    footer: 'Hasil dadu menentukan petak tujuan.',
  },
  buy: {
    eyebrow: 'INVESTASI', title: 'Beli properti', icon: '🏙️', stat: 'TAMBAH ASET',
    description: 'Gunakan saldo untuk membeli tanah ini. Properti bisa menghasilkan sewa.',
    footer: 'Pastikan saldo cukup sebelum membeli.',
  },
  'skip-buy': {
    eyebrow: 'KEPUTUSAN', title: 'Lewati pembelian', icon: '↗', stat: 'JAGA SALDO',
    description: 'Lewati tanah yang ditawarkan dan simpan uang untuk kebutuhan berikutnya.',
    footer: 'Kamu bisa menghindari investasi ini.',
  },
  build: {
    eyebrow: 'KEMBANGKAN ASET', title: 'Bangun rumah', icon: '🏠', stat: 'SEWA NAIK',
    description: 'Tambahkan rumah pada wilayah lengkap milikmu untuk menaikkan pemasukan sewa.',
    footer: 'Biaya pembangunan dipotong dari saldo.',
  },
  continue: {
    eyebrow: 'ALUR PERMAINAN', title: 'Akhiri giliran', icon: '⏭', stat: 'GILIRAN BERIKUT',
    description: 'Selesaikan aksimu dan serahkan giliran ke pemain berikutnya.',
    footer: 'Periksa saldo dan aset sebelum lanjut.',
  },
  bail: {
    eyebrow: 'KELUAR DARI LAPAS', title: 'Bayar jaminan', icon: '🗝️', stat: 'KURANGI SALDO',
    description: 'Bayar biaya jaminan untuk keluar dari lapas tanpa menunggu angka kembar.',
    footer: 'Biaya jaminan akan mengurangi uangmu.',
  },
};

const BUTTON_PREVIEWS = {
  backHome: {
    eyebrow: 'NAVIGASI', title: 'Kembali ke beranda', icon: '⌂', stat: 'MENU UTAMA',
    description: 'Tutup meja permainan dan kembali ke halaman utama NASIB +62.',
    footer: 'Progres ronde yang belum selesai bisa hilang.',
  },
  openRules: {
    eyebrow: 'BUKU PANDUAN', title: 'Lihat aturan permainan', icon: '▤', stat: 'PANDUAN',
    description: 'Buka buku panduan berilustrasi untuk melihat aturan, properti, dan kartu.',
    footer: 'Permainan dijeda saat panduan dibuka.',
  },
  heroPlay: {
    eyebrow: 'MULAI BERMAIN', title: 'Atur pemainmu', icon: '🎲', stat: '2–4 PEMAIN',
    description: 'Pilih jumlah pemain, gaya strategi komputer, lalu mulai permainan.',
    footer: 'Setiap pemain memulai dengan Rp10 juta.',
  },
  navPlay: {
    eyebrow: 'MULAI BERMAIN', title: 'Atur pemainmu', icon: '🎲', stat: '2–4 PEMAIN',
    description: 'Pilih jumlah pemain, gaya strategi komputer, lalu mulai permainan.',
    footer: 'Setiap pemain memulai dengan Rp10 juta.',
  },
  howPlay: {
    eyebrow: 'MULAI BERMAIN', title: 'Coba satu permainan', icon: '🎲', stat: '2–4 PEMAIN',
    description: 'Masuk ke meja dan hadapi dadu, properti, serta kartu kejadian.',
    footer: 'Saldo awal setiap pemain Rp10 juta.',
  },
  heroGuide: {
    eyebrow: 'BUKU PANDUAN', title: 'Kenali aturan NASIB +62', icon: '▤', stat: 'ILUSTRASI + ATURAN',
    description: 'Baca cara bermain, sistem sewa, pembangunan rumah, dan kartu kejadian.',
    footer: 'Bisa ditutup kapan saja untuk lanjut bermain.',
  },
  navGuide: {
    eyebrow: 'BUKU PANDUAN', title: 'Kenali aturan NASIB +62', icon: '▤', stat: 'PANDUAN',
    description: 'Baca cara bermain, sistem sewa, pembangunan rumah, dan kartu kejadian.',
    footer: 'Panduan membantu sebelum mulai bermain.',
  },
  heroOnline: {
    eyebrow: 'MULTIPLAYER', title: 'Mabar online', icon: '♟', stat: 'KODE ROOM',
    description: 'Buat room lalu bagikan kode kepada teman untuk bermain di papan yang sama.',
    footer: 'Maksimal empat pemain dalam satu room.',
  },
  navOnline: {
    eyebrow: 'MULTIPLAYER', title: 'Mabar online', icon: '♟', stat: 'KODE ROOM',
    description: 'Buat room lalu bagikan kode kepada teman untuk bermain di papan yang sama.',
    footer: 'Maksimal empat pemain dalam satu room.',
  },
  demoReplay: {
    eyebrow: 'SIMULASI GILIRAN', title: 'Ulangi contoh', icon: '↻', stat: 'DEMO',
    description: 'Putar lagi contoh lempar dadu, bergerak empat petak, lalu membeli tanah.',
    footer: 'Simulasi ini tidak mengubah saldo permainanmu.',
  },
  toTop: {
    eyebrow: 'NAVIGASI', title: 'Kembali ke atas', icon: '↑', stat: 'AWAL HALAMAN',
    description: 'Luncur kembali ke hero tanpa harus menggulir halaman secara manual.',
    footer: 'Scroll halus mengikuti pengaturan gerakmu.',
  },
  startGame: {
    eyebrow: 'KONFIRMASI', title: 'Buka papan permainan', icon: '▣', stat: 'SIAP BERMAIN',
    description: 'Mulai sesi dengan jumlah pemain dan tingkat strategi yang sudah dipilih.',
    footer: 'Permainan langsung menyiapkan 28 petak.',
  },
  playAgain: {
    eyebrow: 'MAIN LAGI', title: 'Mulai ronde baru', icon: '↻', stat: 'SESI BARU',
    description: 'Atur ulang nama dan pemain untuk memulai permainan berikutnya.',
    footer: 'Saldo kembali ke saldo awal.',
  },
  homeAgain: {
    eyebrow: 'NAVIGASI', title: 'Kembali ke beranda', icon: '⌂', stat: 'MENU UTAMA',
    description: 'Tinggalkan layar hasil dan kembali ke landing NASIB +62.',
    footer: 'Mulai permainan baru dari halaman utama.',
  },
};

const TILE_PREVIEWS = {
  property: {
    eyebrow: 'INFO PROPERTI', icon: '🏙️', stat: 'HARGA & SEWA',
    description: 'Buka petak ini untuk melihat harga tanah, sewa, pemilik, dan jumlah rumah.',
    footer: 'Pilih petak untuk membuka panel detail.',
  },
  start: {
    eyebrow: 'TITIK MULAI', icon: '💵', stat: 'GAJIAN',
    description: 'Lewati START untuk menerima gaji dan menambah saldo permainan.',
    footer: 'Perhatikan posisi pion dan arah langkah.',
  },
  fate: {
    eyebrow: 'KARTU TAKDIR', icon: '✦', stat: 'KEJUTAN',
    description: 'Petak ini membuka kartu Takdir: bisa ada rezeki, bantuan, atau kejadian tak terduga.',
    footer: 'Efek kartu berlaku setelah berhenti di petak.',
  },
  mishap: {
    eyebrow: 'KARTU MUSIBAH', icon: '⚠', stat: 'RISIKO',
    description: 'Buka kartu Musibah dan hadapi biaya atau peristiwa yang menguji saldo.',
    footer: 'Siapkan dana untuk kejadian tak terduga.',
  },
  jail: {
    eyebrow: 'LAPAS', icon: '▥', stat: 'JAMINAN',
    description: 'Cek status lapas dan pilihan untuk bebas dari giliran yang tertahan.',
    footer: 'Angka kembar atau jaminan bisa membantu.',
  },
  pungli: {
    eyebrow: 'BIAYA DADAKAN', icon: '🧾', stat: 'PENGELUARAN',
    description: 'Petak biaya dadakan dapat mengurangi saldo ketika pion berhenti di sini.',
    footer: 'Saldo bersih menentukan daya tahanmu.',
  },
  tax: {
    eyebrow: 'PAJAK', icon: '🧾', stat: 'POTONG SALDO',
    description: 'Siapkan pembayaran pajak saat tiba di petak ini.',
    footer: 'Pengeluaran wajib ikut memengaruhi strategi.',
  },
  toll: {
    eyebrow: 'JALUR TOL', icon: '🛣️', stat: 'BIAYA LEWAT',
    description: 'Petak jalur tol memiliki biaya yang bisa mengubah saldo saat melintas.',
    footer: 'Cek saldo sebelum mengambil risiko.',
  },
  court: {
    eyebrow: 'URUSAN ADMINISTRASI', icon: '⚖', stat: 'PROSES',
    description: 'Petak ini mewakili urusan administrasi dan konsekuensi permainan.',
    footer: 'Lihat detail petak untuk memahami efeknya.',
  },
  tilang: {
    eyebrow: 'TILANG', icon: '🚦', stat: 'DENDA',
    description: 'Perjalanan kadang berujung denda. Periksa biaya yang tertera di petak.',
    footer: 'Biaya kecil juga bisa menumpuk.',
  },
};

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function currentOverlayOpen() {
  return Boolean(document.querySelector('.modal:not(.hidden), #guide:not(.hidden), .online-modal-backdrop'));
}

function makePreviewElement() {
  const root = document.createElement('aside');
  root.className = 'dashboard-preview-window';
  root.setAttribute('role', 'tooltip');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="dashboard-preview-chrome" aria-hidden="true">
      <span class="dashboard-preview-lights"><i></i><i></i><i></i></span>
      <span class="dashboard-preview-brand">NASIB / QUICK PREVIEW</span>
      <span class="dashboard-preview-live">LIVE</span>
    </div>
    <div class="dashboard-preview-main">
      <div class="dashboard-preview-scene" aria-hidden="true">
        <div class="dashboard-preview-scene-glow"></div>
        <span class="dashboard-preview-icon">✦</span>
        <div class="dashboard-preview-scenebars"><i></i><i></i><i></i></div>
      </div>
      <div class="dashboard-preview-copy">
        <span class="dashboard-preview-eyebrow"></span>
        <strong class="dashboard-preview-title"></strong>
        <p class="dashboard-preview-description"></p>
      </div>
    </div>
    <div class="dashboard-preview-footer">
      <span class="dashboard-preview-footnote"></span>
      <span class="dashboard-preview-meter"><i></i></span>
    </div>`;
  document.body.append(root);
  return {
    root,
    icon: root.querySelector('.dashboard-preview-icon'),
    eyebrow: root.querySelector('.dashboard-preview-eyebrow'),
    title: root.querySelector('.dashboard-preview-title'),
    description: root.querySelector('.dashboard-preview-description'),
    footnote: root.querySelector('.dashboard-preview-footnote'),
    meter: root.querySelector('.dashboard-preview-meter i'),
  };
}

function describeTarget(target) {
  if (target.matches('.tile[data-tile]')) {
    const type = Object.keys(TILE_PREVIEWS).find((key) => target.classList.contains(key)) || 'property';
    const base = TILE_PREVIEWS[type];
    const name = normalize(target.querySelector('.nm')?.textContent) || normalize(target.getAttribute('aria-label')) || 'Detail petak';
    const region = normalize(target.querySelector('.sub')?.textContent);
    const price = normalize(target.querySelector('.pr')?.textContent);
    const owned = Boolean(target.querySelector('.own .dot'));
    const houses = target.querySelectorAll('.own .hs svg').length;
    const extras = [region, price, owned ? 'ADA PEMILIK' : '', houses ? `${houses} RUMAH` : ''].filter(Boolean);
    return {
      ...base,
      title: name,
      description: type === 'property'
        ? `${base.description}${region ? ` Wilayah: ${region}.` : ''}`
        : base.description,
      stat: extras[1] || base.stat,
      footer: extras.length ? extras.join(' · ') : base.footer,
      accent: target.querySelector('.band')?.style.backgroundColor || '#58a273',
      key: `tile-${target.dataset.tile}`,
    };
  }

  const action = target.dataset.action;
  if (action && ACTION_PREVIEWS[action]) {
    const base = ACTION_PREVIEWS[action];
    const inspectorName = normalize(target.closest('#inspector')?.querySelector('.body h3')?.textContent);
    const actionText = normalize(target.textContent);
    const title = action === 'continue' && /bonus/i.test(actionText) ? 'Ambil giliran bonus' :
      action === 'continue' && /lanjutkan permainan/i.test(actionText) ? 'Lanjutkan permainan' :
      action === 'build' && /di\s/i.test(actionText) ? actionText.split('·')[0] :
      action === 'buy' && inspectorName ? `Beli ${inspectorName}` : base.title;
    const details = action === 'build' ? 'Rp1 juta per rumah. Sewa petak meningkat sehingga lawan membayar lebih saat mendarat.' :
      action === 'buy' && inspectorName ? `Lihat harga dan potensi sewa ${inspectorName} sebelum uangmu dipakai untuk membeli.` : base.description;
    const trailing = actionText.match(/Rp\s?[\d.,]+/i)?.[0];
    return { ...base, title, description: details, stat: trailing || base.stat, footer: target.disabled ? 'Saldo belum cukup untuk aksi ini.' : base.footer, accent: action === 'buy' ? '#58a273' : action === 'build' ? '#e8b852' : action === 'bail' ? '#d66b5b' : '#7b95eb' };
  }

  if (target.matches('[data-feat]')) {
    return {
      eyebrow: 'FITUR PERMAINAN',
      title: normalize(target.querySelector('strong')?.textContent) || 'Lihat fitur',
      icon: ['🏙️', '🧾', '🏠', '🎴', '📉', '♟️', '🏆'][Number(target.dataset.feat)] || '✦',
      stat: 'PREVIEW FITUR',
      description: normalize(target.querySelector('span')?.textContent) || 'Lihat cara kerja fitur ini di NASIB +62.',
      footer: 'Pilih untuk melihat contoh visual di samping.',
      accent: '#8ca2ed',
    };
  }

  const custom = BUTTON_PREVIEWS[target.id];
  if (custom) return { ...custom, accent: '#d94c43' };

  const label = normalize(target.getAttribute('aria-label') || target.textContent) || 'Aksi';
  const header = normalize(target.closest('#siteHeader') ? 'NAVIGASI' : target.closest('#game') ? 'KONTROL PERMAINAN' : 'AKSI NASIB +62');
  return {
    eyebrow: header,
    title: label.length > 42 ? `${label.slice(0, 39)}…` : label,
    icon: '✦',
    stat: target.disabled ? 'TIDAK TERSEDIA' : 'AKSI',
    description: target.disabled ? 'Aksi ini belum tersedia pada keadaan permainan sekarang.' : `Pilih “${label}” untuk menjalankan aksi ini.`,
    footer: 'Preview ini tidak mengubah permainan.',
    accent: '#8ca2ed',
  };
}

export function initDashboardPreview() {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return () => {};
  if (window.__nasibDashboardPreview) return () => {};

  const ui = makePreviewElement();
  window.__nasibDashboardPreview = true;
  let activeTarget = null;
  let openTimer = 0;
  let closeTimer = 0;
  let raf = 0;
  let visible = false;

  function clearTimers() {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
  }

  function positionPreview(target) {
    if (!target?.isConnected || !ui.root.isConnected) return;
    const rect = target.getBoundingClientRect();
    const box = ui.root.getBoundingClientRect();
    const margin = 12;
    const gap = 13;
    const below = rect.bottom + box.height + gap <= window.innerHeight - margin;
    const top = below ? rect.bottom + gap : Math.max(margin, rect.top - box.height - gap);
    const idealLeft = rect.left + rect.width / 2 - box.width / 2;
    const left = Math.max(margin, Math.min(window.innerWidth - box.width - margin, idealLeft));
    ui.root.style.left = `${Math.round(left)}px`;
    ui.root.style.top = `${Math.round(top)}px`;
    ui.root.dataset.placement = below ? 'bottom' : 'top';
    const originX = Math.max(18, Math.min(box.width - 18, rect.left + rect.width / 2 - left));
    ui.root.style.setProperty('--preview-origin-x', `${originX}px`);
    ui.root.style.setProperty('--preview-origin-y', below ? '0%' : '100%');
  }

  function render(target) {
    const data = describeTarget(target);
    ui.icon.textContent = data.icon || '✦';
    ui.eyebrow.textContent = data.eyebrow || 'NASIB +62';
    ui.title.textContent = data.title || 'Preview aksi';
    ui.description.textContent = data.description || '';
    ui.footnote.textContent = data.footer || 'Preview aksi';
    ui.root.style.setProperty('--preview-accent', data.accent || '#d94c43');
    ui.root.dataset.kind = data.key?.startsWith('tile-') ? 'tile' : data.eyebrow?.includes('FITUR') ? 'feature' : 'action';
    ui.meter.style.width = `${38 + (Math.abs((data.title || '').length * 7) % 58)}%`;
    ui.root.classList.remove('is-visible');
    ui.root.setAttribute('aria-hidden', 'false');
    // Measure only after content changes, then place and let CSS animate in.
    positionPreview(target);
    ui.root.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (!activeTarget || !ui.root.isConnected) return;
      ui.root.classList.add('is-visible');
      visible = true;
    });
  }

  function hide() {
    const wasOpen = Boolean(activeTarget) || visible || ui.root.classList.contains('is-visible');
    activeTarget = null;
    visible = false;
    if (!wasOpen) return;
    ui.root.classList.remove('is-visible');
    ui.root.setAttribute('aria-hidden', 'true');
  }

  function scheduleShow(target, delay = 240) {
    if (!target || target.disabled || currentOverlayOpen()) return;
    if (activeTarget === target && visible) return;
    clearTimers();
    openTimer = window.setTimeout(() => {
      if (!target.isConnected || currentOverlayOpen()) return;
      activeTarget = target;
      render(target);
    }, delay);
  }

  function scheduleHide(delay = 115) {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(hide, delay);
  }

  function onPointerOver(event) {
    if (event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null;
    if (!target || target.disabled || currentOverlayOpen()) return;
    if (target === activeTarget && visible) return;
    scheduleShow(target);
  }

  function onPointerOut(event) {
    const target = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null;
    if (!target) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    scheduleHide();
  }

  function onFocusIn(event) {
    const target = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null;
    if (!target || target.disabled || currentOverlayOpen()) return;
    scheduleShow(target, 70);
  }

  function onFocusOut(event) {
    const current = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null;
    const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest(TARGET_SELECTOR) : null;
    if (current && current !== next) scheduleHide(80);
  }

  function onViewportChange() {
    if (!activeTarget) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!activeTarget?.isConnected) { hide(); return; }
      positionPreview(activeTarget);
    });
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && activeTarget) hide();
  }

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
  window.addEventListener('resize', onViewportChange, { passive: true });

  // Watch actual overlays, not every class change in the app. Observing the
  // preview's own class would create unnecessary observer feedback on hover.
  const overlayObserver = new MutationObserver(() => {
    if (activeTarget && !activeTarget.isConnected) hide();
    if (currentOverlayOpen()) hide();
  });
  overlayObserver.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('.modal, #guide').forEach((overlay) => {
    overlayObserver.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });

  return () => {
    clearTimers();
    if (raf) cancelAnimationFrame(raf);
    overlayObserver.disconnect();
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('pointerout', onPointerOut, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
    ui.root.remove();
    delete window.__nasibDashboardPreview;
  };
}
