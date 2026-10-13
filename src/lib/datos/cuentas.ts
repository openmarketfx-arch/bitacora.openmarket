import { createClient } from "@/lib/supabase/server";
import type { Retiro, TradingAccount } from "@/lib/types";

/** Cuentas del usuario con su capital y sus límites de pérdida (RLS recorta a las suyas). */
export async function listarCuentas(): Promise<TradingAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");

  if (error) throw new Error(`No se pudieron cargar las cuentas: ${error.message}`);
  return (data ?? []) as TradingAccount[];
}

/** Todos los retiros del usuario, el más reciente primero. */
export async function listarRetiros(): Promise<Retiro[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_withdrawals")
    .select("*")
    .order("fecha_hora", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los retiros: ${error.message}`);
  return (data ?? []) as Retiro[];
}
