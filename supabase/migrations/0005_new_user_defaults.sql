-- ============================================================
-- Open Market — Provisión inicial de un usuario nuevo
-- Al registrarse se le crea una cuenta de trading por defecto para que
-- pueda registrar operaciones sin pasar antes por Configuración.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.trading_accounts (user_id, nombre, broker, moneda_base, tipo, activo)
  values (new.id, 'Cuenta principal', null, 'USD', 'real', true)
  on conflict do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
