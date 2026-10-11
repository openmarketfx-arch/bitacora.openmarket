import { formatDinero, tonoDe, type Tono } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cifra de resultado con la convención de Open Market: verde el positivo,
 * negro el negativo.
 *
 * El negro va como relleno, no como color de letra: sobre el fondo oscuro de
 * la app, texto negro puro sería ilegible. La cifra negativa se pinta dentro
 * de un chip negro con un filo claro que lo separa del fondo, y el texto
 * encima en gris claro. Así el negro se ve de verdad y el número se lee.
 */
export type TamanoCifra = "sm" | "md" | "lg";

const TAMANOS: Record<TamanoCifra, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-1 text-sm",
  lg: "px-3 py-1.5 text-xl",
};

export function CifraResultado({
  monto,
  moneda = "USD",
  tamano = "sm",
  className,
}: {
  monto: number | null | undefined;
  moneda?: string;
  tamano?: TamanoCifra;
  className?: string;
}) {
  const tono = tonoDe(monto);

  if (monto === null || monto === undefined) {
    return (
      <span className={cn("tabular font-mono text-muted-foreground/50", TAMANOS[tamano], className)}>
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        "tabular inline-flex items-center justify-end rounded-md border font-mono font-medium",
        TAMANOS[tamano],
        estiloTono(tono),
        className,
      )}
    >
      {formatDinero(monto, moneda)}
    </span>
  );
}

export function estiloTono(tono: Tono): string {
  if (tono === "positivo") return "border-positive/30 bg-positive/10 text-positive";
  if (tono === "negativo") return "border-white/15 bg-negative text-negative-foreground";
  return "border-border bg-background/40 text-muted-foreground";
}
