-- ============================================================
-- MIGRATION V3: Allow multiple users to reserve same match
-- (each with their own guests, up to a daily capacity limit).
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Drop the old unique constraint on match_id (only one reservation per match)
alter table public.reservations drop constraint if exists reservations_match_id_key;

-- Also drop the PRIMARY KEY constraint if it's on match_id
-- Note: if match_id was the primary key, we need to restructure.
-- Check current structure first: the table likely has (id) as PK now.

-- Add composite unique (user_id, match_id) so each user can have
-- at most one reservation per match (but can edit it to add more guests).
alter table public.reservations
  drop constraint if exists reservations_user_match_key;
alter table public.reservations
  add constraint reservations_user_match_key unique (user_id, match_id);

-- Ensure the table has an id primary key (it should already)
-- If not, uncomment these lines:
-- alter table public.reservations drop constraint if exists reservations_pkey;
-- alter table public.reservations add column if not exists id uuid default gen_random_uuid();
-- alter table public.reservations add primary key (id);
