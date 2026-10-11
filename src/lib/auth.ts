import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Usuario de la sesión actual. Redirige a /login si no hay ninguno.
 * Toda página dentro de (app) pasa por aquí: es la puerta única de entrada.
 */
export async function requerirUsuario(): Promise<User> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
}
