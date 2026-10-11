"use client";

import { LogOut } from "lucide-react";
import { inicialesDe } from "@/lib/usuario";

export function MenuUsuario({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
        {inicialesDe(email)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-foreground" title={email}>
          {email}
        </div>
      </div>
      <form action="/auth/cerrar-sesion" method="post">
        <button
          type="submit"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
