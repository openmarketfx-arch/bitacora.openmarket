import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { FormularioOperacion } from "@/components/operaciones/formulario-operacion";
import type { InstrumentoOpcion } from "@/components/operaciones/selector-instrumento";
import { Button } from "@/components/ui/button";
import { requerirUsuario } from "@/lib/auth";
import { obtenerOperacion } from "@/lib/datos/operaciones";
import { createClient } from "@/lib/supabase/server";
import { TIPO_ORDEN_MAP, type Instrument, type Tag, type TradingAccount } from "@/lib/types";

export const metadata = { title: "Editar operación — Open Market" };

export default async function EditarOperacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirUsuario();
  const { id } = await params;

  const operacion = await obtenerOperacion(id);
  if (!operacion) notFound();

  const supabase = await createClient();
  const [{ data: cuentas }, { data: instrumentos }, { data: tags }, { data: seguidos }] =
    await Promise.all([
      // Todas, también las desactivadas: la operación puede ser de una de ellas.
      supabase.from("trading_accounts").select("*").order("nombre"),
      supabase.from("instruments").select("*").order("simbolo"),
      supabase.from("tags").select("*").order("nombre"),
      supabase.from("user_instruments").select("instrument_id"),
    ]);

  const idsSeguidos = new Set((seguidos ?? []).map((s) => s.instrument_id as string));
  const opciones: InstrumentoOpcion[] = ((instrumentos ?? []) as Instrument[]).map((i) => ({
    ...i,
    seguido: idsSeguidos.has(i.id),
  }));

  return (
    <>
      <Topbar
        titulo={`Editar ${operacion.instrument.simbolo} · ${TIPO_ORDEN_MAP[operacion.tipo_orden].etiqueta}`}
        descripcion="Cambia cualquier dato de la operación, también si ya está cerrada"
        acciones={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/operaciones/${operacion.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <main className="mx-auto max-w-4xl p-5 sm:p-8">
        <FormularioOperacion
          cuentas={(cuentas ?? []) as TradingAccount[]}
          instrumentos={opciones}
          tagsIniciales={(tags ?? []) as Tag[]}
          operacion={operacion}
        />
      </main>
    </>
  );
}
