import Link from "next/link";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPorcentaje, plural } from "@/lib/format";
import { codigoOperacion, etiquetaPlan } from "@/lib/plan-alterno";
import { resultadoNeto } from "@/lib/resultado";
import { mejorPlan, type FilaPlan, type ResumenSecuencias } from "@/lib/datos/analitica";

function desenlace(neto: number | null): string {
  if ((neto ?? 0) > 0) return "gana";
  if ((neto ?? 0) < 0) return "pierde";
  return "BE";
}

export function PanelPlanes({
  filas,
  resumen,
  moneda,
}: {
  filas: FilaPlan[];
  resumen: ResumenSecuencias;
  moneda: string;
}) {
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-16 text-center">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">
          Todavía no hay operaciones cerradas con plan. Activa el plan alterno en Configuración y
          elige el plan al registrar cada entrada para ver aquí cuál funciona mejor.
        </p>
      </div>
    );
  }

  const mejor = mejorPlan(filas);
  const { cacheriaRecuperada, gruposConCaceria } = resumen;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-1 p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              El plan que mejor funciona
            </div>
            {mejor ? (
              <>
                <div className="text-sm font-medium">{etiquetaPlan(mejor.plan)}</div>
                <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                  {formatPorcentaje(mejor.winRate)} de acierto y una expectativa de{" "}
                  <CifraResultado monto={mejor.expectativa} moneda={moneda} tamano="sm" /> por
                  operación, en {plural(mejor.operaciones, "operación", "operaciones")}.
                </p>
              </>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">
                Hacen falta al menos 3 operaciones cerradas en un plan para compararlo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={cacheriaRecuperada > 0 ? "border-amber-500/40" : undefined}>
          <CardContent className="space-y-1 p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Cacería seguida de acierto
            </div>
            {gruposConCaceria > 0 ? (
              <>
                <div className="text-sm font-medium">
                  {cacheriaRecuperada} de {plural(gruposConCaceria, "grupo", "grupos")} con cacería
                </div>
                <p className="text-xs text-muted-foreground">
                  {cacheriaRecuperada > 0
                    ? "Un plan cayó por cacería y otro posterior ganó. La lectura era buena y el stop quedó corto: es lo que se puede corregir."
                    : "Cuando un plan cae por cacería, el siguiente no la ha recuperado todavía."}
                </p>
              </>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">
                Ningún grupo enlazado tiene una operación cerrada por cacería de stop.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">Rendimiento por plan</h3>
          <p className="text-xs text-muted-foreground">
            Cada plan por separado. La cacería es el % de sus operaciones clasificadas que
            terminaron en stop por cacería.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Ops</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
              <TableHead className="text-right">Expectativa</TableHead>
              <TableHead className="text-right">P/L acumulado</TableHead>
              <TableHead className="text-right">Cacería</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.plan}>
                <TableCell className="font-medium">{etiquetaPlan(f.plan)}</TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {f.operaciones}
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {f.winRate === null ? "—" : formatPorcentaje(f.winRate)}
                </TableCell>
                <TableCell className="text-right">
                  <CifraResultado monto={f.expectativa} moneda={moneda} tamano="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <CifraResultado monto={f.plTotal} moneda={moneda} tamano="sm" />
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {f.clasificadas === 0
                    ? "—"
                    : `${f.cacerias} de ${f.clasificadas} · ${formatPorcentaje((f.cacerias / f.clasificadas) * 100, 0)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">Entradas enlazadas</h3>
          <p className="text-xs text-muted-foreground">
            Los planes tomados uno tras otro dentro de un mismo grupo, y cómo terminó el conjunto.
          </p>
        </div>

        {resumen.secuencias.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-10 text-center">
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Aún no hay grupos con dos o más operaciones cerradas. Al registrar una entrada,
              enlázala con la anterior de tu plan de entradas.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Secuencia</TableHead>
                  <TableHead className="text-right">Grupos</TableHead>
                  <TableHead className="text-right">En positivo</TableHead>
                  <TableHead className="text-right">P/L acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.porPatron.map((p) => (
                  <TableRow key={p.patron}>
                    <TableCell className="font-mono text-xs">{p.patron}</TableCell>
                    <TableCell className="tabular text-right font-mono text-xs">
                      {p.grupos}
                    </TableCell>
                    <TableCell className="tabular text-right font-mono text-xs">
                      {p.positivos} de {p.grupos}
                    </TableCell>
                    <TableCell className="text-right">
                      <CifraResultado monto={p.plTotal} moneda={moneda} tamano="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <ul className="space-y-2 pt-2">
              {resumen.secuencias.slice(0, 12).map((s) => (
                <li
                  key={s.grupoId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2 text-xs"
                >
                  <span className="font-mono font-medium">{s.patron}</span>
                  <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    {s.operaciones.map((o) => (
                      <Link
                        key={o.id}
                        href={`/operaciones/${o.id}`}
                        className="font-mono hover:text-primary hover:underline"
                      >
                        {codigoOperacion(o.numero)} ({desenlace(resultadoNeto(o))}
                        {o.tipo_cierre === "stop_caceria" ? ", cacería" : ""})
                      </Link>
                    ))}
                  </span>
                  {s.cacheriaYRecuperacion && (
                    <Badge variant="warning" className="text-[10px]">
                      Cacería y recuperación
                    </Badge>
                  )}
                  <CifraResultado
                    monto={s.plTotal}
                    moneda={moneda}
                    tamano="sm"
                    className="ml-auto"
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
