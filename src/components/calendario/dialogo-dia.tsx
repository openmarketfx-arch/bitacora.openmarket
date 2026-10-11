"use client";

import Link from "next/link";
import { resultadoNeto } from "@/lib/resultado";
import { ChevronRight } from "lucide-react";
import { EtiquetaTipoOrden } from "@/components/operaciones/selector-tipo-orden";
import { Badge } from "@/components/ui/badge";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { useZona } from "@/components/layout/proveedor-zona";
import { etiquetaPeriodo, NOMBRE_PERIODO } from "@/components/riesgo/formato";
import { formatDinero, formatPrecio, plural } from "@/lib/format";
import type { DiaCalendario } from "@/lib/datos/calendario";
import { TIPO_CIERRE_MAP } from "@/lib/types";
import { cn } from "@/lib/utils";

const FMT_DIA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatosHora = new Map<string, Intl.DateTimeFormat>();

function formatoHora(zona: string): Intl.DateTimeFormat {
  let f = formatosHora.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("es-ES", { timeZone: zona, hour: "2-digit", minute: "2-digit" });
    formatosHora.set(zona, f);
  }
  return f;
}

export function DialogoDia({
  dia,
  onOpenChange,
}: {
  dia: DiaCalendario;
  onOpenChange: (abierto: boolean) => void;
}) {
  const zona = useZona();
  const titulo = FMT_DIA.format(dia.fecha);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="first-letter:uppercase">{titulo}</DialogTitle>
          <DialogDescription>
            {plural(dia.operaciones.length, "operación", "operaciones")}
            {dia.cerradas > 0 && ` · ${plural(dia.cerradas, "cerrada", "cerradas")}`}
            {dia.abiertas > 0 && ` · ${dia.abiertas} en curso`}
            {dia.pendientes > 0 && ` · ${dia.pendientes} por revisar`}
          </DialogDescription>
        </DialogHeader>

        {dia.incumplimientos.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-300">
              <ShieldAlert className="h-4 w-4" />
              {dia.incumplimientos.length === 1
                ? "Superaste un límite de pérdida"
                : `Superaste ${dia.incumplimientos.length} límites de pérdida`}
            </div>
            <ul className="space-y-0.5 text-xs text-red-200/80">
              {dia.incumplimientos.map((i) => (
                <li key={`${i.cuentaId}-${i.tipo}-${i.inicio}`}>
                  Límite {NOMBRE_PERIODO[i.tipo].singular} ({etiquetaPeriodo(i)}): perdiste{" "}
                  {formatDinero(i.perdida, i.moneda, { signo: false })} y tu máximo era{" "}
                  {formatDinero(i.limite, i.moneda, { signo: false })}.
                </li>
              ))}
            </ul>
          </div>
        )}

        {dia.neto !== null && (
          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Resultado neto del día</span>
            <CifraResultado monto={dia.neto} tamano="md" />
          </div>
        )}

        <div className="space-y-2">
          {dia.operaciones.map((op) => {
            const cierre = op.tipo_cierre ? TIPO_CIERRE_MAP[op.tipo_cierre] : null;
            const hora =
              op.estado_operacion === "cerrada" && op.fecha_hora_salida
                ? op.fecha_hora_salida
                : op.fecha_hora_entrada;

            return (
              <Link
                key={op.id}
                href={`/operaciones/${op.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="tabular w-11 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {formatoHora(zona).format(new Date(hora))}
                </span>

                <span className="w-[74px] shrink-0 font-mono text-xs font-medium">
                  {op.instrument.simbolo}
                </span>

                <span className="w-[86px] shrink-0 text-muted-foreground">
                  <EtiquetaTipoOrden tipo={op.tipo_orden} activada={op.orden_activada} />
                </span>

                <span className="tabular hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                  {formatPrecio(op.precio_entrada, op.instrument.decimales_precio)}
                  {op.precio_salida !== null && (
                    <> → {formatPrecio(op.precio_salida, op.instrument.decimales_precio)}</>
                  )}
                </span>

                <span className="ml-auto flex shrink-0 items-center gap-2">
                  {op.estado_operacion === "abierta" ? (
                    <Badge variant="primary">Abierta</Badge>
                  ) : op.estado_operacion === "no_activada" ? (
                    <Badge variant="outline">No activada</Badge>
                  ) : cierre ? (
                    <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          cierre.tono === "positivo" && "bg-positive",
                          cierre.tono === "negativo" && "border border-white/25 bg-negative",
                          cierre.tono === "neutro" && "bg-muted-foreground/50",
                        )}
                      />
                      {cierre.etiqueta}
                    </span>
                  ) : (
                    <Badge variant="warning">Por revisar</Badge>
                  )}

                  <CifraResultado
                    monto={resultadoNeto(op)}
                    moneda={op.account.moneda_base}
                    tamano="sm"
                  />

                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
