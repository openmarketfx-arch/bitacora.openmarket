import type { Incumplimiento, TipoPeriodo } from "@/lib/datos/riesgo";
import { fechaDeClave } from "@/lib/zona";

const DIA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DIA_MES = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });
const MES = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "sáb, 10 oct 2026", "7 sep – 13 sep 2026" o "Septiembre de 2026". */
export function etiquetaPeriodo(i: Pick<Incumplimiento, "tipo" | "inicio" | "fin">): string {
  const inicio = fechaDeClave(i.inicio);
  switch (i.tipo) {
    case "diario":
      return mayuscula(DIA.format(inicio));
    case "semanal":
      return `${DIA_MES.format(inicio)} – ${DIA.format(fechaDeClave(i.fin)).replace(/^[^,]*,\s*/, "")}`;
    case "mensual":
      return mayuscula(MES.format(inicio));
  }
}

export const NOMBRE_PERIODO: Record<TipoPeriodo, { singular: string; actual: string; evaluados: string }> = {
  diario: { singular: "diario", actual: "Hoy", evaluados: "días" },
  semanal: { singular: "semanal", actual: "Esta semana", evaluados: "semanas" },
  mensual: { singular: "mensual", actual: "Este mes", evaluados: "meses" },
};

/** Texto de "dónde más incumples". */
export function fraseMasIncumplido(tipos: TipoPeriodo[]): string | null {
  if (tipos.length === 0) return null;
  if (tipos.length === 1) return `Tu límite ${NOMBRE_PERIODO[tipos[0]].singular} es el que más incumples.`;
  const nombres = tipos.map((t) => NOMBRE_PERIODO[t].singular);
  const ultimo = nombres.pop();
  return `Incumples por igual los límites ${nombres.join(", ")} y ${ultimo}.`;
}
