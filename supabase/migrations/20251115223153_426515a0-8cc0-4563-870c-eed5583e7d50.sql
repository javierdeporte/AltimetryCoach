-- Enable RLS on routes table (if not already enabled)
alter table public.routes enable row level security;

-- Policy to allow anonymous read access to shared and active routes only
drop policy if exists "Anon can read shared routes" on public.routes;

create policy "Anon can read shared routes"
on public.routes
for select
using (
  exists (
    select 1
    from public.shared_routes sr
    where sr.route_id = routes.id
      and sr.is_active = true
  )
);