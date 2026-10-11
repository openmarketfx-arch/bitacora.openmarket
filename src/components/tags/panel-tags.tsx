"use client";

import { useState, useTransition } from "react";
import { Crosshair, Layers, Loader2, Merge, Pencil, Plus, Shield, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarTag,
  crearTag,
  eliminarTag,
  fusionarTags,
} from "@/app/(app)/configuracion/acciones-tags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { plural } from "@/lib/format";
import {
  CATEGORIAS_TAG,
  CATEGORIA_TAG_MAP,
  SUBTIPO_SALIDA_LABEL,
  type CategoriaTag,
  type SubtipoSalida,
  type Tag,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TagConUso extends Tag {
  usos: number;
}

/** Los cuatro grupos que ve el usuario: salida se parte en TP y stop. */
interface Grupo {
  clave: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  categoria: CategoriaTag;
  subtipo: SubtipoSalida | null;
}

const GRUPOS: Grupo[] = [
  {
    clave: "estructura",
    titulo: CATEGORIA_TAG_MAP.estructura.etiqueta,
    descripcion: CATEGORIA_TAG_MAP.estructura.descripcion,
    icono: <Layers className="h-3.5 w-3.5" />,
    categoria: "estructura",
    subtipo: null,
  },
  {
    clave: "entrada",
    titulo: CATEGORIA_TAG_MAP.entrada.etiqueta,
    descripcion: CATEGORIA_TAG_MAP.entrada.descripcion,
    icono: <Crosshair className="h-3.5 w-3.5" />,
    categoria: "entrada",
    subtipo: null,
  },
  {
    clave: "salida-tp",
    titulo: SUBTIPO_SALIDA_LABEL.tp,
    descripcion: "Dónde pones el objetivo y por qué ahí.",
    icono: <Target className="h-3.5 w-3.5" />,
    categoria: "salida",
    subtipo: "tp",
  },
  {
    clave: "salida-stop",
    titulo: SUBTIPO_SALIDA_LABEL.stop,
    descripcion: "Dónde pones el stop y por qué ahí.",
    icono: <Shield className="h-3.5 w-3.5" />,
    categoria: "salida",
    subtipo: "stop",
  },
];

export function PanelTags({ tags }: { tags: TagConUso[] }) {
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [enEdicion, setEnEdicion] = useState<TagConUso | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [categoriaEditada, setCategoriaEditada] = useState<CategoriaTag>("entrada");
  const [subtipoEditado, setSubtipoEditado] = useState<SubtipoSalida>("tp");
  const [aFusionar, setAFusionar] = useState<TagConUso | null>(null);
  const [destinoFusion, setDestinoFusion] = useState<string>("");
  const [porBorrar, setPorBorrar] = useState<TagConUso | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function deGrupo(g: Grupo) {
    return tags.filter(
      (t) => t.categoria === g.categoria && (g.subtipo === null || t.subtipo_salida === g.subtipo),
    );
  }

  function agregar(g: Grupo) {
    const nombre = (nuevo[g.clave] ?? "").trim();
    if (!nombre) return;

    iniciarTransicion(async () => {
      const r = await crearTag({ nombre, categoria: g.categoria, subtipo_salida: g.subtipo });
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo crear.");
      else {
        toast.success(`"${nombre}" añadido a ${g.titulo.toLowerCase()}.`);
        setNuevo((prev) => ({ ...prev, [g.clave]: "" }));
      }
    });
  }

  function abrirEdicion(tag: TagConUso) {
    setEnEdicion(tag);
    setNombreEditado(tag.nombre);
    setCategoriaEditada(tag.categoria);
    setSubtipoEditado(tag.subtipo_salida ?? "tp");
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    const tag = enEdicion;
    if (!tag) return;

    iniciarTransicion(async () => {
      const r = await actualizarTag(tag.id, {
        nombre: nombreEditado.trim(),
        categoria: categoriaEditada,
        subtipo_salida: categoriaEditada === "salida" ? subtipoEditado : null,
      });
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo guardar.");
      else {
        toast.success("Tag actualizado.");
        setEnEdicion(null);
      }
    });
  }

  function confirmarFusion() {
    const origen = aFusionar;
    if (!origen || !destinoFusion) return;

    iniciarTransicion(async () => {
      const r = await fusionarTags(origen.id, destinoFusion);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo fusionar.");
      else {
        const destino = tags.find((t) => t.id === destinoFusion);
        toast.success(`"${origen.nombre}" se fusionó en "${destino?.nombre ?? "el otro tag"}".`);
        setAFusionar(null);
      }
    });
  }

  function confirmarBorrado() {
    const tag = porBorrar;
    if (!tag) return;

    iniciarTransicion(async () => {
      const r = await eliminarTag(tag.id);
      if (!r.ok) toast.error(r.mensaje ?? "No se pudo borrar.");
      else toast.success("Tag borrado.");
      setPorBorrar(null);
    });
  }

  // Fusionar solo tiene sentido entre tags que significan lo mismo, y eso
  // implica la misma categoría: mezclar una estructura con una entrada
  // destruiría justamente la separación que da sentido a la analítica.
  const candidatosFusion = aFusionar
    ? tags.filter(
        (t) =>
          t.id !== aFusionar.id &&
          t.categoria === aFusionar.categoria &&
          t.subtipo_salida === aFusionar.subtipo_salida,
      )
    : [];

  return (
    <>
      <div className="pb-5">
        <h2 className="text-sm font-semibold">Biblioteca de confirmaciones</h2>
        <p className="text-xs text-muted-foreground">
          Separadas por lo que responden. La analítica cruza las tres: así se distingue si
          pierdes por leer mal la estructura, por entrar mal o por dónde pones las salidas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {GRUPOS.map((g) => {
          const delGrupo = deGrupo(g);

          return (
            <div key={g.clave} className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="text-muted-foreground">{g.icono}</span>
                  {g.titulo}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({delGrupo.length})
                  </span>
                </h3>
                <p className="pt-0.5 text-xs text-muted-foreground">{g.descripcion}</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  agregar(g);
                }}
                className="flex gap-2"
              >
                <Input
                  value={nuevo[g.clave] ?? ""}
                  onChange={(e) => setNuevo((prev) => ({ ...prev, [g.clave]: e.target.value }))}
                  maxLength={60}
                  placeholder="Añadir…"
                  aria-label={`Nueva confirmación de ${g.titulo}`}
                  className="h-9"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9"
                  disabled={pendiente || !(nuevo[g.clave] ?? "").trim()}
                >
                  {pendiente ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {delGrupo.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground/60">
                  Todavía vacío.
                </p>
              ) : (
                <ul className="space-y-1">
                  {delGrupo.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                    >
                      <span className="flex-1 truncate text-sm">{tag.nombre}</span>
                      <span className="tabular font-mono text-[11px] text-muted-foreground">
                        {tag.usos}
                      </span>
                      <Acciones
                        onEditar={() => abrirEdicion(tag)}
                        onFusionar={() => {
                          setAFusionar(tag);
                          setDestinoFusion("");
                        }}
                        onBorrar={() => setPorBorrar(tag)}
                        nombre={tag.nombre}
                        puedeFusionar={
                          tags.filter(
                            (t) =>
                              t.categoria === tag.categoria &&
                              t.subtipo_salida === tag.subtipo_salida,
                          ).length > 1
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Editar: nombre y categoría */}
      <Dialog open={enEdicion !== null} onOpenChange={(a) => !a && setEnEdicion(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar confirmación</DialogTitle>
            <DialogDescription>
              Las {enEdicion?.usos ?? 0} operaciones que la usan conservan el vínculo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarEdicion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-tag">Nombre</Label>
              <Input
                id="nombre-tag"
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria-tag">Categoría</Label>
              <Select
                value={categoriaEditada}
                onValueChange={(v) => setCategoriaEditada(v as CategoriaTag)}
              >
                <SelectTrigger id="categoria-tag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_TAG.map((c) => (
                    <SelectItem key={c.valor} value={c.valor}>
                      {c.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoriaEditada === "salida" && (
              <div className="space-y-2">
                <Label htmlFor="subtipo-tag">¿Qué zona define?</Label>
                <Select
                  value={subtipoEditado}
                  onValueChange={(v) => setSubtipoEditado(v as SubtipoSalida)}
                >
                  <SelectTrigger id="subtipo-tag">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tp">{SUBTIPO_SALIDA_LABEL.tp}</SelectItem>
                    <SelectItem value="stop">{SUBTIPO_SALIDA_LABEL.stop}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEnEdicion(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendiente || !nombreEditado.trim()}>
                {pendiente && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fusionar */}
      <Dialog open={aFusionar !== null} onOpenChange={(a) => !a && setAFusionar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fusionar confirmación</DialogTitle>
            <DialogDescription>
              Las operaciones de{" "}
              <span className="text-foreground">&ldquo;{aFusionar?.nombre}&rdquo;</span> pasan a
              la que elijas, y esta desaparece. Solo se puede fusionar dentro de la misma
              categoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="destino-fusion">Fusionar dentro de</Label>
            <Select value={destinoFusion} onValueChange={setDestinoFusion}>
              <SelectTrigger id="destino-fusion">
                <SelectValue placeholder="Elige la que se queda" />
              </SelectTrigger>
              <SelectContent>
                {candidatosFusion.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinoFusion && (
              <p className="pt-1 text-xs text-muted-foreground">
                {plural(aFusionar?.usos ?? 0, "operación", "operaciones")} se{" "}
                {(aFusionar?.usos ?? 0) === 1 ? "reasignará" : "reasignarán"}. No se pierde
                ninguna.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAFusionar(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarFusion} disabled={pendiente || !destinoFusion}>
              {pendiente && <Loader2 className="h-4 w-4 animate-spin" />}
              Fusionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogoConfirmacion
        abierto={porBorrar !== null}
        onOpenChange={(a) => !a && setPorBorrar(null)}
        titulo="Borrar confirmación"
        descripcion={
          (porBorrar?.usos ?? 0) > 0
            ? `"${porBorrar?.nombre}" se quitará de ${plural(porBorrar?.usos ?? 0, "operación", "operaciones")}. Las operaciones se conservan, pero pierden esta confirmación y saldrán de la analítica por tag.`
            : `"${porBorrar?.nombre ?? ""}" se borrará. No la usa ninguna operación.`
        }
        etiquetaConfirmar="Borrar"
        destructivo
        procesando={pendiente}
        onConfirmar={confirmarBorrado}
      />
    </>
  );
}

function Acciones({
  nombre,
  puedeFusionar,
  onEditar,
  onFusionar,
  onBorrar,
}: {
  nombre: string;
  puedeFusionar: boolean;
  onEditar: () => void;
  onFusionar: () => void;
  onBorrar: () => void;
}) {
  const clase = "flex h-6 w-6 items-center justify-center rounded transition-colors";

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title="Editar"
        aria-label={`Editar ${nombre}`}
        onClick={onEditar}
        className={cn(clase, "text-muted-foreground hover:bg-accent hover:text-foreground")}
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        type="button"
        title="Fusionar"
        aria-label={`Fusionar ${nombre}`}
        disabled={!puedeFusionar}
        onClick={onFusionar}
        className={cn(
          clase,
          "text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30",
        )}
      >
        <Merge className="h-3 w-3" />
      </button>
      <button
        type="button"
        title="Borrar"
        aria-label={`Borrar ${nombre}`}
        onClick={onBorrar}
        className={cn(clase, "text-muted-foreground hover:bg-accent hover:text-foreground")}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
