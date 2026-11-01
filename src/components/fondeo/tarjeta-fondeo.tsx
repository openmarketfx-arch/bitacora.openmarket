import { Check, Flag, ShieldAlert, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDinero, formatFecha } from "@/lib/format";
import type { EvaluacionPrueba, SeguimientoFondeada } from "@/lib/datos/fondeo";
import type { TradingAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  cuenta: TradingAccount;
  /** La prueba (en curso, aprobada o perdida). Null si la cuenta no tiene datos completos. */
  evaluacion: EvaluacionPrueba | null;
  /** Solo en cuentas ya fondeadas: sus límites de pérdida desde que se fondeó. */
  seguimiento: SeguimientoFondeada | null;
  zona: string;
}

const pct = (n: number) =>
  `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

/**
 * Cómo va una cuenta de prueba de fondeo frente a sus objetivos y a los límites de
 * pérdida que no puede pasar. Las barras se leen de un vistazo: la verde avanza hacia el
 * objetivo; las otras dos se llenan hacia el límite y se ponen en rojo al acercarse.
 */
export function TarjetaFondeo({ cuenta, evaluacion, seguimiento, zona }: Props) {
  if (!evaluacion) return null;

  const moneda = cuenta.moneda_base;
  const capital = evaluacion.capital;
  const dinero = (porcentaje: number) =>
    formatDinero((capital * porcentaje) / 100, moneda, { signo: false });
  const fondeada = cuenta.tipo === "fondeada";
  const perdida = evaluacion.estado === "fallida";
  const aprobada = evaluacion.estado === "aprobada";

  // En una cuenta fondeada las barras de pérdida miden desde que se fondeó, no la prueba.
  const perdidaDia = fondeada && seguimiento ? seguimiento.perdidaDiaPct : evaluacion.perdidaDiaPct;
  const perdidaTotal =
    fondeada && seguimiento ? seguimiento.perdidaTotalPct : evaluacion.perdidaTotalPct;

  return (
    <Card
      className={cn(
        perdida && "border-red-500/40",
        aprobada && "border-positive/40",
        !perdida && !aprobada && "border-primary/30",
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              {fondeada ? (
                <Trophy className="h-4 w-4 text-positive" />
              ) : (
                <Flag className="h-4 w-4 text-primary" />
              )}
              {fondeada ? "Cuenta fondeada" : "Prueba de fondeo"} · {cuenta.nombre}
            </CardTitle>
            <CardDescription>
              {fondeada
                ? "Aprobaste la prueba. Cuida los límites de pérdida para no perder el fondeo."
                : "Tu avance hacia el objetivo y lo cerca que estás de los límites de pérdida."}
            </CardDescription>
          </div>
          {perdida ? (
            <Badge variant="negative" className="border-red-500/40 bg-red-500/15 text-red-300">
              Prueba perdida
            </Badge>
          ) : aprobada ? (
            <Badge variant="positive">Aprobada</Badge>
          ) : (
            <Badge variant="warning">
              Fase {evaluacion.faseActual} de {evaluacion.totalFases}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {perdida && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-200/90">
              <span className="font-medium text-red-300">
                Superaste el límite de pérdida{" "}
                {evaluacion.motivoFallo === "diaria" ? "diaria" : "máxima"}
                {evaluacion.resueltaEn ? ` el ${formatFecha(evaluacion.resueltaEn, zona)}` : ""}.
              </span>{" "}
              La prueba se da por perdida.
            </p>
          </div>
        )}

        {(aprobada || fondeada) && !perdida && (
          <div className="flex items-start gap-3 rounded-lg border border-positive/40 bg-positive/10 px-4 py-3">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
            <p className="text-sm text-foreground/90">
              <span className="font-medium text-positive">
                Prueba aprobada
                {evaluacion.resueltaEn ? ` el ${formatFecha(evaluacion.resueltaEn, zona)}` : ""}.
              </span>{" "}
              Cumpliste el objetivo de{" "}
              {evaluacion.totalFases === 1 ? "la fase" : `las ${evaluacion.totalFases} fases`}: la
              cuenta pasó a ser fondeada.
            </p>
          </div>
        )}

        {fondeada && seguimiento?.limiteSuperado && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-200/90">
              Desde que se fondeó la cuenta superaste un límite de pérdida. Revisa las condiciones
              de tu fondeo: podrías perderlo.
            </p>
          </div>
        )}

        <Fases evaluacion={evaluacion} />

        <div className="space-y-4">
          {!fondeada && !perdida && !aprobada && (
            <Barra
              etiqueta={`Objetivo de la fase ${evaluacion.faseActual}`}
              valor={evaluacion.gananciaFasePct}
              maximo={evaluacion.objetivoFasePct}
              texto={`${evaluacion.gananciaFasePct >= 0 ? "+" : "−"}${pct(Math.abs(evaluacion.gananciaFasePct))} de ${pct(evaluacion.objetivoFasePct)}`}
              detalle={`${formatDinero((capital * evaluacion.gananciaFasePct) / 100, moneda)} de ${dinero(evaluacion.objetivoFasePct)}`}
              tipo="objetivo"
            />
          )}

          <Barra
            etiqueta={perdida && evaluacion.motivoFallo === "diaria" ? "Pérdida diaria" : "Pérdida diaria (hoy)"}
            valor={perdidaDia}
            maximo={evaluacion.limiteDiarioPct}
            texto={`${pct(perdidaDia)} de ${pct(evaluacion.limiteDiarioPct)}`}
            detalle={`${dinero(perdidaDia)} de ${dinero(evaluacion.limiteDiarioPct)}`}
            tipo="limite"
          />

          <Barra
            etiqueta={fondeada ? "Pérdida máxima (desde el fondeo)" : "Pérdida máxima de la fase"}
            valor={perdidaTotal}
            maximo={evaluacion.limiteTotalPct}
            texto={`${pct(perdidaTotal)} de ${pct(evaluacion.limiteTotalPct)}`}
            detalle={`${dinero(perdidaTotal)} de ${dinero(evaluacion.limiteTotalPct)}`}
            tipo="limite"
          />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Objetivos y límites son un % del capital inicial (
          {formatDinero(capital, moneda, { signo: false })}). Solo cuentan las operaciones cerradas,
          con comisiones y swaps.
        </p>
      </CardContent>
    </Card>
  );
}

/** Las fases de la prueba como pasos: superada, en juego o pendiente. */
function Fases({ evaluacion }: { evaluacion: EvaluacionPrueba }) {
  return (
    <ol className="flex items-start">
      {evaluacion.fases.map((f, i) => {
        const superada = f.estado === "superada";
        const actual = f.estado === "actual" && evaluacion.estado === "en_curso";
        return (
          <li key={f.numero} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  superada && "border-positive bg-positive/20 text-positive",
                  actual && "border-primary bg-primary/20 text-primary ring-2 ring-primary/30",
                  !superada && !actual && "border-border bg-card text-muted-foreground",
                )}
              >
                {superada ? <Check className="h-3.5 w-3.5" /> : f.numero}
              </span>
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                Fase {f.numero} · {f.objetivoPct}%
              </span>
            </div>
            {i < evaluacion.fases.length - 1 && (
              <span
                className={cn("mx-2 mt-3.5 h-px flex-1", superada ? "bg-positive/60" : "bg-border")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Una barra: "objetivo" avanza hacia la meta; "limite" se llena hacia un tope que no se debe pasar. */
function Barra({
  etiqueta,
  valor,
  maximo,
  texto,
  detalle,
  tipo,
}: {
  etiqueta: string;
  valor: number;
  maximo: number;
  texto: string;
  detalle: string;
  tipo: "objetivo" | "limite";
}) {
  const razon = maximo > 0 ? valor / maximo : 0;
  const ancho = Math.min(Math.max(razon, 0), 1) * 100;
  const superado = tipo === "limite" && razon > 1;

  const relleno =
    tipo === "objetivo"
      ? razon >= 1
        ? "bg-positive"
        : "bg-positive/80"
      : razon > 0.85
        ? "bg-red-500"
        : razon > 0.6
          ? "bg-amber-400"
          : razon > 0
            ? "bg-primary"
            : "bg-muted-foreground/30";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium">{etiqueta}</span>
        <span
          className={cn(
            "tabular font-mono",
            superado && "font-semibold text-red-300",
            tipo === "objetivo" && valor < 0 && "text-negative-foreground",
          )}
        >
          {texto}
          {superado && " · superado"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ancho)}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50"
      >
        <div
          className={cn("h-full rounded-full transition-all", relleno)}
          style={{ width: `${Math.max(ancho, razon > 0 ? 2 : 0)}%` }}
        />
      </div>
      <div className="tabular text-right font-mono text-[11px] text-muted-foreground">{detalle}</div>
    </div>
  );
}
