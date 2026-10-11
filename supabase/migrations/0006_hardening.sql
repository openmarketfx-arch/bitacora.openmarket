-- ============================================================
-- Open Market — Endurecimiento de las funciones de trigger
-- Responde a los avisos del linter de Supabase:
--   · search_path mutable en funciones de trigger
--   · funciones SECURITY DEFINER expuestas como RPC en /rest/v1/rpc/
-- Ninguna de estas funciones tiene sentido fuera de su trigger.
-- ============================================================

alter function public.set_updated_at()                set search_path = '';
alter function public.trades_sync_estado_revision()   set search_path = '';
alter function public.trades_validate_ownership()     set search_path = public, pg_temp;
alter function public.handle_new_user()               set search_path = public, pg_temp;

-- Se ejecutan como triggers, nunca como RPC: nadie necesita EXECUTE.
revoke execute on function public.set_updated_at()              from public, anon, authenticated;
revoke execute on function public.trades_sync_estado_revision() from public, anon, authenticated;
revoke execute on function public.trades_validate_ownership()   from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
