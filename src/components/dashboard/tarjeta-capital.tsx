import { Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { estiloTono } from "@/components/ui/cifra-resultado";
import { formatDinero, tonoDe } from "@/lib/format";
import { ETIQUETA_TIPO_CUENTA, type AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CapitalCuenta {
  id: string;
  nombre: string;
  tipo: AccountType;
  moneda: string;
  capitalInicial: number;
  /** Capital inicial + resultado neto de lo cerrado - retiros: lo que hay en la cuenta. */
  saldo: number;
  retirado: number;
}

const VARIANTE_TIPO: Record<AccountType, "primary" | "outline" | "warning" | "positive"> = {
  real: "primary",
  demo: "outline",
  prueba_fondeo: "warning",
  fondeada: "positive",
};

/**
 * El capital total de cada cuenta tras sumar y restar cada operación (y los retiros).
 * Es la cifra grande del dashboard: lo demás explica cómo se llegó a ella.
 */
export function TarjetasCapital({ cuentas }: { cuentas: CapitalCuenta[] }) {
  if (cuentas.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-4",
        cuentas.length > 1 && "md:grid-cols-2",
        cuentas.length > 2 && "xl:grid-cols-3",
      )}
    >
      {cuentas.map((c) => (
        <TarjetaCapital key={c.id} cuenta={c} />
      ))}
    </div>
  );
}

function TarjetaCapital({ cuenta }: { cuenta: CapitalCuenta }) {
  // Lo que movieron las operaciones: el saldo ya sin el efecto de los retiros.
  const resultado = Math.round((cuenta.saldo + cuenta.retirado - cuenta.capitalInicial) * 100) / 100;
  const pct = cuenta.capitalInicial > 0 ? (resultado / cuenta.capitalInicial) * 100 : 0;
  const tono = tonoDe(resultado);

  return (
    <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
      />
      <CardContent className="relative space-y-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Landmark className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm font-medium">{cuenta.nombre}</span>
          </div>
          <Badge variant={VARIANTE_TIPO[cuenta.tipo]}>{ETIQUETA_TIPO_CUENTA[cuenta.tipo]}</Badge>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Capital total
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <span className="tabular font-mono text-4xl font-semibold leading-none tracking-tight">
              {formatDinero(cuenta.saldo, cuenta.moneda, { signo: false })}
            </span>
            <span className="pb-0.5 text-xs font-medium text-muted-foreground">{cuenta.moneda}</span>
          </div>
          <div
            className={cn(
              "tabular inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-semibold",
              estiloTono(tono),
            )}
          >
            {formatDinero(resultado, cuenta.moneda)}
            <span className="font-normal opacity-80">
              · {pct >= 0 ? "+" : "−"}
              {Math.abs(pct).toLocaleString("es-ES", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4 text-xs">
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">Capital inicial</dt>
            <dd className="tabular font-mono">
              {formatDinero(cuenta.capitalInicial, cuenta.moneda, { signo: false })}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">Resultado neto</dt>
            <dd className="tabular font-mono">{formatDinero(resultado, cuenta.moneda)}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">Retirado</dt>
            <dd className="tabular font-mono">
              {cuenta.retirado > 0
                ? `−${formatDinero(cuenta.retirado, cuenta.moneda, { signo: false })}`
                : formatDinero(0, cuenta.moneda, { signo: false })}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
