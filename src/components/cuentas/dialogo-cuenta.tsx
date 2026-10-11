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
import { formatDinero } from "@/lib/format";
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
  const [moneda, setMoneda] = useState(cuenta?.moneda_base ?? "USD");
  const [tipo, setTipo] = useState<"real" | "demo">(cuenta?.tipo ?? "real");
  const [capital, setCapital] = useState(texto(cuenta?.capital_inicial));
  const [limiteDiario, setLimiteDiario] = useState(texto(cuenta?.limite_riesgo_diario));
  const [limiteSemanal, setLimiteSemanal] = useState(texto(cuenta?.limite_riesgo_semanal));
  const [limiteMensual, setLimiteMensual] = useState(texto(cuenta?.limite_riesgo_mensual));
  const [guardando, setGuardando] = useState(false);

  const capitalNumero = Number(capital.replace(",", "."));
  const hayCapital = capital.trim() !== "" && Number.isFinite(capitalNumero) && capitalNumero > 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const datos = {
      nombre,
      moneda_base: moneda,
      tipo,
      capital_inicial: capital,
      limite_riesgo_diario: limiteDiario,
      limite_riesgo_semanal: limiteSemanal,
      limite_riesgo_mensual: limiteMensual,
    };
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
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cuenta" : "Nueva cuenta de trading"}</DialogTitle>
          <DialogDescription>
            Cada cuenta lleva su propio historial y su propio capital. Sirve para separar
            capital real de demo, o estrategias distintas.
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

          <div className="space-y-2">
            <Label htmlFor="capital">Capital inicial ({moneda})</Label>
            <Input
              id="capital"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="font-mono"
              placeholder="10000"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Con cuánto dinero arranca la cuenta. El saldo se actualiza solo con el resultado
              de cada operación, comisiones y swaps incluidos.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <h3 className="text-sm font-semibold">Límite de pérdida</h3>
              <p className="pt-0.5 text-xs text-muted-foreground">
                El máximo que aceptas perder, como % del saldo de la cuenta al empezar cada
                periodo. Si lo superas cuenta como un incumplimiento de tu gestión del riesgo.
                Deja vacío el que no quieras medir.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CampoLimite
                id="limite-diario"
                etiqueta="Por día"
                valor={limiteDiario}
                onChange={setLimiteDiario}
                capital={hayCapital ? capitalNumero : null}
                moneda={moneda}
              />
              <CampoLimite
                id="limite-semanal"
                etiqueta="Por semana"
                valor={limiteSemanal}
                onChange={setLimiteSemanal}
                capital={hayCapital ? capitalNumero : null}
                moneda={moneda}
              />
              <CampoLimite
                id="limite-mensual"
                etiqueta="Por mes"
                valor={limiteMensual}
                onChange={setLimiteMensual}
                capital={hayCapital ? capitalNumero : null}
                moneda={moneda}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              La semana va de lunes a domingo. Cada periodo se mide por separado: puedes
              cumplir el límite diario todos los días y aun así pasarte del semanal.
            </p>
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

/** Un valor numérico de la base de datos como texto para el input. */
function texto(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "" : String(Number(valor));
}

function CampoLimite({
  id,
  etiqueta,
  valor,
  onChange,
  capital,
  moneda,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  capital: number | null;
  moneda: string;
}) {
  const pct = Number(valor.replace(",", "."));
  const equivalente =
    capital !== null && valor.trim() !== "" && Number.isFinite(pct) && pct > 0
      ? formatDinero((capital * pct) / 100, moneda, { signo: false })
      : null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          className="pr-7 font-mono"
          placeholder="3"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          %
        </span>
      </div>
      <p className="min-h-[1rem] text-[11px] text-muted-foreground">
        {equivalente ? `≈ ${equivalente} sobre el capital inicial` : " "}
      </p>
    </div>
  );
}
