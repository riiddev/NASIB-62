# NASIB +62 — menyiapkan mabar realtime

Mode mabar menggunakan **Supabase Realtime Broadcast + Presence**. Tidak perlu membuat akun pemain atau membuat tabel game. Host menjadi sumber state gameplay; kode room mengundang 2–4 browser ke channel yang sama. Chat dan perubahan giliran dikirim melalui channel tersebut.

## 1. Buat project Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project.
2. Buka **Connect** atau **Settings → API Keys**.
3. Salin **Project URL** dan **Publishable key** (`sb_publishable_...`). Key legacy `anon` juga didukung.
4. Jangan pakai `secret` atau `service_role` key di browser. Publishable key memang boleh tampil pada frontend; jangan membagikan key dengan hak admin.
5. Pastikan layanan Realtime tersedia/aktif pada project.

## 2. Hubungkan website

Ada dua cara:

- **Paling mudah untuk semua pemain:** di GitHub repo, buka **Settings → Secrets and variables → Actions → Variables** dan buat variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Isi dengan URL dan publishable key dari project. Buka **Actions → Deploy NASIB +62 to GitHub Pages → Run workflow** agar website dibangun ulang dengan koneksi tersebut.
- **Tanpa mengubah workflow:** setiap browser membuka **Mabar Online**, lalu mengisi URL dan publishable key satu kali. Form menyimpan values di local storage browser itu agar tidak perlu mengetik berulang.

## 3. Mulai mabar

1. Host klik **Mabar Online → Buat room baru**.
2. Bagikan kode room yang muncul kepada teman.
3. Teman membuka website yang sama, memilih **Gabung pakai kode**, lalu mengisi kode.
4. Host menekan **Mulai permainan online** ketika minimal dua pemain sudah masuk. Maksimal empat pemain.

## Catatan keamanan dan batasan

- Room memakai kode acak 8 karakter dan channel realtime publik agar teman dapat masuk tanpa akun. Siapa pun yang mengetahui kode dapat mencoba bergabung; bagikan kode hanya ke teman yang diajak.
- Untuk game santai, host browser menjadi pemegang state dan menyiarkan perubahan ke pemain lain. Ini belum merupakan sistem anti-cheat kompetitif yang server-authoritative. Untuk kompetisi berperingkat atau hadiah, pindahkan validasi aksi dan state ke server/Edge Functions serta gunakan private channels dengan autentikasi dan aturan RLS.
- State pertandingan berada di browser host; refresh atau keluarnya host akan memutus sesi. Sistem ini belum menyediakan reconnection/resume setelah host menutup halaman.
- Tidak semua browser menyediakan suara bahasa Indonesia; itu tetap bergantung pada perangkat.
