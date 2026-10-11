import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ColasOperaciones } from "@/components/operaciones/colas-operaciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarraFiltros } from "@/components/filtros/barra-filtros";
import { requerirUsuario } from "@/lib/auth";
import { obtenerZona } from "@/lib/zona-servidor";
import {
  filtrarOperaciones,
  instrumentosUsados,
  parsearFiltro,
  type ParametrosFiltro,
} from "@/lib/datos/filtros";
import { listarOperaciones } from "@/lib/datos/operaciones";

export const metadata = { title: "Operaciones — Open Market" };

export default async function OperacionesPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosFiltro>;
}) {
  await requerirUsuario();
  const params = await searchParams;
  const zona = await obtenerZona();

  // Una sola lectura: las colas y los filtros se resuelven en memoria, que sale
  // más barato que un viaje a la base por cada combinación.
  const filtro = parsearFiltro(params, "todo", zona);
  const sinFiltrar = await listarOperaciones({ limite: 500 });
  const todas = filtrarOperaciones(sinFiltrar, filtro);
  const abiertas = todas.filter((o) => o.estado_operacion === "abierta");
  const pendientes = todas.filter((o) => o.estado_revision === "pendiente");

  return (
    <>
      <Topbar
        titulo="Operaciones"
        descripcion="Tu bitácora, y lo que queda por cerrar o revisar"
      />

      <main className="p-5 sm:p-8">
        {sinFiltrar.length > 0 && (
          <div className="mb-5">
            <BarraFiltros
              periodo={filtro.periodo}
              desde={params.desde ?? ""}
              hasta={params.hasta ?? ""}
              instrumento={filtro.instrumento}
              instrumentos={instrumentosUsados(sinFiltrar)}
            />
          </div>
        )}

        {sinFiltrar.length > 0 && todas.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Ninguna operación coincide con estos filtros.
            </CardContent>
          </Card>
        ) : todas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Todavía no hay operaciones</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Registra la primera. Puedes cerrarla de una vez si ya tienes el resultado, o
                  dejarla abierta y cerrarla después.
                </p>
              </div>
              <Button asChild>
                <Link href="/operaciones/nueva">
                  <Plus className="h-4 w-4" />
                  Nueva operación
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ColasOperaciones todas={todas} abiertas={abiertas} pendientes={pendientes} />
        )}
      </main>
    </>
  );
}
