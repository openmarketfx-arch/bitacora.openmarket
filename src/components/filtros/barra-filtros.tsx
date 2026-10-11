"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PERIODOS } from "@/lib/datos/metricas";
import { cn } from "@/lib/utils";

interface Props {
  /** Periodo activo; null cuando hay un rango personalizado. */
  periodo: string | null;
  desde: string;
  hasta: string;
  instrumento: string | null;
  instrumentos: string[];
  /** Oculta presets y fechas (el calendario ya navega por mes). */
  soloInstrumento?: boolean;
}

const CAMPO =
  "h-8 rounded-md border border-input bg-background/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring";

export function BarraFiltros({
  periodo,
  desde,
  hasta,
  instrumento,
  instrumentos,
  soloInstrumento = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const actuales = useSearchParams();

  function aplicar(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(actuales.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }
    const consulta = params.toString();
    router.push(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
  }

  const hayRango = !!(desde || hasta);
  const hayFiltros = hayRango || !!instrumento;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!soloInstrumento && (
        <>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => aplicar({ periodo: p.valor, desde: null, hasta: null })}
                aria-pressed={p.valor === periodo}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  p.valor === periodo
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.corta}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <label htmlFor="filtro-desde">Desde</label>
            <input
              id="filtro-desde"
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => aplicar({ desde: e.target.value || null, periodo: null })}
              className={CAMPO}
            />
            <label htmlFor="filtro-hasta">hasta</label>
            <input
              id="filtro-hasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => aplicar({ hasta: e.target.value || null, periodo: null })}
              className={CAMPO}
            />
          </div>
        </>
      )}

      <select
        aria-label="Instrumento"
        value={instrumento ?? ""}
        onChange={(e) => aplicar({ instrumento: e.target.value || null })}
        className={CAMPO}
      >
        <option value="">Todos los instrumentos</option>
        {instrumentos.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {hayFiltros && (
        <button
          type="button"
          onClick={() =>
            aplicar(
              soloInstrumento
                ? { instrumento: null }
                : { periodo: null, desde: null, hasta: null, instrumento: null },
            )
          }
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Quitar filtros
        </button>
      )}
    </div>
  );
}
