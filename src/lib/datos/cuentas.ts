import { createClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/lib/types";

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
