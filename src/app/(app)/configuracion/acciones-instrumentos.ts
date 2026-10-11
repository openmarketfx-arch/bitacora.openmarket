"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Resultado } from "@/app/(app)/configuracion/acciones";

const esquemaInstrumento = z
  .object({
    simbolo: z
      .string()
      .trim()
      .min(1, "Ponle un símbolo.")
      .max(24, "El símbolo no puede pasar de 24 caracteres."),
    nombre: z.string().trim().min(1, "Ponle un nombre.").max(120),
    asset_class: z.enum(["forex", "crypto", "index", "stock"]),
    decimales_precio: z.coerce.number().int().min(0).max(10),
    // Todo instrumento declara su unidad: pips en forex, puntos en el resto.
    valor_pip: z.coerce.number().positive("Hace falta el tamaño del pip o punto."),
    /** Precio orientativo. No es una cotización en vivo. */
    precio_referencia: z.coerce.number().positive().nullable().optional(),
  });

export async function crearInstrumento(datos: unknown): Promise<Resultado> {
  const parseado = esquemaInstrumento.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = createClient();
  const d = parseado.data;

  const { error } = await supabase.from("instruments").insert({
    user_id: usuario.id,
    simbolo: d.simbolo.toUpperCase(),
    nombre: d.nombre,
    asset_class: d.asset_class,
    decimales_precio: d.decimales_precio,
    valor_pip: d.valor_pip,
    precio_referencia: d.precio_referencia ?? null,
    referencia_actualizada: d.precio_referencia ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya existe un instrumento con ese símbolo." };
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function actualizarInstrumento(id: string, datos: unknown): Promise<Resultado> {
  const parseado = esquemaInstrumento.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await requerirUsuario();
  const supabase = createClient();
  const d = parseado.data;

  // RLS solo deja tocar instrumentos propios: los del sistema (user_id null)
  // quedan fuera del update sin necesidad de comprobarlo aquí.
  const { error, count } = await supabase
    .from("instruments")
    .update(
      {
        simbolo: d.simbolo.toUpperCase(),
        nombre: d.nombre,
        asset_class: d.asset_class,
        decimales_precio: d.decimales_precio,
        valor_pip: d.valor_pip,
        precio_referencia: d.precio_referencia ?? null,
        referencia_actualizada: d.precio_referencia ? new Date().toISOString() : null,
      },
      { count: "exact" },
    )
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya existe un instrumento con ese símbolo." };
    return { ok: false, mensaje: error.message };
  }
  if (count === 0) {
    return { ok: false, mensaje: "Los instrumentos del catálogo del sistema no se pueden editar." };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarInstrumento(id: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = createClient();

  const { error } = await supabase.from("instruments").delete().eq("id", id);

  if (error) {
    // 23503 = tiene operaciones; trades.instrument_id es ON DELETE RESTRICT.
    if (error.code === "23503") {
      return {
        ok: false,
        mensaje:
          "Este instrumento tiene operaciones registradas. Borrarlo se llevaría ese historial.",
      };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

/** Añade o quita el instrumento de la lista de seguidos del usuario. */
export async function alternarSeguimiento(
  instrumentId: string,
  seguir: boolean,
): Promise<Resultado> {
  const usuario = await requerirUsuario();
  const supabase = createClient();

  if (seguir) {
    const { error } = await supabase
      .from("user_instruments")
      .upsert({ user_id: usuario.id, instrument_id: instrumentId });
    if (error) return { ok: false, mensaje: error.message };
  } else {
    const { error } = await supabase
      .from("user_instruments")
      .delete()
      .eq("user_id", usuario.id)
      .eq("instrument_id", instrumentId);
    if (error) return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
