-- Supabase schema for Datathon 2026 registrations
-- Run this in: Supabase Dashboard -> SQL Editor

create table if not exists public.registrations (
  id bigserial primary key,
  name text not null,
  email text not null,
  phone text not null,
  university text not null,
  department text not null,
  year text not null,
  participation text not null check (participation in ('solo','team')),
  team_name text,
  team_size text,
  team_members jsonb,
  consent text not null,
  registered_at timestamptz not null default now()
);

create index if not exists registrations_registered_at_idx on public.registrations (registered_at desc);
create index if not exists registrations_email_idx on public.registrations (email);
