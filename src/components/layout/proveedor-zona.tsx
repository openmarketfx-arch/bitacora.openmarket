"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_ZONA, ZONA_POR_DEFECTO, zonaValida } from "@/lib/zona";

const ContextoZona = createContext<string>(ZONA_POR_DEFECTO);

/**
 * Reparte a los componentes de cliente la misma zona con la que el servidor
 * renderizó la página. Usar la del navegador directamente haría que el HTML del
 * servidor y el del cliente no coincidieran (error de hidratación).
 */
export function ProveedorZona({ zona, children }: { zona: string; children: React.ReactNode }) {
  return <ContextoZona.Provider value={zona}>{children}</ContextoZona.Provider>;
}

export function useZona(): string {
  return useContext(ContextoZona);
}

/**
 * Guarda la zona horaria del navegador en una cookie para que el servidor la
 * use al calcular días, horas y rangos. La primera visita llega sin cookie y se
 * renderiza en UTC; aquí se fija y se vuelve a pedir la página una sola vez.
 */
export function FijarZona() {
  const router = useRouter();
  const zonaServidor = useZona();

  useEffect(() => {
    const zonaNavegador = zonaValida(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (zonaNavegador === zonaServidor) return;

    document.cookie = `${COOKIE_ZONA}=${encodeURIComponent(zonaNavegador)}; path=/; max-age=31536000; SameSite=Lax`;

    // Si el navegador no deja guardar cookies no se recarga: sería un bucle.
    if (document.cookie.includes(`${COOKIE_ZONA}=`)) router.refresh();
  }, [zonaServidor, router]);

  return null;
}
