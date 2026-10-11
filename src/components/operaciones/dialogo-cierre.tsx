"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cerrarOperacion } from "@/app/(app)/operaciones/acciones";
import { PreguntaActivacion } from "@/components/operaciones/pregunta-activacion";
import { ResumenPips } from "@/components/operaciones/resumen-pips";
import { SelectorTipoCierre } from "@/components/operaciones/selector-tipo-cierre";
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
import { useZona } from "@/components/layout/proveedor-zona";
import { CamposCostos } from "@/components/operaciones/campos-costos";
import { formatFechaHora, formatPrecio } from "@/lib/format";
import { deInputDateTime, paraInputDateTime } from "@/lib/zona";
import { esOrdenPendiente, TIPO_ORDEN_MAP, type TipoCierre, type TradeCompleto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  operacion: TradeCompleto | null;
  onOpenChange: (abierto: boolean) => void;
}

export function DialogoCierre({ operacion, onOpenChange }: Props) {
  const router = useRouter();
  const zona = useZona();

  const [fechaSalida, setFechaSalida] = useState(() => paraInputDateTime(zona));
  const [precioSalida, setPrecioSalida] = useState("");
  const [resultado, setResultado] = useState("");
  const [comision, setComision] = useState("");
  const [swap, setSwap] = useState("");
  const [tipoCierre, setTipoCierre] = useState<TipoCierre | null>(null);
  const [medicion, setMedicion] = useState("");
  const [seActivo, setSeActivo] = useState(true);
  const [distanciaNoActivada, setDistanciaNoActivada] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!operacion) return null;

  const pendiente = esOrdenPendiente(operacion.tipo_orden);
  const sinActivar = pendiente && !seActivo;

  const pasoPrecio = 1 / 10 ** operacion.instrument.decimales_precio;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!operacion) return;

    const noActivada = esOrdenPendiente(operacion.tipo_orden) && !seActivo;

    setGuardando(true);
    const r = await cerrarOperacion(operacion.id, {
      activada: esOrdenPendiente(operacion.tipo_orden) ? seActivo : null,
      fecha_hora_salida: noActivada ? "" : deInputDateTime(fechaSalida, zona),
      precio_salida: noActivada ? null : precioSalida,
      resultado_dinero: noActivada ? null : resultado,
      comision: noActivada ? "" : comision,
      swap: noActivada ? "" : swap,
      tipo_cierre: noActivada ? null : tipoCierre,
      medicion: noActivada || medicion === "" ? null : medicion,
      distancia: noActivada && distanciaNoActivada !== "" ? distanciaNoActivada : null,
    });
    setGuardando(false);

    if (!r.ok) {
      toast.error(r.mensaje ?? "No se pudo concluir.");
      return;
    }

    toast.success(
      noActivada
        ? "Registrada como no activada: el precio nunca llegó a tu orden."
        : tipoCierre
          ? "Operación cerrada y clasificada."
          : "Operación cerrada. Queda pendiente de revisión.",
    );
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {sinActivar ? "Concluir" : "Cerrar"} {operacion.instrument.simbolo} ·{" "}
            {TIPO_ORDEN_MAP[operacion.tipo_orden].etiqueta}
          </DialogTitle>
          <DialogDescription>
            {pendiente ? "Orden puesta" : "Abierta"} el{" "}
            {formatFechaHora(operacion.fecha_hora_entrada, zona)} en{" "}
            {formatPrecio(operacion.precio_entrada, operacion.instrument.decimales_precio)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-6">
          <PreguntaActivacion
            tipoOrden={operacion.tipo_orden}
            activada={seActivo}
            onChange={setSeActivo}
            assetClass={operacion.instrument.asset_class}
            distancia={distanciaNoActivada}
            onDistanciaChange={setDistanciaNoActivada}
          />

          {!sinActivar && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cierre-fecha">Fecha y hora de salida</Label>
              <Input
                id="cierre-fecha"
                type="datetime-local"
                required={!sinActivar}
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cierre-precio">Precio de salida</Label>
              <Input
                id="cierre-precio"
                type="number"
                step={pasoPrecio}
                min="0"
                required={!sinActivar}
                inputMode="decimal"
                className="font-mono"
                value={precioSalida}
                onChange={(e) => setPrecioSalida(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cierre-resultado">
                Resultado ({operacion.account.moneda_base})
              </Label>
              <Input
                id="cierre-resultado"
                type="number"
                step="0.01"
                required={!sinActivar}
                inputMode="decimal"
                className={cn(
                  "font-mono",
                  Number(resultado) > 0 && "text-positive",
                  Number(resultado) < 0 && "text-negative-foreground",
                )}
                placeholder="-45.20"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
              />
            </div>
          </div>
          )}

          {!sinActivar && (
            <CamposCostos
              id="cierre"
              comision={comision}
              swap={swap}
              onComisionChange={setComision}
              onSwapChange={setSwap}
              resultado={resultado}
              moneda={operacion.account.moneda_base}
            />
          )}

          {!sinActivar && (
            <ResumenPips
              instrumento={operacion.instrument}
              direccion={operacion.direccion}
              entrada={String(operacion.precio_entrada)}
              tp={operacion.precio_tp === null ? "" : String(operacion.precio_tp)}
              stop={operacion.precio_stop === null ? "" : String(operacion.precio_stop)}
              salida={precioSalida}
            />
          )}

          {!sinActivar && (
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <Label>
                Tipo de cierre <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <p className="pt-1 text-xs text-muted-foreground">
                Si aún no has revisado el gráfico, déjalo sin marcar: pasa a la cola de revisión.
              </p>
            </div>
            <SelectorTipoCierre
              instrumento={operacion.instrument}
              valor={tipoCierre}
              onChange={setTipoCierre}
              medicion={medicion}
              onMedicionChange={setMedicion}
            />
          </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {sinActivar ? "Registrar como no activada" : "Cerrar y finalizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
