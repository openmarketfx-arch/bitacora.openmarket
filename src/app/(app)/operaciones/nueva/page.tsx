import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormularioOperacion } from "@/components/operaciones/formulario-operacion";
import type { InstrumentoOpcion } from "@/components/operaciones/selector-instrumento";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { requerirUsuario } from "@/lib/auth";
import { listarCuentas, listarRetiros } from "@/lib/datos/cuentas";
import { listarOperaciones } from "@/lib/datos/operaciones";
import { listarCandidatasEnlace, obtenerConfigPlanAlterno } from "@/lib/datos/plan-alterno";
import { calcularRiesgo } from "@/lib/datos/riesgo";
import { resolverCuenta } from "@/lib/cuenta";
import { obtenerCuentaGuardada, obtenerZona } from "@/lib/zona-servidor";
import { createClient } from "@/lib/supabase/server";
import type { Instrument, Tag, TradingAccount } from "@/lib/types";

export const metadata = { title: "Nueva operación — Open Market" };

export default async function NuevaOperacionPage() {
  await requerirUsuario();
  const supabase = await createClient();
  const zona = await obtenerZona();

  const [{ data: cuentas }, { data: instrumentos }, { data: tags }, { data: seguidos }] =
    await Promise.all([
      supabase
        .from("trading_accounts")
        .select("*")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("instruments").select("*").order("simbolo"),
      supabase.from("tags").select("*").order("nombre"),
      supabase.from("user_instruments").select("instrument_id"),
    ]);

  // Si ya se pasó de un límite en el periodo actual, se avisa antes de abrir otra.
  // El aviso sale por cuenta: el formulario muestra el de la cuenta que se elija.
  const [todasCuentas, historial, retiros, cuentaGuardada, configPlan, candidatasEnlace] =
    await Promise.all([
      listarCuentas(),
      listarOperaciones({ limite: 2000 }),
      listarRetiros(),
      obtenerCuentaGuardada(),
      obtenerConfigPlanAlterno(),
      listarCandidatasEnlace(),
    ]);
  const riesgo = calcularRiesgo(todasCuentas, historial, retiros, zona);
  const cuentaInicial = resolverCuenta(todasCuentas, null, cuentaGuardada);

  const idsSeguidos = new Set((seguidos ?? []).map((s) => s.instrument_id as string));

  const opciones: InstrumentoOpcion[] = ((instrumentos ?? []) as Instrument[]).map((i) => ({
    ...i,
    seguido: idsSeguidos.has(i.id),
  }));

  return (
    <>
      <Topbar
        titulo="Nueva operación"
        descripcion="Registra la entrada; ciérrala ahora o cuando tengas el resultado"
        acciones={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/operaciones">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <main className="mx-auto max-w-4xl space-y-5 p-5 sm:p-8">
        <FormularioOperacion
          cuentaInicial={cuentaInicial}
          riesgo={riesgo}
          configPlan={configPlan}
          candidatasEnlace={candidatasEnlace}
          cuentas={(cuentas ?? []) as TradingAccount[]}
          instrumentos={opciones}
          tagsIniciales={(tags ?? []) as Tag[]}
        />
      </main>
    </>
  );
}
