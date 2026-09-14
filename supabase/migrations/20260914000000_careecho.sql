create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  assistant_name text not null default 'Ada',
  preferred_language text not null default 'en',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  read_aloud boolean not null default false,
  large_text boolean not null default false,
  high_contrast boolean not null default false,
  voice_first boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_entries (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_transcript text not null,
  summary text not null default '',
  structured_data jsonb not null default '{}'::jsonb,
  language text not null default 'en',
  source_type text not null default 'PATIENT_REPORTED',
  engine text,
  edited boolean not null default false,
  is_demo boolean not null default false,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.visits (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default 'en',
  status text not null default 'completed',
  raw_transcript text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  audio_path text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.voice_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  visit_id text,
  question text not null,
  answer jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.health_entries enable row level security;
alter table public.visits enable row level security;
alter table public.voice_queries enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "preferences own rows" on public.user_preferences;
create policy "preferences own rows" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "health entries own rows" on public.health_entries;
create policy "health entries own rows" on public.health_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "visits own rows" on public.visits;
create policy "visits own rows" on public.visits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "voice queries own rows" on public.voice_queries;
create policy "voice queries own rows" on public.voice_queries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
