// Tipos compartidos entre el servidor (Colyseus) y el cliente (React + Phaser).
// Mantener estos tipos en el paquete `shared` evita duplicación y garantiza
// que ambos extremos hablen el mismo "idioma" sobre el estado del juego.

// ────────────────────────────────────────────────────────────────────────────
// Recursos y terreno
// ────────────────────────────────────────────────────────────────────────────

/** Los cinco recursos producibles + el "desierto" que no produce. */
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

/** Cada recurso está asociado a un tipo de terreno. */
export type TerrainType = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert';

/** Conversión terreno → recurso que produce (desierto no produce). */
export const TERRAIN_RESOURCE: Record<TerrainType, ResourceType | null> = {
  forest: 'wood',
  hills: 'brick',
  pasture: 'sheep',
  fields: 'wheat',
  mountains: 'ore',
  desert: null,
};

/** Nombre legible de cada recurso (para UI). */
export const RESOURCE_LABEL: Record<ResourceType, string> = {
  wood: 'Madera',
  brick: 'Arcilla',
  sheep: 'Lana',
  wheat: 'Trigo',
  ore: 'Mineral',
};

/** Inventario de recursos de un jugador. */
export type Resources = Record<ResourceType, number>;

/** Crea un inventario vacío. */
export function emptyResources(): Resources {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Jugadores y colores
// ────────────────────────────────────────────────────────────────────────────

/** Colores disponibles para los jugadores (estilo Catán clásico). */
export const PLAYER_COLORS = ['#d23636', '#2f7fe0', '#33a14b', '#e0a72f'] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

/** Cantidad mínima y máxima de jugadores en una partida. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

/** Puntos necesarios para ganar. */
export const POINTS_TO_WIN = 10;

// ────────────────────────────────────────────────────────────────────────────
// Construcciones
// ────────────────────────────────────────────────────────────────────────────

export type BuildingType = 'settlement' | 'city' | 'road';

/** Coste en recursos de cada construcción. */
export const BUILD_COST: Record<BuildingType, Partial<Resources>> = {
  // Poblado: 1 madera + 1 arcilla + 1 lana + 1 trigo
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  // Ciudad (mejora de poblado): 2 trigo + 3 mineral
  city: { wheat: 2, ore: 3 },
  // Camino: 1 madera + 1 arcilla
  road: { wood: 1, brick: 1 },
};

/** Puntos de victoria que otorga cada construcción. */
export const BUILD_POINTS: Record<BuildingType, number> = {
  settlement: 1,
  city: 2,
  road: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// Fases del juego
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fases:
 * - lobby:    esperando jugadores
 * - setup:    colocación inicial (2 poblados + 2 camos por jugador, en orden y reversa)
 * - roll:     inicio del turno, el jugador debe tirar dados
 * - play:     el jugador puede construir/comerciar/terminar turno
 * - robber:   salió un 7, el jugador debe mover el robador y robar
 * - ended:    partida finalizada
 */
export type GamePhase = 'lobby' | 'setup' | 'roll' | 'play' | 'robber' | 'ended';

// ────────────────────────────────────────────────────────────────────────────
// Tablero hexagonal
// ────────────────────────────────────────────────────────────────────────────

/** Coordenadas axiales (q, r) para hexágonos. */
export interface Axial {
  q: number;
  r: number;
}

/** Un hexágono del tablero. */
export interface Hex {
  id: string;
  q: number;
  r: number;
  terrain: TerrainType;
  /** Número del token (2-12) o null si es desierto. */
  number: number | null;
  /** ¿El robador está actualmente aquí? */
  hasRobber: boolean;
}

/** Un vértice del tablero (esquina entre 2-3 hexágonos). */
export interface Vertex {
  id: string;
  /** Coordenadas axial-like del vértice (usamos triple (q,r,v) con v en 0..5). */
  q: number;
  r: number;
  v: number;
  /** Edificio construido o null. */
  building: { owner: string; type: 'settlement' | 'city' } | null;
}

/** Una arista del tablero (lado entre 2 hexágonos) donde se ponen caminos. */
export interface Edge {
  id: string;
  /** Índices de los dos vértices que conecta. */
  a: string;
  b: string;
  /** Camino construido o null. */
  road: { owner: string } | null;
}

/** Estructura completa del tablero. */
export interface Board {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
}
