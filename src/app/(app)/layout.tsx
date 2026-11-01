import { ChartCandlestick } from "lucide-react";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { FijarZona, ProveedorZona } from "@/components/layout/proveedor-zona";
import { Sidebar } from "@/components/layout/sidebar";
import { requerirUsuario } from "@/lib/auth";
import { resolverCuenta } from "@/lib/cuenta";
import { listarCuentas } from "@/lib/datos/cuentas";
import { contarPorEstado } from "@/lib/datos/operaciones";
import { obtenerCuentaGuardada, obtenerZona } from "@/lib/zona-servidor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await requerirUsuario();
  const email = usuario.email ?? "";
  const zona = await obtenerZona();

  // El contador del menú es de la cuenta que se está viendo, no un total de todas.
  const [cuentas, cuentaGuardada] = await Promise.all([listarCuentas(), obtenerCuentaGuardada()]);
  const { pendientes } = await contarPorEstado(resolverCuenta(cuentas, null, cuentaGuardada));

  return (
    <ProveedorZona zona={zona}>
    <FijarZona />
    <div className="min-h-screen">
      <Sidebar email={email} pendientes={pendientes} />

      {/* En pantallas chicas el sidebar no existe: la identidad vive aquí. */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 py-1.5 lg:hidden">
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
            <ChartCandlestick className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Open Market</span>
        </div>
        <MenuUsuario email={email} />
      </div>

      <div className="lg:pl-60">{children}</div>
    </div>
    </ProveedorZona>
  );
}
