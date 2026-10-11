import { Card, CardContent } from "@/components/ui/card";
import { estiloTono } from "@/components/ui/cifra-resultado";
import { type Tono } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  etiqueta: string;
  valor: React.ReactNode;
  /** Cuando se pasa, el valor se pinta dentro de un chip con el tono. */
  tono?: Tono;
  detalle?: React.ReactNode;
  icono?: React.ReactNode;
  destacado?: boolean;
}

export function TarjetaKpi({ etiqueta, valor, tono, detalle, icono, destacado }: Props) {
  return (
    <Card className={cn(destacado && "border-amber-500/40")}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {etiqueta}
          </span>
          {icono}
        </div>

        {tono ? (
          <div
            className={cn(
              "tabular inline-flex items-center rounded-md border px-2 py-1 font-mono text-lg font-semibold",
              estiloTono(tono),
            )}
          >
            {valor}
          </div>
        ) : (
          <div className="tabular font-mono text-2xl font-semibold leading-none">{valor}</div>
        )}

        {detalle && <div className="text-xs text-muted-foreground">{detalle}</div>}
      </CardContent>
    </Card>
  );
}
