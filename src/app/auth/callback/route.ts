import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Destino del enlace de confirmación de correo: canjea el código por sesión. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const pedido = searchParams.get("siguiente") ?? "/";
  // Solo rutas internas: "//otro.sitio" o "https://..." serían una redirección abierta.
  const siguiente = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${siguiente}`);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
}
