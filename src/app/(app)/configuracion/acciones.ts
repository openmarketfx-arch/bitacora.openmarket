"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Los límites y el capital cambian cifras en el dashboard, la analítica y el calendario. */
function revalidarRiesgo() {
  for (const ruta of ["/", "/analitica", "/calendario", "/operaciones"]) revalidatePath(ruta);
}

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
  moneda_base: z.string().trim().min(2).max(8),
  tipo: z.enum(["real", "demo"]),
  capital_inicial: numeroOpcional("El capital inicial", { min: 0, max: 1_000_000_000 }),
  limite_riesgo_diario: porcentajeOpcional("El límite diario"),
  limite_riesgo_semanal: porcentajeOpcional("El límite semanal"),
  limite_riesgo_mensual: porcentajeOpcional("El límite mensual"),
}).superRefine((d, ctx) => {
  // Un % de riesgo no significa nada sin un capital sobre el que aplicarlo.
  const hayLimite =
    d.limite_riesgo_diario !== null ||
    d.limite_riesgo_semanal !== null ||
    d.limite_riesgo_mensual !== null;
  if (hayLimite && (d.capital_inicial === null || d.capital_inicial <= 0)) {
    ctx.addIssue({
      code: "custom",
      message: "Para medir el riesgo hace falta el capital de la cuenta. Ponlo primero.",
      path: ["capital_inicial"],
    });
  }
});

/** Campo numérico que puede venir vacío (null) o con un valor dentro del rango. */
function numeroOpcional(nombre: string, { min, max }: { min: number; max: number }) {
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${nombre} no es un número válido.` });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    });
}

/** % entre 0 (excluido) y 100, o vacío si no se quiere ese límite. */
function porcentajeOpcional(nombre: string) {
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || n > 100) {
        ctx.addIssue({ code: "custom", message: `${nombre} debe estar entre 0 y 100 %.` });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    });
}

/** Lo que se guarda de la cuenta. El bróker ya no se pide: su columna queda intacta. */
function columnasDeCuenta(d: z.infer<typeof esquemaCuenta>) {
  return {
    nombre: d.nombre,
    moneda_base: d.moneda_base.toUpperCase(),
    tipo: d.tipo,
    capital_inicial: d.capital_inicial,
    limite_riesgo_diario: d.limite_riesgo_diario,
    limite_riesgo_semanal: d.limite_riesgo_semanal,
    limite_riesgo_mensual: d.limite_riesgo_mensual,
  };
}

export async function crearCuenta(datos: unknown): Promise<Resultado> {
  const parseado = esquemaCuenta.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("trading_accounts").insert({
    user_id: usuario.id,
    ...columnasDeCuenta(parseado.data),
  });

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya tienes una cuenta con ese nombre." };
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  revalidarRiesgo();
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
    .update(columnasDeCuenta(parseado.data))
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya tienes una cuenta con ese nombre." };
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  revalidarRiesgo();
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
