"use client";

import { useState } from "react";
import { resultadoNeto } from "@/lib/resultado";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { useZona } from "@/components/layout/proveedor-zona";
import { DialogoCierre } from "@/components/operaciones/dialogo-cierre";
import { DialogoRevision } from "@/components/operaciones/dialogo-revision";
import { EtiquetaTipoOrden } from "@/components/operaciones/selector-tipo-orden";
import { TablaOperaciones } from "@/components/operaciones/tabla-operaciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFechaHora, formatPrecio } from "@/lib/format";
import type { TradeCompleto } from "@/lib/types";

interface Props {
  todas: TradeCompleto[];
  abiertas: TradeCompleto[];
  pendientes: TradeCompleto[];
}

export function ColasOperaciones({ todas, abiertas, pendientes }: Props) {
  const zona = useZona();
  const [cerrando, setCerrando] = useState<TradeCompleto | null>(null);
  const [revisando, setRevisando] = useState<TradeCompleto | null>(null);

  return (
    <>
      <Tabs defaultValue={pendientes.length > 0 ? "pendientes" : abiertas.length > 0 ? "abiertas" : "todas"}>
        <TabsList>
          <TabsTrigger value="todas">
            Todas
            <span className="text-xs text-muted-foreground">{todas.length}</span>
          </TabsTrigger>
          <TabsTrigger value="abiertas">
            Abiertas
            {abiertas.length > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
                {abiertas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            Por revisar
            {pendientes.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-400">
                {pendientes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <Card>
            <CardContent className="pt-5">
              <TablaOperaciones operaciones={todas} zona={zona} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abiertas">
          <Cola
            operaciones={abiertas}
            icono={Clock}
            vacioTitulo="Ninguna operación abierta"
            vacioTexto="Todas tus posiciones tienen ya un resultado final."
            descripcion="Posiciones sin resultado final. Al cerrarlas se completan de una vez todos los datos que faltan."
            etiquetaAccion="Cerrar y finalizar"
            onAccion={setCerrando}
          />
        </TabsContent>

        <TabsContent value="pendientes">
          <Cola
            operaciones={pendientes}
            icono={ClipboardCheck}
            vacioTitulo="Nada pendiente de revisión"
            vacioTexto="Todas tus operaciones cerradas están clasificadas. La analítica está completa."
            descripcion="Cerradas pero sin clasificar. Hasta que no les pongas tipo de cierre, no cuentan en la analítica."
            etiquetaAccion="Clasificar"
            onAccion={setRevisando}
          />
        </TabsContent>
      </Tabs>

      {cerrando && <DialogoCierre operacion={cerrando} onOpenChange={() => setCerrando(null)} />}
      {revisando && (
        <DialogoRevision operacion={revisando} onOpenChange={() => setRevisando(null)} />
      )}
    </>
  );
}

function Cola({
  operaciones,
  icono: Icono,
  vacioTitulo,
  vacioTexto,
  descripcion,
  etiquetaAccion,
  onAccion,
}: {
  operaciones: TradeCompleto[];
  icono: typeof Clock;
  vacioTitulo: string;
  vacioTexto: string;
  descripcion: string;
  etiquetaAccion: string;
  onAccion: (op: TradeCompleto) => void;
}) {
  const zona = useZona();
  if (operaciones.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <CheckCircle2 className="h-6 w-6 text-positive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{vacioTitulo}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{vacioTexto}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {descripcion}
      </p>

      {operaciones.map((op) => (
        <Card key={op.id}>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
            <div className="min-w-[150px]">
              <Link
                href={`/operaciones/${op.id}`}
                className="font-mono text-sm font-medium hover:text-primary hover:underline"
              >
                {op.instrument.simbolo}
              </Link>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <EtiquetaTipoOrden tipo={op.tipo_orden} activada={op.orden_activada} />
                <span>· {op.account.nombre}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Entrada
              </div>
              <div className="tabular font-mono text-xs">
                {formatPrecio(op.precio_entrada, op.instrument.decimales_precio)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {formatFechaHora(op.fecha_hora_entrada, zona)}
              </div>
            </div>

            {op.estado_operacion === "cerrada" && (
              <div className="space-y-0.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Salida
                </div>
                <div className="tabular font-mono text-xs">
                  {formatPrecio(op.precio_salida, op.instrument.decimales_precio)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatFechaHora(op.fecha_hora_salida, zona)}
                </div>
              </div>
            )}

            {op.tags.length > 0 && (
              <div className="flex max-w-[260px] flex-wrap gap-1">
                {op.tags.map((t) => (
                  <Badge key={t.id} variant="outline" className="text-[10px]">
                    {t.nombre}
                  </Badge>
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-3">
              {op.estado_operacion === "cerrada" && (
                <CifraResultado
                  monto={resultadoNeto(op)}
                  moneda={op.account.moneda_base}
                  tamano="md"
                />
              )}
              <Button size="sm" onClick={() => onAccion(op)}>
                {etiquetaAccion}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
