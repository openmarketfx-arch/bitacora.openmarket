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
 * El capital total de la cuenta tras sumar y restar cada operación (y los retiros), en una
 * franja delgada: es el dato de referencia, no el protagonista del dashboard.
 */
export function TarjetasCapital({ cuentas }: { cuentas: CapitalCuenta[] }) {
  if (cuentas.length === 0) return null;

  return (
    <div className="space-y-2">
      {cuentas.map((c) => (
        <FranjaCapital key={c.id} cuenta={c} />
      ))}
    </div>
  );
}

function FranjaCapital({ cuenta }: { cuenta: CapitalCuenta }) {
  // Lo que movieron las operaciones: el saldo ya sin el efecto de los retiros.
  const resultado = Math.round((cuenta.saldo + cuenta.retirado - cuenta.capitalInicial) * 100) / 100;
  const pct = cuenta.capitalInicial > 0 ? (resultado / cuenta.capitalInicial) * 100 : 0;
  const tono = tonoDe(resultado);

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card">
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Landmark className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium">{cuenta.nombre}</span>
          <Badge variant={VARIANTE_TIPO[cuenta.tipo]} className="px-2 py-0 text-[10px]">
            {ETIQUETA_TIPO_CUENTA[cuenta.tipo]}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Capital total
          </span>
          <span className="tabular font-mono text-lg font-semibold leading-none">
            {formatDinero(cuenta.saldo, cuenta.moneda, { signo: false })}
          </span>
          <span className="text-[10px] text-muted-foreground">{cuenta.moneda}</span>
          <span
            className={cn(
              "tabular rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium",
              estiloTono(tono),
            )}
          >
            {pct >= 0 ? "+" : "−"}
            {Math.abs(pct).toLocaleString("es-ES", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            %
          </span>
        </div>

        <dl className="ml-auto hidden items-center gap-5 text-[11px] md:flex">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Inicial</dt>
            <dd className="tabular font-mono">
              {formatDinero(cuenta.capitalInicial, cuenta.moneda, { signo: false })}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Resultado</dt>
            <dd className="tabular font-mono">{formatDinero(resultado, cuenta.moneda)}</dd>
          </div>
          {cuenta.retirado > 0 && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">Retirado</dt>
              <dd className="tabular font-mono">
                −{formatDinero(cuenta.retirado, cuenta.moneda, { signo: false })}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
