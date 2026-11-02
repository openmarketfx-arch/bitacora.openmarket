"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { sincronizarPruebasFondeo } from "@/lib/fondeo-servidor";
import { revalidarRiesgo } from "@/lib/revalidar-riesgo";
import { createClient } from "@/lib/supabase/server";
import type { ResultadoOperacion } from "@/app/(app)/operaciones/acciones";

const esquema = z.object({
  cuentas: z
    .array(z.string().uuid())
    .min(1, "Elige al menos una cuenta.")
    .max(50, "Son demasiadas cuentas a la vez."),
  /**
   * "completa": copia también la salida y el resultado, como un copiador de operaciones.
   * "entrada": copia solo la entrada y deja la operación abierta en cada cuenta.
   */
  modo: z.enum(["completa", "entrada"]),
});

export interface ResultadoDuplicado extends ResultadoOperacion {
  /** Cuántas copias se crearon. */
  copias?: number;
}

/**
 * Duplica una operación en una o varias cuentas a la vez, incluida la de origen. Cada copia es una operación
 * nueva e independiente, con su propio número de referencia: se copian los datos de la
 * entrada, los tags y, si se pide, el cierre. No se copian la captura (borrar una operación
 * borra su archivo) ni el enlace con el grupo de planes, porque ese grupo es de una cuenta.
 */
export async function duplicarOperacion(id: string, datos: unknown): Promise<ResultadoDuplicado> {
  const parseado = esquema.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { cuentas, modo } = parseado.data;

  const usuario = await requerirUsuario();
  const supabase = await createClient();

  // RLS limita la lectura a las operaciones del usuario.
  const { data: origen } = await supabase
    .from("trades")
    .select("*, trade_tags ( tag_id )")
    .eq("id", id)
    .maybeSingle();
  if (!origen) return { ok: false, mensaje: "No se encontró la operación." };

  // Vale cualquier cuenta activa, también la de la operación original.
  const destinos = Array.from(new Set(cuentas));

  const { data: cuentasValidas } = await supabase
    .from("trading_accounts")
    .select("id, activo")
    .in("id", destinos);
  const permitidas = new Set(
    (cuentasValidas ?? []).filter((c) => c.activo).map((c) => c.id as string),
  );
  if (destinos.some((c) => !permitidas.has(c))) {
    return { ok: false, mensaje: "Alguna cuenta elegida no existe o está desactivada." };
  }

  // Una abierta no tiene cierre que copiar: en ese caso los dos modos dan lo mismo.
  const conCierre = modo === "completa" && origen.estado_operacion !== "abierta";

  const base = {
    user_id: usuario.id,
    instrument_id: origen.instrument_id,
    // direccion no se escribe: la base la deriva de tipo_orden.
    tipo_orden: origen.tipo_orden,
    fecha_hora_entrada: origen.fecha_hora_entrada,
    precio_entrada: origen.precio_entrada,
    precio_tp: origen.precio_tp,
    precio_stop: origen.precio_stop,
    lotaje: origen.lotaje,
    notas: origen.notas,
    plan: origen.plan,
  };

  const cierre = conCierre
    ? {
        orden_activada: origen.orden_activada,
        estado_operacion: origen.estado_operacion,
        distancia_no_activada: origen.distancia_no_activada,
        fecha_hora_salida: origen.fecha_hora_salida,
        precio_salida: origen.precio_salida,
        resultado_dinero: origen.resultado_dinero,
        comision: origen.comision,
        swap: origen.swap,
        tipo_cierre: origen.tipo_cierre,
        margen_error_precio: origen.margen_error_precio,
        no_capturado_precio: origen.no_capturado_precio,
        devuelto_precio: origen.devuelto_precio,
      }
    : {
        // Solo la entrada: queda abierta y una orden pendiente vuelve a esperar su activación.
        orden_activada: null,
        estado_operacion: "abierta" as const,
        distancia_no_activada: null,
        fecha_hora_salida: null,
        precio_salida: null,
        resultado_dinero: null,
        comision: 0,
        swap: 0,
        tipo_cierre: null,
        margen_error_precio: null,
        no_capturado_precio: null,
        devuelto_precio: null,
      };

  // Un solo insert: o se crean todas las copias o ninguna.
  const { data: creadas, error } = await supabase
    .from("trades")
    .insert(destinos.map((cuentaId) => ({ ...base, ...cierre, trading_account_id: cuentaId })))
    .select("id");

  if (error || !creadas) {
    return { ok: false, mensaje: error?.message ?? "No se pudo duplicar la operación." };
  }

  const tags = ((origen.trade_tags ?? []) as { tag_id: string }[]).map((t) => t.tag_id);
  if (tags.length > 0) {
    const { error: errorTags } = await supabase
      .from("trade_tags")
      .insert(creadas.flatMap((c) => tags.map((tag_id) => ({ trade_id: c.id, tag_id }))));

    // Igual que al crear: una copia sin sus confirmaciones ensucia la analítica por tag.
    if (errorTags) {
      await supabase
        .from("trades")
        .delete()
        .in(
          "id",
          creadas.map((c) => c.id),
        );
      return { ok: false, mensaje: `No se pudieron copiar los tags: ${errorTags.message}` };
    }
  }

  await sincronizarPruebasFondeo();
  revalidarRiesgo();
  revalidatePath("/operaciones");
  revalidatePath("/calendario");
  revalidatePath("/analitica");
  revalidatePath("/");
  return { ok: true, copias: creadas.length };
}
