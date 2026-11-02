"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { guardarPlanAlterno } from "@/app/(app)/configuracion/acciones-plan-alterno";
import { Button } from "@/components/ui/button";
import {
  PLANES,
  etiquetaPlan,
  type ConfigPlanAlterno,
  type Plan,
} from "@/lib/plan-alterno";
import { cn } from "@/lib/utils";

const DESCRIPCION: Record<Plan, string> = {
  A: "Tu entrada principal.",
  B: "La segunda entrada, si la primera sale mal.",
  C: "La tercera entrada.",
  D: "La cuarta entrada.",
  E: "La quinta entrada.",
};

/** Configuración del plan alterno: activarlo y elegir cuántas entradas (planes) usa el trader. */
export function PanelPlanAlterno({ config }: { config: ConfigPlanAlterno }) {
  const router = useRouter();
  const [habilitado, setHabilitado] = useState(config.habilitado);
  const [planes, setPlanes] = useState<Plan[]>(config.planes);
  const [pendiente, iniciarTransicion] = useTransition();

  const sinCambios =
    habilitado === config.habilitado &&
    planes.length === config.planes.length &&
    planes.every((p) => config.planes.includes(p));

  function alternarPlan(plan: Plan) {
    setPlanes((previos) =>
      previos.includes(plan) ? previos.filter((p) => p !== plan) : [...previos, plan].sort(),
    );
  }

  function activar(valor: boolean) {
    setHabilitado(valor);
    // Al activarlo por primera vez se parte del Plan A, que es la entrada de siempre.
    if (valor && planes.length === 0) setPlanes(["A"]);
  }

  function guardar() {
    iniciarTransicion(async () => {
      const r = await guardarPlanAlterno({ habilitado, planes });
      if (!r.ok) {
        toast.error(r.mensaje ?? "No se pudo guardar.");
        return;
      }
      toast.success(habilitado ? "Plan alterno guardado." : "Plan alterno desactivado.");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Plan alterno</h2>
        <p className="text-sm text-muted-foreground">
          Hay traders que solo toman una entrada al día y otros que, si la primera sale mal,
          tienen una segunda o una tercera entrada prevista en su plan. Actívalo para marcar cada
          operación con el plan al que pertenece y poder enlazarlas entre sí. En la analítica verás
          qué plan funciona mejor.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Usar plan alterno</span>
          <span className="block text-xs text-muted-foreground">
            Aparece un selector de plan al registrar cada operación.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={habilitado}
          aria-label="Usar plan alterno"
          onClick={() => activar(!habilitado)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
            habilitado ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
              habilitado && "translate-x-5",
            )}
          />
        </button>
      </div>

      <fieldset disabled={!habilitado} className={cn("space-y-2", !habilitado && "opacity-50")}>
        <legend className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Planes que usas
        </legend>
        {PLANES.map((plan) => (
          <label
            key={plan}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3",
              planes.includes(plan)
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:bg-accent/40",
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={planes.includes(plan)}
              onChange={() => alternarPlan(plan)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{etiquetaPlan(plan)}</span>
              <span className="block text-xs text-muted-foreground">{DESCRIPCION[plan]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {habilitado && (
        <p className="text-sm text-muted-foreground">
          {planes.length === 0
            ? "Elige al menos un plan."
            : planes.length === 1
              ? "Tu plan permite 1 entrada al día."
              : `Tu plan permite hasta ${planes.length} entradas al día (${planes.map((p) => etiquetaPlan(p)).join(", ")}).`}
        </p>
      )}

      <div className="space-y-2 rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Cómo se enlazan.</span> Cada operación
          tiene un código de referencia (OP-0001, OP-0002…). Al registrar una entrada con plan
          puedes enlazarla con la anterior de tu plan de entradas.
        </p>
        <p>
          <span className="font-medium text-foreground">Una regla.</span> Un mismo plan no puede
          repetirse dentro de un grupo enlazado: no vale Plan A con otro Plan A, ni Plan A + Plan B
          + Plan B.
        </p>
      </div>

      <Button
        onClick={guardar}
        disabled={pendiente || sinCambios || (habilitado && planes.length === 0)}
      >
        {pendiente && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </div>
  );
}
