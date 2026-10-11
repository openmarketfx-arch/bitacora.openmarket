"use client";

import { AlertTriangle, Shield, Target, TrendingUp } from "lucide-react";
import {
  calcularPlan,
  formatPips,
  formatRatio,
  pipsEntre,
  unidadDe,
} from "@/lib/format";
import type { Direccion, Instrument } from "@/lib/types";
import { cn } from "@/lib/utils";

type InstrumentoMinimo = Pick<
  Instrument,
  "asset_class" | "valor_pip" | "decimales_precio" | "simbolo" | "precio_referencia"
>;

interface Props {
  instrumento: InstrumentoMinimo | null;
  direccion: Direccion;
  entrada: string;
  tp: string;
  stop: string;
  /** Solo cuando la operación ya tiene salida: el recorrido real. */
  salida?: string;
}

const aNumero = (v: string) => (v.trim() === "" ? null : Number(v));

/**
 * Lectura en pips de lo que el usuario está escribiendo, calculada al vuelo.
 *
 * El objetivo es que no haga falta sacar la calculadora: al teclear los
 * niveles se ve de inmediato cuánto se arriesga, cuánto se busca y si el
 * R:R vale la pena, en la unidad del instrumento.
 */
export function ResumenPips({ instrumento, direccion, entrada, tp, stop, salida }: Props) {
  if (!instrumento) return null;

  const e = aNumero(entrada);
  const t = aNumero(tp);
  const s = aNumero(stop);
  const x = salida !== undefined ? aNumero(salida) : null;

  const plan = calcularPlan(e, t, s, direccion, instrumento);
  const recorrido = pipsEntre(e, x, instrumento);
  const unidad = unidadDe(instrumento.asset_class);

  // Un recorrido a favor o en contra según la dirección de la operación.
  const aFavor =
    e !== null && x !== null ? (direccion === "compra" ? x > e : x < e) : null;

  const hayAlgo = plan.riesgo !== null || plan.objetivo !== null || recorrido !== null;
  if (!hayAlgo) {
    return (
      <p className="text-xs text-muted-foreground/70">
        Escribe entrada, TP y stop y aquí aparecerá la distancia en {unidad}.
      </p>
    );
  }

  const incoherencias: string[] = [];
  if (!plan.stopCoherente) {
    incoherencias.push(
      direccion === "compra"
        ? "En una compra el stop va por debajo de la entrada."
        : "En una venta el stop va por encima de la entrada.",
    );
  }
  if (!plan.tpCoherente) {
    incoherencias.push(
      direccion === "compra"
        ? "En una compra el TP va por encima de la entrada."
        : "En una venta el TP va por debajo de la entrada.",
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Dato
          icono={<Shield className="h-3 w-3" />}
          etiqueta="Riesgo"
          valor={formatPips(plan.riesgo, instrumento)}
          tono={plan.stopCoherente ? "neutro" : "aviso"}
        />
        <Dato
          icono={<Target className="h-3 w-3" />}
          etiqueta="Objetivo"
          valor={formatPips(plan.objetivo, instrumento)}
          tono={plan.tpCoherente ? "neutro" : "aviso"}
        />
        <Dato
          icono={<TrendingUp className="h-3 w-3" />}
          etiqueta="R:R"
          valor={formatRatio(plan.ratio)}
          tono={plan.ratio !== null && plan.ratio >= 1 ? "bueno" : "neutro"}
        />
        {recorrido !== null && (
          <Dato
            etiqueta="Recorrido real"
            valor={`${aFavor === false ? "−" : ""}${formatPips(recorrido, instrumento)}`}
            tono={aFavor === null ? "neutro" : aFavor ? "bueno" : "malo"}
          />
        )}
      </div>

      {incoherencias.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{incoherencias.join(" ")}</span>
        </p>
      )}
    </div>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
  tono,
}: {
  icono?: React.ReactNode;
  etiqueta: string;
  valor: string;
  tono: "neutro" | "bueno" | "malo" | "aviso";
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icono}
        {etiqueta}
      </span>
      <span
        className={cn(
          "tabular font-mono text-sm font-medium",
          tono === "bueno" && "text-positive",
          tono === "malo" && "text-negative-foreground",
          tono === "aviso" && "text-amber-400",
        )}
      >
        {valor}
      </span>
    </span>
  );
}

/** Pista de formato bajo un campo de precio: decimales y referencia del par. */
export function PistaPrecio({ instrumento }: { instrumento: InstrumentoMinimo | null }) {
  if (!instrumento) return null;

  const unidad = unidadDe(instrumento.asset_class);
  const pip = Number(instrumento.valor_pip);
  const ejemplo = instrumento.precio_referencia
    ? Number(instrumento.precio_referencia).toLocaleString("es-ES", {
        minimumFractionDigits: instrumento.decimales_precio,
        maximumFractionDigits: instrumento.decimales_precio,
      })
    : null;

  return (
    <p className="text-[11px] text-muted-foreground/70">
      {instrumento.decimales_precio} decimales · 1 {unidad.replace(/s$/, "")} ={" "}
      {pip.toLocaleString("es-ES", { maximumFractionDigits: 10 })}
      {ejemplo && ` · ref. ${ejemplo}`}
    </p>
  );
}
