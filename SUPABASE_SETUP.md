# Panduan Supabase Untuk Aplikasi Pengolah Nilai Ijazah

Panduan ini menjelaskan cara mengaktifkan mode multi-user cloud (Supabase) pada aplikasi ini.

## 1. Buat Project Supabase

1. Buka https://supabase.com
2. Login lalu klik **New project**
3. Isi nama project, password database, region, lalu tunggu provisioning selesai

## 2. Jalankan Skema Database

1. Buka menu **SQL Editor** di dashboard Supabase
2. Buka file `supabase-schema.sql` dari project ini
3. Salin seluruh isi file
4. Paste ke SQL Editor, lalu klik **Run**

Catatan:
- File ini sudah mencakup tabel, relasi, RLS policy, dan migrasi rename kolom settings lama ke baru.

## 3. Aktifkan Metode Login Email/Password

1. Masuk ke **Authentication** -> **Providers**
2. Pastikan **Email** dalam keadaan aktif
3. Jika ingin login tanpa verifikasi email, nonaktifkan konfirmasi email di pengaturan auth project

## 4. Ambil Kredensial Project

1. Masuk ke **Project Settings** -> **API**
2. Salin:
- **Project URL**
- **anon public key**

## 5. Buat File Environment Lokal

Di root project, buat file `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 6. Jalankan Aplikasi

1. Install dependency jika belum:

```bash
npm install
```

2. Jalankan mode development:

```bash
npm run dev
```

3. Buka aplikasi, lalu:
- Registrasi user baru dari halaman login
- Login user
- Semua data akan tersimpan per user (`owner_id`), terpisah antar akun

## 7. Cara Kerja Multi User

- Setiap data (siswa, mapel, nilai, settings) memiliki `owner_id`
- RLS policy memastikan user hanya bisa mengakses data miliknya sendiri
- Fitur reset password di menu Pengaturan Sistem akan update password user aktif

## 8. Jika Supabase Belum Diisi

Jika env Supabase tidak diisi, aplikasi otomatis jalan dalam mode lokal (localStorage) agar tetap bisa dipakai.

## 9. Troubleshooting

### Error login meski akun benar
- Cek apakah provider Email aktif
- Cek apakah akun perlu verifikasi email

### Data tidak bisa disimpan
- Pastikan `supabase-schema.sql` sudah dijalankan
- Cek RLS policy di tabel `app_settings`, `students`, `subjects`, `report_grades`, `exam_grades`

### Error kolom settings tidak ditemukan
- Jalankan ulang isi terbaru `supabase-schema.sql` (sudah ada migrasi rename kolom lama ke baru)

## 10. Rekomendasi Produksi

- Gunakan domain deployment yang aman (HTTPS)
- Atur Auth URL config di Supabase jika pakai redirect
- Backup berkala database Supabase