/**
 * Helpers de usuario sin dependencias de servidor.
 * Vive aparte de lib/auth.ts porque los componentes de cliente los necesitan
 * y lib/auth.ts importa next/headers, que no existe en el navegador.
 */

/** Iniciales para el avatar, a partir del correo. */
export function inicialesDe(email: string | undefined): string {
  if (!email) return "?";
  const usuario = email.split("@")[0] ?? "";
  const partes = usuario.split(/[._-]/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return usuario.slice(0, 2).toUpperCase();
}
