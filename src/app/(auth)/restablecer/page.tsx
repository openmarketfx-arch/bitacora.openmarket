import { FormularioRestablecer } from "@/components/auth/formulario-restablecer";

export const metadata = { title: "Nueva contraseña — Open Market" };

// Ruta protegida por el middleware: solo se llega con la sesión que crea el
// enlace del correo (/auth/callback), así que no hay nada que comprobar aquí.
export default function RestablecerPage() {
  return <FormularioRestablecer />;
}
