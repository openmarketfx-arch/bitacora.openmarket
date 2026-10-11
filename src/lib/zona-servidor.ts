import { cookies } from "next/headers";
import { COOKIE_ZONA, zonaValida } from "@/lib/zona";

/**
 * Zona horaria del usuario en este request. La fija el navegador (cookie `tz`,
 * ver `FijarZona`); la primera visita, antes de que exista, cae a UTC.
 */
export async function obtenerZona(): Promise<string> {
  const almacen = await cookies();
  return zonaValida(almacen.get(COOKIE_ZONA)?.value);
}
