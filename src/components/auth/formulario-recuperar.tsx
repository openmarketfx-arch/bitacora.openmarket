"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?siguiente=/restablecer`,
    });

    setCargando(false);

    if (error) {
      const m = error.message.toLowerCase();
      setError(
        m.includes("rate limit") || m.includes("too many")
          ? "Se enviaron demasiados correos seguidos. Espera un rato e inténtalo de nuevo."
          : error.message,
      );
      return;
    }

    // Supabase responde igual exista o no la cuenta, para no revelar quién está registrado.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
          <MailCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">Revisa tu correo</h2>
          <p className="text-sm text-muted-foreground">
            Si <span className="text-foreground">{email}</span> tiene una cuenta, te enviamos un
            enlace para elegir una contraseña nueva. Ábrelo en este mismo navegador.
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold">Recuperar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Escribe tu correo y te enviamos un enlace para elegir una contraseña nueva.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        Enviar enlace
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
