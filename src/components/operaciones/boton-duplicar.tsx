"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { duplicarOperacion } from "@/app/(app)/operaciones/acciones-duplicar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ETIQUETA_TIPO_CUENTA, type AccountType, type TradeCompleto } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CuentaDestino {
  id: string;
  nombre: string;
  tipo: AccountType;
  moneda_base: string;
  activo: boolean;
}

type Modo = "completa" | "entrada";

interface Props {
  operacion: TradeCompleto;
  /** Todas las cuentas del usuario; aquí se descartan las desactivadas. */
  cuentas: CuentaDestino[];
  /** Con texto, el botón es normal; sin él, solo el icono. */
  conTexto?: boolean;
}

/** El icono de duplicar y el diálogo para elegir en qué cuentas se copia. */
export function BotonDuplicar({ operacion, cuentas, conTexto = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  const otras = cuentas.filter((c) => c.activo);

  if (otras.length === 0) return null;

  return (
    <>
      <Button
        variant={conTexto ? "outline" : "ghost"}
        size={conTexto ? "sm" : "icon"}
        title="Duplicar"
        aria-label={`Duplicar ${operacion.instrument.simbolo}`}
        onClick={() => setAbierto(true)}
      >
        <Copy className="h-3.5 w-3.5" />
        {conTexto && "Duplicar"}
      </Button>

      {abierto && (
        <DialogoDuplicar operacion={operacion} cuentas={otras} onCerrar={() => setAbierto(false)} />
      )}
    </>
  );
}

function DialogoDuplicar({
  operacion,
  cuentas,
  onCerrar,
}: {
  operacion: TradeCompleto;
  cuentas: CuentaDestino[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<Modo>("completa");
  const [pendiente, iniciarTransicion] = useTransition();

  const tieneCierre = operacion.estado_operacion !== "abierta";
  const todas = elegidas.size === cuentas.length;

  function alternar(id: string) {
    setElegidas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  }

  function duplicar() {
    iniciarTransicion(async () => {
      const r = await duplicarOperacion(operacion.id, {
        cuentas: Array.from(elegidas),
        modo,
      });
      if (!r.ok) {
        toast.error(r.mensaje ?? "No se pudo duplicar la operación.");
        return;
      }
      toast.success(
        r.copias === 1 ? "Operación duplicada en 1 cuenta." : `Operación duplicada en ${r.copias} cuentas.`,
      );
      onCerrar();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !pendiente && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar operación</DialogTitle>
          <DialogDescription>
            {operacion.instrument.simbolo} de {operacion.account.nombre}. Elige en qué cuentas
            quieres crear una copia, también puede ser la misma; cada una será una operación
            independiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cuentas
              </span>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setElegidas(todas ? new Set() : new Set(cuentas.map((c) => c.id)))}
              >
                {todas ? "Quitar todas" : "Elegir todas"}
              </button>
            </div>

            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {cuentas.map((c) => (
                <li key={c.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-sm hover:bg-accent/50",
                      elegidas.has(c.id) && "bg-accent/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={elegidas.has(c.id)}
                      onChange={() => alternar(c.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {c.nombre}
                      {c.id === operacion.account.id && (
                        <span className="text-muted-foreground"> (cuenta actual)</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.moneda_base} · {ETIQUETA_TIPO_CUENTA[c.tipo]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {tieneCierre && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Qué se copia
              </legend>
              <OpcionModo
                activa={modo === "completa"}
                onElegir={() => setModo("completa")}
                titulo="Todo, con su resultado"
                texto="Copia también la salida y el resultado en dinero tal cual. Ajústalo después si la cuenta es de otro tamaño."
              />
              <OpcionModo
                activa={modo === "entrada"}
                onElegir={() => setModo("entrada")}
                titulo="Solo la entrada"
                texto="Queda abierta en cada cuenta para que la cierres con su propio resultado."
              />
            </fieldset>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button onClick={duplicar} disabled={pendiente || elegidas.size === 0}>
            {pendiente && <Loader2 className="h-4 w-4 animate-spin" />}
            {elegidas.size > 1 ? `Duplicar en ${elegidas.size} cuentas` : "Duplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpcionModo({
  activa,
  onElegir,
  titulo,
  texto,
}: {
  activa: boolean;
  onElegir: () => void;
  titulo: string;
  texto: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2",
        activa ? "border-primary/50 bg-primary/5" : "border-border hover:bg-accent/40",
      )}
    >
      <input
        type="radio"
        name="modo-duplicado"
        className="mt-1 accent-primary"
        checked={activa}
        onChange={onElegir}
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{texto}</span>
      </span>
    </label>
  );
}
