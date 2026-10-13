import { revalidatePath } from "next/cache";

/** El capital, los límites y los retiros cambian cifras en todas estas pantallas. */
export function revalidarRiesgo() {
  for (const ruta of ["/", "/analitica", "/calendario", "/operaciones", "/configuracion"]) {
    revalidatePath(ruta);
  }
}
