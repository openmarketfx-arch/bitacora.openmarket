import { Tag as TagIcon } from "lucide-react";
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
import type { FilaTag } from "@/lib/datos/analitica";
import { cn } from "@/lib/utils";

export function PanelPorTag({
  filas,
  moneda,
  titulo,
  descripcion,
}: {
  filas: FilaTag[];
  moneda: string;
  titulo?: string;
  descripcion?: string;
}) {
  if (filas.length === 0) {
    return (
      <div className="space-y-2">
        {titulo && <h3 className="text-sm font-medium">{titulo}</h3>}
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-10 text-center">
          <TagIcon className="h-5 w-5 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Ninguna operación cerrada lleva confirmaciones de esta categoría.
          </p>
        </div>
      </div>
    );
  }

  const maxAbs = Math.max(...filas.map((f) => Math.abs(f.plTotal)), 1);

  return (
    <div className="space-y-2">
      {titulo && (
        <div>
          <h3 className="text-sm font-medium">{titulo}</h3>
          {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
        </div>
      )}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Confirmación</TableHead>
          <TableHead className="text-right">Ops</TableHead>
          <TableHead className="text-right">Win rate</TableHead>
          <TableHead className="text-right">Expectativa</TableHead>
          <TableHead className="text-right">P/L acumulado</TableHead>
          <TableHead className="w-[140px]">Peso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => {
          const ancho = (Math.abs(f.plTotal) / maxAbs) * 100;
          const positivo = f.plTotal > 0;

          return (
            <TableRow key={f.tagId}>
              <TableCell className="font-medium">{f.nombre}</TableCell>

              <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                {f.operaciones}
              </TableCell>

              <TableCell className="tabular text-right font-mono text-xs">
                {formatPorcentaje(f.winRate)}
                <span className="pl-1.5 text-[10px] text-muted-foreground">
                  {f.ganadoras}/{f.ganadoras + f.perdedoras}
                </span>
              </TableCell>

              <TableCell className="text-right">
                <CifraResultado monto={f.expectativa} moneda={moneda} />
              </TableCell>

              <TableCell className="text-right">
                <CifraResultado monto={f.plTotal} moneda={moneda} />
              </TableCell>

              <TableCell>
                {/* Barra proporcional para ver de un vistazo qué tag pesa más. */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      positivo ? "bg-positive" : "border border-white/20 bg-negative",
                    )}
                    style={{ width: `${Math.max(ancho, 3)}%` }}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
