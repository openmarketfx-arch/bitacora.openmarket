"use client";

import { useState, useTransition } from "react";
import { Banknote, Pencil, Plus, PowerOff, Power, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  alternarActivoCuenta,
  eliminarCuenta,
} from "@/app/(app)/configuracion/acciones";
import { DialogoCuenta } from "@/components/cuentas/dialogo-cuenta";
import { DialogoRetiros } from "@/components/cuentas/dialogo-retiros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDinero, plural } from "@/lib/format";
import type { Retiro, TradingAccount } from "@/lib/types";

/** Cuenta + cuántas operaciones tiene, para decidir si se puede borrar. */
export interface CuentaConUso extends TradingAccount {
  operaciones: number;
  /** Capital inicial más el resultado neto de lo cerrado, menos los retiros. null si no hay capital. */
  saldo: number | null;
  /** Lo que movieron las operaciones cerradas, comisiones y swaps incluidos. */
  resultadoNeto: number;
  retiros: Retiro[];
  retirado: number;
}

export function ListaCuentas({ cuentas }: { cuentas: CuentaConUso[] }) {
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<TradingAccount | null>(null);
  const [porBorrar, setPorBorrar] = useState<CuentaConUso | null>(null);
  const [retirosDeId, setRetirosDeId] = useState<string | null>(null);
  const cuentaConRetiros = cuentas.find((c) => c.id === retirosDeId) ?? null;
  const [pendiente, iniciarTransicion] = useTransition();

  function abrirNueva() {
    setEnEdicion(null);
    setDialogoAbierto(true);
  }

  function abrirEdicion(cuenta: TradingAccount) {
    setEnEdicion(cuenta);
    setDialogoAbierto(true);
  }

  function alternar(cuenta: CuentaConUso) {
    iniciarTransicion(async () => {
      const r = await alternarActivoCuenta(cuenta.id, !cuenta.activo);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo cambiar el estado.");
      else toast.success(cuenta.activo ? "Cuenta desactivada." : "Cuenta activada.");
    });
  }

  function pedirBorrado(cuenta: CuentaConUso) {
    // Una cuenta con historial no se borra: perderla se llevaría las operaciones.
    if (cuenta.operaciones > 0) {
      toast.error(
        `"${cuenta.nombre}" tiene ${plural(cuenta.operaciones, "operación registrada", "operaciones registradas")}. Desactívala en lugar de borrarla.`,
      );
      return;
    }
    setPorBorrar(cuenta);
  }

  function confirmarBorrado() {
    const cuenta = porBorrar;
    if (!cuenta) return;

    iniciarTransicion(async () => {
      const r = await eliminarCuenta(cuenta.id);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo borrar.");
      else toast.success("Cuenta borrada.");
      setPorBorrar(null);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-sm font-semibold">Cuentas de trading</h2>
          <p className="text-xs text-muted-foreground">
            Cada cuenta lleva su capital y sus límites de pérdida diario, semanal y mensual.
          </p>
        </div>
        <Button size="sm" onClick={abrirNueva}>
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no tienes cuentas. Crea la primera para empezar a registrar operaciones.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Capital inicial</TableHead>
              <TableHead className="text-right">Saldo actual</TableHead>
              <TableHead>Límite de pérdida</TableHead>
              <TableHead className="text-right">Operaciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentas.map((cuenta) => (
              <TableRow key={cuenta.id} className={cuenta.activo ? "" : "opacity-55"}>
                <TableCell className="font-medium">{cuenta.nombre}</TableCell>
                <TableCell className="font-mono text-xs">{cuenta.moneda_base}</TableCell>
                <TableCell>
                  <Badge variant={cuenta.tipo === "real" ? "primary" : "outline"}>
                    {cuenta.tipo === "real" ? "Real" : "Demo"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {cuenta.capital_inicial === null ? (
                    <span className="text-amber-400">Sin capital</span>
                  ) : (
                    formatDinero(cuenta.capital_inicial, cuenta.moneda_base, { signo: false })
                  )}
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {cuenta.saldo === null
                    ? "—"
                    : formatDinero(cuenta.saldo, cuenta.moneda_base, { signo: false })}
                  {cuenta.retirado > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      −{formatDinero(cuenta.retirado, cuenta.moneda_base, { signo: false })} retirados
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <LimitesDeCuenta cuenta={cuenta} />
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">
                  {cuenta.operaciones}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {cuenta.activo ? "Activa" : "Inactiva"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      aria-label={`Editar ${cuenta.nombre}`}
                      onClick={() => abrirEdicion(cuenta)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Retiros"
                      aria-label={`Retiros de ${cuenta.nombre}`}
                      onClick={() => setRetirosDeId(cuenta.id)}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pendiente}
                      title={cuenta.activo ? "Desactivar" : "Activar"}
                      aria-label={`${cuenta.activo ? "Desactivar" : "Activar"} ${cuenta.nombre}`}
                      onClick={() => alternar(cuenta)}
                    >
                      {cuenta.activo ? (
                        <PowerOff className="h-3.5 w-3.5" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pendiente}
                      title="Borrar"
                      aria-label={`Borrar ${cuenta.nombre}`}
                      onClick={() => pedirBorrado(cuenta)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {dialogoAbierto && (
        <DialogoCuenta
          key={enEdicion?.id ?? "nueva"}
          abierto={dialogoAbierto}
          onOpenChange={setDialogoAbierto}
          cuenta={enEdicion}
        />
      )}

      {cuentaConRetiros && (
        <DialogoRetiros
          key={cuentaConRetiros.id}
          cuenta={cuentaConRetiros}
          onOpenChange={(abierto) => !abierto && setRetirosDeId(null)}
        />
      )}

      <DialogoConfirmacion
        abierto={porBorrar !== null}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
        titulo="Borrar cuenta"
        descripcion={`"${porBorrar?.nombre ?? ""}" se borrará para siempre. No se puede deshacer.`}
        etiquetaConfirmar="Borrar"
        destructivo
        procesando={pendiente}
        onConfirmar={confirmarBorrado}
      />
    </>
  );
}

const pct = (n: number) => `${String(Number(n))} %`;

/** "3 % día · 6 % semana · 10 % mes", o un aviso si no hay ninguno. */
function LimitesDeCuenta({ cuenta }: { cuenta: TradingAccount }) {
  const partes = [
    cuenta.limite_riesgo_diario !== null ? `${pct(cuenta.limite_riesgo_diario)} día` : null,
    cuenta.limite_riesgo_semanal !== null ? `${pct(cuenta.limite_riesgo_semanal)} semana` : null,
    cuenta.limite_riesgo_mensual !== null ? `${pct(cuenta.limite_riesgo_mensual)} mes` : null,
  ].filter((p): p is string => p !== null);

  if (partes.length === 0) return <span className="text-amber-400">Sin límites</span>;
  return <span className="tabular font-mono">{partes.join(" · ")}</span>;
}
