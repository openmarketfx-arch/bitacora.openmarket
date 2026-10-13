"use server";

import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { resultadoNeto } from "@/lib/resultado";
import { revalidarRiesgo } from "@/lib/revalidar-riesgo";
import { createClient } from "@/lib/supabase/server";
import { deInputDateTime } from "@/lib/zona";
import { obtenerZona } from "@/lib/zona-servidor";
import type { Resultado } from "@/app/(app)/configuracion/acciones";

const esquemaRetiro = z.object({
  monto: z.coerce
    .number({ invalid_type_error: "Escribe cuánto retiraste." })
    .positive("El monto del retiro debe ser mayor que cero.")
    .max(1_000_000_000, "Ese monto es demasiado grande."),
  fecha_hora: z.string().min(1, "Falta la fecha del retiro."),
  nota: z.string().trim().max(200, "La nota no puede pasar de 200 caracteres.").optional(),
});

const dinero = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Registra dinero que se sacó de la cuenta. Baja el saldo (el "capital real") sin
 * contar como pérdida, así que los límites de riesgo siguientes parten de lo que
 * realmente queda. No se puede retirar más de lo que había.
 */
export async function registrarRetiro(cuentaId: string, datos: unknown): Promise<Resultado> {
  const crudo = typeof datos === "object" && datos !== null ? (datos as Record<string, unknown>) : {};
  const zona = await obtenerZona();

  // La hora llega ya en ISO desde el navegador; si llegara sin zona se lee en la del usuario.
  const parseado = esquemaRetiro.safeParse({
    ...crudo,
    fecha_hora:
      typeof crudo.fecha_hora === "string" ? deInputDateTime(crudo.fecha_hora, zona) : "",
  });
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseado.data;
  const fecha = new Date(d.fecha_hora);

  if (Number.isNaN(fecha.getTime())) return { ok: false, mensaje: "La fecha del retiro no es válida." };
  if (fecha.getTime() > Date.now() + 5 * 60 * 1000) {
    return { ok: false, mensaje: "La fecha del retiro no puede ser futura." };
  }

  const usuario = await requerirUsuario();
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("trading_accounts")
    .select("id, nombre, capital_inicial, moneda_base")
    .eq("id", cuentaId)
    .maybeSingle();

  if (!cuenta) return { ok: false, mensaje: "No se encontró la cuenta." };
  if (cuenta.capital_inicial === null || Number(cuenta.capital_inicial) <= 0) {
    return {
      ok: false,
      mensaje: "Antes de registrar retiros pon el capital inicial de la cuenta.",
    };
  }

  // Saldo en la fecha del retiro y hoy: no se puede sacar más de lo que había en ninguno de los dos.
  const [{ data: trades }, { data: retiros }] = await Promise.all([
    supabase
      .from("trades")
      .select("resultado_dinero, comision, swap, fecha_hora_salida")
      .eq("trading_account_id", cuentaId)
      .eq("estado_operacion", "cerrada"),
    supabase.from("account_withdrawals").select("monto, fecha_hora").eq("trading_account_id", cuentaId),
  ]);

  const saldoA = (hasta: Date) => {
    const ganado = (trades ?? []).reduce((s, t) => {
      if (!t.fecha_hora_salida || new Date(t.fecha_hora_salida) > hasta) return s;
      return s + (resultadoNeto(t) ?? 0);
    }, 0);
    const retirado = (retiros ?? []).reduce(
      (s, r) => (new Date(r.fecha_hora) > hasta ? s : s + Number(r.monto)),
      0,
    );
    return Math.round((Number(cuenta.capital_inicial) + ganado - retirado) * 100) / 100;
  };

  const saldoEnFecha = saldoA(fecha);
  const saldoHoy = saldoA(new Date());
  const disponible = Math.min(saldoEnFecha, saldoHoy);

  if (d.monto > disponible) {
    return {
      ok: false,
      mensaje:
        disponible <= 0
          ? "La cuenta no tiene saldo disponible para retirar."
          : `El retiro supera el saldo de la cuenta (${dinero(disponible)} ${cuenta.moneda_base} disponibles).`,
    };
  }

  const { error } = await supabase.from("account_withdrawals").insert({
    user_id: usuario.id,
    trading_account_id: cuentaId,
    monto: Math.round(d.monto * 100) / 100,
    fecha_hora: fecha.toISOString(),
    nota: d.nota || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  revalidarRiesgo();
  return { ok: true };
}

/** Borra un retiro, por si se registró mal. El saldo vuelve a incluir ese dinero. */
export async function eliminarRetiro(id: string): Promise<Resultado> {
  await requerirUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("account_withdrawals").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  revalidarRiesgo();
  return { ok: true };
}
