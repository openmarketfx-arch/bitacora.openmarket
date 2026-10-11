"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const TIPOS_OK = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  /** Ruta dentro del bucket trade-captures, o null si no hay captura. */
  valor: string | null;
  onChange: (ruta: string | null) => void;
}

export function SubidorCaptura({ valor, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  async function subir(archivo: File) {
    if (!TIPOS_OK.includes(archivo.type)) {
      toast.error("Solo PNG, JPG, WEBP o GIF.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      toast.error("La imagen pesa más de 5 MB.");
      return;
    }

    setSubiendo(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubiendo(false);
      toast.error("Se perdió la sesión. Vuelve a entrar.");
      return;
    }

    // El primer segmento de la ruta es el user_id: es lo que usan las
    // políticas del bucket para aislar las capturas de cada usuario.
    const extension = archivo.name.split(".").pop()?.toLowerCase() || "png";
    const ruta = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("trade-captures")
      .upload(ruta, archivo, { cacheControl: "3600", upsert: false });

    setSubiendo(false);

    if (error) {
      toast.error(`No se pudo subir la captura: ${error.message}`);
      return;
    }

    setVistaPrevia(URL.createObjectURL(archivo));
    onChange(ruta);
  }

  async function quitar() {
    if (valor) {
      const supabase = createClient();
      await supabase.storage.from("trade-captures").remove([valor]);
    }
    setVistaPrevia(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_OK.join(",")}
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) void subir(archivo);
        }}
      />

      {valor ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-2">
          {vistaPrevia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vistaPrevia}
              alt="Captura del gráfico"
              className="h-14 w-24 rounded object-cover"
            />
          ) : (
            <div className="flex h-14 w-24 items-center justify-center rounded bg-muted">
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="flex-1 truncate text-xs text-muted-foreground">
            Captura adjunta
          </span>
          <Button type="button" variant="ghost" size="icon" onClick={quitar} aria-label="Quitar captura">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          {subiendo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {subiendo ? "Subiendo…" : "Adjuntar captura"}
        </Button>
      )}
    </div>
  );
}
