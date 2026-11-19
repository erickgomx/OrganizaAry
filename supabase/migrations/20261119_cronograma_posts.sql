-- ==============================================================================
-- ORGANIZA ARY - CRONOGRAMA DE POSTAGENS MIGRATION
-- Social Content Schedule (social_posts)
-- ==============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid null references public.clients(id) on delete set null,
  scheduled_date date not null,
  scheduled_time text not null default '18:00',
  social_network text not null check (social_network in ('Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook', 'Outro')),
  format text not null check (format in ('Reels', 'Carrossel', 'Estático', 'Stories', 'Shorts', 'Outro')),
  theme text not null,
  caption text not null default '',
  status text not null check (status in ('Aprovado', 'Publicado', 'Pendente', 'Em Revisão', 'Ajustar', 'Reprovado')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_social_posts_user_date
  on public.social_posts(user_id, scheduled_date);

create index if not exists idx_social_posts_client_id
  on public.social_posts(client_id);

drop trigger if exists set_social_posts_updated_at on public.social_posts;
create trigger set_social_posts_updated_at
before update on public.social_posts
for each row execute function public.handle_updated_at();

alter table public.social_posts enable row level security;

drop policy if exists "Users can view own social posts" on public.social_posts;
create policy "Users can view own social posts"
on public.social_posts for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own social posts" on public.social_posts;
create policy "Users can insert own social posts"
on public.social_posts for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients
      where id = client_id and user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can update own social posts" on public.social_posts;
create policy "Users can update own social posts"
on public.social_posts for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients
      where id = client_id and user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can delete own social posts" on public.social_posts;
create policy "Users can delete own social posts"
on public.social_posts for delete
to authenticated
using ((select auth.uid()) = user_id);
