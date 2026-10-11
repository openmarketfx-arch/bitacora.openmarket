"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Modo = "login" | "registro";

/** Traduce los errores de Supabase Auth a algo que se entienda. */
function mensajeDeError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Todavía no confirmaste tu correo. Revisa la bandeja de entrada.";
  if (m.includes("user already registered"))
    return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos seguidos. Espera un momento.";
  return mensaje;
}

export function FormularioAuth({ modo }: { modo: Modo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siguiente = searchParams.get("siguiente") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "enlace_invalido"
      ? "El enlace no es válido o caducó. Pide uno nuevo."
      : null,
  );
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();

    try {
      if (modo === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?siguiente=${siguiente}` },
        });
        if (error) throw error;

        // Sin sesión inmediata = el proyecto exige confirmar el correo.
        if (!data.session) {
          setConfirmacionPendiente(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace(siguiente);
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err instanceof Error ? err.message : "Algo salió mal."));
    } finally {
      setCargando(false);
    }
  }

  if (confirmacionPendiente) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
          <MailCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">Confirma tu correo</h2>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace a <span className="text-foreground">{email}</span>. Ábrelo para
            activar la cuenta y volver aquí.
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          {modo === "login" && (
            <Link
              href="/recuperar"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={modo === "registro" ? "new-password" : "current-password"}
          required
          minLength={6}
          placeholder={modo === "registro" ? "Mínimo 6 caracteres" : "••••••••"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {modo === "registro" ? "Crear cuenta" : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {modo === "registro" ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </>
        ) : (
          <>
            ¿Primera vez?{" "}
            <Link href="/registro" className="text-primary underline-offset-4 hover:underline">
              Crea tu cuenta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
