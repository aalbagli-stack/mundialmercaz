-- ============================================================
-- RESERVATIONS FOR COMMUNITY SPACE
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id int not null unique,  -- Only one reservation per match
  guests jsonb not null default '[]'::jsonb,  -- [{name, rut, phone, email, is_merkaz}]
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reservations enable row level security;

-- Any authenticated user can see reservations (to know which matches are taken)
drop policy if exists "reservations_read_all" on public.reservations;
create policy "reservations_read_all"
  on public.reservations for select
  to authenticated using (true);

-- Authenticated users can create their own reservations
drop policy if exists "reservations_insert_own" on public.reservations;
create policy "reservations_insert_own"
  on public.reservations for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own reservations
drop policy if exists "reservations_update_own" on public.reservations;
create policy "reservations_update_own"
  on public.reservations for update
  to authenticated
  using (auth.uid() = user_id);

-- Admin can update anyone's reservation
drop policy if exists "reservations_update_admin" on public.reservations;
create policy "reservations_update_admin"
  on public.reservations for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Users can delete their own reservation
drop policy if exists "reservations_delete_own" on public.reservations;
create policy "reservations_delete_own"
  on public.reservations for delete
  to authenticated
  using (auth.uid() = user_id);

-- Admin can delete any reservation
drop policy if exists "reservations_delete_admin" on public.reservations;
create policy "reservations_delete_admin"
  on public.reservations for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Updated_at trigger
drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();
