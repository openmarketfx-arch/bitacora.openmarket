import Link from "next/link";
import { formatDinero, tonoDe } from "@/lib/format";
import { formatearMes } from "@/lib/datos/calendario";
import type { ResumenDia } from "@/lib/datos/metricas";
import { cn } from "@/lib/utils";

const FMT_DIA_CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "narrow" });

/** Tira de los últimos días, con el mismo código de color del calendario. */
export function TiraDias({ dias }: { dias: ResumenDia[] }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
      {dias.map((dia) => {
        const tono = tonoDe(dia.neto);
        const mes = formatearMes(dia.fecha.getFullYear(), dia.fecha.getMonth() + 1);

        return (
          <Link
            key={dia.clave}
            href={`/calendario?mes=${mes}`}
            title={
              dia.neto === null
                ? `${dia.clave}: sin operaciones`
                : `${dia.clave}: ${formatDinero(dia.neto)} en ${dia.operaciones}`
            }
            className={cn(
              "flex min-w-[46px] flex-1 flex-col items-center gap-1 rounded-md border p-2 transition-colors hover:brightness-125",
              dia.neto === null
                ? "border-border bg-card"
                : tono === "positivo"
                  ? "border-positive/30 bg-positive/15"
                  : tono === "negativo"
                    ? "border-white/15 bg-negative"
                    : "border-border bg-muted/40",
            )}
          >
            <span
              className={cn(
                "text-[10px] uppercase",
                tono === "negativo" ? "text-negative-foreground/60" : "text-muted-foreground",
              )}
            >
              {FMT_DIA_CORTO.format(dia.fecha)}
              {dia.fecha.getDate()}
            </span>
            <span
              className={cn(
                "tabular font-mono text-[10px] font-medium",
                dia.neto === null
                  ? "text-muted-foreground/40"
                  : tono === "positivo"
                    ? "text-positive"
                    : tono === "negativo"
                      ? "text-negative-foreground"
                      : "text-muted-foreground",
              )}
            >
              {dia.neto === null ? "—" : formatDinero(dia.neto).replace(/,\d\d$/, "")}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
