"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDinero } from "@/lib/format";
import type { PuntoEquity } from "@/lib/datos/metricas";

export function CurvaEquity({
  puntos,
  moneda = "USD",
}: {
  puntos: PuntoEquity[];
  moneda?: string;
}) {
  if (puntos.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Aún no hay operaciones cerradas en este periodo.
      </div>
    );
  }

  const acumulados = puntos.map((p) => p.acumulado);
  const minimo = Math.min(0, ...acumulados);
  const maximo = Math.max(0, ...acumulados);
  const margen = Math.max((maximo - minimo) * 0.12, 1);
  const terminaEnPositivo = (acumulados.at(-1) ?? 0) >= 0;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="gradienteEquity" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={terminaEnPositivo ? "hsl(var(--positive))" : "hsl(var(--muted-foreground))"}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={terminaEnPositivo ? "hsl(var(--positive))" : "hsl(var(--muted-foreground))"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="etiqueta"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            minTickGap={24}
          />
          <YAxis
            domain={[minimo - margen, maximo + margen]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(v: number) => formatDinero(v, moneda, { signo: false })}
          />

          {/* El cero es la referencia que importa: por encima vas ganando. */}
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />

          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
            formatter={(valor: number, nombre: string) => [
              formatDinero(valor, moneda),
              nombre === "acumulado" ? "Acumulado" : "Del día",
            ]}
          />

          <Area
            type="monotone"
            dataKey="acumulado"
            stroke={terminaEnPositivo ? "hsl(var(--positive))" : "hsl(var(--muted-foreground))"}
            strokeWidth={2}
            fill="url(#gradienteEquity)"
            dot={false}
            activeDot={{ r: 3 }}
            /* Recharts dibuja la curva completa y la va destapando con un
               clipPath animado. Si la animación no corre — pestaña de fondo,
               reduced-motion — el clip se queda estrecho y el gráfico parece
               vacío aunque el trazado esté ahí. Para datos que el usuario
               quiere leer de un vistazo, la animación no aporta nada. */
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
