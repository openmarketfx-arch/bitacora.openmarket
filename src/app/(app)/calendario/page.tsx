import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { RejillaMes } from "@/components/calendario/rejilla-mes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { BarraFiltros } from "@/components/filtros/barra-filtros";
import { requerirUsuario } from "@/lib/auth";
import { obtenerZona } from "@/lib/zona-servidor";
import { claveHoy, partesDeClave } from "@/lib/zona";
import { filtrarPorInstrumento, instrumentosUsados } from "@/lib/datos/filtros";
import {
  construirMes,
  formatearMes,
  mesVecino,
  parsearMes,
  rangoRejilla,
} from "@/lib/datos/calendario";
import { listarCuentas } from "@/lib/datos/cuentas";
import { listarOperaciones, listarParaCalendario } from "@/lib/datos/operaciones";
import { calcularRiesgo, limitesDePeriodo } from "@/lib/datos/riesgo";
import { plural } from "@/lib/format";

export const metadata = { title: "Calendario — Open Market" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; instrumento?: string }>;
}) {
  await requerirUsuario();
  const params = await searchParams;
  const zona = await obtenerZona();

  const { anio, mes } = parsearMes(params.mes, zona);
  const { inicio, fin } = rangoRejilla(anio, mes, zona);

  // El riesgo necesita todo el historial: el saldo con el que arranca cada periodo
  // depende de lo cerrado antes. Ignora el filtro de instrumento (es de la cuenta).
  const [delMes, cuentas, historial] = await Promise.all([
    listarParaCalendario(inicio, fin),
    listarCuentas(),
    listarOperaciones({ limite: 2000 }),
  ]);
  const riesgo = calcularRiesgo(cuentas, historial, zona, { desde: inicio, hasta: fin });
  const riesgoMedible = riesgo.cuentas.some((c) => c.configurada);
  const rangoMes = limitesDePeriodo("mensual", `${anio}-${String(mes).padStart(2, "0")}-01`);
  const delMesRiesgo = riesgo.incumplimientos.filter(
    (i) => i.fin >= rangoMes.inicio && i.inicio <= rangoMes.fin,
  );
  const contarTipo = (tipo: string) => delMesRiesgo.filter((i) => i.tipo === tipo).length;
  const instrumento = params.instrumento?.trim() || null;
  const instrumentos = Array.from(
    new Set([...instrumentosUsados(delMes), ...(instrumento ? [instrumento] : [])]),
  ).sort();
  const operaciones = filtrarPorInstrumento(delMes, instrumento);
  const consultaInstrumento = instrumento ? `&instrumento=${encodeURIComponent(instrumento)}` : "";
  const datos = construirMes(anio, mes, operaciones, zona, riesgo.incumplimientos);

  const hoy = partesDeClave(claveHoy(zona));
  const esMesActual = anio === hoy.anio && mes === hoy.mes;

  return (
    <>
      <Topbar
        titulo="Calendario"
        descripcion="Verde el día que ganaste, negro el que perdiste"
        acciones={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild aria-label="Mes anterior">
              <Link href={`/calendario?mes=${mesVecino(anio, mes, -1)}${consultaInstrumento}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild disabled={esMesActual}>
              <Link href={`/calendario?mes=${formatearMes(hoy.anio, hoy.mes)}${consultaInstrumento}`}>
                Hoy
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Mes siguiente">
              <Link href={`/calendario?mes=${mesVecino(anio, mes, 1)}${consultaInstrumento}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <main className="space-y-5 p-5 sm:p-8">
        <BarraFiltros
          soloInstrumento
          periodo={null}
          desde=""
          hasta=""
          instrumento={instrumento}
          instrumentos={instrumentos}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{datos.etiqueta}</h2>

          <div className="flex flex-wrap items-center gap-3">
            {datos.totales.abiertas > 0 && (
              <Badge variant="primary">{datos.totales.abiertas} en curso</Badge>
            )}
            {riesgoMedible && (
              <Badge
                variant={delMesRiesgo.length > 0 ? "negative" : "positive"}
                title={`Diarios: ${contarTipo("diario")} · Semanales: ${contarTipo("semanal")} · Mensuales: ${contarTipo("mensual")}`}
                className={delMesRiesgo.length > 0 ? "border-red-500/40 bg-red-500/15 text-red-300" : undefined}
              >
                {delMesRiesgo.length === 0
                  ? "Sin incumplimientos de riesgo"
                  : `${plural(delMesRiesgo.length, "incumplimiento", "incumplimientos")} de riesgo · ${contarTipo("diario")} d · ${contarTipo("semanal")} s · ${contarTipo("mensual")} m`}
              </Badge>
            )}
            {datos.totales.pendientes > 0 && (
              <Badge variant="warning">{datos.totales.pendientes} por revisar</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {plural(datos.totales.operaciones, "operación", "operaciones")} en el mes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Neto</span>
              <CifraResultado monto={datos.totales.neto} tamano="md" />
            </div>
          </div>
        </div>

        <RejillaMes mes={datos} />

        <p className="text-xs text-muted-foreground">
          El color de cada día sale del P/L que se realizó ese día, así que una operación
          cerrada cuenta en su fecha de salida. Las que siguen abiertas todavía no tienen
          resultado: aparecen con el reloj en el día que las abriste.
        </p>
      </main>
    </>
  );
}
