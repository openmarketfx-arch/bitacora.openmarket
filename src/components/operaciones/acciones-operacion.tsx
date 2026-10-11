"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { eliminarOperacion } from "@/app/(app)/operaciones/acciones";
import { DialogoCierre } from "@/components/operaciones/dialogo-cierre";
import { DialogoRevision } from "@/components/operaciones/dialogo-revision";
import { Button } from "@/components/ui/button";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import type { TradeCompleto } from "@/lib/types";

export function AccionesOperacion({ operacion }: { operacion: TradeCompleto }) {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function borrar() {
    iniciarTransicion(async () => {
      const r = await eliminarOperacion(operacion.id);
      if (!r.ok) {
        toast.error(r.mensaje ?? "No se pudo borrar.");
        return;
      }
      toast.success("Operación borrada.");
      router.push("/operaciones");
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {operacion.estado_operacion === "abierta" && (
          <Button size="sm" onClick={() => setCerrando(true)}>
            <Clock className="h-4 w-4" />
            Cerrar y finalizar
          </Button>
        )}

        {operacion.estado_operacion === "cerrada" && (
          <Button
            size="sm"
            variant={operacion.estado_revision === "pendiente" ? "default" : "outline"}
            onClick={() => setRevisando(true)}
          >
            {operacion.estado_revision === "pendiente" ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Clasificar
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Reclasificar
              </>
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          title="Borrar operación"
          aria-label="Borrar operación"
          onClick={() => setConfirmandoBorrado(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {cerrando && (
        <DialogoCierre operacion={operacion} onOpenChange={() => setCerrando(false)} />
      )}
      {revisando && (
        <DialogoRevision operacion={operacion} onOpenChange={() => setRevisando(false)} />
      )}

      <DialogoConfirmacion
        abierto={confirmandoBorrado}
        onOpenChange={setConfirmandoBorrado}
        titulo="Borrar operación"
        descripcion={`Se borrará la operación de ${operacion.instrument.simbolo} y su captura, si la tiene. No se puede deshacer.`}
        etiquetaConfirmar="Borrar"
        destructivo
        procesando={pendiente}
        onConfirmar={borrar}
      />
    </>
  );
}
