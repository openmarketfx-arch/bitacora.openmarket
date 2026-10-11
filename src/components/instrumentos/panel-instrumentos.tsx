"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  alternarSeguimiento,
  eliminarInstrumento,
} from "@/app/(app)/configuracion/acciones-instrumentos";
import { DialogoInstrumento } from "@/components/instrumentos/dialogo-instrumento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { plural } from "@/lib/format";
import { ASSET_CLASS_LABEL, type AssetClass, type Instrument } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface InstrumentoConEstado extends Instrument {
  seguido: boolean;
  operaciones: number;
}

type FiltroClase = AssetClass | "todas";

export function PanelInstrumentos({ instrumentos }: { instrumentos: InstrumentoConEstado[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [clase, setClase] = useState<FiltroClase>("todas");
  const [soloSeguidos, setSoloSeguidos] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Instrument | null>(null);
  const [porBorrar, setPorBorrar] = useState<InstrumentoConEstado | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const seguidos = instrumentos.filter((i) => i.seguido).length;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return instrumentos.filter((i) => {
      if (clase !== "todas" && i.asset_class !== clase) return false;
      if (soloSeguidos && !i.seguido) return false;
      if (!q) return true;
      return i.simbolo.toLowerCase().includes(q) || i.nombre.toLowerCase().includes(q);
    });
  }, [instrumentos, busqueda, clase, soloSeguidos]);

  function alternar(inst: InstrumentoConEstado) {
    iniciarTransicion(async () => {
      const r = await alternarSeguimiento(inst.id, !inst.seguido);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo actualizar el seguimiento.");
    });
  }

  function pedirBorrado(inst: InstrumentoConEstado) {
    if (inst.operaciones > 0) {
      toast.error(
        `${inst.simbolo} tiene ${plural(inst.operaciones, "operación registrada", "operaciones registradas")}. Borrarlo se llevaría ese historial.`,
      );
      return;
    }
    setPorBorrar(inst);
  }

  function confirmarBorrado() {
    const inst = porBorrar;
    if (!inst) return;

    iniciarTransicion(async () => {
      const r = await eliminarInstrumento(inst.id);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo borrar.");
      else toast.success("Instrumento borrado.");
      setPorBorrar(null);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="text-sm font-semibold">Instrumentos</h2>
          <p className="text-xs text-muted-foreground">
            Marca con estrella los que operas: aparecerán primero al registrar una operación.
            {seguidos > 0 && ` Llevas ${seguidos} seguido${seguidos === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEnEdicion(null);
            setDialogoAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo instrumento
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pb-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por símbolo o nombre…"
            aria-label="Buscar instrumento"
            className="pl-9"
          />
        </div>

        <Select value={clase} onValueChange={(v) => setClase(v as FiltroClase)}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrar por clase de activo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las clases</SelectItem>
            {(Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).map((c) => (
              <SelectItem key={c} value={c}>
                {ASSET_CLASS_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={soloSeguidos ? "default" : "outline"}
          onClick={() => setSoloSeguidos((v) => !v)}
          aria-pressed={soloSeguidos}
        >
          <Star className={cn("h-4 w-4", soloSeguidos && "fill-current")} />
          Solo seguidos
        </Button>
      </div>

      <div className="max-h-[480px] overflow-y-auto scrollbar-thin rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-[1%]" />
              <TableHead>Símbolo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Clase</TableHead>
              <TableHead className="text-right">Decimales</TableHead>
              <TableHead className="text-right">Pip / punto</TableHead>
              <TableHead className="text-right">Referencia</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Ningún instrumento coincide con el filtro.
                </TableCell>
              </TableRow>
            ) : (
              visibles.map((inst) => {
                const propio = inst.user_id !== null;
                return (
                  <TableRow key={inst.id}>
                    <TableCell className="pr-0">
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => alternar(inst)}
                        title={inst.seguido ? "Dejar de seguir" : "Seguir"}
                        aria-label={`${inst.seguido ? "Dejar de seguir" : "Seguir"} ${inst.simbolo}`}
                        aria-pressed={inst.seguido}
                        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            inst.seguido
                              ? "fill-primary text-primary"
                              : "text-muted-foreground/50",
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">{inst.simbolo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {inst.nombre}
                      {propio && (
                        <Badge variant="outline" className="ml-2 align-middle">
                          Propio
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ASSET_CLASS_LABEL[inst.asset_class]}
                    </TableCell>
                    <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                      {inst.decimales_precio}
                    </TableCell>
                    <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                      {inst.valor_pip}
                    </TableCell>
                    <TableCell className="tabular text-right font-mono text-xs text-muted-foreground">
                      {inst.precio_referencia === null
                        ? "—"
                        : Number(inst.precio_referencia).toFixed(inst.decimales_precio)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        {propio ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              aria-label={`Editar ${inst.simbolo}`}
                              onClick={() => {
                                setEnEdicion(inst);
                                setDialogoAbierto(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Borrar"
                              aria-label={`Borrar ${inst.simbolo}`}
                              onClick={() => pedirBorrado(inst)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="pr-2 text-[11px] text-muted-foreground/60">
                            Catálogo
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="pt-3 text-xs text-muted-foreground">
        Mostrando {visibles.length} de {instrumentos.length}.
      </p>

      {dialogoAbierto && (
        <DialogoInstrumento
          key={enEdicion?.id ?? "nuevo"}
          abierto={dialogoAbierto}
          onOpenChange={setDialogoAbierto}
          instrumento={enEdicion}
        />
      )}

      <DialogoConfirmacion
        abierto={porBorrar !== null}
        onOpenChange={(a) => !a && setPorBorrar(null)}
        titulo="Borrar instrumento"
        descripcion={`${porBorrar?.simbolo ?? ""} se borrará de tu catálogo. No lo usa ninguna operación.`}
        etiquetaConfirmar="Borrar"
        destructivo
        procesando={pendiente}
        onConfirmar={confirmarBorrado}
      />
    </>
  );
}
