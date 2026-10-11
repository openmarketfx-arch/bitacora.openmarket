"use client";

import { ArrowDownRight, ArrowUpRight, Clock } from "lucide-react";
import { TIPOS_ORDEN, TIPO_ORDEN_MAP, type TipoOrden } from "@/lib/types";
import { cn } from "@/lib/utils";

const A_MERCADO = TIPOS_ORDEN.filter((t) => !t.pendiente);
const PENDIENTES = TIPOS_ORDEN.filter((t) => t.pendiente);

export function SelectorTipoOrden({
  valor,
  onChange,
}: {
  valor: TipoOrden;
  onChange: (valor: TipoOrden) => void;
}) {
  const meta = TIPO_ORDEN_MAP[valor];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          A mercado
        </div>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          {A_MERCADO.map((t) => (
            <Boton key={t.valor} tipo={t.valor} activo={valor === t.valor} onChange={onChange} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Clock className="h-3 w-3" />
          Pendientes
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PENDIENTES.map((t) => (
            <Boton key={t.valor} tipo={t.valor} activo={valor === t.valor} onChange={onChange} />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{meta.descripcion}</p>
    </div>
  );
}

function Boton({
  tipo,
  activo,
  onChange,
}: {
  tipo: TipoOrden;
  activo: boolean;
  onChange: (t: TipoOrden) => void;
}) {
  const meta = TIPO_ORDEN_MAP[tipo];
  const Icono = meta.direccion === "compra" ? ArrowUpRight : ArrowDownRight;

  return (
    <button
      type="button"
      onClick={() => onChange(tipo)}
      aria-pressed={activo}
      title={meta.descripcion}
      className={cn(
        "flex h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-sm transition-colors",
        activo
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border bg-background/40 text-muted-foreground hover:bg-accent/50",
      )}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{meta.etiqueta}</span>
    </button>
  );
}

/** Etiqueta compacta con icono, para tablas y fichas. */
export function EtiquetaTipoOrden({
  tipo,
  activada,
  className,
}: {
  tipo: TipoOrden;
  activada?: boolean | null;
  className?: string;
}) {
  const meta = TIPO_ORDEN_MAP[tipo];
  const Icono = meta.direccion === "compra" ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs", className)}
      title={meta.descripcion}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" />
      {meta.etiqueta}
      {meta.pendiente && activada === false && (
        <span className="text-[10px] text-muted-foreground/70">· no activada</span>
      )}
    </span>
  );
}
