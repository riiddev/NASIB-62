import { createClient } from '@supabase/supabase-js';
import { isSafeClientId, isValidActionPayload, sanitizeGameSnapshot, sanitizeIncomingChat, sanitizeRoster } from './security.js';

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
    this.hostClientId = this.isHost ? this.clientId : null;
    this.lastIntentAt = new Map();
    this.lastChatAt = new Map();
    this.disposed = false;
    this.onUpdate = onUpdate;
    this.bridge = {
      requestAction: (action, payload) => this.requestAction(action, payload),
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
      const roster = sanitizeRoster(this.roster, this.clientId);
      if (!roster) throw new Error('Roster room tidak valid. Muat ulang room dan coba lagi.');
      this.roster = roster;
      this.hostClientId = this.clientId;
      await this.send('lobby-state', { code: this.code, roster: this.roster, hostId: this.clientId, maxPlayers: MAX_PLAYERS });
      this.status = this.roster.length > 1 ? 'Teman sudah masuk. Siap mulai.' : 'Bagikan kode room ke temanmu.';
      this.emit();
    } catch (error) { this.setStatus('Gagal memperbarui lobby.', error.message); }
  }

  receiveLobby(payload = {}) {
    if (this.isHost || this.started || payload.code !== this.code) return;
    const roster = sanitizeRoster(payload.roster, payload.hostId);
    if (!roster) return;
    this.hostClientId = payload.hostId;
    this.roster = roster;
    const mine = this.roster.find((p) => p.clientId === this.clientId);
    if (mine) { this.slot = mine.slot; this.status = this.roster.length > 1 ? 'Lobby tersambung. Menunggu host memulai.' : 'Menunggu teman bergabung…'; }
    else { this.slot = -1; this.status = 'Room sudah penuh (maksimum 4 pemain).'; }
    this.emit();
  }

  async startGame() {
    if (!this.isHost || this.started) throw new Error('Hanya host yang dapat memulai permainan.');
    const roster = sanitizeRoster(this.presenceRoster(), this.clientId);
    if (!roster || roster.length < 2) throw new Error('Butuh minimal 2 pemain valid di room sebelum mulai.');
    if (roster.length > MAX_PLAYERS) throw new Error('Room maksimum 4 pemain.');
    this.roster = roster;
    this.hostClientId = this.clientId;
    const engine = window.NasibEngine;
    if (!engine) throw new Error('Game engine belum siap. Muat ulang halaman.');
    this.started = true;
    this.status = 'Memulai permainan online…';
    this.emit();
    try {
      const snapshot = sanitizeGameSnapshot(await engine.startOnlineGame(this.roster.map((p) => p.name), 0));
      if (!snapshot) throw new Error('Engine menghasilkan state awal yang tidak valid.');
      await this.send('game-start', { code: this.code, hostId: this.clientId, roster: this.roster, snapshot });
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
    if (this.isHost || this.started || payload.code !== this.code) return;
    if (this.hostClientId && payload.hostId !== this.hostClientId) return;
    const roster = sanitizeRoster(payload.roster, payload.hostId);
    const snapshot = sanitizeGameSnapshot(payload.snapshot);
    if (!roster || !snapshot || roster.length !== snapshot.players.length || snapshot.players.some((player, index) => player.name !== roster[index].name)) {
      this.setStatus('Data awal room tidak konsisten.');
      return;
    }
    const mine = roster.find((p) => p.clientId === this.clientId);
    if (!mine) { this.setStatus('Browser ini tidak terdaftar di room host.'); return; }
    this.hostClientId = payload.hostId;
    this.roster = roster;
    this.slot = mine.slot;
    this.started = true;
    try {
      const engine = window.NasibEngine;
      if (!engine) throw new Error('Game engine belum siap. Muat ulang halaman.');
      await engine.startOnlineGame(this.roster.map((p) => p.name), this.slot);
      if (!engine.applySnapshot(snapshot)) throw new Error('State pertandingan ditolak oleh engine.');
      this.status = 'Mabar aktif — giliranmu akan muncul di papan';
      this.emit();
    } catch (error) { this.started = false; this.setStatus('Tidak bisa membuka papan online.', String(error?.message || '').slice(0, 240)); }
  }

  receiveGameState(payload = {}) {
    if (this.isHost || !this.started || payload.code !== this.code || payload.hostId !== this.hostClientId) return;
    const snapshot = sanitizeGameSnapshot(payload.snapshot);
    if (!snapshot || snapshot.players.length !== this.roster.length || snapshot.players.some((player, index) => player.name !== this.roster[index].name)) {
      this.setStatus('Update permainan tidak valid; state terakhir dipertahankan.');
      return;
    }
    if (!window.NasibEngine?.applySnapshot(snapshot)) { this.setStatus('Engine menolak update permainan.'); return; }
    this.status = snapshot.ended ? 'Permainan selesai.' : 'Mabar aktif — state terbaru diterima';
    this.emit();
  }

  requestAction(action, payload) {
    if (!this.started || this.slot < 0 || !isValidActionPayload(action, payload)) return;
    if (this.isHost) { void this.performHostAction(this.slot, action, payload); return; }
    void this.send('intent', { code: this.code, clientId: this.clientId, slot: this.slot, action, payload })
      .catch(() => this.setStatus('Aksi belum terkirim. Periksa koneksi room.'));
  }

  async receiveIntent(payload = {}) {
    if (!this.isHost || !this.started || payload.code !== this.code || !isSafeClientId(payload.clientId) || !isValidActionPayload(payload.action, payload.payload)) return;
    const member = this.roster.find((p) => p.clientId === payload.clientId && p.slot === Number(payload.slot));
    if (!member || !window.NasibEngine?.canAct(member.slot)) return;
    const now = Date.now();
    const previousIntent = this.lastIntentAt.get(member.clientId) || 0;
    if (now - previousIntent < ACTION_RATE_LIMIT_MS) return;
    this.lastIntentAt.set(member.clientId, now);
    await this.performHostAction(member.slot, payload.action, payload.payload);
  }

  async performHostAction(slot, action, payload) {
    const engine = window.NasibEngine;
    if (!this.isHost || !isValidActionPayload(action, payload) || !engine?.canAct(slot)) return;
    try {
      const work = engine.performAction(action, payload);
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
    const snapshot = sanitizeGameSnapshot(window.NasibEngine.getSnapshot());
    if (!snapshot) throw new Error('Engine menghasilkan state permainan yang tidak valid.');
    await this.send('game-state', { code: this.code, hostId: this.clientId, snapshot });
  }

  sendChat(text) {
    const clean = typeof text === 'string' ? text.trim().slice(0, MAX_CHAT_LENGTH) : '';
    if (!clean || !this.connected) return;
    const now = Date.now();
    const previous = this.lastChatAt.get(this.clientId) || 0;
    if (now - previous < CHAT_RATE_LIMIT_MS) return;
    this.lastChatAt.set(this.clientId, now);
    const message = { id: makeClientId(), name: this.name, text: clean, time: new Date(now).toISOString() };
    this.messages = [...this.messages, message].slice(-40);
    this.emit();
    void this.send('chat', { code: this.code, clientId: this.clientId, message })
      .catch(() => this.setStatus('Chat gagal terkirim. Periksa koneksi room.'));
  }
  receiveChat(payload = {}) {
    if (payload?.clientId === this.clientId) return;
    const message = sanitizeIncomingChat(payload, this.code, this.roster);
    if (!message || this.messages.some((entry) => entry.id === message.id)) return;
    const now = Date.now();
    const previous = this.lastChatAt.get(payload.clientId) || 0;
    if (now - previous < CHAT_RATE_LIMIT_MS) return;
    this.lastChatAt.set(payload.clientId, now);
    this.messages = [...this.messages, message].slice(-40);
    this.emit();
  }
  receiveHostLeft(payload = {}) {
    if (payload.code !== this.code || payload.hostId !== this.hostClientId || this.isHost) return;
    this.setStatus('Host meninggalkan room. Sesi online ditutup.');
    void this.disconnect({ notifyHostLeft: false });
  }

  async disconnect({ notifyHostLeft = true } = {}) {
    if (this.disposed) return;
    if (this.isHost && this.connected && notifyHostLeft) {
      await this.send('host-left', { code: this.code, hostId: this.clientId }).catch(() => {});
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
