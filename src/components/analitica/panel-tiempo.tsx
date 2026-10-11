import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPorcentaje } from "@/lib/format";
import type { FilaTiempo } from "@/lib/datos/analitica";
import { cn } from "@/lib/utils";

export function TablaTiempo({
  filas,
  encabezado,
  moneda,
  vacio,
}: {
  filas: FilaTiempo[];
  encabezado: string;
  moneda: string;
  vacio: string;
}) {
  if (filas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">{vacio}</p>
      </div>
    );
  }

  const maxAbs = Math.max(...filas.map((f) => Math.abs(f.plTotal)), 1);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{encabezado}</TableHead>
          <TableHead className="text-right">Ops</TableHead>
          <TableHead className="text-right">Win rate</TableHead>
          <TableHead className="text-right">P/L</TableHead>
          <TableHead className="w-[120px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.clave}>
            <TableCell className="font-medium">{f.etiqueta}</TableCell>
            <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
              {f.operaciones}
            </TableCell>
            <TableCell className="tabular text-right font-mono text-xs">
              {formatPorcentaje(f.winRate)}
            </TableCell>
            <TableCell className="text-right">
              <CifraResultado monto={f.plTotal} moneda={moneda} />
            </TableCell>
            <TableCell>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-full",
                    f.plTotal > 0 ? "bg-positive" : "border border-white/20 bg-negative",
                  )}
                  style={{ width: `${Math.max((Math.abs(f.plTotal) / maxAbs) * 100, 3)}%` }}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
