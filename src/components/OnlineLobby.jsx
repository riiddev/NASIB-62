import React, { useCallback, useEffect, useRef, useState } from 'react';

const URL_STORAGE = 'nasib62-supabase-url';
const KEY_STORAGE = 'nasib62-supabase-anon-key';
const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const NAME_STORAGE = 'nasib62-player-name';
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * chars.length);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}
function saved(key, fallback = '') { try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; } }
function localTime(value) { try { return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); } catch { return ''; } }

export default function OnlineLobby() {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState(() => DEFAULT_URL || saved(URL_STORAGE));
  const [anonKey, setAnonKey] = useState(() => DEFAULT_KEY || saved(KEY_STORAGE));
  const [name, setName] = useState(() => saved(NAME_STORAGE, 'Riid'));
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState({ code: '', connected: false, started: false, isHost: false, slot: -1, roster: [], messages: [], status: '', error: '' });
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [chatText, setChatText] = useState('');
  const roomRef = useRef(null);
  const chatListRef = useRef(null);
  const visibleRef = useRef(false);
  visibleRef.current = visible;

  const handleUpdate = useCallback((next) => {
    setSession((previous) => ({ ...previous, ...next }));
    if (next.started && next.connected) setVisible(false);
    if (next.started && !next.connected) setVisible(true);
  }, []);

  useEffect(() => {
    const open = () => { setVisible(true); setNotice(''); };
    window.addEventListener('nasib:online-open', open);
    return () => window.removeEventListener('nasib:online-open', open);
  }, []);

  useEffect(() => {
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [session.messages]);

  const saveConfig = () => {
    try {
      window.localStorage.setItem(URL_STORAGE, url.trim());
      window.localStorage.setItem(KEY_STORAGE, anonKey.trim());
      window.localStorage.setItem(NAME_STORAGE, name.trim());
    } catch { /* Private mode may block local storage; the current form still works. */ }
  };

  const connectRoom = async (host) => {
    if (pending) return;
    if (!url.trim() || !anonKey.trim() || !name.trim()) {
      setNotice('Isi URL Supabase, anon/publishable key, dan nama panggilan terlebih dahulu.');
      return;
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url.trim())) {
      setNotice('URL Supabase harus berformat https://PROJECT.supabase.co.');
      return;
    }
    const code = host ? generateRoomCode() : roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!host && code.length < 6) {
      setNotice('Masukkan kode room 6–8 karakter dari temanmu.');
      return;
    }
    setPending(true); setNotice(host ? 'Membuat room realtime…' : 'Mencari room teman…');
    saveConfig();
    try {
      const { OnlineRoom } = await import('../online/realtime.js');
      const room = new OnlineRoom({ url, anonKey, name, code, isHost: host, onUpdate: handleUpdate });
      roomRef.current = room;
      await room.connect();
      setRoomCode(code);
      setNotice('');
      setVisible(true);
    } catch (error) {
      await roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
      const raw = error?.message || 'Tidak dapat menyambung ke Supabase Realtime.';
      setNotice(/channel error|transport failure|timed out|failed to fetch/i.test(raw) ? 'Koneksi Supabase gagal. Periksa URL dan publishable key, koneksi internet, serta layanan Realtime pada project.' : raw);
    } finally { setPending(false); }
  };

  const disconnectRoom = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (window.NasibEngine?.isOnline()) window.NasibEngine.leaveOnlineGame?.();
    else await room?.disconnect();
    setSession({ code: '', connected: false, started: false, isHost: false, slot: -1, roster: [], messages: [], status: '', error: '' });
    setNotice('Kamu sudah keluar dari room.');
    setVisible(true);
  };

  const beginOnline = async () => {
    setPending(true); setNotice('Host sedang membuka papan untuk semua pemain…');
    try { await roomRef.current?.startGame(); setNotice(''); }
    catch (error) { setNotice(error?.message || 'Gagal memulai mabar.'); }
    finally { setPending(false); }
  };

  const sendChat = (event) => {
    event.preventDefault();
    const value = chatText.trim();
    if (!value) return;
    roomRef.current?.sendChat(value);
    setChatText('');
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(session.code || roomCode); setNotice('Kode room berhasil disalin. Kirim ke temanmu.'); }
    catch { setNotice('Pilih dan salin kode room yang tampil.'); }
  };

  const roomActive = session.connected;
  return <>
    {!session.started && visible && <div className="online-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !roomActive) setVisible(false); }}>
      <section className="online-modal" role="dialog" aria-modal="true" aria-labelledby="onlineTitle">
        <button className="online-close" type="button" aria-label="Tutup mabar" onClick={() => roomActive ? void disconnectRoom() : setVisible(false)}>×</button>
        <span className="eyebrow">NASIB +62 / MULTIPLAYER</span>
        <h2 id="onlineTitle">Mabar tanpa akun.</h2>
        <p className="lede">Buat room, kirim kode ke teman, lalu main bergantian di papan yang sama. Maksimal empat pemain; state permainan dikendalikan host dan disiarkan real-time.</p>
        {!roomActive ? <>
          <div className="online-grid">
            <div className="online-field"><label htmlFor="onlineName">Nama panggilan</label><input id="onlineName" maxLength={18} autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama kamu"/></div>
            <div className="online-field"><label htmlFor="onlineRoomCode">Kode room teman</label><input id="onlineRoomCode" maxLength={8} value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="CONTOH: 7K2M9Q" autoCapitalize="characters"/></div>
          </div>
          <div className="online-field"><label htmlFor="onlineSupabaseUrl">Supabase project URL</label><input id="onlineSupabaseUrl" inputMode="url" autoComplete="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://project-id.supabase.co"/></div>
          <div className="online-field"><label htmlFor="onlineSupabaseKey">Supabase anon / publishable key</label><input id="onlineSupabaseKey" type="password" autoComplete="off" value={anonKey} onChange={(event) => setAnonKey(event.target.value)} placeholder="sb_publishable_… atau anon key"/></div>
          <p className="online-help">Koneksi realtime memerlukan project Supabase. Jika owner sudah menyiapkan koneksi di website, dua kolom ini akan terisi otomatis. Kalau kosong, masukkan Project URL dan publishable/anon key — jangan pernah service-role key. Nilai yang kamu isi disimpan di browser ini. <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Buka Supabase Dashboard ↗</a></p>
          <div className="online-actions"><button className="btn btn-primary" type="button" disabled={pending} onClick={() => void connectRoom(true)}>{pending ? 'Menyambungkan…' : 'Buat room baru'}</button><button className="btn btn-dark" type="button" disabled={pending} onClick={() => void connectRoom(false)}>Gabung pakai kode</button></div>
        </> : <>
          <div className="online-room-code">{session.code}</div>
          <button className="online-mini-btn" style={{ color: '#12162a', borderColor: '#c9c6bc', background: '#fffdf7' }} type="button" onClick={() => void copyCode()}>Salin kode untuk teman</button>
          <div className="online-statusline" data-kind={notice ? 'error' : 'success'}>{notice || session.status}</div>
          <div className="online-roster">{session.roster.map((player) => <div className="online-roster-row" key={player.clientId}><span className="online-roster-num">{String(player.slot + 1).padStart(2, '0')}</span><span className="online-roster-name">{player.name}{player.clientId === roomRef.current?.clientId ? ' (kamu)' : ''}</span><span className="online-roster-label">{player.isHost ? 'HOST' : 'PEMAIN'}</span><span className="online-led"/></div>)}</div>
          <p className="online-help">{session.roster.length}/4 pemain tersambung. Kode ini adalah tiket masuk — kirimkan hanya kepada teman yang kamu ajak.</p>
          {session.isHost ? <button className="btn btn-primary btn-wide" type="button" disabled={pending || session.roster.length < 2} onClick={() => void beginOnline()}>{session.roster.length < 2 ? 'Menunggu minimal 2 pemain' : pending ? 'Membuka papan…' : 'Mulai permainan online'}</button> : <p className="online-statusline">Kamu masuk sebagai pemain #{session.slot + 1}. Host akan memulai permainan setelah semua siap.</p>}
          <button className="btn btn-quiet btn-wide" style={{ marginTop: 8 }} type="button" disabled={pending} onClick={() => void disconnectRoom()}>Keluar dari room</button>
        </>}
        {(notice || session.error) && <p className="online-statusline" data-kind="error" role="status">{session.error || notice}</p>}
        {!roomActive && <p className="online-help">Mabar memakai satu state permainan yang dijalankan host. Semua pemain perlu memakai URL dan public key dari project Supabase yang sama.</p>}
      </section>
    </div>}

    {session.connected && session.started && <aside className="online-game-dock" aria-label="Panel mabar online">
      <div className="online-game-head"><span className="online-led"/><strong>MABAR ONLINE</strong><span className="online-code-small">{session.code}</span></div>
      <div className="online-game-buttons"><button className="online-mini-btn" type="button" onClick={() => { setVisible(true); setNotice(''); }}>Pemain ({session.roster.length}/4)</button><button className="online-mini-btn" type="button" onClick={() => void copyCode()}>Salin kode</button><button className="online-mini-btn" type="button" onClick={() => void disconnectRoom()}>Keluar</button></div>
      <div className="online-chat"><div className="online-chat-list" ref={chatListRef} aria-live="polite">{session.messages.length ? session.messages.map((message) => <div className="online-chat-message" key={message.id}><b>{message.name}</b>{message.text}<span style={{ float: 'right', color: 'rgba(255,255,255,.38)', fontSize: 9 }}>{localTime(message.time)}</span></div>) : <p className="online-chat-message" style={{ color: 'rgba(255,255,255,.5)' }}>Chat room kosong. Ajak temanmu ngobrol sambil bermain.</p>}</div><form className="online-chat-form" onSubmit={sendChat}><input maxLength={240} value={chatText} onChange={(event) => setChatText(event.target.value)} aria-label="Pesan chat" placeholder="Tulis pesan…"/><button type="submit" disabled={!chatText.trim()}>Kirim</button></form></div>
      {session.status && <p style={{ padding: '0 12px 10px', margin: 0, color: 'rgba(255,255,255,.5)', fontSize: 10 }}>{session.status}</p>}
    </aside>}
  </>;
}
