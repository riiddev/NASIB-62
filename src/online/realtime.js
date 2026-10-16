import { createClient } from '@supabase/supabase-js';

const ALLOWED_ACTIONS = new Set(['roll', 'buy', 'skip-buy', 'build', 'continue', 'bail', 'card-continue']);
const MAX_PLAYERS = 4;
const MAX_CHAT_LENGTH = 240;

function makeClientId() {
  return globalThis.crypto?.randomUUID?.() || `p-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
function cleanName(value) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, 18) || 'Pemain';
}
function cleanCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }

export function createRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}

export class OnlineRoom {
  constructor({ url, anonKey, name, code, isHost = false, onUpdate = () => {} }) {
    this.url = String(url || '').trim().replace(/\/$/, '');
    this.anonKey = String(anonKey || '').trim();
    this.name = cleanName(name);
    this.code = cleanCode(code);
    this.isHost = Boolean(isHost);
    this.clientId = makeClientId();
    this.joinedAt = Date.now();
    this.client = null;
    this.channel = null;
    this.connected = false;
    this.started = false;
    this.slot = this.isHost ? 0 : -1;
    this.roster = [];
    this.messages = [];
    this.status = 'Menyiapkan koneksi…';
    this.error = '';
    this.lastRosterKey = '';
    this.disposed = false;
    this.onUpdate = onUpdate;
    this.bridge = {
      requestAction: (action) => this.requestAction(action),
      disconnect: () => this.disconnect(),
    };
  }

  state() {
    return {
      code: this.code,
      connected: this.connected,
      started: this.started,
      isHost: this.isHost,
      slot: this.slot,
      name: this.name,
      roster: this.roster.map((p) => ({ ...p })),
      messages: this.messages.map((m) => ({ ...m })),
      status: this.status,
      error: this.error,
    };
  }
  emit() { if (!this.disposed) this.onUpdate(this.state()); }
  setStatus(status, error = '') { this.status = status; this.error = error; this.emit(); }

  async connect() {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(this.url)) throw new Error('URL Supabase harus berupa https://PROJECT.supabase.co.');
    if (this.anonKey.length < 20) throw new Error('Anon/publishable key Supabase belum valid.');
    if (!/^[A-Z0-9]{6,8}$/.test(this.code)) throw new Error('Kode room harus berisi 6–8 huruf/angka.');
    this.client = createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 12 } },
    });
    this.channel = this.client.channel(`nasib62-${this.code}`, {
      config: { broadcast: { self: false, ack: true }, presence: { key: this.clientId } },
    });
    this.channel
      .on('presence', { event: 'sync' }, () => this.handlePresenceSync())
      .on('broadcast', { event: 'lobby-state' }, ({ payload }) => this.receiveLobby(payload))
      .on('broadcast', { event: 'game-start' }, ({ payload }) => { void this.receiveGameStart(payload); })
      .on('broadcast', { event: 'game-state' }, ({ payload }) => this.receiveGameState(payload))
      .on('broadcast', { event: 'intent' }, ({ payload }) => { if (this.isHost) void this.receiveIntent(payload); })
      .on('broadcast', { event: 'chat' }, ({ payload }) => this.receiveChat(payload))
      .on('broadcast', { event: 'host-left' }, ({ payload }) => this.receiveHostLeft(payload));

    await new Promise((resolve, reject) => {
      let settled = false;
      this.channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED' && !settled) {
          settled = true;
          try {
            await this.channel.track({ clientId: this.clientId, name: this.name, isHost: this.isHost, joinedAt: this.joinedAt });
            this.connected = true;
            this.status = this.isHost ? 'Room dibuat. Bagikan kode ke teman.' : 'Terhubung. Menunggu lobby host…';
            window.NasibOnlineBridge = this.bridge;
            this.handlePresenceSync();
            this.emit();
            resolve(true);
          } catch (trackError) {
            settled = true;
            reject(trackError);
          }
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && !settled) {
          settled = true;
          reject(err || new Error(`Koneksi Realtime gagal (${status}). Periksa URL/key dan kebijakan Realtime Supabase.`));
        } else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status) && settled) {
          this.setStatus('Koneksi terputus.', err?.message || status);
        }
      });
    });
    return this.state();
  }

  presenceRoster() {
    if (!this.channel) return [];
    const all = Object.values(this.channel.presenceState()).flat();
    const byId = new Map();
    for (const person of all) {
      if (!person?.clientId || byId.has(person.clientId)) continue;
      byId.set(person.clientId, {
        clientId: String(person.clientId),
        name: cleanName(person.name),
        isHost: Boolean(person.isHost),
        joinedAt: Number(person.joinedAt) || 0,
      });
    }
    return [...byId.values()].sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.joinedAt - b.joinedAt).slice(0, MAX_PLAYERS)
      .map((person, slot) => ({ ...person, slot }));
  }

  handlePresenceSync() {
    if (!this.connected || this.started) return;
    const totalOnline = Object.values(this.channel.presenceState()).flat().filter((p) => p?.clientId).length;
    const roster = this.presenceRoster();
    if (totalOnline > MAX_PLAYERS && !roster.some((p) => p.clientId === this.clientId)) this.status = 'Room sudah penuh (maksimum 4 pemain).';
    if (roster.length) {
      this.roster = roster;
      const mine = roster.find((p) => p.clientId === this.clientId);
      if (mine) this.slot = mine.slot;
    }
    if (this.isHost) {
      const key = JSON.stringify(this.roster.map(({ clientId, name, isHost, slot }) => ({ clientId, name, isHost, slot })));
      if (key !== this.lastRosterKey) { this.lastRosterKey = key; void this.publishLobby(); }
    }
    this.emit();
  }

  async send(event, payload) {
    if (!this.channel || !this.connected) return false;
    const result = await this.channel.send({ type: 'broadcast', event, payload });
    if (result && result !== 'ok') throw new Error(`Kirim data room gagal (${result}).`);
    return true;
  }
  async publishLobby() {
    if (!this.isHost || !this.connected || this.started) return;
    try {
      await this.send('lobby-state', { code: this.code, roster: this.roster, hostId: this.clientId, maxPlayers: MAX_PLAYERS });
      this.status = this.roster.length > 1 ? 'Teman sudah masuk. Siap mulai.' : 'Bagikan kode room ke temanmu.';
      this.emit();
    } catch (error) { this.setStatus('Gagal memperbarui lobby.', error.message); }
  }

  receiveLobby(payload = {}) {
    if (this.isHost || this.started || payload.code !== this.code || !Array.isArray(payload.roster)) return;
    this.roster = payload.roster.slice(0, MAX_PLAYERS).map((p, slot) => ({ ...p, slot }));
    const mine = this.roster.find((p) => p.clientId === this.clientId);
    if (mine) { this.slot = mine.slot; this.status = this.roster.length > 1 ? 'Lobby tersambung. Menunggu host memulai.' : 'Menunggu teman bergabung…'; }
    else { this.slot = -1; this.status = 'Room sudah penuh (maksimum 4 pemain).'; }
    this.emit();
  }

  async startGame() {
    if (!this.isHost || this.started) throw new Error('Hanya host yang dapat memulai permainan.');
    this.roster = this.presenceRoster();
    if (this.roster.length < 2) throw new Error('Butuh minimal 2 pemain di room sebelum mulai.');
    if (this.roster.length > MAX_PLAYERS) throw new Error('Room maksimum 4 pemain.');
    const engine = window.NasibEngine;
    if (!engine) throw new Error('Game engine belum siap. Muat ulang halaman.');
    this.started = true;
    this.status = 'Memulai permainan online…';
    this.emit();
    try {
      const snapshot = await engine.startOnlineGame(this.roster.map((p) => p.name), 0);
      await this.send('game-start', { code: this.code, roster: this.roster, snapshot });
      await this.publishGameState();
      this.status = 'Mabar aktif — semua aksi disinkronkan';
      this.emit();
    } catch (error) {
      this.started = false;
      this.setStatus('Tidak bisa memulai permainan online.', error?.message || String(error));
      throw error;
    }
  }

  async receiveGameStart(payload = {}) {
    if (this.isHost || this.started || payload.code !== this.code || !Array.isArray(payload.roster) || !payload.snapshot) return;
    this.started = true;
    this.roster = payload.roster.slice(0, MAX_PLAYERS).map((p, slot) => ({ ...p, slot }));
    const mine = this.roster.find((p) => p.clientId === this.clientId);
    if (!mine) { this.status = 'Nama browser ini tidak ada di room host.'; this.emit(); return; }
    this.slot = mine.slot;
    try {
      const engine = window.NasibEngine;
      await engine.startOnlineGame(this.roster.map((p) => p.name), this.slot);
      engine.applySnapshot(payload.snapshot);
      this.status = 'Mabar aktif — giliranmu akan muncul di papan';
      this.emit();
    } catch (error) { this.setStatus('Tidak bisa membuka papan online.', error.message); }
  }

  receiveGameState(payload = {}) {
    if (this.isHost || !this.started || payload.code !== this.code || !payload.snapshot) return;
    window.NasibEngine?.applySnapshot(payload.snapshot);
    this.status = payload.snapshot.ended ? 'Permainan selesai.' : 'Mabar aktif — state terbaru diterima';
    this.emit();
  }

  requestAction(action) {
    if (!ALLOWED_ACTIONS.has(action) || !this.started) return;
    if (this.slot < 0) return;
    if (this.isHost) { void this.performHostAction(this.slot, action); return; }
    void this.send('intent', { code: this.code, clientId: this.clientId, slot: this.slot, action })
      .catch((error) => this.setStatus('Aksi belum terkirim.', error.message));
  }

  async receiveIntent(payload = {}) {
    if (!this.isHost || !this.started || payload.code && payload.code !== this.code || !ALLOWED_ACTIONS.has(payload.action)) return;
    const member = this.roster.find((p) => p.clientId === payload.clientId && p.slot === Number(payload.slot));
    if (!member || !window.NasibEngine?.canAct(member.slot)) return;
    await this.performHostAction(member.slot, payload.action);
  }

  async performHostAction(slot, action) {
    const engine = window.NasibEngine;
    if (!this.isHost || !engine?.canAct(slot)) return;
    try {
      const work = engine.performAction(action);
      // Broadcast the busy phase first so clients cannot queue duplicate clicks while dice/movement animate.
      await this.publishGameState();
      await work;
      await this.publishGameState();
    } catch (error) {
      this.setStatus('Aksi permainan gagal diproses.', error.message);
      await this.publishGameState().catch(() => {});
    }
  }

  async publishGameState() {
    if (!this.isHost || !this.started || !window.NasibEngine) return;
    await this.send('game-state', { code: this.code, snapshot: window.NasibEngine.getSnapshot() });
  }

  sendChat(text) {
    const clean = String(text || '').trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean || !this.connected) return;
    const message = { id: makeClientId(), name: this.name, text: clean, time: new Date().toISOString() };
    this.messages = [...this.messages, message].slice(-40);
    this.emit();
    void this.send('chat', { code: this.code, message }).catch((error) => this.setStatus('Chat gagal terkirim.', error.message));
  }
  receiveChat(payload = {}) {
    if (payload.code !== this.code || !payload.message?.id || payload.message.name === this.name && this.messages.some((m) => m.id === payload.message.id)) return;
    if (this.messages.some((m) => m.id === payload.message.id)) return;
    this.messages = [...this.messages, payload.message].slice(-40);
    this.emit();
  }
  receiveHostLeft(payload = {}) {
    if (payload.code !== this.code || this.isHost) return;
    this.setStatus('Host meninggalkan room. Sesi online ditutup.');
    void this.disconnect({ notifyHostLeft: false });
  }

  async disconnect({ notifyHostLeft = true } = {}) {
    if (this.disposed) return;
    if (this.isHost && this.connected && notifyHostLeft) {
      await this.send('host-left', { code: this.code }).catch(() => {});
    }
    this.disposed = true;
    this.connected = false;
    try { if (this.channel) await this.client.removeChannel(this.channel); } catch { /* leave quietly */ }
    try { if (window.NasibOnlineBridge === this.bridge) delete window.NasibOnlineBridge; } catch { /* old browser */ }
    this.onUpdate({ ...this.state(), connected: false, started: this.started, status: 'Keluar dari room.' });
    this.channel = null;
    this.client = null;
  }
}
