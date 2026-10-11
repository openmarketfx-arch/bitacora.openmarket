"use client";

import { CifraResultado } from "@/components/ui/cifra-resultado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  /** Prefijo para los id de los campos, así el mismo componente sirve en dos formularios. */
  id: string;
  comision: string;
  swap: string;
  onComisionChange: (valor: string) => void;
  onSwapChange: (valor: string) => void;
  /** Lo que lleva escrito en "Resultado", para mostrar el neto en vivo. */
  resultado: string;
  moneda: string;
}

/**
 * Comisión y swap que el bróker cobró por la operación. Son opcionales, pero
 * mueven el saldo de la cuenta, así que cuentan en el resultado neto y en la
 * medición del riesgo.
 */
export function CamposCostos({
  id,
  comision,
  swap,
  onComisionChange,
  onSwapChange,
  resultado,
  moneda,
}: Props) {
  const hayCostos = comision !== "" || swap !== "";
  const hayResultado = resultado !== "" && Number.isFinite(Number(resultado));
  const neto = Number(resultado || 0) + Number(comision || 0) + Number(swap || 0);

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-comision`}>
            Comisión <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id={`${id}-comision`}
            type="number"
            step="0.01"
            inputMode="decimal"
            className="font-mono"
            placeholder="-3.50"
            value={comision}
            onChange={(e) => onComisionChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-swap`}>
            Swap <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id={`${id}-swap`}
            type="number"
            step="0.01"
            inputMode="decimal"
            className="font-mono"
            placeholder="-1.20"
            value={swap}
            onChange={(e) => onSwapChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Resultado neto</Label>
          <div className="flex h-10 items-center rounded-md border border-dashed border-border px-3">
            {hayResultado || hayCostos ? (
              <CifraResultado monto={neto} moneda={moneda} tamano="sm" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Escríbelos como los muestra tu plataforma: en negativo si te los cobraron, en positivo
        si te los abonaron. Se suman al resultado y mueven el saldo de la cuenta.
      </p>
    </div>
  );
}
