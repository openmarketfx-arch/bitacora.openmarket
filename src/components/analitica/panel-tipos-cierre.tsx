import { CifraResultado } from "@/components/ui/cifra-resultado";
import { Card, CardContent } from "@/components/ui/card";
import { formatDinero, formatPorcentaje } from "@/lib/format";
import type { FilaTipoCierre, RatioDisciplina } from "@/lib/datos/analitica";
import { TIPO_CIERRE_MAP } from "@/lib/types";
import { cn } from "@/lib/utils";

function claseTonoPunto(tono: "positivo" | "negativo" | "neutro") {
  if (tono === "positivo") return "bg-positive";
  if (tono === "negativo") return "border border-white/25 bg-negative";
  return "bg-muted-foreground/50";
}

/** Barra de distribución de los 8 tipos sobre el total clasificado. */
export function DistribucionCierres({ filas }: { filas: FilaTipoCierre[] }) {
  const conDatos = filas.filter((f) => f.operaciones > 0);
  if (conDatos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
        {conDatos.map((f) => {
          const meta = TIPO_CIERRE_MAP[f.tipo];
          return (
            <div
              key={f.tipo}
              title={`${meta.etiqueta}: ${f.operaciones} (${formatPorcentaje(f.porcentaje)})`}
              style={{ width: `${f.porcentaje}%` }}
              className={cn(
                "h-full",
                meta.tono === "positivo" && "bg-positive",
                meta.tono === "negativo" && "bg-negative",
                meta.tono === "neutro" && "bg-muted-foreground/60",
                "border-r border-background/60 last:border-r-0",
              )}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {conDatos.map((f) => {
          const meta = TIPO_CIERRE_MAP[f.tipo];
          return (
            <span key={f.tipo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", claseTonoPunto(meta.tono))} />
              {meta.etiqueta}
              <span className="tabular font-mono text-[11px] text-foreground">
                {formatPorcentaje(f.porcentaje, 0)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TarjetasTipoCierre({
  filas,
  disciplina,
  moneda,
}: {
  filas: FilaTipoCierre[];
  disciplina: RatioDisciplina;
  moneda: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {filas.map((f) => {
        const meta = TIPO_CIERRE_MAP[f.tipo];
        const sinDatos = f.operaciones === 0;

        return (
          <Card key={f.tipo} className={cn(sinDatos && "opacity-50")}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", claseTonoPunto(meta.tono))}
                  />
                  <span className="text-sm font-medium">{meta.etiqueta}</span>
                </div>
                <div className="text-right">
                  <div className="tabular font-mono text-sm font-semibold">{f.operaciones}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatPorcentaje(f.porcentaje, 0)} del total
                  </div>
                </div>
              </div>

              <p className="text-xs leading-snug text-muted-foreground">
                Mide: <span className="text-foreground">{meta.mide}</span>
              </p>

              {sinDatos ? (
                <p className="text-xs text-muted-foreground/60">Todavía sin casos.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">P/L acumulado</span>
                    <CifraResultado monto={f.plTotal} moneda={moneda} />
                  </div>

                  {/* La métrica derivada de la sección 5, cuando el tipo la tiene. */}
                  {meta.campo && f.promedios.length > 0 && (
                    <div className="space-y-1.5 rounded-md border border-border bg-background/40 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {meta.campoEtiqueta} · promedio
                      </div>
                      {f.promedios.map((p) => (
                        <div
                          key={p.simbolo}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {p.simbolo}
                          </span>
                          <span className="tabular font-mono">
                            {p.promedio.toLocaleString("es-ES", {
                              maximumFractionDigits: 1,
                            })}{" "}
                            {p.unidad}
                            <span className="pl-1.5 text-[10px] text-muted-foreground">
                              ({p.operaciones})
                            </span>
                          </span>
                        </div>
                      ))}
                      <p className="pt-1 text-[11px] leading-snug text-muted-foreground/80">
                        {textoAccionable(f.tipo)}
                      </p>
                    </div>
                  )}

                  {/* cierre_correcto y cierre_incorrecto se leen juntos. */}
                  {(f.tipo === "cierre_correcto" || f.tipo === "cierre_incorrecto") &&
                    disciplina.aciertoAlCerrar !== null && (
                      <div className="rounded-md border border-border bg-background/40 p-3 text-xs">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-muted-foreground">Acierto al cerrar antes</span>
                          <span className="tabular font-mono">
                            {formatPorcentaje(disciplina.aciertoAlCerrar)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 pt-1">
                          <span className="text-muted-foreground">
                            Coste de los innecesarios
                          </span>
                          <span className="tabular font-mono text-negative-foreground">
                            {formatDinero(disciplina.costeIncorrectos, moneda, { signo: false })}
                          </span>
                        </div>
                      </div>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** La frase que convierte el promedio en una acción concreta. */
function textoAccionable(tipo: FilaTipoCierre["tipo"]): string {
  switch (tipo) {
    case "stop_caceria":
      return "Ampliar el stop por encima de esa media habría salvado estas operaciones.";
    case "tp_corto":
      return "Es el recorrido que el precio siguió después de tu TP.";
    case "cierre_incorrecto":
      return "Es lo que habrías ganado de más si no hubieras cerrado antes.";
    case "reversion":
      return "Es lo que devolviste desde el máximo a favor: tus TPs pueden estar demasiado lejos.";
    default:
      return "";
  }
}
