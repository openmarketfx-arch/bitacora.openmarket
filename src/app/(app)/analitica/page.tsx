import Link from "next/link";
import { AlertTriangle, ClipboardCheck, LineChart } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PanelCruce } from "@/components/analitica/panel-cruce";
import { PanelPorTag } from "@/components/analitica/panel-por-tag";
import {
  MedicionesDeCierre,
  TablaPlanificacion,
  TarjetaMedicion,
} from "@/components/analitica/panel-pips";
import { PanelTiposOrden } from "@/components/analitica/panel-tipos-orden";
import {
  DistribucionCierres,
  TarjetasTipoCierre,
} from "@/components/analitica/panel-tipos-cierre";
import { TablaTiempo } from "@/components/analitica/panel-tiempo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarraFiltros } from "@/components/filtros/barra-filtros";
import { requerirUsuario } from "@/lib/auth";
import {
  filtrarOperaciones,
  instrumentosUsados,
  parsearFiltro,
  type ParametrosFiltro,
} from "@/lib/datos/filtros";
import { listarOperaciones } from "@/lib/datos/operaciones";
import {
  agruparTags,
  analizarDisciplina,
  analizarPorDiaSemana,
  analizarPorHora,
  analizarPorTag,
  analizarPorTipoCierre,
  analizarPlanificacion,
  analizarPorTipoOrden,
  calcularRachas,
  cruzarTagYCierre,
  peorLectura,
  promediarPorInstrumento,
  resumirOrdenesPendientes,
} from "@/lib/datos/analitica";
import { formatPorcentaje, plural } from "@/lib/format";
import { TIPO_CIERRE_MAP } from "@/lib/types";

export const metadata = { title: "Analítica — Open Market" };

export default async function AnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosFiltro>;
}) {
  await requerirUsuario();
  const params = await searchParams;

  const filtro = parsearFiltro(params, "todo");
  const todasSinFiltrar = await listarOperaciones({ limite: 2000 });
  const instrumentos = instrumentosUsados(todasSinFiltrar);
  const todas = filtrarOperaciones(todasSinFiltrar, filtro);
  const hayHistorial = todasSinFiltrar.some((o) => o.estado_operacion === "cerrada");

  const barra = (
    <BarraFiltros
      periodo={filtro.periodo}
      desde={params.desde ?? ""}
      hasta={params.hasta ?? ""}
      instrumento={filtro.instrumento}
      instrumentos={instrumentos}
    />
  );
  const cerradas = todas.filter((o) => o.estado_operacion === "cerrada");
  const clasificadas = cerradas.filter((o) => o.tipo_cierre !== null);
  const pendientes = todas.filter((o) => o.estado_revision === "pendiente").length;

  const porTag = analizarPorTag(cerradas);
  const grupos = agruparTags(porTag);
  const porOrden = analizarPorTipoOrden(todas);
  const resumenPendientes = resumirOrdenesPendientes(porOrden);

  const noActivadas = todas.filter((o) => o.estado_operacion === "no_activada");
  const planificacion = analizarPlanificacion(cerradas);
  const medicionesCierre = (["stop_caceria", "tp_corto", "cierre_incorrecto", "reversion"] as const).map(
    (tipo) => ({
      tipo,
      promedios: promediarPorInstrumento(
        clasificadas.filter((o) => o.tipo_cierre === tipo),
        TIPO_CIERRE_MAP[tipo].campo!,
      ),
    }),
  );
  const distanciaActivacion = promediarPorInstrumento(noActivadas, "distancia_no_activada");
  const porTipo = analizarPorTipoCierre(clasificadas);
  const cruce = cruzarTagYCierre(clasificadas);
  const disciplina = analizarDisciplina(clasificadas);
  const rachas = calcularRachas(cerradas);
  const porDia = analizarPorDiaSemana(cerradas);
  const porHora = analizarPorHora(cerradas);
  const hallazgo = peorLectura(cruce);

  const moneda = cerradas[0]?.account.moneda_base ?? "USD";
  const mejorTag = porTag[0];
  const peorTag = porTag.length > 1 ? porTag[porTag.length - 1] : null;

  if (cerradas.length === 0) {
    return (
      <>
        <Topbar titulo="Analítica" descripcion="Qué funciona y qué te está costando dinero" />
        <main className="space-y-6 p-5 sm:p-8">
          {hayHistorial && barra}
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
              <LineChart className="h-7 w-7 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {hayHistorial
                    ? "Ninguna operación cerrada con estos filtros"
                    : "Todavía no hay operaciones cerradas"}
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {hayHistorial
                    ? "Amplía el rango de fechas o quita el filtro de instrumento."
                    : "La analítica necesita operaciones cerradas y clasificadas. Cierra alguna y vuelve."}
                </p>
              </div>
              {!hayHistorial && (
                <Button asChild>
                  <Link href="/operaciones">Ir a operaciones</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar titulo="Analítica" descripcion="Qué funciona y qué te está costando dinero" />

      <main className="space-y-6 p-5 sm:p-8">
        {barra}

        {pendientes > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="flex-1 text-sm text-amber-100/90">
              {plural(pendientes, "operación cerrada", "operaciones cerradas")} sin clasificar.
              No cuentan aquí hasta que les pongas tipo de cierre.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/operaciones">
                <ClipboardCheck className="h-4 w-4" />
                Clasificar
              </Link>
            </Button>
          </div>
        )}

        {/* Los tres hallazgos que el usuario busca al abrir esta pantalla. */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tu mejor confirmación
              </div>
              {mejorTag && mejorTag.plTotal > 0 ? (
                <>
                  <div className="text-sm font-medium">{mejorTag.nombre}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatPorcentaje(mejorTag.winRate)} de acierto en{" "}
                    {plural(mejorTag.operaciones, "operación", "operaciones")}
                  </p>
                </>
              ) : (
                <p className="pt-1 text-xs text-muted-foreground">
                  Ningún tag acumula resultado positivo todavía.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                La que más te cuesta
              </div>
              {peorTag && peorTag.plTotal < 0 ? (
                <>
                  <div className="text-sm font-medium">{peorTag.nombre}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatPorcentaje(peorTag.winRate)} de acierto en{" "}
                    {plural(peorTag.operaciones, "operación", "operaciones")}
                  </p>
                </>
              ) : (
                <p className="pt-1 text-xs text-muted-foreground">
                  Ningún tag está en negativo. Buena señal.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Peor lectura de estructura
              </div>
              {hallazgo ? (
                <>
                  <div className="text-sm font-medium">{hallazgo.nombre}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatPorcentaje(hallazgo.proporcion, 0)} de sus operaciones acaban en stop
                    en contra ({hallazgo.casos} de {hallazgo.total})
                  </p>
                </>
              ) : (
                <p className="pt-1 text-xs text-muted-foreground">
                  Sin datos suficientes. Hacen falta al menos 3 operaciones por tag.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tags">
          <TabsList>
            <TabsTrigger value="tags">Por confirmación</TabsTrigger>
            <TabsTrigger value="ordenes">Por tipo de orden</TabsTrigger>
            <TabsTrigger value="cierres">Por tipo de cierre</TabsTrigger>
            <TabsTrigger value="pips">Pips</TabsTrigger>
            <TabsTrigger value="cruce">Cruce</TabsTrigger>
            <TabsTrigger value="tiempo">Tiempo y rachas</TabsTrigger>
          </TabsList>

          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rendimiento por confirmación</CardTitle>
                <CardDescription>
                  Separado por lo que responde cada una. Comparar las tres categorías es lo que
                  dice si el dinero se pierde leyendo mal la estructura, entrando mal o
                  colocando mal las salidas. La expectativa es lo que gana o pierde, de media,
                  cada operación que la lleva.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <PanelPorTag
                  filas={grupos.estructura}
                  moneda={moneda}
                  titulo="Estructura"
                  descripcion="Cómo leíste el mercado antes de pensar en entrar."
                />
                <PanelPorTag
                  filas={grupos.entrada}
                  moneda={moneda}
                  titulo="Entrada"
                  descripcion="Lo que te dio permiso para tomar la posición."
                />
                <PanelPorTag
                  filas={grupos.salida_tp}
                  moneda={moneda}
                  titulo="Zona de TP"
                  descripcion="Cómo definiste el objetivo."
                />
                <PanelPorTag
                  filas={grupos.salida_stop}
                  moneda={moneda}
                  titulo="Zona de stop"
                  descripcion="Cómo definiste dónde te sacaba el mercado."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ordenes">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rendimiento por tipo de orden</CardTitle>
                <CardDescription>
                  Cómo se comportan tus entradas a mercado frente a las pendientes, y cuántas de
                  estas llegan a activarse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PanelTiposOrden
                  filas={porOrden}
                  resumen={resumenPendientes}
                  moneda={moneda}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cierres" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribución de los cierres</CardTitle>
                <CardDescription>
                  Cómo terminan tus {plural(clasificadas.length, "operación", "operaciones")}{" "}
                  clasificadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistribucionCierres filas={porTipo} />
              </CardContent>
            </Card>

            <TarjetasTipoCierre filas={porTipo} disciplina={disciplina} moneda={moneda} />
          </TabsContent>

          <TabsContent value="pips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lo que planificas frente a lo que pasa</CardTitle>
                <CardDescription>
                  Riesgo, objetivo y recorrido real, en la unidad de cada instrumento. Los
                  promedios van por instrumento a propósito: 8 pips de EURUSD y 430 puntos de
                  BTCUSD no son la misma magnitud y su media no significaría nada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TablaPlanificacion filas={planificacion} />
              </CardContent>
            </Card>

            <div>
              <h2 className="pb-3 text-sm font-semibold">Cuánto te falta y cuánto te sobra</h2>
              <MedicionesDeCierre mediciones={medicionesCierre} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TarjetaMedicion
                titulo="Órdenes que no se activaron · Le faltó"
                explicacion="Lo que le faltó al precio para tocar tu orden pendiente. Es cuánto hay que acercar la entrada para que entre sin perder la lectura de dirección."
                promedios={distanciaActivacion}
              />
            </div>
          </TabsContent>

          <TabsContent value="cruce">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Confirmación × tipo de cierre</CardTitle>
                <CardDescription>
                  Cómo termina cada setup. Es el cruce que explica por qué un tag pierde dinero.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PanelCruce filas={cruce} moneda={moneda} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tiempo" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Rachas</CardTitle>
                    <CardDescription>
                      Operaciones consecutivas ganando o perdiendo. Los break even no cortan la
                      racha.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="positive">Mejor: {rachas.mejorRacha} seguidas</Badge>
                    <Badge variant="negative">Peor: {rachas.peorRacha} seguidas</Badge>
                    {rachas.signoActual && (
                      <Badge variant={rachas.signoActual === "ganando" ? "positive" : "negative"}>
                        Ahora: {rachas.rachaActual} {rachas.signoActual}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Por día de la semana</CardTitle>
                  <CardDescription>Según el día en que cerraste.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TablaTiempo
                    filas={porDia}
                    encabezado="Día"
                    moneda={moneda}
                    vacio="Sin operaciones cerradas."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Por hora de entrada</CardTitle>
                  <CardDescription>La hora a la que decides entrar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TablaTiempo
                    filas={porHora}
                    encabezado="Hora"
                    moneda={moneda}
                    vacio="Sin operaciones cerradas."
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
