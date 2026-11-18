-- ==============================================================================
-- ORGANIZA ARY - FINANCIAL MODULE MIGRATION
-- Cash Flow (financial_transactions) & Profit Pillar Rules (profit_pillar_rules)
-- ==============================================================================

-- Ensure updated_at trigger helper exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- 1. FINANCIAL TRANSACTIONS TABLE
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid null references public.events(id) on delete set null,
  date date not null,
  description text not null,
  type text not null check (type in ('entrada', 'saida')),
  category text not null check (category in ('Receita', 'Custo Fixo', 'Custo Variável')),
  amount numeric(10,2) not null check (amount >= 0),
  status text not null check (status in ('Recebido', 'Pago', 'Pendente')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for financial_transactions
create index if not exists idx_financial_transactions_user_date
  on public.financial_transactions(user_id, date);

create index if not exists idx_financial_transactions_event_id
  on public.financial_transactions(event_id);

-- Updated_at trigger for financial_transactions
drop trigger if exists set_financial_transactions_updated_at on public.financial_transactions;
create trigger set_financial_transactions_updated_at
before update on public.financial_transactions
for each row execute function public.handle_updated_at();

-- Enable RLS for financial_transactions
alter table public.financial_transactions enable row level security;

drop policy if exists "Users can view own financial transactions" on public.financial_transactions;
create policy "Users can view own financial transactions"
on public.financial_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own financial transactions" on public.financial_transactions;
create policy "Users can insert own financial transactions"
on public.financial_transactions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    event_id is null
    or exists (
      select 1 from public.events
      where id = event_id and user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can update own financial transactions" on public.financial_transactions;
create policy "Users can update own financial transactions"
on public.financial_transactions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    event_id is null
    or exists (
      select 1 from public.events
      where id = event_id and user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can delete own financial transactions" on public.financial_transactions;
create policy "Users can delete own financial transactions"
on public.financial_transactions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 2. PROFIT PILLAR RULES TABLE
create table if not exists public.profit_pillar_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  percentage numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
  sort_order int not null default 0,
  color text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Index for profit_pillar_rules
create index if not exists idx_profit_pillar_rules_user_sort
  on public.profit_pillar_rules(user_id, sort_order);

-- Updated_at trigger for profit_pillar_rules
drop trigger if exists set_profit_pillar_rules_updated_at on public.profit_pillar_rules;
create trigger set_profit_pillar_rules_updated_at
before update on public.profit_pillar_rules
for each row execute function public.handle_updated_at();

-- Enable RLS for profit_pillar_rules
alter table public.profit_pillar_rules enable row level security;

drop policy if exists "Users can view own profit pillar rules" on public.profit_pillar_rules;
create policy "Users can view own profit pillar rules"
on public.profit_pillar_rules for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own profit pillar rules" on public.profit_pillar_rules;
create policy "Users can insert own profit pillar rules"
on public.profit_pillar_rules for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profit pillar rules" on public.profit_pillar_rules;
create policy "Users can update own profit pillar rules"
on public.profit_pillar_rules for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own profit pillar rules" on public.profit_pillar_rules;
create policy "Users can delete own profit pillar rules"
on public.profit_pillar_rules for delete
to authenticated
using ((select auth.uid()) = user_id);
