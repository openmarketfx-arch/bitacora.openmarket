"use client";

import { Crosshair, Layers, Shield, Target } from "lucide-react";
import { SelectorTags } from "@/components/operaciones/selector-tags";
import { Label } from "@/components/ui/label";
import { CATEGORIA_TAG_MAP, type Tag } from "@/lib/types";

interface Props {
  tags: Tag[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  onTagCreado: (tag: Tag) => void;
}

/**
 * Las confirmaciones, separadas por lo que responden. La separación es el
 * punto: mezclarlas en una sola lista impide luego saber si el problema fue
 * leer mal la estructura, entrar mal o poner el stop donde no tocaba.
 */
export function BloqueConfirmaciones({ tags, seleccionados, onChange, onTagCreado }: Props) {
  const estructura = CATEGORIA_TAG_MAP.estructura;
  const entrada = CATEGORIA_TAG_MAP.entrada;
  const salida = CATEGORIA_TAG_MAP.salida;

  return (
    <div className="space-y-5">
      <Seccion
        icono={<Layers className="h-3.5 w-3.5" />}
        titulo={estructura.etiqueta}
        pregunta={estructura.pregunta}
      >
        <SelectorTags
          tags={tags}
          categoria="estructura"
          seleccionados={seleccionados}
          onChange={onChange}
          onTagCreado={onTagCreado}
          ejemplos={estructura.ejemplos}
        />
      </Seccion>

      <Seccion
        icono={<Crosshair className="h-3.5 w-3.5" />}
        titulo={entrada.etiqueta}
        pregunta={entrada.pregunta}
      >
        <SelectorTags
          tags={tags}
          categoria="entrada"
          seleccionados={seleccionados}
          onChange={onChange}
          onTagCreado={onTagCreado}
          ejemplos={entrada.ejemplos}
        />
      </Seccion>

      <Seccion
        icono={<Target className="h-3.5 w-3.5" />}
        titulo={salida.etiqueta}
        pregunta={salida.pregunta}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
            <Label className="flex items-center gap-1.5 text-xs">
              <Target className="h-3 w-3 text-positive" />
              Zona de TP
            </Label>
            <SelectorTags
              tags={tags}
              categoria="salida"
              subtipoSalida="tp"
              seleccionados={seleccionados}
              onChange={onChange}
              onTagCreado={onTagCreado}
              ejemplos="Liquidez del máximo previo, extensión 1.618"
            />
          </div>

          <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
            <Label className="flex items-center gap-1.5 text-xs">
              <Shield className="h-3 w-3 text-muted-foreground" />
              Zona de stop
            </Label>
            <SelectorTags
              tags={tags}
              categoria="salida"
              subtipoSalida="stop"
              seleccionados={seleccionados}
              onChange={onChange}
              onTagCreado={onTagCreado}
              ejemplos="Bajo el swing anterior, ATR × 1.5"
            />
          </div>
        </div>
      </Seccion>
    </div>
  );
}

function Seccion({
  icono,
  titulo,
  pregunta,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  pregunta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{icono}</span>
          {titulo}
        </Label>
        <p className="pt-0.5 text-xs text-muted-foreground">{pregunta}</p>
      </div>
      {children}
    </div>
  );
}
