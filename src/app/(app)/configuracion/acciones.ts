"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { sincronizarPruebasFondeo } from "@/lib/fondeo-servidor";
import { revalidarRiesgo } from "@/lib/revalidar-riesgo";
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
  moneda_base: z.string().trim().min(2).max(8),
  tipo: z.enum(["real", "demo", "prueba_fondeo", "fondeada"]),
  capital_inicial: numeroOpcional("El capital inicial", { min: 0, max: 1_000_000_000 }),
  limite_riesgo_diario: porcentajeOpcional("El límite diario"),
  limite_riesgo_semanal: porcentajeOpcional("El límite semanal"),
  limite_riesgo_mensual: porcentajeOpcional("El límite mensual"),
  // Datos de la prueba de fondeo (solo cuentas de prueba y fondeadas).
  prueba_fases: numeroOpcional("El número de fases", { min: 1, max: 4 }),
  prueba_objetivos: z.array(z.union([z.string(), z.number(), z.null()])).max(4).optional(),
  prueba_limite_diario: porcentajeOpcional("El límite de pérdida diaria"),
  prueba_limite_total: porcentajeOpcional("El límite de pérdida máxima"),
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

  if (d.tipo === "prueba_fondeo" || d.tipo === "fondeada") {
    if (d.capital_inicial === null || d.capital_inicial <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Una prueba de fondeo necesita el capital de la cuenta: los objetivos y límites son un % de él.",
        path: ["capital_inicial"],
      });
    }
    if (d.prueba_limite_diario === null || d.prueba_limite_total === null) {
      ctx.addIssue({
        code: "custom",
        message: "Indica el límite de pérdida diaria y el de pérdida máxima de la prueba.",
        path: ["prueba_limite_diario"],
      });
    }
  }

  // Los objetivos solo se piden mientras se está en prueba: una cuenta ya fondeada los conserva.
  if (d.tipo === "prueba_fondeo") {
    if (d.prueba_fases === null || d.prueba_fases === undefined) {
      ctx.addIssue({ code: "custom", message: "Indica cuántas fases tiene la prueba.", path: ["prueba_fases"] });
      return;
    }
    const objetivos = objetivosDe(d.prueba_objetivos, d.prueba_fases);
    if (objetivos === null) {
      ctx.addIssue({
        code: "custom",
        message: "Indica el objetivo de ganancia de cada fase, en %, entre 0 y 100.",
        path: ["prueba_objetivos"],
      });
    }
  }
});

/**
 * Un objetivo por fase, cada uno un % entre 0 (excluido) y 100.
 * null si falta alguno, sobra alguno o no es válido.
 */
function objetivosDe(
  crudos: (string | number | null)[] | undefined,
  fases: number,
): number[] | null {
  if (!crudos || crudos.length !== fases) return null;
  const numeros = crudos.map((v) =>
    v === null || String(v).trim() === "" ? NaN : Number(String(v).replace(",", ".")),
  );
  if (numeros.some((n) => !Number.isFinite(n) || n <= 0 || n > 100)) return null;
  return numeros.map((n) => Math.round(n * 100) / 100);
}

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

type DatosCuenta = z.infer<typeof esquemaCuenta>;

/** Lo que ya tiene guardado una cuenta que se está editando. */
interface CuentaPrevia {
  tipo: string;
  prueba_estado: string | null;
  prueba_resuelta_en: string | null;
  prueba_fases: number | null;
  prueba_objetivos: number[] | null;
}

/**
 * Lo que se guarda de la cuenta. El bróker ya no se pide: su columna queda intacta.
 *
 * Cada tipo guarda lo suyo: una cuenta real o demo no lleva datos de prueba; una prueba
 * de fondeo arranca "en curso"; una cuenta ya fondeada conserva su prueba y solo permite
 * ajustar sus límites. Los constraints de la base exigen exactamente esta coherencia.
 */
function columnasDeCuenta(d: DatosCuenta, previa?: CuentaPrevia) {
  const base = {
    nombre: d.nombre,
    moneda_base: d.moneda_base.toUpperCase(),
    capital_inicial: d.capital_inicial,
    limite_riesgo_diario: d.limite_riesgo_diario,
    limite_riesgo_semanal: d.limite_riesgo_semanal,
    limite_riesgo_mensual: d.limite_riesgo_mensual,
  };

  if (d.tipo === "real" || d.tipo === "demo") {
    return {
      ...base,
      tipo: d.tipo,
      prueba_fases: null,
      prueba_objetivos: null,
      prueba_limite_diario: null,
      prueba_limite_total: null,
      prueba_estado: null,
      prueba_resuelta_en: null,
    };
  }

  if (d.tipo === "fondeada" && previa?.tipo === "fondeada") {
    return {
      ...base,
      tipo: "fondeada" as const,
      prueba_limite_diario: d.prueba_limite_diario,
      prueba_limite_total: d.prueba_limite_total,
    };
  }

  // prueba_fondeo: un resultado ya guardado (fallida) se respeta si la cuenta ya era una prueba.
  const eraPrueba = previa?.tipo === "prueba_fondeo";
  return {
    ...base,
    tipo: "prueba_fondeo" as const,
    prueba_fases: d.prueba_fases,
    prueba_objetivos: objetivosDe(d.prueba_objetivos, d.prueba_fases ?? 0),
    prueba_limite_diario: d.prueba_limite_diario,
    prueba_limite_total: d.prueba_limite_total,
    prueba_estado: eraPrueba ? (previa?.prueba_estado ?? "en_curso") : "en_curso",
    prueba_resuelta_en: eraPrueba ? previa?.prueba_resuelta_en ?? null : null,
  };
}

/** "Fondeada" no se elige: solo se alcanza aprobando una prueba. */
const MENSAJE_FONDEADA =
  "Una cuenta solo pasa a fondeada al aprobar su prueba de fondeo; no se puede elegir a mano.";

export async function crearCuenta(datos: unknown): Promise<Resultado> {
  const parseado = esquemaCuenta.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (parseado.data.tipo === "fondeada") return { ok: false, mensaje: MENSAJE_FONDEADA };

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

  // Una prueba recién creada o editada puede estar ya resuelta con las operaciones existentes.
  await sincronizarPruebasFondeo();
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

  // RLS limita la lectura a las cuentas del usuario: si no aparece, no es suya.
  const { data: previa } = await supabase
    .from("trading_accounts")
    .select("tipo, prueba_estado, prueba_resuelta_en, prueba_fases, prueba_objetivos")
    .eq("id", id)
    .maybeSingle();
  if (!previa) return { ok: false, mensaje: "No se encontró la cuenta." };

  // Fondeada solo se llega aprobando; y una cuenta fondeada no vuelve atrás.
  if (parseado.data.tipo === "fondeada" && previa.tipo !== "fondeada") {
    return { ok: false, mensaje: MENSAJE_FONDEADA };
  }
  if (previa.tipo === "fondeada" && parseado.data.tipo !== "fondeada") {
    return { ok: false, mensaje: "Una cuenta fondeada ya aprobó su prueba y no puede cambiar de tipo." };
  }

  // RLS ya limita el update a las filas del usuario; no hace falta filtrar por user_id.
  const { error } = await supabase
    .from("trading_accounts")
    .update(columnasDeCuenta(parseado.data, previa as CuentaPrevia))
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya tienes una cuenta con ese nombre." };
    return { ok: false, mensaje: error.message };
  }

  await sincronizarPruebasFondeo();
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
          "Esta cuenta tiene operaciones o retiros registrados, así que no se puede borrar sin perder ese historial. Desactívala en su lugar.",
      };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
