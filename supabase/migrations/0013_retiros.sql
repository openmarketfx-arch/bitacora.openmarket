-- ============================================================
-- Retiros de dinero de una cuenta de trading
--
-- Un retiro baja el saldo de la cuenta sin ser una pérdida de trading. La app calcula
--   saldo = capital_inicial + resultado neto de lo cerrado - retiros
-- y ese saldo es la base de los límites de riesgo, de modo que la bitácora trabaja
-- siempre sobre el capital real y retirar ganancias no cuenta como perder.
--
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================

create table if not exists public.account_withdrawals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  -- on delete restrict, como en trades: una cuenta con historial no se borra.
  trading_account_id  uuid not null references public.trading_accounts(id) on delete restrict,
  monto               numeric(18, 2) not null check (monto > 0),
  fecha_hora          timestamptz not null default now(),
  nota                text check (nota is null or length(nota) <= 200),
  created_at          timestamptz not null default now()
);

create index if not exists account_withdrawals_cuenta_fecha_idx
  on public.account_withdrawals (trading_account_id, fecha_hora desc);
create index if not exists account_withdrawals_user_idx
  on public.account_withdrawals (user_id);

-- La cuenta referenciada debe ser del mismo usuario.
create or replace function public.account_withdrawals_validate_ownership()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  if not exists (
    select 1 from public.trading_accounts a
    where a.id = new.trading_account_id and a.user_id = new.user_id
  ) then
    raise exception 'La cuenta de trading no pertenece al usuario';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_account_withdrawals_ownership on public.account_withdrawals;
create trigger trg_account_withdrawals_ownership
  before insert or update of trading_account_id, user_id
  on public.account_withdrawals for each row
  execute function public.account_withdrawals_validate_ownership();

-- Solo se ejecuta como trigger, nunca como RPC.
revoke execute on function public.account_withdrawals_validate_ownership()
  from public, anon, authenticated;

-- ---------- RLS: aislamiento total por user_id ----------
alter table public.account_withdrawals enable row level security;

drop policy if exists account_withdrawals_select on public.account_withdrawals;
create policy account_withdrawals_select on public.account_withdrawals
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists account_withdrawals_insert on public.account_withdrawals;
create policy account_withdrawals_insert on public.account_withdrawals
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists account_withdrawals_update on public.account_withdrawals;
create policy account_withdrawals_update on public.account_withdrawals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists account_withdrawals_delete on public.account_withdrawals;
create policy account_withdrawals_delete on public.account_withdrawals
  for delete to authenticated using (user_id = (select auth.uid()));
