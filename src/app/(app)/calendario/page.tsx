import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { RejillaMes } from "@/components/calendario/rejilla-mes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { BarraFiltros } from "@/components/filtros/barra-filtros";
import { requerirUsuario } from "@/lib/auth";
import { filtrarPorInstrumento, instrumentosUsados } from "@/lib/datos/filtros";
import {
  construirMes,
  formatearMes,
  mesVecino,
  parsearMes,
  rangoRejilla,
} from "@/lib/datos/calendario";
import { listarParaCalendario } from "@/lib/datos/operaciones";
import { plural } from "@/lib/format";

export const metadata = { title: "Calendario — Open Market" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; instrumento?: string }>;
}) {
  await requerirUsuario();
  const params = await searchParams;

  const { anio, mes } = parsearMes(params.mes);
  const { inicio, fin } = rangoRejilla(anio, mes);

  const delMes = await listarParaCalendario(inicio, fin);
  const instrumento = params.instrumento?.trim() || null;
  const instrumentos = Array.from(
    new Set([...instrumentosUsados(delMes), ...(instrumento ? [instrumento] : [])]),
  ).sort();
  const operaciones = filtrarPorInstrumento(delMes, instrumento);
  const consultaInstrumento = instrumento ? `&instrumento=${encodeURIComponent(instrumento)}` : "";
  const datos = construirMes(anio, mes, operaciones);

  const hoy = new Date();
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;

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
              <Link href={`/calendario?mes=${formatearMes(hoy.getFullYear(), hoy.getMonth() + 1)}${consultaInstrumento}`}>
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
