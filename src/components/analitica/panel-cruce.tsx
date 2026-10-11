import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FilaCruce } from "@/lib/datos/analitica";
import { CATEGORIA_TAG_MAP, SUBTIPO_SALIDA_LABEL, TIPOS_CIERRE } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Cruce tag × tipo de cierre. La celda no muestra el conteo pelado sino la
 * proporción dentro del tag: lo que interesa no es que un setup acumule 4
 * stops en contra, sino que el 60% de sus operaciones acaben así.
 */
export function PanelCruce({ filas, moneda }: { filas: FilaCruce[]; moneda: string }) {
  if (filas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Hacen falta operaciones clasificadas y con tags para cruzarlas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">Confirmación</TableHead>
            <TableHead className="text-right">Ops</TableHead>
            {TIPOS_CIERRE.map((t) => (
              <TableHead key={t.valor} className="text-center">
                <span title={t.etiqueta} className="block max-w-[64px] text-[10px] leading-tight">
                  {t.etiqueta}
                </span>
              </TableHead>
            ))}
            <TableHead className="text-right">P/L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.tagId}>
              <TableCell>
                <span className="font-medium">{fila.nombre}</span>
                <div className="text-[10px] text-muted-foreground">
                  {fila.categoria === "salida" && fila.subtipoSalida
                    ? SUBTIPO_SALIDA_LABEL[fila.subtipoSalida]
                    : CATEGORIA_TAG_MAP[fila.categoria].etiqueta}
                </div>
              </TableCell>
              <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                {fila.total}
              </TableCell>

              {TIPOS_CIERRE.map((t) => {
                const casos = fila.conteos[t.valor];
                const proporcion = fila.total ? casos / fila.total : 0;

                return (
                  <TableCell key={t.valor} className="p-1 text-center">
                    {casos === 0 ? (
                      <span className="text-xs text-muted-foreground/25">·</span>
                    ) : (
                      <span
                        title={`${casos} de ${fila.total} (${Math.round(proporcion * 100)}%)`}
                        className={cn(
                          "tabular inline-flex h-7 w-10 items-center justify-center rounded font-mono text-[11px]",
                          t.tono === "positivo" && "text-positive",
                          t.tono === "negativo" && "text-negative-foreground",
                          t.tono === "neutro" && "text-muted-foreground",
                        )}
                        style={{
                          // La intensidad del fondo es la proporción: cuanto
                          // más oscura o más verde la celda, más concentrado
                          // está ese desenlace en ese tag.
                          backgroundColor:
                            t.tono === "positivo"
                              ? `hsl(var(--positive) / ${0.08 + proporcion * 0.35})`
                              : t.tono === "negativo"
                                ? `hsl(0 0% 0% / ${0.25 + proporcion * 0.75})`
                                : `hsl(var(--muted) / ${0.3 + proporcion * 0.5})`,
                          boxShadow:
                            t.tono === "negativo"
                              ? `inset 0 0 0 1px hsl(0 0% 100% / ${0.08 + proporcion * 0.15})`
                              : undefined,
                        }}
                      >
                        {Math.round(proporcion * 100)}%
                      </span>
                    )}
                  </TableCell>
                );
              })}

              <TableCell className="text-right">
                <CifraResultado monto={fila.plTotal} moneda={moneda} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Cada celda es el porcentaje de las operaciones de esa confirmación que terminaron así.
        Leído por categoría: mucho <span className="text-foreground">Stop en contra</span> en
        una de <span className="text-foreground">estructura</span> señala que lees mal el
        mercado; mucho <span className="text-foreground">Stop cacería</span> en una de{" "}
        <span className="text-foreground">zona de stop</span> señala que lo colocas demasiado
        ajustado; y mucho <span className="text-foreground">TP corto</span> en una de{" "}
        <span className="text-foreground">zona de TP</span>, que te quedas corto de objetivo.
      </p>
    </div>
  );
}
