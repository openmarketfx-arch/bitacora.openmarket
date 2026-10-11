"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar?: string;
  destructivo?: boolean;
  procesando?: boolean;
  onConfirmar: () => void;
}

export function DialogoConfirmacion({
  abierto,
  onOpenChange,
  titulo,
  descripcion,
  etiquetaConfirmar = "Confirmar",
  destructivo = false,
  procesando = false,
  onConfirmar,
}: Props) {
  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            variant={destructivo ? "destructive" : "default"}
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            {etiquetaConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
