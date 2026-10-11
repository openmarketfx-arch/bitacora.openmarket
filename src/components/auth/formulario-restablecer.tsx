"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function mensajeDeError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("same password") || m.includes("different from the old"))
    return "La contraseña nueva debe ser distinta de la anterior.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  return mensaje;
}

export function FormularioRestablecer() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);

    if (error) {
      setError(mensajeDeError(error.message));
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold">Elige una contraseña nueva</h2>
        <p className="text-sm text-muted-foreground">
          Al guardarla entrarás directamente a tu cuenta.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="repetida">Repítela</Label>
        <Input
          id="repetida"
          name="repetida"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar contraseña
      </Button>
    </form>
  );
}
