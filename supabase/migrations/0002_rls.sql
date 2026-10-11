-- ============================================================
-- Open Market — Row Level Security
-- Aislamiento total por user_id. Base lista para multi-tenant.
-- ============================================================

alter table public.trading_accounts enable row level security;
alter table public.instruments      enable row level security;
alter table public.user_instruments enable row level security;
alter table public.tags             enable row level security;
alter table public.trades           enable row level security;
alter table public.trade_tags       enable row level security;
alter table public.market_prices    enable row level security;
alter table public.economic_events  enable row level security;

-- ---------- trading_accounts ----------
drop policy if exists trading_accounts_select on public.trading_accounts;
create policy trading_accounts_select on public.trading_accounts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists trading_accounts_insert on public.trading_accounts;
create policy trading_accounts_insert on public.trading_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists trading_accounts_update on public.trading_accounts;
create policy trading_accounts_update on public.trading_accounts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists trading_accounts_delete on public.trading_accounts;
create policy trading_accounts_delete on public.trading_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- instruments ----------
-- Lectura: catálogo del sistema (user_id null) + los propios.
-- Escritura: solo los propios; el catálogo del sistema es de solo lectura.
drop policy if exists instruments_select on public.instruments;
create policy instruments_select on public.instruments
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));

drop policy if exists instruments_insert on public.instruments;
create policy instruments_insert on public.instruments
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists instruments_update on public.instruments;
create policy instruments_update on public.instruments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists instruments_delete on public.instruments;
create policy instruments_delete on public.instruments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- user_instruments ----------
drop policy if exists user_instruments_select on public.user_instruments;
create policy user_instruments_select on public.user_instruments
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists user_instruments_insert on public.user_instruments;
create policy user_instruments_insert on public.user_instruments
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists user_instruments_delete on public.user_instruments;
create policy user_instruments_delete on public.user_instruments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- tags ----------
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists tags_update on public.tags;
create policy tags_update on public.tags
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists tags_delete on public.tags;
create policy tags_delete on public.tags
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- trades ----------
drop policy if exists trades_select on public.trades;
create policy trades_select on public.trades
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists trades_insert on public.trades;
create policy trades_insert on public.trades
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists trades_update on public.trades;
create policy trades_update on public.trades
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists trades_delete on public.trades;
create policy trades_delete on public.trades
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- trade_tags ----------
-- Sin user_id propio: la pertenencia se hereda de la operación y del tag.
drop policy if exists trade_tags_select on public.trade_tags;
create policy trade_tags_select on public.trade_tags
  for select to authenticated using (
    exists (select 1 from public.trades t
            where t.id = trade_tags.trade_id and t.user_id = (select auth.uid()))
  );

drop policy if exists trade_tags_insert on public.trade_tags;
create policy trade_tags_insert on public.trade_tags
  for insert to authenticated with check (
    exists (select 1 from public.trades t
            where t.id = trade_tags.trade_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g
                where g.id = trade_tags.tag_id and g.user_id = (select auth.uid()))
  );

drop policy if exists trade_tags_delete on public.trade_tags;
create policy trade_tags_delete on public.trade_tags
  for delete to authenticated using (
    exists (select 1 from public.trades t
            where t.id = trade_tags.trade_id and t.user_id = (select auth.uid()))
  );

-- ---------- Cachés de mercado ----------
-- Lectura para cualquier usuario autenticado; la escritura la hace el
-- cron/Edge Function con service_role (que salta RLS). Sin policy de escritura.
drop policy if exists market_prices_select on public.market_prices;
create policy market_prices_select on public.market_prices
  for select to authenticated using (true);

drop policy if exists economic_events_select on public.economic_events;
create policy economic_events_select on public.economic_events
  for select to authenticated using (true);
