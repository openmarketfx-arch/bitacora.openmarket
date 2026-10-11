"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Star } from "lucide-react";
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
import { ASSET_CLASS_LABEL, type AssetClass, type Instrument } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface InstrumentoOpcion extends Instrument {
  seguido: boolean;
}

interface Props {
  instrumentos: InstrumentoOpcion[];
  valor: string | null;
  onChange: (id: string) => void;
  id?: string;
}

const ORDEN_CLASES: AssetClass[] = ["forex", "crypto", "index", "stock"];

export function SelectorInstrumento({ instrumentos, valor, onChange, id }: Props) {
  const [abierto, setAbierto] = useState(false);

  const seleccionado = instrumentos.find((i) => i.id === valor) ?? null;

  // Los seguidos van en su propio grupo arriba; el resto se agrupa por clase.
  const { seguidos, porClase } = useMemo(() => {
    const seguidos = instrumentos.filter((i) => i.seguido);
    const porClase = new Map<AssetClass, InstrumentoOpcion[]>();
    for (const clase of ORDEN_CLASES) {
      const lista = instrumentos.filter((i) => !i.seguido && i.asset_class === clase);
      if (lista.length) porClase.set(clase, lista);
    }
    return { seguidos, porClase };
  }, [instrumentos]);

  function elegir(idInstrumento: string) {
    onChange(idInstrumento);
    setAbierto(false);
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className="h-10 w-full justify-between font-normal"
        >
          {seleccionado ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs font-medium">{seleccionado.simbolo}</span>
              <span className="truncate text-muted-foreground">{seleccionado.nombre}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Elige un instrumento…</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            // value trae "SIMBOLO nombre" para que se pueda buscar por ambos.
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por símbolo o nombre…" />
          <CommandList>
            <CommandEmpty>Ningún instrumento coincide.</CommandEmpty>

            {seguidos.length > 0 && (
              <CommandGroup heading="Los que sigues">
                {seguidos.map((inst) => (
                  <Fila
                    key={inst.id}
                    instrumento={inst}
                    seleccionado={inst.id === valor}
                    onSelect={elegir}
                  />
                ))}
              </CommandGroup>
            )}

            {Array.from(porClase.entries()).map(([clase, lista]) => (
              <CommandGroup key={clase} heading={ASSET_CLASS_LABEL[clase]}>
                {lista.map((inst) => (
                  <Fila
                    key={inst.id}
                    instrumento={inst}
                    seleccionado={inst.id === valor}
                    onSelect={elegir}
                  />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Fila({
  instrumento,
  seleccionado,
  onSelect,
}: {
  instrumento: InstrumentoOpcion;
  seleccionado: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <CommandItem
      value={`${instrumento.simbolo} ${instrumento.nombre}`}
      onSelect={() => onSelect(instrumento.id)}
    >
      <Check
        className={cn("h-4 w-4 shrink-0", seleccionado ? "text-primary" : "opacity-0")}
      />
      <span className="w-[72px] shrink-0 font-mono text-xs font-medium">
        {instrumento.simbolo}
      </span>
      <span className="truncate text-muted-foreground">{instrumento.nombre}</span>
      {instrumento.seguido && (
        <Star className="ml-auto h-3 w-3 shrink-0 fill-primary text-primary" />
      )}
    </CommandItem>
  );
}
