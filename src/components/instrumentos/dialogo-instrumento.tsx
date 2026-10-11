"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarInstrumento,
  crearInstrumento,
} from "@/app/(app)/configuracion/acciones-instrumentos";
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
import { ASSET_CLASS_LABEL, type AssetClass, type Instrument } from "@/lib/types";

/** Valores por defecto razonables al cambiar de clase de activo. */
const DEFECTOS: Record<AssetClass, { decimales: number; pip: string }> = {
  forex: { decimales: 5, pip: "0.0001" },
  crypto: { decimales: 2, pip: "1" },
  index: { decimales: 2, pip: "1" },
  stock: { decimales: 2, pip: "1" },
};

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  instrumento?: Instrument | null;
}

export function DialogoInstrumento({ abierto, onOpenChange, instrumento }: Props) {
  const editando = Boolean(instrumento);

  const [simbolo, setSimbolo] = useState(instrumento?.simbolo ?? "");
  const [nombre, setNombre] = useState(instrumento?.nombre ?? "");
  const [assetClass, setAssetClass] = useState<AssetClass>(instrumento?.asset_class ?? "forex");
  const [decimales, setDecimales] = useState(String(instrumento?.decimales_precio ?? 5));
  const [pip, setPip] = useState(
    instrumento?.valor_pip !== null && instrumento?.valor_pip !== undefined
      ? String(instrumento.valor_pip)
      : "0.0001",
  );
  const [referencia, setReferencia] = useState(
    instrumento?.precio_referencia !== null && instrumento?.precio_referencia !== undefined
      ? String(instrumento.precio_referencia)
      : "",
  );
  const [guardando, setGuardando] = useState(false);

  const unidad = assetClass === "forex" ? "pips" : "puntos";
  const base = referencia !== "" ? Number(referencia) : Number(10 ** Number(decimales || 0));
  const salto = Number(pip || 0) * 10;
  const dec = Number(decimales || 0);
  const ejemploDesde = Number.isFinite(base) ? base.toFixed(dec) : "—";
  const ejemploHasta = Number.isFinite(base + salto) ? (base + salto).toFixed(dec) : "—";

  function cambiarClase(valor: string) {
    const clase = valor as AssetClass;
    setAssetClass(clase);
    setDecimales(String(DEFECTOS[clase].decimales));
    setPip(DEFECTOS[clase].pip);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const datos = {
      simbolo,
      nombre,
      asset_class: assetClass,
      decimales_precio: decimales,
      valor_pip: pip,
      precio_referencia: referencia === "" ? null : referencia,
    };

    const resultado = instrumento
      ? await actualizarInstrumento(instrumento.id, datos)
      : await crearInstrumento(datos);

    setGuardando(false);

    if (!resultado.ok) {
      toast.error(resultado.mensaje ?? "No se pudo guardar.");
      return;
    }

    toast.success(editando ? "Instrumento actualizado." : "Instrumento creado.");
    onOpenChange(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar instrumento" : "Nuevo instrumento"}</DialogTitle>
          <DialogDescription>
            Para lo que no esté en el catálogo: un par exótico, un token, el índice de tu bróker.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-[1fr_1.4fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="simbolo">Símbolo</Label>
              <Input
                id="simbolo"
                required
                maxLength={24}
                placeholder="EURTRY"
                className="font-mono uppercase"
                value={simbolo}
                onChange={(e) => setSimbolo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre-inst">Nombre</Label>
              <Input
                id="nombre-inst"
                required
                maxLength={120}
                placeholder="Euro / Lira turca"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clase">Clase de activo</Label>
            <Select value={assetClass} onValueChange={cambiarClase}>
              <SelectTrigger id="clase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {ASSET_CLASS_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimales">Decimales de precio</Label>
              <Input
                id="decimales"
                type="number"
                min={0}
                max={10}
                required
                className="font-mono"
                value={decimales}
                onChange={(e) => setDecimales(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pip">Tamaño del {unidad.replace(/s$/, "")}</Label>
              <Input
                id="pip"
                type="number"
                step="any"
                min="0"
                required
                className="font-mono"
                placeholder={assetClass === "forex" ? "0.0001" : "1"}
                value={pip}
                onChange={(e) => setPip(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia">
              Precio de referencia <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="referencia"
              type="number"
              step="any"
              min="0"
              className="font-mono"
              placeholder="4133.40"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>

          {/* El ejemplo con números concretos es lo que deja ver de un vistazo
              si la convención coincide con la del bróker, que es la que manda. */}
          <p className="rounded-md border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Con estos valores, un movimiento de{" "}
            <span className="font-mono text-foreground">{ejemploDesde}</span> a{" "}
            <span className="font-mono text-foreground">{ejemploHasta}</span> son{" "}
            <span className="text-foreground">10 {unidad}</span>. Si tu bróker lo cuenta
            distinto, ajusta el tamaño del {unidad.replace(/s$/, "")} aquí.
            <br />
            El precio de referencia solo orienta: fija los decimales y el orden de magnitud en
            los formularios. No es una cotización en vivo.
          </p>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? "Guardar cambios" : "Crear instrumento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
