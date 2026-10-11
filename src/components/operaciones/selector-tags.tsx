"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { crearTagRapido } from "@/app/(app)/operaciones/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CategoriaTag, SubtipoSalida, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  /** Biblioteca completa; el selector filtra la parte que le toca. */
  tags: Tag[];
  categoria: CategoriaTag;
  /** Obligatorio cuando categoria === "salida". */
  subtipoSalida?: SubtipoSalida;
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  onTagCreado: (tag: Tag) => void;
  ejemplos?: string;
}

export function SelectorTags({
  tags,
  categoria,
  subtipoSalida,
  seleccionados,
  onChange,
  onTagCreado,
  ejemplos,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [creando, iniciarCreacion] = useTransition();

  // Cada selector solo ve —y solo crea— tags de su propia categoría.
  const disponibles = tags.filter(
    (t) =>
      t.categoria === categoria &&
      (categoria !== "salida" || t.subtipo_salida === subtipoSalida),
  );

  const elegidos = disponibles.filter((t) => seleccionados.includes(t.id));
  const normalizada = busqueda.trim();
  const yaExiste = disponibles.some(
    (t) => t.nombre.toLowerCase() === normalizada.toLowerCase(),
  );

  function alternar(id: string) {
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter((s) => s !== id)
        : [...seleccionados, id],
    );
  }

  function crear() {
    const nombre = normalizada;
    if (!nombre) return;

    iniciarCreacion(async () => {
      const r = await crearTagRapido(nombre, categoria, subtipoSalida ?? null);
      if (!r.ok || !r.tag) {
        toast.error(r.mensaje ?? "No se pudo crear el tag.");
        return;
      }
      onTagCreado(r.tag);
      onChange([...seleccionados, r.tag.id]);
      setBusqueda("");
      toast.success(`"${r.tag.nombre}" añadido a tu biblioteca.`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {elegidos.map((tag) => (
          <Badge key={tag.id} variant="primary" className="pr-1">
            {tag.nombre}
            <button
              type="button"
              onClick={() => alternar(tag.id)}
              aria-label={`Quitar ${tag.nombre}`}
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 border-dashed">
              <Plus className="h-3.5 w-3.5" />
              Añadir
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72 p-0" align="start">
            <Command shouldFilter>
              <CommandInput
                placeholder="Buscar o crear…"
                value={busqueda}
                onValueChange={setBusqueda}
              />
              <CommandList>
                <CommandEmpty>
                  <span className="text-xs">
                    {normalizada
                      ? "No hay ninguno así. Créalo abajo."
                      : "Nada en esta categoría todavía."}
                  </span>
                </CommandEmpty>

                {disponibles.length > 0 && (
                  <CommandGroup>
                    {disponibles.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.nombre}
                        onSelect={() => alternar(tag.id)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            seleccionados.includes(tag.id) ? "text-primary" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{tag.nombre}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>

            {normalizada && !yaExiste && (
              <div className="border-t border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  disabled={creando}
                  onClick={crear}
                >
                  {creando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Crear &ldquo;{normalizada}&rdquo;
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {elegidos.length === 0 && ejemplos && (
        <p className="text-xs text-muted-foreground/70">Ej: {ejemplos}</p>
      )}
    </div>
  );
}
