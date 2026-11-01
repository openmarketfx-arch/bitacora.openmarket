import { listarOperaciones } from "@/lib/datos/operaciones";
import { evaluarPrueba } from "@/lib/datos/fondeo";
import { createClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/lib/types";
import { obtenerZona } from "@/lib/zona-servidor";

/**
 * Pone al día las pruebas de fondeo en curso.
 *
 * Si una prueba ya cumplió todos sus objetivos, la cuenta pasa a ser "fondeada". Si
 * sobrepasó un límite de pérdida, queda como "fallida". Solo se escribe cuando hay un
 * resultado nuevo, así que llamarla de más no cuesta nada: sin pruebas en curso no
 * hace ninguna consulta de operaciones.
 *
 * Se llama después de registrar, cerrar o editar una operación y al abrir el dashboard.
 * Nunca lanza: una prueba que no se pudo actualizar no debe tumbar la acción que la llamó.
 */
export async function sincronizarPruebasFondeo(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("tipo", "prueba_fondeo")
      .eq("prueba_estado", "en_curso");

    const enCurso = (data ?? []) as TradingAccount[];
    if (enCurso.length === 0) return;

    const [operaciones, zona] = await Promise.all([
      listarOperaciones({ limite: 2000 }),
      obtenerZona(),
    ]);

    for (const cuenta of enCurso) {
      const evaluacion = evaluarPrueba(cuenta, operaciones, zona);
      if (!evaluacion || evaluacion.estado === "en_curso") continue;

      const cambios =
        evaluacion.estado === "aprobada"
          ? { tipo: "fondeada", prueba_estado: "aprobada", prueba_resuelta_en: evaluacion.resueltaEn }
          : { prueba_estado: "fallida", prueba_resuelta_en: evaluacion.resueltaEn };

      // El filtro por estado evita pisar una resolución que otra petición ya guardó.
      await supabase
        .from("trading_accounts")
        .update(cambios)
        .eq("id", cuenta.id)
        .eq("prueba_estado", "en_curso");
    }
  } catch {
    // Se reintenta en la siguiente llamada.
  }
}
