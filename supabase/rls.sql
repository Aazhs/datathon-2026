-- Optional: RLS + grants for a public registration form
-- Run this AFTER schema.sql if you want anonymous inserts enabled.

alter table public.registrations enable row level security;

-- Ensure roles can access the schema + insert into the table
grant usage on schema public to anon, authenticated;
grant insert on table public.registrations to anon, authenticated;

-- Optional: allow viewing for authenticated users only (commented out)
-- grant select on table public.registrations to authenticated;

drop policy if exists "Allow public inserts" on public.registrations;
create policy "Allow public inserts"
  on public.registrations
  for insert
  to anon, authenticated
  with check (true);
