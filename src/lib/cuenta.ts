/**
 * Cuenta de trading que se está viendo.
 *
 * Cada cuenta tiene su propio capital, reglas y resultados, así que las pantallas de
 * análisis (dashboard, analítica y calendario) muestran siempre UNA cuenta a la vez: mezclar
 * cuentas daría cifras que no significan nada (otro capital, otra moneda, otras reglas).
 *
 * La cuenta sale, por orden, de: el parámetro `?cuenta=` de la URL, la última que se eligió
 * (cookie) y, si no hay ninguna válida, la primera cuenta activa.
 * Son funciones puras: la cookie se lee aparte, en el servidor.
 */

export const COOKIE_CUENTA = "cuenta";

interface CuentaElegible {
  id: string;
  activo: boolean;
}

/** El id de la cuenta a mostrar, o null si el usuario no tiene ninguna. */
export function resolverCuenta(
  cuentas: CuentaElegible[],
  parametro: string | null | undefined,
  guardada: string | null | undefined,
): string | null {
  const existe = (id: string | null | undefined) =>
    id ? cuentas.some((c) => c.id === id) : false;

  if (existe(parametro)) return parametro!;
  if (existe(guardada)) return guardada!;
  return (cuentas.find((c) => c.activo) ?? cuentas[0])?.id ?? null;
}
