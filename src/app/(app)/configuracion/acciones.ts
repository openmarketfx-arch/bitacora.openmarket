"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface Resultado {
  ok: boolean;
  mensaje?: string;
}

const esquemaCuenta = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Ponle un nombre a la cuenta.")
    .max(80, "El nombre no puede pasar de 80 caracteres."),
  broker: z.string().trim().max(80).optional().or(z.literal("")),
  moneda_base: z.string().trim().min(2).max(8),
  tipo: z.enum(["real", "demo"]),
});

export async function crearCuenta(datos: unknown): Promise<Resultado> {
  const parseado = esquemaCuenta.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("trading_accounts").insert({
    user_id: usuario.id,
    nombre: parseado.data.nombre,
    broker: parseado.data.broker || null,
    moneda_base: parseado.data.moneda_base.toUpperCase(),
    tipo: parseado.data.tipo,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya tienes una cuenta con ese nombre." };
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function actualizarCuenta(id: string, datos: unknown): Promise<Resultado> {
  const parseado = esquemaCuenta.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await requerirUsuario();
  const supabase = await createClient();

  // RLS ya limita el update a las filas del usuario; no hace falta filtrar por user_id.
  const { error } = await supabase
    .from("trading_accounts")
    .update({
      nombre: parseado.data.nombre,
      broker: parseado.data.broker || null,
      moneda_base: parseado.data.moneda_base.toUpperCase(),
      tipo: parseado.data.tipo,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya tienes una cuenta con ese nombre." };
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function alternarActivoCuenta(id: string, activo: boolean): Promise<Resultado> {
  await requerirUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("trading_accounts").update({ activo }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarCuenta(id: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("trading_accounts").delete().eq("id", id);

  if (error) {
    // 23503 = la cuenta tiene operaciones y trades.trading_account_id es ON DELETE RESTRICT.
    if (error.code === "23503") {
      return {
        ok: false,
        mensaje:
          "Esta cuenta tiene operaciones registradas, así que no se puede borrar sin perder ese historial. Desactívala en su lugar.",
      };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
