-- ============================================================
-- POLLA MUNDIALERA 2026 - Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 2. PREDICTIONS TABLE (one row per user, scores as JSONB)
create table if not exists public.predictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scores jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. REAL RESULTS TABLE (one row per match)
create table if not exists public.real_results (
  match_id int primary key,
  home int not null check (home >= 0 and home <= 20),
  away int not null check (away >= 0 and away <= 20),
  updated_at timestamptz default now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.predictions    enable row level security;
alter table public.real_results   enable row level security;

-- ============================================================
-- POLICIES
-- ============================================================

-- PROFILES: anyone authenticated can read all (for leaderboard),
-- users can only update their own row.
drop policy if exists "profiles_read_all"   on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_read_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- PREDICTIONS: anyone authenticated reads all (leaderboard + viewing),
-- users write only their own, admins write anything.
drop policy if exists "predictions_read_all"    on public.predictions;
drop policy if exists "predictions_insert_own"  on public.predictions;
drop policy if exists "predictions_update_own"  on public.predictions;
drop policy if exists "predictions_admin_all"   on public.predictions;
drop policy if exists "predictions_admin_delete" on public.predictions;

create policy "predictions_read_all"
  on public.predictions for select
  to authenticated
  using (true);

create policy "predictions_insert_own"
  on public.predictions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "predictions_update_own"
  on public.predictions for update
  to authenticated
  using (auth.uid() = user_id);

-- Admin can update/delete any prediction
create policy "predictions_admin_all"
  on public.predictions for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "predictions_admin_delete"
  on public.predictions for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- REAL RESULTS: anyone authenticated reads, only admin writes
drop policy if exists "results_read_all"     on public.real_results;
drop policy if exists "results_admin_write"  on public.real_results;
drop policy if exists "results_admin_update" on public.real_results;
drop policy if exists "results_admin_delete" on public.real_results;

create policy "results_read_all"
  on public.real_results for select
  to authenticated
  using (true);

create policy "results_admin_write"
  on public.real_results for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "results_admin_update"
  on public.real_results for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "results_admin_delete"
  on public.real_results for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- AUTO-CREATE PROFILE + PREDICTION ON NEW USER SIGNUP
-- Admin flag auto-assigned to your email.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    new.email = 'aalbagli@levalcohomes.com'
  );

  insert into public.predictions (user_id, scores)
  values (new.id, '{}'::jsonb);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

drop trigger if exists results_set_updated_at on public.real_results;
create trigger results_set_updated_at
  before update on public.real_results
  for each row execute function public.set_updated_at();

-- ============================================================
-- DONE! Go to Authentication → Email Templates to customize
-- the OTP email (optional).
-- ============================================================
