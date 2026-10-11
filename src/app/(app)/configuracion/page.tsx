import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListaCuentas, type CuentaConUso } from "@/components/cuentas/lista-cuentas";
import {
  PanelInstrumentos,
  type InstrumentoConEstado,
} from "@/components/instrumentos/panel-instrumentos";
import { PanelTags, type TagConUso } from "@/components/tags/panel-tags";
import { requerirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Instrument, Tag, TradingAccount } from "@/lib/types";

export const metadata = { title: "Configuración — Open Market" };

export default async function ConfiguracionPage() {
  await requerirUsuario();
  const supabase = await createClient();

  // RLS recorta cada consulta al usuario de la sesión. instruments incluye
  // además el catálogo del sistema (user_id null), visible para todos.
  const [
    { data: cuentas },
    { data: instrumentos },
    { data: tags },
    { data: seguidos },
    { data: tradesCuenta },
    { data: tradesInstrumento },
    { data: usosTags },
  ] = await Promise.all([
    supabase
      .from("trading_accounts")
      .select("*")
      .order("activo", { ascending: false })
      .order("nombre"),
    supabase
      .from("instruments")
      .select("*")
      .order("asset_class")
      .order("simbolo"),
    supabase.from("tags").select("*").order("nombre"),
    supabase.from("user_instruments").select("instrument_id"),
    supabase.from("trades").select("trading_account_id"),
    supabase.from("trades").select("instrument_id"),
    supabase.from("trade_tags").select("tag_id"),
  ]);

  const contar = <T extends string>(filas: Record<T, string>[] | null, campo: T) => {
    const mapa = new Map<string, number>();
    for (const fila of filas ?? []) {
      const id = fila[campo];
      mapa.set(id, (mapa.get(id) ?? 0) + 1);
    }
    return mapa;
  };

  const usoCuentas = contar(tradesCuenta, "trading_account_id");
  const usoInstrumentos = contar(tradesInstrumento, "instrument_id");
  const usoTags = contar(usosTags, "tag_id");
  const idsSeguidos = new Set((seguidos ?? []).map((s) => s.instrument_id as string));

  const cuentasConUso: CuentaConUso[] = ((cuentas ?? []) as TradingAccount[]).map((c) => ({
    ...c,
    operaciones: usoCuentas.get(c.id) ?? 0,
  }));

  // Los seguidos suben arriba; el resto mantiene el orden por clase y símbolo.
  const instrumentosConEstado: InstrumentoConEstado[] = ((instrumentos ?? []) as Instrument[])
    .map((i) => ({
      ...i,
      seguido: idsSeguidos.has(i.id),
      operaciones: usoInstrumentos.get(i.id) ?? 0,
    }))
    .sort((a, b) => Number(b.seguido) - Number(a.seguido));

  const tagsConUso: TagConUso[] = ((tags ?? []) as Tag[]).map((t) => ({
    ...t,
    usos: usoTags.get(t.id) ?? 0,
  }));

  return (
    <>
      <Topbar
        titulo="Configuración"
        descripcion="Cuentas de trading, instrumentos y biblioteca de tags"
        acciones={<span />}
      />

      <main className="p-5 sm:p-8">
        <Tabs defaultValue="cuentas">
          <TabsList>
            <TabsTrigger value="cuentas">
              Cuentas
              <span className="text-xs text-muted-foreground">{cuentasConUso.length}</span>
            </TabsTrigger>
            <TabsTrigger value="instrumentos">
              Instrumentos
              <span className="text-xs text-muted-foreground">{idsSeguidos.size}</span>
            </TabsTrigger>
            <TabsTrigger value="tags">
              Tags
              <span className="text-xs text-muted-foreground">{tagsConUso.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cuentas">
            <Card>
              <CardContent className="pt-5">
                <ListaCuentas cuentas={cuentasConUso} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instrumentos">
            <Card>
              <CardContent className="pt-5">
                <PanelInstrumentos instrumentos={instrumentosConEstado} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardContent className="pt-5">
                <PanelTags tags={tagsConUso} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
