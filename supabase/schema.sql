-- ==============================================================================
-- ORGANIZA ARY - DATABASE SCHEMA & RLS POLICIES
-- Platform for Photographic & Audiovisual Workflow Management
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
do $$ begin
  create type public.event_status as enum (
    'budget_lead',      -- Orçamento / Lead
    'scheduled',        -- Agendado
    'captured',         -- Captação Concluída
    'post_production',  -- Pós-Produção
    'finished'          -- Finalizado
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_priority as enum (
    'low',              -- Baixa
    'medium',           -- Média
    'high',             -- Alta
    'urgent'            -- Urgente
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum (
    'todo',             -- A Fazer
    'in_progress',      -- Em Andamento
    'done'              -- Concluído
  );
exception
  when duplicate_object then null;
end $$;

-- 3. PROFILES TABLE (Stores user info and offline Google OAuth tokens)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  google_refresh_token text,
  google_access_token text,
  token_expires_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. CLIENTS TABLE (CRM)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. EVENTS TABLE (Captações)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  date timestamptz not null,
  location text,
  status public.event_status not null default 'budget_lead',
  price numeric(12, 2) not null default 0.00,
  google_event_id text,
  drive_folder_url text,
  drive_folder_id text,
  meet_link text,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 6. TASKS TABLE (Pós-Produção & Kanban)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date timestamptz,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==============================================================================
create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_events_user_id on public.events(user_id);
create index if not exists idx_events_client_id on public.events(client_id);
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_event_id on public.tasks(event_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

-- ==============================================================================
-- AUTOMATIC TIMESTAMPS & BUSINESS LOGIC TRIGGERS
-- ==============================================================================

-- Function: update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Triggers for updated_at
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.handle_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.handle_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.handle_updated_at();

-- Function: Auto create profile on user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Function: Synchronize task is_done flag with status
create or replace function public.sync_task_status_done()
returns trigger as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.is_done = true;
  elsif new.is_done = true and (new.status is distinct from 'done') then
    new.status = 'done';
  elsif new.is_done = false and new.status = 'done' then
    new.status = 'todo';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_task_done_sync on public.tasks;
create trigger set_task_done_sync
before insert or update on public.tasks
for each row execute function public.sync_task_status_done();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: users can only see & manipulate their own data
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- CLIENTS POLICIES
drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can view own clients"
on public.clients for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients"
on public.clients for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients"
on public.clients for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients"
on public.clients for delete
to authenticated
using (auth.uid() = user_id);

-- EVENTS POLICIES
drop policy if exists "Users can view own events" on public.events;
create policy "Users can view own events"
on public.events for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.events;
create policy "Users can insert own events"
on public.events for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.clients
    where id = client_id and user_id = auth.uid()
  )
);

drop policy if exists "Users can update own events" on public.events;
create policy "Users can update own events"
on public.events for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.clients
    where id = client_id and user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own events" on public.events;
create policy "Users can delete own events"
on public.events for delete
to authenticated
using (auth.uid() = user_id);

-- TASKS POLICIES
drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks"
on public.tasks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
on public.tasks for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    event_id is null
    or exists (
      select 1 from public.events
      where id = event_id and user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    event_id is null
    or exists (
      select 1 from public.events
      where id = event_id and user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
on public.tasks for delete
to authenticated
using (auth.uid() = user_id);
