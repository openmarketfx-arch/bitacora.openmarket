"use client";

import { useState } from "react";
import { Circle, Clock, ShieldAlert } from "lucide-react";
import { DialogoDia } from "@/components/calendario/dialogo-dia";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { formatDinero, plural, tonoDe } from "@/lib/format";
import type { DiaCalendario, MesCalendario } from "@/lib/datos/calendario";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function RejillaMes({ mes }: { mes: MesCalendario }) {
  const [diaAbierto, setDiaAbierto] = useState<DiaCalendario | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-card">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {mes.dias.map((dia) => (
            <Celda key={dia.clave} dia={dia} onAbrir={() => setDiaAbierto(dia)} />
          ))}
        </div>
      </div>

      {diaAbierto && (
        <DialogoDia dia={diaAbierto} onOpenChange={() => setDiaAbierto(null)} />
      )}
    </>
  );
}

function Celda({ dia, onAbrir }: { dia: DiaCalendario; onAbrir: () => void }) {
  const tono = tonoDe(dia.neto);
  const tieneAlgo = dia.operaciones.length > 0;
  const superoLimiteDiario = dia.incumplimientos.some((i) => i.tipo === "diario");
  const periodosSuperados = dia.incumplimientos.length;

  // El negro va de relleno, igual que en las cifras de resultado: sobre el
  // fondo de la app un día perdedor se lee por su mancha, no por el texto.
  const fondo =
    dia.neto === null
      ? "bg-card"
      : tono === "positivo"
        ? "bg-positive/15"
        : tono === "negativo"
          ? "bg-negative"
          : "bg-muted/40";

  return (
    <button
      type="button"
      onClick={tieneAlgo ? onAbrir : undefined}
      disabled={!tieneAlgo}
      aria-label={
        tieneAlgo
          ? `${dia.fecha.getUTCDate()}: ${plural(
              dia.operaciones.length,
              "operación",
              "operaciones",
            )}${dia.neto !== null ? `, neto ${formatDinero(dia.neto)}` : ""}`
          : `${dia.fecha.getUTCDate()}, sin operaciones`
      }
      className={cn(
        "relative flex min-h-[92px] flex-col gap-1 border-b border-r border-border/70 p-2 text-left transition-colors",
        fondo,
        !dia.delMes && "opacity-35",
        tieneAlgo ? "cursor-pointer hover:brightness-125" : "cursor-default",
        dia.esHoy && "ring-1 ring-inset ring-primary/60",
        superoLimiteDiario && "outline outline-1 -outline-offset-1 outline-red-500/70",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "tabular text-xs font-medium",
            dia.esHoy ? "text-primary" : "text-muted-foreground",
            tono === "negativo" && !dia.esHoy && "text-negative-foreground/70",
          )}
        >
          {dia.fecha.getUTCDate()}
        </span>

        <div className="flex items-center gap-1">
          {periodosSuperados > 0 && (
            <span
              title={`Superaste ${periodosSuperados === 1 ? "un límite de pérdida" : `${periodosSuperados} límites de pérdida`} que incluye${periodosSuperados === 1 ? "" : "n"} este día`}
              className={cn(
                "flex items-center gap-0.5 text-[10px]",
                superoLimiteDiario ? "text-red-400" : "text-red-400/60",
              )}
            >
              <ShieldAlert className="h-3 w-3" />
            </span>
          )}
          {dia.abiertas > 0 && (
            <span
              title={`${dia.abiertas} abierta${dia.abiertas === 1 ? "" : "s"}`}
              className="flex items-center gap-0.5 text-[10px] text-primary"
            >
              <Clock className="h-2.5 w-2.5" />
              {dia.abiertas}
            </span>
          )}
          {dia.pendientes > 0 && (
            <span
              title={`${dia.pendientes} por revisar`}
              className="flex items-center gap-0.5 text-[10px] text-amber-400"
            >
              <Circle className="h-2 w-2 fill-current" />
              {dia.pendientes}
            </span>
          )}
        </div>
      </div>

      {dia.neto !== null && (
        <CifraResultado monto={dia.neto} tamano="sm" className="w-full justify-center" />
      )}

      {dia.cerradas > 0 && (
        <span
          className={cn(
            "mt-auto text-[10px]",
            tono === "negativo" ? "text-negative-foreground/50" : "text-muted-foreground",
          )}
        >
          {dia.cerradas} cerrada{dia.cerradas === 1 ? "" : "s"}
        </span>
      )}

      {dia.cerradas === 0 && dia.abiertas > 0 && (
        <span className="mt-auto text-[10px] text-muted-foreground">
          {dia.abiertas} en curso
        </span>
      )}
    </button>
  );
}
