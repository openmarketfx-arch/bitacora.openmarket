"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clasificarOperacion } from "@/app/(app)/operaciones/acciones";
import { SelectorTipoCierre } from "@/components/operaciones/selector-tipo-cierre";
import { Button } from "@/components/ui/button";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useZona } from "@/components/layout/proveedor-zona";
import { formatFechaHora, formatPrecio } from "@/lib/format";
import {
  TIPO_CIERRE_MAP,
  TIPO_ORDEN_MAP,
  type TipoCierre,
  type TradeCompleto,
} from "@/lib/types";

interface Props {
  operacion: TradeCompleto | null;
  onOpenChange: (abierto: boolean) => void;
}

export function DialogoRevision({ operacion, onOpenChange }: Props) {
  const router = useRouter();
  const zona = useZona();

  const [tipoCierre, setTipoCierre] = useState<TipoCierre | null>(
    operacion?.tipo_cierre ?? null,
  );
  const [medicion, setMedicion] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!operacion) return null;

  const meta = tipoCierre ? TIPO_CIERRE_MAP[tipoCierre] : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!operacion) return;

    if (!tipoCierre) {
      toast.error("Elige cómo terminó la operación.");
      return;
    }

    setGuardando(true);
    const r = await clasificarOperacion(operacion.id, {
      tipo_cierre: tipoCierre,
      medicion: medicion === "" ? null : medicion,
    });
    setGuardando(false);

    if (!r.ok) {
      toast.error(r.mensaje ?? "No se pudo clasificar.");
      return;
    }

    toast.success(`Clasificada como "${TIPO_CIERRE_MAP[tipoCierre].etiqueta}".`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Revisar {operacion.instrument.simbolo} ·{" "}
            {TIPO_ORDEN_MAP[operacion.tipo_orden].etiqueta}
          </DialogTitle>
          <DialogDescription>
            ¿Por qué terminó así? Es la pregunta que convierte el resultado en algo accionable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background/40 p-4 text-sm sm:grid-cols-4">
          <Resumen etiqueta="Entrada" valor={formatFechaHora(operacion.fecha_hora_entrada, zona)} />
          <Resumen
            etiqueta="Precios"
            valor={`${formatPrecio(
              operacion.precio_entrada,
              operacion.instrument.decimales_precio,
            )} → ${formatPrecio(operacion.precio_salida, operacion.instrument.decimales_precio)}`}
          />
          <Resumen etiqueta="Salida" valor={formatFechaHora(operacion.fecha_hora_salida, zona)} />
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Resultado
            </div>
            <CifraResultado
              monto={operacion.resultado_dinero}
              moneda={operacion.account.moneda_base}
            />
          </div>
        </div>

        {operacion.tags.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Confirmaciones: {operacion.tags.map((t) => t.nombre).join(", ")}
          </p>
        )}

        <form onSubmit={enviar} className="space-y-5">
          <SelectorTipoCierre
            instrumento={operacion.instrument}
            valor={tipoCierre}
            onChange={setTipoCierre}
            medicion={medicion}
            onMedicionChange={setMedicion}
            opcional={false}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || !tipoCierre}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {meta ? `Marcar como ${meta.etiqueta.toLowerCase()}` : "Guardar clasificación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</div>
      <div className="tabular font-mono text-xs">{valor}</div>
    </div>
  );
}
