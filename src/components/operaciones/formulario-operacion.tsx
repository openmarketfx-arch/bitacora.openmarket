"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { crearOperacion } from "@/app/(app)/operaciones/acciones";
import {
  SelectorInstrumento,
  type InstrumentoOpcion,
} from "@/components/operaciones/selector-instrumento";
import { BloqueConfirmaciones } from "@/components/operaciones/bloque-confirmaciones";
import { PreguntaActivacion } from "@/components/operaciones/pregunta-activacion";
import { PistaPrecio, ResumenPips } from "@/components/operaciones/resumen-pips";
import { SelectorTipoOrden } from "@/components/operaciones/selector-tipo-orden";
import { SelectorTipoCierre } from "@/components/operaciones/selector-tipo-cierre";
import { SubidorCaptura } from "@/components/operaciones/subidor-captura";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paraInputDateTime } from "@/lib/format";
import {
  TIPO_ORDEN_MAP,
  esOrdenPendiente,
  type Tag,
  type TipoCierre,
  type TipoOrden,
  type TradingAccount,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  cuentas: TradingAccount[];
  instrumentos: InstrumentoOpcion[];
  tagsIniciales: Tag[];
}

export function FormularioOperacion({ cuentas, instrumentos, tagsIniciales }: Props) {
  const router = useRouter();

  // ---- Entrada ----
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "");
  const [instrumentoId, setInstrumentoId] = useState<string | null>(null);
  const [tipoOrden, setTipoOrden] = useState<TipoOrden>("buy");
  const [fechaEntrada, setFechaEntrada] = useState(paraInputDateTime());
  const [precioEntrada, setPrecioEntrada] = useState("");
  const [precioTp, setPrecioTp] = useState("");
  const [precioStop, setPrecioStop] = useState("");
  const [lotaje, setLotaje] = useState("");
  const [tags, setTags] = useState<Tag[]>(tagsIniciales);
  const [tagsElegidos, setTagsElegidos] = useState<string[]>([]);
  const [notas, setNotas] = useState("");
  const [captura, setCaptura] = useState<string | null>(null);

  // ---- Cierre ----
  const [cerrando, setCerrando] = useState(false);
  const [fechaSalida, setFechaSalida] = useState("");
  const [precioSalida, setPrecioSalida] = useState("");
  const [resultado, setResultado] = useState("");
  const [tipoCierre, setTipoCierre] = useState<TipoCierre | null>(null);
  const [medicion, setMedicion] = useState("");
  /** Solo relevante en órdenes pendientes: si el precio llegó a tocarlas. */
  const [seActivo, setSeActivo] = useState(true);
  const [distanciaNoActivada, setDistanciaNoActivada] = useState("");

  const [guardando, setGuardando] = useState(false);

  const instrumento = instrumentos.find((i) => i.id === instrumentoId) ?? null;
  const cuenta = cuentas.find((c) => c.id === cuentaId) ?? null;
  const pasoPrecio = instrumento ? 1 / 10 ** instrumento.decimales_precio : 0.00001;
  const pendiente = esOrdenPendiente(tipoOrden);
  const direccion = TIPO_ORDEN_MAP[tipoOrden].direccion;
  // El placeholder usa el precio orientativo del par: deja claro de un vistazo
  // cuántos decimales espera el campo y en qué orden de magnitud se mueve.
  const referencia = instrumento
    ? Number(
        instrumento.precio_referencia ?? 10 ** (2 - instrumento.decimales_precio),
      ).toFixed(instrumento.decimales_precio)
    : "0.00000";

  function abrirCierre() {
    setCerrando(true);
    if (!fechaSalida) setFechaSalida(paraInputDateTime());
  }

  function cancelarCierre() {
    setCerrando(false);
    setFechaSalida("");
    setPrecioSalida("");
    setResultado("");
    setTipoCierre(null);
    setMedicion("");
  }

  async function enviar(cerrar: boolean) {
    if (!instrumentoId) {
      toast.error("Elige un instrumento.");
      return;
    }

    // Concluir una orden pendiente que nunca se activó no es un cierre: no
    // hay salida ni resultado, solo el dato de que el precio no llegó.
    const noActivada = cerrar && pendiente && !seActivo;
    const desenlace = noActivada ? "no_activada" : cerrar ? "cerrada" : "abierta";
    const conSalida = desenlace === "cerrada";

    setGuardando(true);

    const resultadoAccion = await crearOperacion({
      trading_account_id: cuentaId,
      instrument_id: instrumentoId,
      tipo_orden: tipoOrden,
      fecha_hora_entrada: fechaEntrada,
      precio_entrada: precioEntrada,
      precio_tp: precioTp === "" ? null : precioTp,
      precio_stop: precioStop === "" ? null : precioStop,
      lotaje: lotaje === "" ? null : lotaje,
      notas,
      captura_url: captura,
      tags: tagsElegidos,

      desenlace,
      fecha_hora_salida: conSalida ? fechaSalida : "",
      precio_salida: conSalida && precioSalida !== "" ? precioSalida : null,
      resultado_dinero: conSalida && resultado !== "" ? resultado : null,
      tipo_cierre: conSalida ? tipoCierre : null,
      medicion: conSalida && medicion !== "" ? medicion : null,
      distancia: noActivada && distanciaNoActivada !== "" ? distanciaNoActivada : null,
    });

    setGuardando(false);

    if (!resultadoAccion.ok) {
      toast.error(resultadoAccion.mensaje ?? "No se pudo guardar.");
      return;
    }

    if (desenlace === "no_activada") {
      toast.success("Registrada como no activada: el precio nunca llegó a tu orden.");
    } else if (!cerrar) {
      toast.success("Operación guardada como abierta. La cierras cuando tengas el resultado.");
    } else if (!tipoCierre) {
      toast.success("Operación cerrada. Queda pendiente de revisión para clasificar el cierre.");
    } else {
      toast.success("Operación cerrada y clasificada.");
    }

    // Sin router.refresh() detrás: encadenarlo aborta la navegación. Las
    // acciones ya llaman a revalidatePath, así que el destino llega fresco.
    router.push(resultadoAccion.id ? `/operaciones/${resultadoAccion.id}` : "/operaciones");
  }

  function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    void enviar(submitter?.value === "cerrar");
  }

  if (cuentas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Necesitas al menos una cuenta de trading activa para registrar operaciones.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="/configuracion">Crear una cuenta</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={alEnviar} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entrada</CardTitle>
          <CardDescription>Lo que sabes en el momento de abrir la posición.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cuenta">Cuenta</Label>
              <Select value={cuentaId} onValueChange={setCuentaId}>
                <SelectTrigger id="cuenta">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.moneda_base} · {c.tipo === "real" ? "Real" : "Demo"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrumento">Instrumento</Label>
              <SelectorInstrumento
                id="instrumento"
                instrumentos={instrumentos}
                valor={instrumentoId}
                onChange={setInstrumentoId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de orden</Label>
            <SelectorTipoOrden valor={tipoOrden} onChange={setTipoOrden} />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fecha-entrada">Fecha y hora de entrada</Label>
              <Input
                id="fecha-entrada"
                type="datetime-local"
                required
                value={fechaEntrada}
                onChange={(e) => setFechaEntrada(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio-entrada">
                {pendiente ? "Precio de la orden" : "Precio de entrada"}
              </Label>
              <Input
                id="precio-entrada"
                type="number"
                step={pasoPrecio}
                min="0"
                required
                inputMode="decimal"
                className="font-mono"
                placeholder={referencia}
                value={precioEntrada}
                onChange={(e) => setPrecioEntrada(e.target.value)}
              />
              <PistaPrecio instrumento={instrumento} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotaje">
                Lotaje <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="lotaje"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                className="font-mono"
                placeholder="0.10"
                value={lotaje}
                onChange={(e) => setLotaje(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="precio-tp">
                  Take profit <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="precio-tp"
                  type="number"
                  step={pasoPrecio}
                  min="0"
                  inputMode="decimal"
                  className="font-mono"
                  placeholder={referencia}
                  value={precioTp}
                  onChange={(e) => setPrecioTp(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio-stop">
                  Stop loss <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="precio-stop"
                  type="number"
                  step={pasoPrecio}
                  min="0"
                  inputMode="decimal"
                  className="font-mono"
                  placeholder={referencia}
                  value={precioStop}
                  onChange={(e) => setPrecioStop(e.target.value)}
                />
              </div>
            </div>

            <ResumenPips
              instrumento={instrumento}
              direccion={direccion}
              entrada={precioEntrada}
              tp={precioTp}
              stop={precioStop}
              salida={cerrando && (!pendiente || seActivo) ? precioSalida : undefined}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <Label>Confirmaciones</Label>
              <p className="pt-0.5 text-xs text-muted-foreground">
                Separadas por lo que responden. Es lo que después permite saber si el problema
                fue la lectura, la entrada o dónde pusiste las salidas.
              </p>
            </div>
            <BloqueConfirmaciones
              tags={tags}
              seleccionados={tagsElegidos}
              onChange={setTagsElegidos}
              onTagCreado={(tag) => setTags((prev) => [...prev, tag])}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notas">
                Notas <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="notas"
                rows={3}
                maxLength={4000}
                placeholder="Contexto, estado de ánimo, lo que viste en el gráfico…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Captura <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <SubidorCaptura valor={captura} onChange={setCaptura} />
            </div>
          </div>
        </CardContent>
      </Card>

      {cerrando && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-sm">
                  {pendiente && !seActivo ? "Conclusión" : "Cierre"}
                </CardTitle>
                <CardDescription>
                  {pendiente && !seActivo
                    ? "La orden nunca se ejecutó: no hay resultado que registrar."
                    : `El resultado final de la operación.${
                        cuenta ? ` El P/L va en ${cuenta.moneda_base}.` : ""
                      }`}
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={cancelarCierre}>
                <X className="h-4 w-4" />
                Dejarla abierta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PreguntaActivacion
              tipoOrden={tipoOrden}
              activada={seActivo}
              onChange={setSeActivo}
              assetClass={instrumento?.asset_class}
              distancia={distanciaNoActivada}
              onDistanciaChange={setDistanciaNoActivada}
            />

            {(!pendiente || seActivo) && (
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fecha-salida">Fecha y hora de salida</Label>
                <Input
                  id="fecha-salida"
                  type="datetime-local"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio-salida">Precio de salida</Label>
                <Input
                  id="precio-salida"
                  type="number"
                  step={pasoPrecio}
                  min="0"
                  inputMode="decimal"
                  className="font-mono"
                  value={precioSalida}
                  onChange={(e) => setPrecioSalida(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resultado">
                  Resultado {cuenta ? `(${cuenta.moneda_base})` : "(P/L)"}
                </Label>
                <Input
                  id="resultado"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={cn(
                    "font-mono",
                    Number(resultado) > 0 && "text-positive",
                    Number(resultado) < 0 && "text-negative-foreground",
                  )}
                  placeholder="-45.20"
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                />
              </div>
            </div>
            )}

            {(!pendiente || seActivo) && (
            <div className="space-y-3 border-t border-border pt-5">
              <div>
                <Label>
                  Tipo de cierre <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <p className="pt-1 text-xs text-muted-foreground">
                  Es lo que convierte la bitácora en analítica. Si no lo tienes claro ahora,
                  déjalo sin marcar: la operación queda pendiente de revisión.
                </p>
              </div>
              <SelectorTipoCierre
                instrumento={instrumento}
                valor={tipoCierre}
                onChange={setTipoCierre}
                medicion={medicion}
                onMedicionChange={setMedicion}
              />
            </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          value="abierta"
          variant="outline"
          size="lg"
          disabled={guardando}
          className="sm:min-w-[200px]"
        >
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar como abierta
        </Button>

        <Button
          type={cerrando ? "submit" : "button"}
          value="cerrar"
          size="lg"
          disabled={guardando}
          onClick={cerrando ? undefined : abrirCierre}
          className="sm:min-w-[200px]"
        >
          {guardando && cerrando && <Loader2 className="h-4 w-4 animate-spin" />}
          {cerrando && pendiente && !seActivo ? "Registrar como no activada" : "Cerrar operación"}
          {!cerrando && <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {!cerrando && (
        <p className="text-right text-xs text-muted-foreground">
          &ldquo;Cerrar operación&rdquo; abre los campos de salida
          {pendiente && " y pregunta si la orden llegó a activarse"}. Si sigue en curso,
          guárdala como abierta y la cierras después.
        </p>
      )}
    </form>
  );
}
