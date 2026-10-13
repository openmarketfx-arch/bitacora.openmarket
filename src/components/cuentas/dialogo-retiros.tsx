"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { eliminarRetiro, registrarRetiro } from "@/app/(app)/configuracion/acciones-retiros";
import type { CuentaConUso } from "@/components/cuentas/lista-cuentas";
import { useZona } from "@/components/layout/proveedor-zona";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDinero, formatFechaHora } from "@/lib/format";
import type { Retiro } from "@/lib/types";
import { deInputDateTime, paraInputDateTime } from "@/lib/zona";

interface Props {
  cuenta: CuentaConUso;
  onOpenChange: (abierto: boolean) => void;
}

/**
 * Retiros de dinero de una cuenta. Bajan el saldo, que es la base de los límites de
 * riesgo, sin contar como pérdida: así la bitácora trabaja siempre sobre el capital
 * real aunque se retiren ganancias.
 */
export function DialogoRetiros({ cuenta, onOpenChange }: Props) {
  const zona = useZona();
  const moneda = cuenta.moneda_base;
  const hayCapital = cuenta.capital_inicial !== null && Number(cuenta.capital_inicial) > 0;

  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => paraInputDateTime(zona));
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Retiro | null>(null);
  const [borrando, iniciarBorrado] = useTransition();

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const r = await registrarRetiro(cuenta.id, {
      monto,
      fecha_hora: deInputDateTime(fecha, zona),
      nota,
    });
    setGuardando(false);

    if (!r.ok) {
      toast.error(r.mensaje ?? "No se pudo registrar el retiro.");
      return;
    }
    toast.success("Retiro registrado. El saldo de la cuenta ya lo descuenta.");
    setMonto("");
    setNota("");
    setFecha(paraInputDateTime(zona));
  }

  function confirmarBorrado() {
    const retiro = porBorrar;
    if (!retiro) return;
    iniciarBorrado(async () => {
      const r = await eliminarRetiro(retiro.id);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo borrar el retiro.");
      else toast.success("Retiro borrado. Ese dinero vuelve al saldo.");
      setPorBorrar(null);
    });
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retiros · {cuenta.nombre}</DialogTitle>
            <DialogDescription>
              Registra el dinero que sacas de la cuenta, por ejemplo al retirar ganancias. Baja
              el saldo y tus límites de riesgo se calculan sobre lo que realmente queda. Un
              retiro nunca cuenta como pérdida.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border bg-card/60 p-4 text-sm sm:grid-cols-4">
            <Dato
              etiqueta="Capital inicial"
              valor={formatDinero(cuenta.capital_inicial, moneda, { signo: false })}
            />
            <Dato etiqueta="Resultado neto" valor={formatDinero(cuenta.resultadoNeto, moneda)} />
            <Dato
              etiqueta="Retirado"
              valor={
                cuenta.retirado > 0
                  ? `−${formatDinero(cuenta.retirado, moneda, { signo: false })}`
                  : formatDinero(0, moneda, { signo: false })
              }
            />
            <Dato
              etiqueta="Saldo actual"
              valor={
                cuenta.saldo === null ? "—" : formatDinero(cuenta.saldo, moneda, { signo: false })
              }
              fuerte
            />
          </dl>

          {hayCapital ? (
            <form onSubmit={registrar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="retiro-monto">Monto retirado ({moneda})</Label>
                  <Input
                    id="retiro-monto"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className="font-mono"
                    placeholder="500"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retiro-fecha">Fecha y hora</Label>
                  <Input
                    id="retiro-fecha"
                    type="datetime-local"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retiro-nota">
                  Nota <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="retiro-nota"
                  maxLength={200}
                  placeholder="Ej: ganancias de septiembre"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={guardando} className="w-full">
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar retiro
              </Button>
            </form>
          ) : (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
              Esta cuenta todavía no tiene capital inicial. Ponlo primero en &quot;Editar cuenta&quot;: sin
              él no hay saldo del que retirar.
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Retiros registrados
            </h3>
            {cuenta.retiros.length === 0 ? (
              <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Todavía no has registrado retiros.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {cuenta.retiros.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="tabular font-mono text-sm font-medium">
                        −{formatDinero(r.monto, moneda, { signo: false })}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatFechaHora(r.fecha_hora, zona)}
                        {r.nota ? ` · ${r.nota}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Borrar retiro"
                      aria-label={`Borrar el retiro de ${formatDinero(r.monto, moneda, { signo: false })}`}
                      onClick={() => setPorBorrar(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DialogoConfirmacion
        abierto={porBorrar !== null}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
        titulo="Borrar retiro"
        descripcion={`El retiro de ${porBorrar ? formatDinero(porBorrar.monto, moneda, { signo: false }) : ""} se borrará y ese dinero volverá al saldo de la cuenta. No se puede deshacer.`}
        etiquetaConfirmar="Borrar"
        destructivo
        procesando={borrando}
        onConfirmar={confirmarBorrado}
      />
    </>
  );
}

function Dato({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd
        className={fuerte ? "tabular font-mono text-sm font-semibold" : "tabular font-mono text-xs"}
      >
        {valor}
      </dd>
    </div>
  );
}
