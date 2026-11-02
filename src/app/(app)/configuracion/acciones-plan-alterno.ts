"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/auth";
import { PLANES } from "@/lib/plan-alterno";
import { createClient } from "@/lib/supabase/server";
import type { Resultado } from "@/app/(app)/configuracion/acciones";

const esquema = z
  .object({
    habilitado: z.boolean(),
    planes: z.array(z.enum(PLANES)).max(PLANES.length),
  })
  .superRefine((d, ctx) => {
    if (d.habilitado && d.planes.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Habilita al menos un plan para activar el plan alterno.",
        path: ["planes"],
      });
    }
  });

/**
 * Guarda si el usuario usa el plan alterno y cuáles de los planes A a E tiene. Las operaciones
 * que ya llevan un plan no se tocan si luego se deshabilita: solo deja de ofrecerse al registrar.
 */
export async function guardarPlanAlterno(datos: unknown): Promise<Resultado> {
  const parseado = esquema.safeParse(datos);
  if (!parseado.success) {
    return { ok: false, mensaje: parseado.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuario = await requerirUsuario();
  const supabase = await createClient();

  // En el orden A..E y sin repetidos, sin importar cómo llegaron.
  const planes = PLANES.filter((p) => parseado.data.planes.includes(p));

  const { error } = await supabase.from("plan_alterno").upsert(
    {
      user_id: usuario.id,
      habilitado: parseado.data.habilitado,
      planes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/configuracion");
  revalidatePath("/operaciones/nueva");
  revalidatePath("/analitica");
  return { ok: true };
}
