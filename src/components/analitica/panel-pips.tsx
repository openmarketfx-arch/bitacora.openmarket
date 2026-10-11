import { Ruler } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPorcentaje, formatRatio } from "@/lib/format";
import type { PlanPorInstrumento, PromedioInstrumento } from "@/lib/datos/analitica";
import { TIPO_CIERRE_MAP, type TipoCierre } from "@/lib/types";
import { cn } from "@/lib/utils";

const num = (v: number | null, decimales = 1) =>
  v === null ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: decimales });

/** Una medición en pips, desglosada por instrumento. */
export function TarjetaMedicion({
  titulo,
  explicacion,
  promedios,
  tono = "neutro",
}: {
  titulo: string;
  explicacion: string;
  promedios: PromedioInstrumento[];
  tono?: "neutro" | "negativo" | "positivo";
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            {titulo}
          </h3>
          <p className="pt-0.5 text-xs leading-snug text-muted-foreground">{explicacion}</p>
        </div>

        {promedios.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground/60">Todavía sin casos medidos.</p>
        ) : (
          <div className="space-y-1.5">
            {promedios.map((p) => (
              <div
                key={p.simbolo}
                className="flex items-baseline justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
              >
                <span className="font-mono text-[11px] text-muted-foreground">{p.simbolo}</span>
                <span className="tabular font-mono text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      tono === "negativo" && "text-negative-foreground",
                      tono === "positivo" && "text-positive",
                    )}
                  >
                    {num(p.promedio)}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">{p.unidad}</span>
                  <span className="pl-1.5 text-[10px] text-muted-foreground">
                    ({p.operaciones})
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Riesgo, objetivo y recorrido real, por instrumento. */
export function TablaPlanificacion({ filas }: { filas: PlanPorInstrumento[] }) {
  if (filas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-12 text-center">
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Ninguna operación cerrada tiene TP o stop registrados. Apúntalos al abrir y aquí verás
          cuánto arriesgas, cuánto buscas y cuánto capturas de verdad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Instrumento</TableHead>
            <TableHead className="text-right">Ops</TableHead>
            <TableHead className="text-right">Riesgo medio</TableHead>
            <TableHead className="text-right">Objetivo medio</TableHead>
            <TableHead className="text-right">R:R medio</TableHead>
            <TableHead className="text-right">Recorrido real</TableHead>
            <TableHead className="text-right">Captura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.simbolo}>
              <TableCell className="font-mono text-xs font-medium">{f.simbolo}</TableCell>
              <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                {f.operaciones}
              </TableCell>
              <TableCell className="tabular text-right font-mono text-xs">
                {num(f.riesgoMedio)} <span className="text-muted-foreground">{f.unidad}</span>
              </TableCell>
              <TableCell className="tabular text-right font-mono text-xs">
                {num(f.objetivoMedio)} <span className="text-muted-foreground">{f.unidad}</span>
              </TableCell>
              <TableCell className="tabular text-right font-mono text-xs">
                {formatRatio(f.ratioMedio)}
              </TableCell>
              <TableCell className="tabular text-right font-mono text-xs">
                {num(f.recorridoMedio)} <span className="text-muted-foreground">{f.unidad}</span>
              </TableCell>
              <TableCell
                className={cn(
                  "tabular text-right font-mono text-xs font-medium",
                  f.capturaObjetivo !== null && f.capturaObjetivo >= 90 && "text-positive",
                  f.capturaObjetivo !== null && f.capturaObjetivo < 60 && "text-amber-400",
                )}
              >
                {formatPorcentaje(f.capturaObjetivo, 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="text-foreground">Captura</span> es qué parte del objetivo que te
        marcaste acabaste recorriendo de verdad. Por debajo del 60% de forma sostenida, o los
        TP están demasiado lejos o estás saliendo antes de tiempo — el cruce con{" "}
        <span className="text-foreground">TP corto</span> y{" "}
        <span className="text-foreground">cierre incorrecto</span> dice cuál de las dos.
      </p>
    </div>
  );
}

/** Las mediciones de los tipos de cierre que llevan una, en una rejilla. */
export function MedicionesDeCierre({
  mediciones,
}: {
  mediciones: { tipo: TipoCierre; promedios: PromedioInstrumento[] }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {mediciones.map(({ tipo, promedios }) => {
        const meta = TIPO_CIERRE_MAP[tipo];
        return (
          <TarjetaMedicion
            key={tipo}
            titulo={`${meta.etiqueta} · ${meta.campoEtiqueta}`}
            explicacion={meta.campoAyuda ?? ""}
            promedios={promedios}
            tono={meta.tono === "positivo" ? "positivo" : "negativo"}
          />
        );
      })}
    </div>
  );
}
