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
import { ETIQUETA_TIPO_CUENTA, type AccountType, type TradingAccount } from "@/lib/types";

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
  const [tipo, setTipo] = useState<AccountType>(cuenta?.tipo ?? "real");
  // Datos de la prueba de fondeo. Los objetivos son un % del capital inicial, uno por fase.
  const [fases, setFases] = useState(String(cuenta?.prueba_fases ?? 2));
  const [objetivos, setObjetivos] = useState<string[]>(
    Array.from({ length: 4 }, (_, i) => texto(cuenta?.prueba_objetivos?.[i])),
  );
  const [pruebaDiario, setPruebaDiario] = useState(texto(cuenta?.prueba_limite_diario));
  const [pruebaTotal, setPruebaTotal] = useState(texto(cuenta?.prueba_limite_total));
  const esPrueba = tipo === "prueba_fondeo";
  const esFondeada = tipo === "fondeada";
  const numeroFases = Math.min(4, Math.max(1, Number(fases) || 1));
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
      prueba_fases: esPrueba ? fases : null,
      prueba_objetivos: esPrueba ? objetivos.slice(0, numeroFases) : null,
      prueba_limite_diario: esPrueba || esFondeada ? pruebaDiario : null,
      prueba_limite_total: esPrueba || esFondeada ? pruebaTotal : null,
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
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as AccountType)}
                // Fondeada no se elige: solo se llega aprobando la prueba, y de ahi no se vuelve.
                disabled={esFondeada}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">{ETIQUETA_TIPO_CUENTA.real}</SelectItem>
                  <SelectItem value="demo">{ETIQUETA_TIPO_CUENTA.demo}</SelectItem>
                  <SelectItem value="prueba_fondeo">{ETIQUETA_TIPO_CUENTA.prueba_fondeo}</SelectItem>
                  {esFondeada && (
                    <SelectItem value="fondeada">{ETIQUETA_TIPO_CUENTA.fondeada}</SelectItem>
                  )}
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

          {(esPrueba || esFondeada) && (
            <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {esFondeada ? "Cuenta fondeada" : "Objetivos de la prueba de fondeo"}
                </h3>
                <p className="pt-0.5 text-xs text-muted-foreground">
                  {esFondeada
                    ? "Esta cuenta ya aprobó su prueba. Los límites de pérdida de la prueba siguen vigentes."
                    : "Todo se mide como un % del capital inicial. Al cumplir el objetivo de cada fase se pasa a la siguiente; al aprobar la última, la cuenta pasa a ser fondeada. Si sobrepasas un límite de pérdida, la prueba se da por perdida."}
                </p>
              </div>

              {esPrueba && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="prueba-fases">Número de fases</Label>
                    <Select value={fases} onValueChange={setFases}>
                      <SelectTrigger id="prueba-fases" className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? "fase" : "fases"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: numeroFases }, (_, i) => (
                      <CampoPorcentaje
                        key={i}
                        id={`objetivo-${i + 1}`}
                        etiqueta={`Fase ${i + 1} · objetivo de ganancia`}
                        valor={objetivos[i]}
                        onChange={(v) =>
                          setObjetivos((prev) => prev.map((x, j) => (j === i ? v : x)))
                        }
                        placeholder={i === 0 ? "8" : "5"}
                        capital={hayCapital ? capitalNumero : null}
                        moneda={moneda}
                        sufijo="de ganancia"
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <CampoPorcentaje
                  id="prueba-diario"
                  etiqueta="Pérdida máxima diaria"
                  valor={pruebaDiario}
                  onChange={setPruebaDiario}
                  placeholder="5"
                  capital={hayCapital ? capitalNumero : null}
                  moneda={moneda}
                  sufijo="de pérdida"
                />
                <CampoPorcentaje
                  id="prueba-total"
                  etiqueta="Pérdida máxima total"
                  valor={pruebaTotal}
                  onChange={setPruebaTotal}
                  placeholder="10"
                  capital={hayCapital ? capitalNumero : null}
                  moneda={moneda}
                  sufijo="de pérdida"
                />
              </div>

              {!hayCapital && (
                <p className="text-xs text-amber-400">
                  Pon el capital inicial arriba: los objetivos y límites son un % de ese capital.
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <h3 className="text-sm font-semibold">
                {esPrueba || esFondeada ? "Tus límites de riesgo (opcional)" : "Límite de pérdida"}
              </h3>
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

/** Un % del capital con su equivalente en dinero. Lo usan los objetivos y límites de la prueba. */
function CampoPorcentaje({
  id,
  etiqueta,
  valor,
  onChange,
  placeholder,
  capital,
  moneda,
  sufijo,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  capital: number | null;
  moneda: string;
  sufijo: string;
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
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          %
        </span>
      </div>
      <p className="min-h-[1rem] text-[11px] text-muted-foreground">
        {equivalente ? `≈ ${equivalente} ${sufijo}` : "\u00a0"}
      </p>
    </div>
  );
}
