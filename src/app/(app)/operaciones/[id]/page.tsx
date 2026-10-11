import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { AccionesOperacion } from "@/components/operaciones/acciones-operacion";
import { EtiquetaTipoOrden } from "@/components/operaciones/selector-tipo-orden";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CifraResultado } from "@/components/ui/cifra-resultado";
import { requerirUsuario } from "@/lib/auth";
import { obtenerOperacion } from "@/lib/datos/operaciones";
import {
  calcularPlan,
  formatFechaHora,
  formatPips,
  formatPrecio,
  formatRatio,
  formatUnidades,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIA_TAG_MAP,
  SUBTIPO_SALIDA_LABEL,
  TIPO_CIERRE_MAP,
  TIPO_ORDEN_MAP,
  repartirPorCategoria,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Operación — Open Market" };

export default async function OperacionPage({ params }: { params: { id: string } }) {
  await requerirUsuario();

  const op = await obtenerOperacion(params.id);
  if (!op) notFound();

  const cierre = op.tipo_cierre ? TIPO_CIERRE_MAP[op.tipo_cierre] : null;

  // El bucket es privado: la imagen necesita una URL firmada de corta vida.
  let capturaUrl: string | null = null;
  if (op.captura_url) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("trade-captures")
      .createSignedUrl(op.captura_url, 60 * 60);
    capturaUrl = data?.signedUrl ?? null;
  }

  const porCategoria = repartirPorCategoria(op.tags);
  const plan = calcularPlan(
    op.precio_entrada,
    op.precio_tp,
    op.precio_stop,
    op.direccion,
    op.instrument,
  );

  // El campo de medición que aplica depende del tipo de cierre.
  const medicion = cierre?.campo ? op[cierre.campo] : null;

  return (
    <>
      <Topbar
        titulo={`${op.instrument.simbolo} · ${TIPO_ORDEN_MAP[op.tipo_orden].etiqueta}`}
        descripcion={`${op.account.nombre} · ${formatFechaHora(op.fecha_hora_entrada)}`}
        acciones={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/operaciones">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
            </Button>
            <AccionesOperacion operacion={op} />
          </div>
        }
      />

      <main className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          {op.estado_operacion === "abierta" ? (
            <Badge variant="primary">Abierta</Badge>
          ) : op.estado_operacion === "no_activada" ? (
            <Badge variant="outline">Orden no activada</Badge>
          ) : op.estado_revision === "pendiente" ? (
            <Badge variant="warning">Pendiente de revisión</Badge>
          ) : (
            <Badge variant="outline">Revisada</Badge>
          )}
          {cierre && <Badge variant="default">{cierre.etiqueta}</Badge>}
          <CifraResultado
            monto={op.resultado_dinero}
            moneda={op.account.moneda_base}
            tamano="lg"
            className="ml-auto"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Dato etiqueta="Fecha y hora" valor={formatFechaHora(op.fecha_hora_entrada)} />
              <Dato
                etiqueta="Precio"
                valor={formatPrecio(op.precio_entrada, op.instrument.decimales_precio)}
                mono
              />
              <Dato
                etiqueta="Tipo de orden"
                valor={<EtiquetaTipoOrden tipo={op.tipo_orden} />}
              />
              <Dato etiqueta="Lotaje" valor={op.lotaje ?? "—"} mono />

              <div className="space-y-3 border-t border-border pt-3">
                <Dato
                  etiqueta="Take profit"
                  valor={
                    op.precio_tp === null
                      ? "—"
                      : `${formatPrecio(op.precio_tp, op.instrument.decimales_precio)}  ·  ${formatPips(plan.objetivo, op.instrument)}`
                  }
                  mono
                />
                <Dato
                  etiqueta="Stop loss"
                  valor={
                    op.precio_stop === null
                      ? "—"
                      : `${formatPrecio(op.precio_stop, op.instrument.decimales_precio)}  ·  ${formatPips(plan.riesgo, op.instrument)}`
                  }
                  mono
                />
                <Dato etiqueta="R:R planificado" valor={formatRatio(plan.ratio)} mono />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Salida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {op.estado_operacion === "abierta" ? (
                <p className="text-sm text-muted-foreground">
                  La operación sigue abierta. Cuando tengas el resultado final, ciérrala y
                  clasifícala.
                </p>
              ) : op.estado_operacion === "no_activada" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    El precio nunca llegó a tu orden, así que no hubo entrada ni resultado.
                    Cuenta como falta de precisión en la entrada, no como pérdida: la dirección
                    que leíste pudo ser correcta.
                  </p>
                  {op.distancia_no_activada !== null && (
                    <div className="border-t border-border pt-3">
                      <Dato
                        etiqueta="Le faltó"
                        valor={formatUnidades(op.distancia_no_activada, op.instrument)}
                        mono
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Dato etiqueta="Fecha y hora" valor={formatFechaHora(op.fecha_hora_salida)} />
                  <Dato
                    etiqueta="Precio"
                    valor={formatPrecio(op.precio_salida, op.instrument.decimales_precio)}
                    mono
                  />
                  <Dato
                    etiqueta="Resultado"
                    valor={
                      <CifraResultado
                        monto={op.resultado_dinero}
                        moneda={op.account.moneda_base}
                      />
                    }
                  />
                  {cierre?.campo && (
                    <Dato
                      etiqueta={cierre.campoEtiqueta ?? "Medición"}
                      valor={formatUnidades(medicion, op.instrument)}
                      mono
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {cierre && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{cierre.etiqueta}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{cierre.descripcion}</p>
              <p className="text-xs text-muted-foreground">
                Alimenta la métrica de <span className="text-foreground">{cierre.mide}</span>.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confirmaciones y notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {op.tags.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <GrupoTags
                  titulo={CATEGORIA_TAG_MAP.estructura.etiqueta}
                  tags={porCategoria.estructura}
                />
                <GrupoTags
                  titulo={CATEGORIA_TAG_MAP.entrada.etiqueta}
                  tags={porCategoria.entrada}
                />
                <GrupoTags titulo={SUBTIPO_SALIDA_LABEL.tp} tags={porCategoria.salidaTp} />
                <GrupoTags titulo={SUBTIPO_SALIDA_LABEL.stop} tags={porCategoria.salidaStop} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin confirmaciones. Esta operación no aparece en la analítica por tag.
              </p>
            )}

            {op.notas && (
              <p className="whitespace-pre-wrap border-t border-border pt-4 text-sm text-muted-foreground">
                {op.notas}
              </p>
            )}

            {capturaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturaUrl}
                alt="Captura del gráfico"
                className="w-full rounded-md border border-border"
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Dato({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className={cn("text-right", mono && "tabular font-mono text-xs")}>{valor}</span>
    </div>
  );
}

function GrupoTags({
  titulo,
  tags,
}: {
  titulo: string;
  tags: { id: string; nombre: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{titulo}</div>
      {tags.length === 0 ? (
        <span className="text-xs text-muted-foreground/50">—</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t.id} variant="primary">
              {t.nombre}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
