"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { actualizarCuenta, crearCuenta } from "@/app/(app)/configuracion/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TradingAccount } from "@/lib/types";

const MONEDAS = ["USD", "EUR", "GBP", "COP", "MXN", "ARS", "CLP", "PEN", "BRL", "USDT"];

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Si viene una cuenta, el diálogo edita; si no, crea. */
  cuenta?: TradingAccount | null;
}

export function DialogoCuenta({ abierto, onOpenChange, cuenta }: Props) {
  const editando = Boolean(cuenta);

  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [broker, setBroker] = useState(cuenta?.broker ?? "");
  const [moneda, setMoneda] = useState(cuenta?.moneda_base ?? "USD");
  const [tipo, setTipo] = useState<"real" | "demo">(cuenta?.tipo ?? "real");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const datos = { nombre, broker, moneda_base: moneda, tipo };
    const resultado = cuenta
      ? await actualizarCuenta(cuenta.id, datos)
      : await crearCuenta(datos);

    setGuardando(false);

    if (!resultado.ok) {
      toast.error(resultado.mensaje ?? "No se pudo guardar.");
      return;
    }

    toast.success(editando ? "Cuenta actualizada." : "Cuenta creada.");
    onOpenChange(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cuenta" : "Nueva cuenta de trading"}</DialogTitle>
          <DialogDescription>
            Cada cuenta lleva su propio historial. Sirve para separar brókers, capital real de
            demo, o estrategias distintas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              required
              maxLength={80}
              placeholder="Cuenta principal"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Bróker</Label>
            <Input
              id="broker"
              maxLength={80}
              placeholder="Opcional"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda base</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger id="moneda">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "real" | "demo")}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? "Guardar cambios" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
