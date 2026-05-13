-- Jalankan file ini di Supabase SQL Editor.
-- Semua tabel dipisah per user menggunakan owner_id.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings' and column_name = 'nama_sekolah'
  ) then
    execute 'alter table public.app_settings rename column nama_sekolah to nama_madrasah';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings' and column_name = 'alamat'
  ) then
    execute 'alter table public.app_settings rename column alamat to alamat_madrasah';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings' and column_name = 'kota'
  ) then
    execute 'alter table public.app_settings rename column kota to kabupaten_kota';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings' and column_name = 'kepala_sekolah'
  ) then
    execute 'alter table public.app_settings rename column kepala_sekolah to nama_kepala_madrasah';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings' and column_name = 'logo'
  ) then
    execute 'alter table public.app_settings rename column logo to logo_url';
  end if;
end $$;

create table if not exists public.app_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  nama_madrasah text not null,
  alamat_madrasah text not null,
  kabupaten_kota text not null,
  tahun_pelajaran text not null,
  nama_kepala_madrasah text not null,
  nip_kepala text not null,
  logo_url text not null,
  persen_rapor integer not null default 60,
  persen_ujian integer not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings add column if not exists nip_kepala text not null default '-';

create table if not exists public.students (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  nisn text not null,
  nama text not null,
  kelas text not null,
  tahun_ajaran text not null,
  status text not null check (status in ('aktif', 'lulus')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kode_mapel text not null,
  nama_mapel text not null,
  kelompok text not null,
  urutan integer not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_grades (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  s1 numeric(5,2) not null default 0,
  s2 numeric(5,2) not null default 0,
  s3 numeric(5,2) not null default 0,
  s4 numeric(5,2) not null default 0,
  s5 numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, student_id, subject_id)
);

create table if not exists public.exam_grades (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  nilai_ujian numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, student_id, subject_id)
);

alter table public.app_settings enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.report_grades enable row level security;
alter table public.exam_grades enable row level security;

drop policy if exists app_settings_owner_all on public.app_settings;
create policy app_settings_owner_all on public.app_settings
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists students_owner_all on public.students;
create policy students_owner_all on public.students
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists subjects_owner_all on public.subjects;
create policy subjects_owner_all on public.subjects
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists report_owner_all on public.report_grades;
create policy report_owner_all on public.report_grades
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists exam_owner_all on public.exam_grades;
create policy exam_owner_all on public.exam_grades
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);