"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unidadDe } from "@/lib/format";
import { TIPOS_CIERRE, TIPO_CIERRE_MAP, type Instrument, type TipoCierre } from "@/lib/types";
import { cn } from "@/lib/utils";

type InstrumentoMinimo = Pick<Instrument, "asset_class" | "valor_pip" | "decimales_precio">;

interface Props {
  instrumento: InstrumentoMinimo | null;
  valor: TipoCierre | null;
  onChange: (valor: TipoCierre | null) => void;
  /** Valor del campo condicional, en pips o puntos (lo que el usuario escribe). */
  medicion: string;
  onMedicionChange: (valor: string) => void;
  /** Si es opcional, se puede dejar sin clasificar y va a la cola de revisión. */
  opcional?: boolean;
}

const INMEDIATOS = TIPOS_CIERRE.filter((t) => t.momento === "inmediato");
const DE_REVISION = TIPOS_CIERRE.filter((t) => t.momento === "revision");

export function SelectorTipoCierre({
  instrumento,
  valor,
  onChange,
  medicion,
  onMedicionChange,
  opcional = true,
}: Props) {
  const meta = valor ? TIPO_CIERRE_MAP[valor] : null;
  const unidad = instrumento ? unidadDe(instrumento.asset_class) : "puntos";

  function elegir(tipo: TipoCierre) {
    // Volver a pulsar el mismo lo deselecciona: queda pendiente de revisión.
    if (valor === tipo && opcional) {
      onChange(null);
      onMedicionChange("");
      return;
    }
    onChange(tipo);
    // El campo de medición pertenece al tipo anterior: no se arrastra.
    if (TIPO_CIERRE_MAP[tipo].campo !== TIPO_CIERRE_MAP[valor ?? tipo]?.campo) {
      onMedicionChange("");
    }
  }

  return (
    <div className="space-y-4">
      <Grupo
        titulo="Se sabe al cerrar"
        ayuda="No hace falta revisar el gráfico después."
        tipos={INMEDIATOS}
        valor={valor}
        onElegir={elegir}
      />
      <Grupo
        titulo="Normalmente se sabe revisando después"
        ayuda="Si aún no lo tienes claro, déjalo sin marcar y la operación entra a la cola de revisión."
        tipos={DE_REVISION}
        valor={valor}
        onElegir={elegir}
      />

      {meta?.campo && (
        <div className="space-y-2 rounded-md border border-border bg-background/40 p-4">
          <Label htmlFor="medicion">
            {meta.campoEtiqueta} <span className="text-muted-foreground">({unidad})</span>
          </Label>
          <Input
            id="medicion"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            className="font-mono"
            placeholder={unidad === "pips" ? "Ej: 8.5" : "Ej: 120"}
            value={medicion}
            onChange={(e) => onMedicionChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {meta.campoAyuda} Es el dato que alimenta la métrica de &ldquo;{meta.mide}
            &rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  ayuda,
  tipos,
  valor,
  onElegir,
}: {
  titulo: string;
  ayuda: string;
  tipos: typeof TIPOS_CIERRE;
  valor: TipoCierre | null;
  onElegir: (t: TipoCierre) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {titulo}
        </div>
        <p className="text-xs text-muted-foreground/70">{ayuda}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {tipos.map((t) => {
          const activo = valor === t.valor;
          return (
            <button
              key={t.valor}
              type="button"
              onClick={() => onElegir(t.valor)}
              aria-pressed={activo}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                activo
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:border-border hover:bg-accent/50",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    t.tono === "positivo" && "bg-positive",
                    t.tono === "negativo" && "border border-white/25 bg-negative",
                    t.tono === "neutro" && "bg-muted-foreground/50",
                  )}
                />
                <span className={cn("text-sm font-medium", activo && "text-primary")}>
                  {t.etiqueta}
                </span>
              </div>
              <p className="pt-1 text-xs leading-snug text-muted-foreground">{t.descripcion}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
