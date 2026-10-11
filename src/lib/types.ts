/**
 * Open Market — tipos del dominio.
 * Reflejan 1:1 los enums y tablas de supabase/migrations/0001_schema.sql.
 */

export type AssetClass = "forex" | "crypto" | "index" | "stock";
export type AccountType = "real" | "demo";
export type Direccion = "compra" | "venta";
export type EstadoOperacion = "abierta" | "cerrada" | "no_activada";
export type EstadoRevision = "no_aplica" | "pendiente" | "revisado";

// ---------- Categorías de confirmación ----------

export type CategoriaTag = "estructura" | "entrada" | "salida";
/** Dentro de salida: si la confirmación define la zona de TP o la del stop. */
export type SubtipoSalida = "tp" | "stop";

export interface CategoriaTagMeta {
  valor: CategoriaTag;
  etiqueta: string;
  singular: string;
  descripcion: string;
  /** Pregunta que el tag responde, para orientar al usuario al crearlo. */
  pregunta: string;
  ejemplos: string;
}

export const CATEGORIAS_TAG: CategoriaTagMeta[] = [
  {
    valor: "estructura",
    etiqueta: "Estructura",
    singular: "estructura",
    descripcion: "Lo que te dice cómo está el mercado antes de pensar en entrar.",
    pregunta: "¿Qué estructura estabas leyendo?",
    ejemplos: "BOS alcista, rango lateral, tendencia bajista en H4, CHoCH",
  },
  {
    valor: "entrada",
    etiqueta: "Entrada",
    singular: "entrada",
    descripcion: "Lo que te dio permiso para tomar la posición.",
    pregunta: "¿Qué te confirmó la entrada?",
    ejemplos: "FVG sin mitigar, divergencia RSI, retest de zona, vela envolvente",
  },
  {
    valor: "salida",
    etiqueta: "Salida",
    singular: "salida",
    descripcion: "Dónde pusiste el objetivo y dónde el stop, y por qué ahí.",
    pregunta: "¿Cómo definiste tus zonas de salida?",
    ejemplos: "Liquidez del máximo previo, swing anterior, ATR × 1.5",
  },
];

export const CATEGORIA_TAG_MAP: Record<CategoriaTag, CategoriaTagMeta> = Object.fromEntries(
  CATEGORIAS_TAG.map((c) => [c.valor, c]),
) as Record<CategoriaTag, CategoriaTagMeta>;

export const SUBTIPO_SALIDA_LABEL: Record<SubtipoSalida, string> = {
  tp: "Zona de TP",
  stop: "Zona de stop",
};

// ---------- Tipos de orden ----------

export type TipoOrden = "buy" | "sell" | "buy_stop" | "sell_stop" | "buy_limit" | "sell_limit";

export interface TipoOrdenMeta {
  valor: TipoOrden;
  etiqueta: string;
  direccion: Direccion;
  /** Una orden a mercado se ejecuta al instante; una pendiente puede no llegar. */
  pendiente: boolean;
  descripcion: string;
}

export const TIPOS_ORDEN: TipoOrdenMeta[] = [
  {
    valor: "buy",
    etiqueta: "Buy",
    direccion: "compra",
    pendiente: false,
    descripcion: "Compra a mercado, ejecutada al momento.",
  },
  {
    valor: "sell",
    etiqueta: "Sell",
    direccion: "venta",
    pendiente: false,
    descripcion: "Venta a mercado, ejecutada al momento.",
  },
  {
    valor: "buy_stop",
    etiqueta: "Buy stop",
    direccion: "compra",
    pendiente: true,
    descripcion: "Compra por encima del precio: entra si el mercado rompe al alza.",
  },
  {
    valor: "sell_stop",
    etiqueta: "Sell stop",
    direccion: "venta",
    pendiente: true,
    descripcion: "Venta por debajo del precio: entra si el mercado rompe a la baja.",
  },
  {
    valor: "buy_limit",
    etiqueta: "Buy limit",
    direccion: "compra",
    pendiente: true,
    descripcion: "Compra por debajo del precio: espera a que el mercado retroceda.",
  },
  {
    valor: "sell_limit",
    etiqueta: "Sell limit",
    direccion: "venta",
    pendiente: true,
    descripcion: "Venta por encima del precio: espera a que el mercado suba primero.",
  },
];

export const TIPO_ORDEN_MAP: Record<TipoOrden, TipoOrdenMeta> = Object.fromEntries(
  TIPOS_ORDEN.map((t) => [t.valor, t]),
) as Record<TipoOrden, TipoOrdenMeta>;

export function esOrdenPendiente(tipo: TipoOrden): boolean {
  return TIPO_ORDEN_MAP[tipo].pendiente;
}

export type TipoCierre =
  | "stop_caceria"
  | "stop_contra"
  | "tp_justo"
  | "tp_corto"
  | "break_even"
  | "cierre_correcto"
  | "cierre_incorrecto"
  | "reversion";

/** Campo numérico extra que habilita cada tipo de cierre (null = ninguno). */
export type CampoMedicion =
  | "margen_error_precio"
  | "no_capturado_precio"
  | "devuelto_precio"
  | null;

export interface TipoCierreMeta {
  valor: TipoCierre;
  etiqueta: string;
  /** "inmediato" se puede clasificar al cerrar; "revision" se sabe después. */
  momento: "inmediato" | "revision";
  /** Qué mide este tipo de cierre. */
  mide: string;
  descripcion: string;
  campo: CampoMedicion;
  campoEtiqueta?: string;
  campoAyuda?: string;
  /** Signo con el que se pinta en la UI (verde / negro / neutro). */
  tono: "positivo" | "negativo" | "neutro";
}

/** Fuente de verdad de la sección 5 del spec: los 8 tipos de cierre. */
export const TIPOS_CIERRE: TipoCierreMeta[] = [
  {
    valor: "stop_caceria",
    etiqueta: "Stop cacería",
    momento: "revision",
    mide: "Precisión de la zona de entrada",
    descripcion:
      "El mercado te sacó por poco y después fue a favor. Mide qué tan ajustada quedó la entrada o el stop.",
    campo: "margen_error_precio",
    campoEtiqueta: "Margen de error",
    campoAyuda: "Cuánto faltó para que el stop aguantara.",
    tono: "negativo",
  },
  {
    valor: "stop_contra",
    etiqueta: "Stop en contra",
    momento: "inmediato",
    mide: "Calidad de lectura de estructura",
    descripcion:
      "El precio siguió en contra: la lectura de tendencia o estructura estuvo equivocada.",
    campo: null,
    tono: "negativo",
  },
  {
    valor: "tp_justo",
    etiqueta: "TP justo",
    momento: "revision",
    mide: "Ubicación de las zonas de TP",
    descripcion: "El precio revirtió justo en tu take profit. La zona estaba bien elegida.",
    campo: null,
    tono: "positivo",
  },
  {
    valor: "tp_corto",
    etiqueta: "TP corto",
    momento: "revision",
    mide: "Objetivo de ganancia corto",
    descripcion: "El precio siguió bastante más allá de tu TP. Dejaste recorrido sobre la mesa.",
    campo: "no_capturado_precio",
    campoEtiqueta: "No capturado",
    campoAyuda: "Cuánto siguió el precio después de tu TP.",
    tono: "positivo",
  },
  {
    valor: "break_even",
    etiqueta: "Break even",
    momento: "inmediato",
    mide: "Operaciones que vuelven a la entrada",
    descripcion: "La operación regresó al punto de entrada antes de llegar a TP o SL.",
    campo: null,
    tono: "neutro",
  },
  {
    valor: "cierre_correcto",
    etiqueta: "Cierre correcto",
    momento: "revision",
    mide: "Validación de cerrar antes",
    descripcion: "Cerraste antes de tiempo y fue lo correcto: el precio no habría llegado al TP.",
    campo: null,
    tono: "positivo",
  },
  {
    valor: "cierre_incorrecto",
    etiqueta: "Cierre incorrecto",
    momento: "revision",
    mide: "Ansiedad y disciplina",
    descripcion: "Cerraste antes de tiempo sin necesidad. El precio sí iba a llegar al objetivo.",
    campo: "no_capturado_precio",
    campoEtiqueta: "No capturado",
    campoAyuda: "Cuánto habrías ganado de más si no cerrabas.",
    tono: "negativo",
  },
  {
    valor: "reversion",
    etiqueta: "Reversión",
    momento: "inmediato",
    mide: "TPs largos y fuerza real de la tendencia",
    descripcion:
      "La operación llegó a estar bien a favor y devolvió el recorrido antes de cerrar.",
    campo: "devuelto_precio",
    campoEtiqueta: "Devuelto",
    campoAyuda: "Cuánto devolvió desde el máximo flotante a favor.",
    tono: "negativo",
  },
];

export const TIPO_CIERRE_MAP: Record<TipoCierre, TipoCierreMeta> = Object.fromEntries(
  TIPOS_CIERRE.map((t) => [t.valor, t]),
) as Record<TipoCierre, TipoCierreMeta>;

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  forex: "Forex",
  crypto: "Cripto",
  index: "Índices",
  stock: "Acciones",
};

// ---------- Filas de base de datos ----------

export interface TradingAccount {
  id: string;
  user_id: string;
  nombre: string;
  broker: string | null;
  moneda_base: string;
  tipo: AccountType;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Instrument {
  id: string;
  user_id: string | null;
  simbolo: string;
  nombre: string;
  asset_class: AssetClass;
  decimales_precio: number;
  /** Tamaño de un pip (forex/metales) o de un punto (resto) en precio. */
  valor_pip: number;
  /** Precio orientativo del par. No es una cotización en vivo. */
  precio_referencia: number | null;
  referencia_actualizada: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  nombre: string;
  categoria: CategoriaTag;
  /** Solo en categoria="salida"; null en el resto. */
  subtipo_salida: SubtipoSalida | null;
  created_at: string;
}

/** Los tags de una operación, ya repartidos por categoría. */
export interface TagsPorCategoria {
  estructura: TagResumen[];
  entrada: TagResumen[];
  salidaTp: TagResumen[];
  salidaStop: TagResumen[];
}

export type TagResumen = Pick<Tag, "id" | "nombre" | "categoria" | "subtipo_salida">;

export function repartirPorCategoria(tags: TagResumen[]): TagsPorCategoria {
  return {
    estructura: tags.filter((t) => t.categoria === "estructura"),
    entrada: tags.filter((t) => t.categoria === "entrada"),
    salidaTp: tags.filter((t) => t.categoria === "salida" && t.subtipo_salida === "tp"),
    salidaStop: tags.filter((t) => t.categoria === "salida" && t.subtipo_salida === "stop"),
  };
}

export interface Trade {
  id: string;
  user_id: string;
  trading_account_id: string;
  instrument_id: string;
  tipo_orden: TipoOrden;
  /** Columna generada a partir de tipo_orden: nunca se escribe a mano. */
  direccion: Direccion;
  /** Solo en órdenes pendientes: si el precio llegó a tocar la orden. */
  orden_activada: boolean | null;
  fecha_hora_entrada: string;
  fecha_hora_salida: string | null;
  precio_entrada: number;
  precio_salida: number | null;
  /** Niveles planificados al abrir. Permiten calcular riesgo, objetivo y R:R. */
  precio_tp: number | null;
  precio_stop: number | null;
  /** Lo que le faltó al precio para tocar una orden pendiente que no se activó. */
  distancia_no_activada: number | null;
  lotaje: number | null;
  resultado_dinero: number | null;
  estado_operacion: EstadoOperacion;
  estado_revision: EstadoRevision;
  tipo_cierre: TipoCierre | null;
  margen_error_precio: number | null;
  no_capturado_precio: number | null;
  devuelto_precio: number | null;
  notas: string | null;
  captura_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Trade con sus relaciones resueltas, tal como lo consumen las vistas. */
export interface TradeCompleto extends Trade {
  instrument: Pick<
    Instrument,
    | "id"
    | "simbolo"
    | "nombre"
    | "asset_class"
    | "decimales_precio"
    | "valor_pip"
    | "precio_referencia"
  >;
  account: Pick<TradingAccount, "id" | "nombre" | "moneda_base" | "tipo">;
  tags: TagResumen[];
}
