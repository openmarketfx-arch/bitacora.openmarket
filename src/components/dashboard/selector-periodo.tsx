"use client";

import Link from "next/link";
import { PERIODOS, type Periodo } from "@/lib/datos/metricas";
import { cn } from "@/lib/utils";

export function SelectorPeriodo({ actual }: { actual: Periodo }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {PERIODOS.map((p) => (
        <Link
          key={p.valor}
          href={`/?periodo=${p.valor}`}
          scroll={false}
          aria-current={p.valor === actual ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            p.valor === actual
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.corta}
        </Link>
      ))}
    </div>
  );
}
