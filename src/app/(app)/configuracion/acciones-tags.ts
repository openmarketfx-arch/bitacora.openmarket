"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Resultado } from "@/app/(app)/configuracion/acciones";

const esquemaTag = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "Ponle un nombre al tag.")
      .max(60, "El nombre no puede pasar de 60 caracteres."),
    categoria: z.enum(["estructura", "entrada", "salida"]),
    subtipo_salida: z.enum(["tp", "stop"]).nullable().optional(),
  })
  .superRefine((d, ctx) => {
    // El constraint de la base impone lo mismo; aquí se traduce a un mensaje.
    if (d.categoria === "salida" && !d.subtipo_salida) {
      ctx.addIssue({
        code: "custom",
        message: "Indica si define la zona de TP o la del stop.",
        path: ["subtipo_salida"],
      });
    }
  });

export async function crearTag(datos: unknown): Promise<Resultado> {
  const parseado = esquemaTag.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = createClient();

  const { error } = await supabase.from("tags").insert({
    user_id: usuario.id,
    nombre: parseado.data.nombre,
    categoria: parseado.data.categoria,
    subtipo_salida:
      parseado.data.categoria === "salida" ? parseado.data.subtipo_salida : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, mensaje: "Ya tienes un tag con ese nombre en esta categoría." };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function actualizarTag(id: string, datos: unknown): Promise<Resultado> {
  const parseado = esquemaTag.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await requerirUsuario();
  const supabase = createClient();

  const { error } = await supabase
    .from("tags")
    .update({
      nombre: parseado.data.nombre,
      categoria: parseado.data.categoria,
      subtipo_salida:
        parseado.data.categoria === "salida" ? parseado.data.subtipo_salida : null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        mensaje: "Ya tienes un tag con ese nombre en esa categoría. Si son lo mismo, fusiónalos.",
      };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function eliminarTag(id: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = createClient();

  // trade_tags cae por cascade: las operaciones se quedan, pierden el tag.
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/configuracion");
  revalidatePath("/analitica");
  return { ok: true };
}

/**
 * Une dos tags que resultaron ser lo mismo. La operación es atómica y vive
 * en la base (migración 0007): reapunta las operaciones y borra el origen.
 */
export async function fusionarTags(origenId: string, destinoId: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = createClient();

  const { error } = await supabase.rpc("fusionar_tags", {
    p_origen: origenId,
    p_destino: destinoId,
  });

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/configuracion");
  revalidatePath("/analitica");
  return { ok: true };
}
