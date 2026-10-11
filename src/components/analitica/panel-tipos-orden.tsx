import { Crosshair } from "lucide-react";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPorcentaje, plural } from "@/lib/format";
import type { FilaTipoOrden, ResumenOrdenesPendientes } from "@/lib/datos/analitica";
import { TIPO_ORDEN_MAP } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PanelTiposOrden({
  filas,
  resumen,
  moneda,
}: {
  filas: FilaTipoOrden[];
  resumen: ResumenOrdenesPendientes;
  moneda: string;
}) {
  const conUso = filas.filter((f) => f.total > 0);

  if (conUso.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">Todavía no hay operaciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {resumen.total > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Órdenes pendientes
              </div>
              <div className="tabular font-mono text-2xl font-semibold leading-none">
                {resumen.total}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumen.activadas} ejecutadas · {resumen.noActivadas} sin activar
                {resumen.enCurso > 0 && ` · ${resumen.enCurso} esperando`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tasa de activación
              </div>
              <div className="tabular font-mono text-2xl font-semibold leading-none">
                {formatPorcentaje(resumen.tasaActivacion)}
              </div>
              <p className="text-xs text-muted-foreground">
                De las órdenes ya resueltas, cuántas llegó a tocar el precio.
              </p>
            </CardContent>
          </Card>

          <Card className={cn(resumen.noActivadas > 0 && "border-amber-500/40")}>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Crosshair className="h-3 w-3" />
                Precisión de entrada
              </div>
              {resumen.peorPrecision ? (
                <>
                  <div className="text-sm font-medium">{resumen.peorPrecision.etiqueta}</div>
                  <p className="text-xs text-muted-foreground">
                    {resumen.peorPrecision.noActivadas} de {resumen.peorPrecision.total} no
                    llegaron a activarse: el nivel quedó lejos de donde reaccionó el mercado.
                  </p>
                </>
              ) : (
                <p className="pt-1 text-xs text-muted-foreground">
                  Todas tus órdenes pendientes se han llenado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de orden</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Activación</TableHead>
            <TableHead className="text-right">Ejecutadas</TableHead>
            <TableHead className="text-right">Win rate</TableHead>
            <TableHead className="text-right">Expectativa</TableHead>
            <TableHead className="text-right">P/L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conUso.map((f) => {
            const meta = TIPO_ORDEN_MAP[f.tipo];

            return (
              <TableRow key={f.tipo}>
                <TableCell>
                  <span className="text-sm font-medium">{meta.etiqueta}</span>
                  <div className="text-[11px] text-muted-foreground">
                    {meta.pendiente ? "Pendiente" : "A mercado"}
                  </div>
                </TableCell>

                <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                  {f.total}
                </TableCell>

                <TableCell className="text-right">
                  {f.tasaActivacion === null ? (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  ) : (
                    <>
                      <span className="tabular font-mono text-xs">
                        {formatPorcentaje(f.tasaActivacion, 0)}
                      </span>
                      {f.noActivadas > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          {plural(f.noActivadas, "sin activar", "sin activar")}
                        </div>
                      )}
                    </>
                  )}
                </TableCell>

                <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                  {f.activadas}
                </TableCell>

                <TableCell className="tabular text-right font-mono text-xs">
                  {formatPorcentaje(f.winRate)}
                </TableCell>

                <TableCell className="text-right">
                  <CifraResultado monto={f.expectativa} moneda={moneda} />
                </TableCell>

                <TableCell className="text-right">
                  <CifraResultado monto={f.plTotal} moneda={moneda} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Una orden pendiente que no se activa no cuenta como pérdida y no entra en el win rate:
        no hubo operación. Lo que mide es otra cosa — que el nivel de entrada quedó lejos de
        donde el mercado reaccionó. Si la tasa de activación es baja pero las que sí entran
        ganan, el problema es de precisión, no de lectura de dirección.
      </p>
    </div>
  );
}
