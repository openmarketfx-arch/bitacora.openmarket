"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartCandlestick,
  LayoutDashboard,
  LineChart,
  Settings,
  TrendingUp,
} from "lucide-react";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { cn } from "@/lib/utils";

const NAVEGACION = [
  { href: "/", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/operaciones", etiqueta: "Operaciones", icono: ChartCandlestick },
  { href: "/calendario", etiqueta: "Calendario", icono: CalendarDays },
  { href: "/analitica", etiqueta: "Analítica", icono: LineChart },
  { href: "/mercados", etiqueta: "Mercados", icono: TrendingUp },
  { href: "/configuracion", etiqueta: "Configuración", icono: Settings },
];

export function Sidebar({ email, pendientes = 0 }: { email: string; pendientes?: number }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/60 lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ChartCandlestick className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Open Market</div>
          <div className="text-[11px] text-muted-foreground">Bitácora de trading</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAVEGACION.map(({ href, etiqueta, icono: Icono }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                activo
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icono className="h-4 w-4 shrink-0" />
              <span className="flex-1">{etiqueta}</span>
              {href === "/operaciones" && pendientes > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                  {pendientes}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <div className="px-2 pb-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-positive" /> Positivo
          </span>
          <span className="ml-3 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-white/25 bg-negative" /> Negativo
          </span>
        </div>
        <MenuUsuario email={email} />
      </div>
    </aside>
  );
}
