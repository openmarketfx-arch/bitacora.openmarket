import Link from "next/link";
import { EtiquetaTipoOrden } from "@/components/operaciones/selector-tipo-orden";
import { Badge } from "@/components/ui/badge";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFechaHora, formatPrecio } from "@/lib/format";
import { TIPO_CIERRE_MAP, type TradeCompleto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TablaOperaciones({
  operaciones,
  zona,
  vacio = "Todavía no hay operaciones.",
}: {
  operaciones: TradeCompleto[];
  /** Zona horaria del usuario, para mostrar las horas. */
  zona: string;
  vacio?: string;
}) {
  if (operaciones.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">{vacio}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estado</TableHead>
          <TableHead>Entrada</TableHead>
          <TableHead>Instrumento</TableHead>
          <TableHead>Orden</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Salida</TableHead>
          <TableHead className="text-right">Resultado</TableHead>
          <TableHead>Cierre</TableHead>
          <TableHead>Confirmaciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {operaciones.map((op) => {
          const cierre = op.tipo_cierre ? TIPO_CIERRE_MAP[op.tipo_cierre] : null;

          return (
            <TableRow key={op.id}>
              <TableCell>
                {op.estado_operacion === "abierta" ? (
                  <Badge variant="primary">Abierta</Badge>
                ) : op.estado_operacion === "no_activada" ? (
                  <Badge variant="outline">No activada</Badge>
                ) : op.estado_revision === "pendiente" ? (
                  <Badge variant="warning">Por revisar</Badge>
                ) : (
                  <Badge variant="outline">Revisada</Badge>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatFechaHora(op.fecha_hora_entrada, zona)}
              </TableCell>

              <TableCell>
                <Link
                  href={`/operaciones/${op.id}`}
                  className="font-mono text-xs font-medium hover:text-primary hover:underline"
                >
                  {op.instrument.simbolo}
                </Link>
                <div className="text-[11px] text-muted-foreground">{op.account.nombre}</div>
              </TableCell>

              <TableCell className="text-muted-foreground">
                <EtiquetaTipoOrden tipo={op.tipo_orden} activada={op.orden_activada} />
              </TableCell>

              <TableCell className="tabular text-right font-mono text-xs">
                {formatPrecio(op.precio_entrada, op.instrument.decimales_precio)}
              </TableCell>

              <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                {formatPrecio(op.precio_salida, op.instrument.decimales_precio)}
              </TableCell>

              <TableCell className="text-right">
                <CifraResultado
                  monto={op.resultado_dinero}
                  moneda={op.account.moneda_base}
                  tamano="sm"
                />
              </TableCell>

              <TableCell>
                {cierre ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
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
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </TableCell>

              <TableCell>
                {op.tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {op.tags.map((t) => (
                      <Badge key={t.id} variant="outline" className="text-[10px]">
                        {t.nombre}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
