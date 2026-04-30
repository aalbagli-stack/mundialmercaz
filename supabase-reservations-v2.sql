-- ============================================================
-- MIGRATION V2: Add confirmation status to reservations
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Add is_confirmed column (default false: pending)
alter table public.reservations
  add column if not exists is_confirmed boolean default false not null;

-- Add confirmed_at timestamp (when CIS confirmed the reservation)
alter table public.reservations
  add column if not exists confirmed_at timestamptz;

-- Add confirmed_by (user id of admin who confirmed)
alter table public.reservations
  add column if not exists confirmed_by uuid references auth.users(id);
