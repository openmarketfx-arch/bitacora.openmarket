import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { etiquetaPeriodo, fraseMasIncumplido, NOMBRE_PERIODO } from "@/components/riesgo/formato";
import { formatDinero, formatPorcentaje } from "@/lib/format";
import {
  TIPOS_PERIODO,
  type EstadoLimite,
  type ResumenRiesgo,
  type RiesgoCuenta,
  type TipoPeriodo,
} from "@/lib/datos/riesgo";
import { cn } from "@/lib/utils";

/** Rojo de alerta: el verde/negro del resto de la app es de resultados, esto es una regla rota. */
const ALERTA = "border-red-500/40 bg-red-500/10 text-red-300";

const hayConfigurada = (r: ResumenRiesgo) => r.cuentas.some((c) => c.configurada);
const tipoConfigurado = (r: ResumenRiesgo, tipo: TipoPeriodo) =>
  r.cuentas.some((c) => c.estados.some((e) => e.tipo === tipo));

/** Aviso cuando todavía no hay nada que medir. */
export function AvisoConfigurarRiesgo({ riesgo }: { riesgo: ResumenRiesgo }) {
  const sin = riesgo.sinConfigurar;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
      <p className="flex-1 text-sm text-amber-100/90">
        {sin.length > 0
          ? `Falta el capital o los límites de pérdida de ${sin.map((c) => `"${c.nombre}"`).join(", ")}. Sin eso no se puede medir si estás respetando tu gestión del riesgo.`
          : "Pon el capital de tu cuenta y tus límites de pérdida diario, semanal y mensual para medir cuántas veces los incumples."}
      </p>
      <Link
        href="/configuracion"
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Configurar cuenta
      </Link>
    </div>
  );
}

/** El número grande, los tres periodos y cuál es el que más se incumple. */
export function ResumenIncumplimientos({
  riesgo,
  etiquetaRango,
}: {
  riesgo: ResumenRiesgo;
  etiquetaRango: string;
}) {
  const frase = fraseMasIncumplido(riesgo.masIncumplidos);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {riesgo.total > 0 ? (
              <ShieldAlert className="h-5 w-5 text-red-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-positive" />
            )}
            <span
              className={cn(
                "tabular font-mono text-4xl font-semibold leading-none",
                riesgo.total > 0 ? "text-red-300" : "text-positive",
              )}
            >
              {riesgo.total}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {riesgo.total === 1 ? "incumplimiento" : "incumplimientos"} de riesgo, {etiquetaRango}
          </p>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          {TIPOS_PERIODO.map(({ tipo, etiqueta }) => {
            const c = riesgo.porTipo[tipo];
            const configurado = tipoConfigurado(riesgo, tipo);
            const masFalla = riesgo.masIncumplidos.includes(tipo);
            return (
              <div
                key={tipo}
                className={cn(
                  "rounded-lg border p-3",
                  masFalla ? ALERTA : "border-border bg-card/60",
                )}
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {etiqueta}
                </div>
                {configurado ? (
                  <>
                    <div className="tabular pt-1 font-mono text-xl font-semibold">
                      {c.incumplidos}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.evaluados > 0
                        ? `de ${c.evaluados} ${NOMBRE_PERIODO[tipo].evaluados} con operaciones · ${formatPorcentaje((c.incumplidos / c.evaluados) * 100, 0)}`
                        : `sin ${NOMBRE_PERIODO[tipo].evaluados} con operaciones`}
                    </div>
                  </>
                ) : (
                  <div className="pt-2 text-xs text-muted-foreground">Sin límite configurado</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hayConfigurada(riesgo) && (
        <p className="text-sm text-muted-foreground">
          {frase ?? "Ningún incumplimiento en este rango. Estás respetando tus límites."}
        </p>
      )}
    </div>
  );
}

/** Cuánto lleva consumido el periodo actual de cada límite. */
export function EstadoActual({ cuentas }: { cuentas: RiesgoCuenta[] }) {
  const configuradas = cuentas.filter((c) => c.configurada && c.cuenta.activo);
  if (configuradas.length === 0) return null;

  return (
    <div className="space-y-4">
      {configuradas.map(({ cuenta, estados, saldo }) => (
        <div key={cuenta.id} className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{cuenta.nombre}</span>
            <span className="text-xs text-muted-foreground">
              Saldo {saldo === null ? "—" : formatDinero(saldo, cuenta.moneda_base, { signo: false })}
            </span>
          </div>
          {estados.map((e) => (
            <MedidorLimite key={e.tipo} estado={e} moneda={cuenta.moneda_base} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MedidorLimite({ estado, moneda }: { estado: EstadoLimite; moneda: string }) {
  const uso = Number.isFinite(estado.uso) ? estado.uso : 1;
  const ancho = Math.min(uso, 1) * 100;
  const tono = estado.superado
    ? "bg-red-500"
    : uso >= 0.75
      ? "bg-amber-400"
      : uso > 0
        ? "bg-primary"
        : "bg-muted-foreground/30";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="text-muted-foreground">
          {NOMBRE_PERIODO[estado.tipo].actual}{" "}
          <span className="text-muted-foreground/60">· límite {formatPorcentaje(estado.limitePct, 2).replace(",00", "")}</span>
        </span>
        <span className={cn("tabular font-mono", estado.superado && "font-semibold text-red-300")}>
          {estado.perdida > 0 ? "−" : ""}
          {formatDinero(estado.perdida, moneda, { signo: false })} de{" "}
          {formatDinero(estado.limite, moneda, { signo: false })}
          {estado.superado && " · superado"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div className={cn("h-full rounded-full", tono)} style={{ width: `${Math.max(ancho, uso > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  );
}

/** Todos los periodos en que se superó el límite, el más reciente primero. */
export function ListaIncumplimientos({ riesgo }: { riesgo: ResumenRiesgo }) {
  if (riesgo.incumplimientos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {hayConfigurada(riesgo)
            ? "No hay periodos en que hayas superado tu límite de pérdida."
            : "Configura el capital y los límites de tu cuenta para empezar a medir."}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periodo</TableHead>
          <TableHead>Límite</TableHead>
          <TableHead>Cuenta</TableHead>
          <TableHead className="text-right">Perdiste</TableHead>
          <TableHead className="text-right">Tu límite</TableHead>
          <TableHead className="text-right">% del saldo</TableHead>
          <TableHead className="text-right">Te pasaste por</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {riesgo.incumplimientos.map((i) => (
          <TableRow key={`${i.cuentaId}-${i.tipo}-${i.inicio}`}>
            <TableCell className="whitespace-nowrap font-medium">
              {etiquetaPeriodo(i)}
              {i.enCurso && (
                <Badge variant="warning" className="ml-2">
                  En curso
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{NOMBRE_PERIODO[i.tipo].singular}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{i.cuenta}</TableCell>
            <TableCell className="tabular text-right font-mono text-xs text-red-300">
              −{formatDinero(i.perdida, i.moneda, { signo: false })}
            </TableCell>
            <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
              {formatDinero(i.limite, i.moneda, { signo: false })}{" "}
              <span className="text-muted-foreground/60">({formatPorcentaje(i.limitePct, 2).replace(",00", "")})</span>
            </TableCell>
            <TableCell className="tabular text-right font-mono text-xs">
              {i.pctReal === null ? "—" : formatPorcentaje(i.pctReal, 2)}
            </TableCell>
            <TableCell className="tabular text-right font-mono text-xs text-red-300">
              {formatDinero(i.perdida - i.limite, i.moneda, { signo: false })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Aviso de que ya se superó un límite en el periodo en curso (para antes de abrir otra operación). */
export function AlertaLimiteSuperado({ riesgo }: { riesgo: ResumenRiesgo }) {
  const superados = riesgo.cuentas.flatMap((c) =>
    c.estados.filter((e) => e.superado).map((e) => ({ cuenta: c.cuenta, estado: e })),
  );
  if (superados.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-red-300">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Ya superaste tu límite de pérdida. Antes de abrir otra operación, piénsalo.
      </div>
      <ul className="space-y-0.5 text-xs text-red-200/80">
        {superados.map(({ cuenta, estado }) => (
          <li key={`${cuenta.id}-${estado.tipo}`}>
            {cuenta.nombre} · {NOMBRE_PERIODO[estado.tipo].actual.toLowerCase()}: perdiste{" "}
            {formatDinero(estado.perdida, cuenta.moneda_base, { signo: false })} y tu máximo es{" "}
            {formatDinero(estado.limite, cuenta.moneda_base, { signo: false })} (
            {formatPorcentaje(estado.limitePct, 2).replace(",00", "")} del saldo).
          </li>
        ))}
      </ul>
    </div>
  );
}
