"use client";

import { CheckCircle2, CircleSlash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unidadDe } from "@/lib/format";
import { TIPO_ORDEN_MAP, type AssetClass, type TipoOrden } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * La pregunta que solo tiene sentido en órdenes pendientes.
 *
 * Una orden que no se activa no es una pérdida: es la señal de que la
 * dirección pudo estar bien leída pero la entrada quedó lejos de donde el
 * mercado reaccionó. Sin registrarlo, ese caso desaparece de la bitácora y
 * con él la única medida de precisión de entrada que existe.
 */
export function PreguntaActivacion({
  tipoOrden,
  activada,
  onChange,
  assetClass,
  distancia,
  onDistanciaChange,
}: {
  tipoOrden: TipoOrden;
  activada: boolean;
  onChange: (activada: boolean) => void;
  /** Para saber si la distancia se mide en pips o en puntos. */
  assetClass?: AssetClass;
  distancia?: string;
  onDistanciaChange?: (valor: string) => void;
}) {
  const meta = TIPO_ORDEN_MAP[tipoOrden];
  if (!meta.pendiente) return null;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-4">
      <Label>¿Se activó la orden?</Label>
      <p className="text-xs text-muted-foreground">
        {meta.etiqueta}: {meta.descripcion}
      </p>

      <div className="grid gap-2 pt-1 sm:grid-cols-2">
        <Opcion
          activo={activada}
          onClick={() => onChange(true)}
          icono={<CheckCircle2 className="h-4 w-4" />}
          titulo="Sí, se ejecutó"
          detalle="El precio llegó y la operación corrió."
        />
        <Opcion
          activo={!activada}
          onClick={() => onChange(false)}
          icono={<CircleSlash className="h-4 w-4" />}
          titulo="No llegó a activarse"
          detalle="El precio no tocó tu orden."
        />
      </div>

      {!activada && (
        <div className="space-y-3 pt-1">
          <p className="text-xs leading-snug text-muted-foreground">
            Se guardará sin salida ni resultado. Cuenta como falta de precisión en la entrada, no
            como pérdida: la lectura de dirección pudo ser correcta.
          </p>

          {onDistanciaChange && (
            <div className="space-y-1.5">
              <Label htmlFor="distancia-activacion">
                ¿Por cuánto no entró?{" "}
                <span className="text-muted-foreground">
                  ({assetClass ? unidadDe(assetClass) : "pips"}, opcional)
                </span>
              </Label>
              <Input
                id="distancia-activacion"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                className="font-mono"
                placeholder="Ej: 4.5"
                value={distancia ?? ""}
                onChange={(e) => onDistanciaChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lo que le faltó al precio para tocar tu orden. Es el dato que dice cuánto hay
                que acercar la entrada la próxima vez.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Opcion({
  activo,
  onClick,
  icono,
  titulo,
  detalle,
}: {
  activo: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "rounded-md border p-3 text-left transition-colors",
        activo
          ? "border-primary bg-primary/10"
          : "border-border bg-background/40 hover:bg-accent/50",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          activo ? "text-primary" : "text-foreground",
        )}
      >
        {icono}
        {titulo}
      </span>
      <span className="block pt-1 text-xs text-muted-foreground">{detalle}</span>
    </button>
  );
}
