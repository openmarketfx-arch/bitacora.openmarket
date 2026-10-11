import Link from "next/link";
import { AlertTriangle, ClipboardCheck, ClipboardList, Clock, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { CurvaEquity } from "@/components/dashboard/curva-equity";
import { BarraFiltros } from "@/components/filtros/barra-filtros";
import { TarjetaKpi } from "@/components/dashboard/tarjeta-kpi";
import { TiraDias } from "@/components/dashboard/tira-dias";
import { TablaOperaciones } from "@/components/operaciones/tabla-operaciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirUsuario } from "@/lib/auth";
import { listarOperaciones } from "@/lib/datos/operaciones";
import { calcularKpis, construirEquity, ultimosDias } from "@/lib/datos/metricas";
import {
  filtrarOperaciones,
  filtrarPorInstrumento,
  instrumentosUsados,
  parsearFiltro,
  type ParametrosFiltro,
} from "@/lib/datos/filtros";
import { formatDinero, formatPorcentaje, plural, tonoDe } from "@/lib/format";

export const metadata = { title: "Dashboard — Open Market" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: ParametrosFiltro;
}) {
  await requerirUsuario();

  const filtro = parsearFiltro(searchParams, "30d");

  // Se lee todo una vez y se recorta en memoria: el rango y el instrumento
  // afectan a los KPI y a la curva, pero las colas (abiertas, pendientes) son
  // estado actual y no deben depender de la ventana temporal elegida.
  const todasSinFiltrar = await listarOperaciones({ limite: 2000 });
  const instrumentos = instrumentosUsados(todasSinFiltrar);
  const todas = filtrarPorInstrumento(todasSinFiltrar, filtro.instrumento);

  const enPeriodo = filtrarOperaciones(todasSinFiltrar, filtro);

  const cerradasPeriodo = enPeriodo.filter((o) => o.estado_operacion === "cerrada");
  const equity = construirEquity(cerradasPeriodo);
  const kpis = calcularKpis(enPeriodo, equity);

  const abiertas = todas.filter((o) => o.estado_operacion === "abierta").length;
  const pendientes = todas.filter((o) => o.estado_revision === "pendiente").length;

  const cerradasTodas = todas.filter((o) => o.estado_operacion === "cerrada");
  const dias = ultimosDias(cerradasTodas, 14);

  const moneda = kpis.monedas[0] ?? "USD";
  const etiquetaPeriodo = filtro.etiquetaRango;

  if (todasSinFiltrar.length === 0) {
    return (
      <>
        <Topbar titulo="Dashboard" descripcion="Tu bitácora, en números" />
        <main className="p-5 sm:p-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Todavía no hay nada que analizar</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Registra tus primeras operaciones y aquí verás tu curva de equity, el win rate
                  y qué te está costando dinero.
                </p>
              </div>
              <Button asChild>
                <Link href="/operaciones/nueva">
                  <Plus className="h-4 w-4" />
                  Registrar la primera
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar titulo="Dashboard" descripcion="Tu bitácora, en números" />

      <main className="space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BarraFiltros
            periodo={filtro.periodo}
            desde={searchParams.desde ?? ""}
            hasta={searchParams.hasta ?? ""}
            instrumento={filtro.instrumento}
            instrumentos={instrumentos}
          />
          {kpis.monedas.length > 1 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Hay cuentas en {kpis.monedas.join(" y ")}: los totales suman monedas distintas.
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <TarjetaKpi
            etiqueta="P/L total"
            valor={formatDinero(kpis.plTotal, moneda)}
            tono={tonoDe(kpis.plTotal)}
            detalle={etiquetaPeriodo}
          />

          <TarjetaKpi
            etiqueta="Win rate"
            valor={formatPorcentaje(kpis.winRate)}
            detalle={
              kpis.winRate === null
                ? "Sin operaciones decisivas"
                : `${kpis.ganadoras} ganadoras · ${kpis.perdedoras} perdedoras${
                    kpis.breakEven > 0 ? ` · ${kpis.breakEven} BE` : ""
                  }`
            }
          />

          <TarjetaKpi
            etiqueta="Operaciones"
            valor={kpis.cerradas}
            detalle={
              kpis.expectativa !== null
                ? `${formatDinero(kpis.expectativa, moneda)} por operación`
                : "cerradas en el periodo"
            }
          />

          <TarjetaKpi
            etiqueta="Abiertas"
            valor={abiertas}
            icono={<Clock className="h-3.5 w-3.5 text-primary" />}
            detalle={
              abiertas > 0 ? (
                <Link href="/operaciones" className="text-primary hover:underline">
                  Cerrar y finalizar
                </Link>
              ) : (
                "Nada en curso"
              )
            }
          />

          <TarjetaKpi
            etiqueta="Por revisar"
            valor={pendientes}
            destacado={pendientes > 0}
            icono={<ClipboardCheck className="h-3.5 w-3.5 text-amber-400" />}
            detalle={
              pendientes > 0 ? (
                <Link href="/operaciones" className="text-amber-400 hover:underline">
                  Clasificar ahora
                </Link>
              ) : (
                "Todo clasificado"
              )
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Curva de equity</CardTitle>
              <CardDescription>Resultado acumulado día a día, {etiquetaPeriodo}.</CardDescription>
            </CardHeader>
            <CardContent>
              <CurvaEquity puntos={equity} moneda={moneda} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detrás de la curva</CardTitle>
              <CardDescription>Lo que explica la forma del gráfico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Fila
                etiqueta="Ganancia media"
                valor={kpis.gananciaMedia !== null ? formatDinero(kpis.gananciaMedia, moneda) : "—"}
              />
              <Fila
                etiqueta="Pérdida media"
                valor={kpis.perdidaMedia !== null ? formatDinero(kpis.perdidaMedia, moneda) : "—"}
              />
              <Fila
                etiqueta="Mejor día"
                valor={kpis.mejorDia ? formatDinero(kpis.mejorDia.neto, moneda) : "—"}
              />
              <Fila
                etiqueta="Peor día"
                valor={kpis.peorDia ? formatDinero(kpis.peorDia.neto, moneda) : "—"}
              />
              <Fila
                etiqueta="Drawdown máximo"
                valor={
                  kpis.drawdownMaximo > 0
                    ? `−${formatDinero(kpis.drawdownMaximo, moneda, { signo: false })}`
                    : "—"
                }
                ayuda="La mayor caída desde un máximo de la curva."
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Últimos 14 días</CardTitle>
                <CardDescription>Verde el que ganaste, negro el que perdiste.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendario">Ver calendario</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TiraDias dias={dias} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Últimas operaciones</CardTitle>
                <CardDescription>
                  {plural(Math.min(todas.length, 8), "operación", "operaciones")} más recientes.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/operaciones">Ver todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TablaOperaciones operaciones={todas.slice(0, 8)} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Fila({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground" title={ayuda}>
        {etiqueta}
      </span>
      <span className="tabular font-mono text-xs">{valor}</span>
    </div>
  );
}
