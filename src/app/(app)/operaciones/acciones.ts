"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { aPrecio } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  TIPO_CIERRE_MAP,
  esOrdenPendiente,
  type CategoriaTag,
  type SubtipoSalida,
  type Tag,
  type TipoCierre,
  type TipoOrden,
} from "@/lib/types";
import type { Resultado } from "@/app/(app)/configuracion/acciones";

export interface ResultadoOperacion extends Resultado {
  id?: string;
}

const TIPOS = [
  "stop_caceria",
  "stop_contra",
  "tp_justo",
  "tp_corto",
  "break_even",
  "cierre_correcto",
  "cierre_incorrecto",
  "reversion",
] as const;

const ORDENES = [
  "buy",
  "sell",
  "buy_stop",
  "sell_stop",
  "buy_limit",
  "sell_limit",
] as const;

const esquemaOperacion = z
  .object({
    trading_account_id: z.string().uuid("Elige una cuenta."),
    instrument_id: z.string().uuid("Elige un instrumento."),
    tipo_orden: z.enum(ORDENES),
    fecha_hora_entrada: z.string().min(1, "Falta la fecha y hora de entrada."),
    precio_entrada: z.coerce.number().positive("El precio de entrada debe ser mayor que cero."),
    precio_tp: z.coerce.number().positive().nullable().optional(),
    precio_stop: z.coerce.number().positive().nullable().optional(),
    lotaje: z.coerce.number().positive().nullable().optional(),
    notas: z.string().trim().max(4000).optional().or(z.literal("")),
    captura_url: z.string().trim().max(500).nullable().optional(),
    tags: z.array(z.string().uuid()).max(60).default([]),

    /** "abierta" | "cerrada" | "no_activada" — lo decide el botón pulsado. */
    desenlace: z.enum(["abierta", "cerrada", "no_activada"]),
    fecha_hora_salida: z.string().optional().or(z.literal("")),
    precio_salida: z.coerce.number().positive().nullable().optional(),
    resultado_dinero: z.coerce.number().nullable().optional(),
    tipo_cierre: z.enum(TIPOS).nullable().optional(),
    /** Lo que escribió el usuario, en pips o puntos según el instrumento. */
    medicion: z.coerce.number().min(0).nullable().optional(),
    /** Pips que le faltaron al precio para tocar una orden no activada. */
    distancia: z.coerce.number().min(0).nullable().optional(),
  })
  .superRefine((d, ctx) => {
    const pendiente = esOrdenPendiente(d.tipo_orden);

    if (d.desenlace === "no_activada" && !pendiente) {
      ctx.addIssue({
        code: "custom",
        message: "Una orden a mercado se ejecuta al instante: no puede quedar sin activar.",
        path: ["tipo_orden"],
      });
    }

    if (d.desenlace !== "cerrada") return;

    if (!d.fecha_hora_salida) {
      ctx.addIssue({ code: "custom", message: "Falta la fecha y hora de salida.", path: ["fecha_hora_salida"] });
    }
    if (d.precio_salida === null || d.precio_salida === undefined) {
      ctx.addIssue({ code: "custom", message: "Falta el precio de salida.", path: ["precio_salida"] });
    }
    if (d.resultado_dinero === null || d.resultado_dinero === undefined) {
      ctx.addIssue({ code: "custom", message: "Falta el resultado en dinero (P/L).", path: ["resultado_dinero"] });
    }
    if (d.fecha_hora_salida && new Date(d.fecha_hora_salida) < new Date(d.fecha_hora_entrada)) {
      ctx.addIssue({
        code: "custom",
        message: "La salida no puede ser anterior a la entrada.",
        path: ["fecha_hora_salida"],
      });
    }
  });

/**
 * Valor de `orden_activada` según el tipo de orden y el desenlace.
 * Las órdenes a mercado lo dejan en null: no hay nada que esperar.
 */
function activacionDe(
  tipo: (typeof ORDENES)[number],
  desenlace: "abierta" | "cerrada" | "no_activada",
): boolean | null {
  if (!esOrdenPendiente(tipo)) return null;
  if (desenlace === "no_activada") return false;
  if (desenlace === "cerrada") return true;
  // Sigue esperando: todavía no se sabe.
  return null;
}

/**
 * Reparte la medición que escribió el usuario en la columna que le
 * corresponde al tipo de cierre. Los constraints de la base rechazan
 * cualquier otra combinación, así que esto y el esquema van de la mano.
 */
function columnasDeMedicion(
  tipo: TipoCierre | null | undefined,
  medicionEnPrecio: number | null,
) {
  const base = {
    margen_error_precio: null as number | null,
    no_capturado_precio: null as number | null,
    devuelto_precio: null as number | null,
  };
  if (!tipo || medicionEnPrecio === null) return base;

  const campo = TIPO_CIERRE_MAP[tipo].campo;
  if (!campo) return base;
  return { ...base, [campo]: medicionEnPrecio };
}

export async function crearOperacion(datos: unknown): Promise<ResultadoOperacion> {
  const parseado = esquemaOperacion.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = createClient();
  const d = parseado.data;

  // El instrumento decide si la medición son pips o puntos. Se resuelve aquí,
  // con el valor_pip que está en la base, para que un fallo del cliente no
  // pueda escribir una diferencia de precio mal convertida.
  const { data: instrumento, error: errorInstrumento } = await supabase
    .from("instruments")
    .select("id, asset_class, valor_pip, decimales_precio")
    .eq("id", d.instrument_id)
    .single();

  if (errorInstrumento || !instrumento) {
    return { ok: false, mensaje: "El instrumento elegido ya no está disponible." };
  }

  const cerrada = d.desenlace === "cerrada";
  const medicionEnPrecio = cerrada ? aPrecio(d.medicion ?? null, instrumento) : null;
  const tipoCierre = cerrada ? (d.tipo_cierre ?? null) : null;

  const { data: creada, error } = await supabase
    .from("trades")
    .insert({
      user_id: usuario.id,
      trading_account_id: d.trading_account_id,
      instrument_id: d.instrument_id,
      // direccion no se escribe: la base la deriva de tipo_orden.
      tipo_orden: d.tipo_orden,
      orden_activada: activacionDe(d.tipo_orden, d.desenlace),
      fecha_hora_entrada: new Date(d.fecha_hora_entrada).toISOString(),
      precio_entrada: d.precio_entrada,
      precio_tp: d.precio_tp ?? null,
      precio_stop: d.precio_stop ?? null,
      lotaje: d.lotaje ?? null,
      notas: d.notas || null,
      captura_url: d.captura_url || null,

      estado_operacion: d.desenlace,
      // Solo la columna que el constraint permite según el desenlace.
      distancia_no_activada:
        d.desenlace === "no_activada" ? aPrecio(d.distancia ?? null, instrumento) : null,
      // estado_revision lo calcula el trigger a partir de estos dos campos.
      fecha_hora_salida: cerrada ? new Date(d.fecha_hora_salida!).toISOString() : null,
      precio_salida: cerrada ? d.precio_salida : null,
      resultado_dinero: cerrada ? d.resultado_dinero : null,
      tipo_cierre: tipoCierre,
      ...columnasDeMedicion(tipoCierre, medicionEnPrecio),
    })
    .select("id")
    .single();

  if (error || !creada) {
    return { ok: false, mensaje: error?.message ?? "No se pudo guardar la operación." };
  }

  if (d.tags.length > 0) {
    const { error: errorTags } = await supabase
      .from("trade_tags")
      .insert(d.tags.map((tag_id) => ({ trade_id: creada.id, tag_id })));

    // Una operación sin sus confirmaciones es peor que ninguna: se deshace
    // el insert para que el usuario reintente con todo, en vez de quedarse
    // con un registro a medias que ensucia la analítica por tag.
    if (errorTags) {
      await supabase.from("trades").delete().eq("id", creada.id);
      return { ok: false, mensaje: `No se pudieron guardar los tags: ${errorTags.message}` };
    }
  }

  revalidatePath("/operaciones");
  revalidatePath("/calendario");
  revalidatePath("/");
  return { ok: true, id: creada.id };
}

export interface ResultadoTag extends Resultado {
  tag?: Tag;
}

/** Crear un tag sin salir del formulario de operación. */
export async function crearTagRapido(
  nombre: string,
  categoria: CategoriaTag,
  subtipoSalida: SubtipoSalida | null = null,
): Promise<ResultadoTag> {
  const limpio = nombre.trim();
  if (!limpio || limpio.length > 60) {
    return { ok: false, mensaje: "El nombre debe tener entre 1 y 60 caracteres." };
  }
  if (categoria === "salida" && !subtipoSalida) {
    return { ok: false, mensaje: "Indica si la confirmación define la zona de TP o la del stop." };
  }

  const usuario = await requerirUsuario();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({
      user_id: usuario.id,
      nombre: limpio,
      categoria,
      subtipo_salida: categoria === "salida" ? subtipoSalida : null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, mensaje: "Ya tienes un tag con ese nombre en esta categoría." };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true, tag: data as Tag };
}

// ============================================================
// Paso 5 — cerrar una operación abierta y clasificar una pendiente
// ============================================================

/** Datos comunes a las dos colas: invalida todo lo que depende de trades. */
function revalidarTodo(id: string) {
  revalidatePath("/operaciones");
  revalidatePath(`/operaciones/${id}`);
  revalidatePath("/calendario");
  revalidatePath("/analitica");
  revalidatePath("/");
}

const esquemaCierre = z
  .object({
    /**
     * Solo llega en órdenes pendientes. false significa que el precio nunca
     * tocó la orden: no hay entrada, ni salida, ni resultado que registrar.
     */
    activada: z.boolean().nullable().optional(),
    /** Pips que le faltaron al precio para tocar la orden. Solo si no se activó. */
    distancia: z.coerce.number().min(0).nullable().optional(),
    fecha_hora_salida: z.string().optional().or(z.literal("")),
    precio_salida: z.coerce.number().positive().nullable().optional(),
    resultado_dinero: z.coerce.number().nullable().optional(),
    tipo_cierre: z.enum(TIPOS).nullable().optional(),
    medicion: z.coerce.number().min(0).nullable().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.activada === false) return;

    if (!d.fecha_hora_salida) {
      ctx.addIssue({ code: "custom", message: "Falta la fecha y hora de salida.", path: ["fecha_hora_salida"] });
    }
    if (d.precio_salida === null || d.precio_salida === undefined) {
      ctx.addIssue({ code: "custom", message: "Falta el precio de salida.", path: ["precio_salida"] });
    }
    if (d.resultado_dinero === null || d.resultado_dinero === undefined) {
      ctx.addIssue({ code: "custom", message: "Falta el resultado en dinero (P/L).", path: ["resultado_dinero"] });
    }
  });

/**
 * Concluye una operación abierta. Dos desenlaces posibles:
 *
 *  - Se ejecutó: precio y hora de salida, P/L y, opcionalmente, clasificación.
 *    Sin clasificar, el trigger la manda a la cola de revisión.
 *  - Era una orden pendiente y el precio nunca la tocó: queda `no_activada`,
 *    sin salida ni resultado. No es una pérdida ni una ganancia; es un dato
 *    sobre la precisión de la entrada.
 */
export async function cerrarOperacion(id: string, datos: unknown): Promise<Resultado> {
  const parseado = esquemaCierre.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await requerirUsuario();
  const supabase = createClient();
  const d = parseado.data;

  // RLS limita el select a las operaciones del usuario.
  const { data: operacion, error: errorLectura } = await supabase
    .from("trades")
    .select(
      "id, estado_operacion, tipo_orden, fecha_hora_entrada, instrument:instruments(asset_class, valor_pip, decimales_precio)",
    )
    .eq("id", id)
    .maybeSingle();

  if (errorLectura || !operacion) {
    return { ok: false, mensaje: "No se encontró la operación." };
  }
  if (operacion.estado_operacion !== "abierta") {
    return { ok: false, mensaje: "Esta operación ya estaba concluida." };
  }

  const pendiente = esOrdenPendiente(operacion.tipo_orden as TipoOrden);

  // ---- Desenlace: la orden nunca se activó ----
  if (d.activada === false) {
    if (!pendiente) {
      return {
        ok: false,
        mensaje: "Una orden a mercado se ejecuta al instante: no puede quedar sin activar.",
      };
    }

    const instrumentoOrden = operacion.instrument as unknown as {
      asset_class: "forex" | "crypto" | "index" | "stock";
      valor_pip: number;
      decimales_precio: number;
    };

    const { error } = await supabase
      .from("trades")
      .update({
        estado_operacion: "no_activada",
        orden_activada: false,
        // La distancia llega en pips y se guarda como diferencia de precio,
        // igual que el resto de mediciones.
        distancia_no_activada: aPrecio(d.distancia ?? null, instrumentoOrden),
        fecha_hora_salida: null,
        precio_salida: null,
        resultado_dinero: null,
        tipo_cierre: null,
        ...columnasDeMedicion(null, null),
      })
      .eq("id", id);

    if (error) return { ok: false, mensaje: error.message };

    revalidarTodo(id);
    return { ok: true };
  }

  // ---- Desenlace: se ejecutó y se cierra ----
  if (new Date(d.fecha_hora_salida!) < new Date(operacion.fecha_hora_entrada)) {
    return { ok: false, mensaje: "La salida no puede ser anterior a la entrada." };
  }

  const instrumento = operacion.instrument as unknown as {
    asset_class: "forex" | "crypto" | "index" | "stock";
    valor_pip: number;
    decimales_precio: number;
  };

  const tipo = d.tipo_cierre ?? null;
  const medicionEnPrecio = aPrecio(d.medicion ?? null, instrumento);

  const { error } = await supabase
    .from("trades")
    .update({
      estado_operacion: "cerrada",
      // Si era pendiente y llegó a cerrarse, por fuerza se activó.
      orden_activada: pendiente ? true : null,
      distancia_no_activada: null,
      fecha_hora_salida: new Date(d.fecha_hora_salida!).toISOString(),
      precio_salida: d.precio_salida,
      resultado_dinero: d.resultado_dinero,
      tipo_cierre: tipo,
      ...columnasDeMedicion(tipo, medicionEnPrecio),
    })
    .eq("id", id);

  if (error) return { ok: false, mensaje: error.message };

  revalidarTodo(id);
  return { ok: true };
}

const esquemaRevision = z.object({
  tipo_cierre: z.enum(TIPOS, { required_error: "Elige cómo terminó la operación." }),
  medicion: z.coerce.number().min(0).nullable().optional(),
});

/**
 * Clasifica una operación ya cerrada que estaba pendiente de revisión.
 * Es la acción que convierte la bitácora en analítica.
 */
export async function clasificarOperacion(id: string, datos: unknown): Promise<Resultado> {
  const parseado = esquemaRevision.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await requerirUsuario();
  const supabase = createClient();
  const d = parseado.data;

  const { data: operacion, error: errorLectura } = await supabase
    .from("trades")
    .select("id, estado_operacion, instrument:instruments(asset_class, valor_pip, decimales_precio)")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura || !operacion) {
    return { ok: false, mensaje: "No se encontró la operación." };
  }
  if (operacion.estado_operacion !== "cerrada") {
    return {
      ok: false,
      mensaje: "Solo se clasifican operaciones cerradas. Ciérrala primero.",
    };
  }

  const instrumento = operacion.instrument as unknown as {
    asset_class: "forex" | "crypto" | "index" | "stock";
    valor_pip: number;
    decimales_precio: number;
  };

  const medicionEnPrecio = aPrecio(d.medicion ?? null, instrumento);

  const { error } = await supabase
    .from("trades")
    .update({
      tipo_cierre: d.tipo_cierre,
      // Se reescriben las tres columnas: si antes tenía otra clasificación,
      // su medición no puede quedarse colgada en la fila.
      ...columnasDeMedicion(d.tipo_cierre, medicionEnPrecio),
    })
    .eq("id", id);

  if (error) return { ok: false, mensaje: error.message };

  revalidarTodo(id);
  return { ok: true };
}

/** Borra una operación. El cascade se lleva sus vínculos con tags. */
export async function eliminarOperacion(id: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = createClient();

  const { data: operacion } = await supabase
    .from("trades")
    .select("captura_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  // La captura queda huérfana en Storage si no se limpia aquí.
  if (operacion?.captura_url) {
    await supabase.storage.from("trade-captures").remove([operacion.captura_url]);
  }

  revalidarTodo(id);
  return { ok: true };
}
