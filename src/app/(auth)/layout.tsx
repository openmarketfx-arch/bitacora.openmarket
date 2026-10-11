import { ChartCandlestick } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChartCandlestick className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Open Market</h1>
            <p className="text-sm text-muted-foreground">
              Tu bitácora de trading, con las métricas que sí explican el resultado.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">{children}</div>
      </div>
    </div>
  );
}
