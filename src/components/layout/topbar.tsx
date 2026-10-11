"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartCandlestick,
  LayoutDashboard,
  LineChart,
  Plus,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_MOVIL = [
  { href: "/", etiqueta: "Inicio", icono: LayoutDashboard },
  { href: "/operaciones", etiqueta: "Ops", icono: ChartCandlestick },
  { href: "/calendario", etiqueta: "Calendario", icono: CalendarDays },
  { href: "/analitica", etiqueta: "Analítica", icono: LineChart },
  { href: "/mercados", etiqueta: "Mercados", icono: TrendingUp },
  { href: "/configuracion", etiqueta: "Ajustes", icono: Settings },
];

interface TopbarProps {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
}

export function Topbar({ titulo, descripcion, acciones }: TopbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-5 sm:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{titulo}</h1>
          {descripcion && (
            <p className="truncate text-xs text-muted-foreground">{descripcion}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {acciones ?? (
            <Button asChild size="sm">
              <Link href="/operaciones/nueva">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva operación</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto scrollbar-thin border-t border-border px-3 py-1.5 lg:hidden">
        {NAV_MOVIL.map(({ href, etiqueta, icono: Icono }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                activo
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icono className="h-3.5 w-3.5" />
              {etiqueta}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
