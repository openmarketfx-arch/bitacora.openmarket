import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_CUENTA } from "@/lib/cuenta";

/** Rutas accesibles sin sesión iniciada. */
const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/auth"];

export async function actualizarSesion(request: NextRequest) {
  // Un enlace con ?cuenta=<id> deja esa cuenta como la recordada: así el menú, la lista de
  // operaciones y el resto de pantallas hablan de la misma cuenta que la página abierta.
  const cuentaUrl = request.nextUrl.searchParams.get("cuenta");
  const cuentaValida = cuentaUrl && /^[0-9a-f-]{36}$/i.test(cuentaUrl) ? cuentaUrl : null;
  if (cuentaValida) request.cookies.set(COOKIE_CUENTA, cuentaValida);

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin credenciales configuradas dejamos pasar: /configuracion-pendiente
  // se encarga de explicar qué falta en lugar de romper con un 500.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((r) => path.startsWith(r));

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("siguiente", path);
    return NextResponse.redirect(destino);
  }

  if (user && (path === "/login" || path === "/registro")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (cuentaValida) {
    response.cookies.set(COOKIE_CUENTA, cuentaValida, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}
