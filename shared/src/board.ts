// Generación y geometría del tablero hexagonal de Catán.
// El servidor llama a `generateBoard(seed)` para crear el tablero inicial;
// el cliente usa las funciones de geometría para dibujar en Phaser.

import type { Board, Edge, Hex, TerrainType, Vertex } from './types.js';

// ────────────────────────────────────────────────────────────────────────────
// Composición fija del tablero estándar de Catán (19 hexágonos)
// ────────────────────────────────────────────────────────────────────────────

// 4 bosques + 3 colinas + 4 pastos + 4 campos + 3 montañas + 1 desierto = 19
const HEX_TERRAINS: TerrainType[] = [
  'forest', 'forest', 'forest', 'forest',
  'hills', 'hills', 'hills',
  'pasture', 'pasture', 'pasture', 'pasture',
  'fields', 'fields', 'fields', 'fields',
  'mountains', 'mountains', 'mountains',
  'desert',
];

// 18 números (el desierto no recibe número). Distribución oficial de Catán.
const HEX_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// ────────────────────────────────────────────────────────────────────────────
// Geometría hexagonal (orientación "pointy-top", punta arriba)
// ────────────────────────────────────────────────────────────────────────────

// Lado del hexágono en unidades lógicas (el cliente lo escala a píxeles).
export const HEX_SIZE = 1;

const SQRT3 = Math.sqrt(3);

// Offsets de los 6 vértices respecto al centro, en sentido horario desde arriba.
// Coordenadas de pantalla con eje Y hacia abajo (estándar canvas/Phaser).
export const VERTEX_OFFSETS: Array<{ x: number; y: number }> = [
  { x: 0, y: -1 },                  // 0: arriba
  { x: SQRT3 / 2, y: -0.5 },        // 1: arriba-derecha
  { x: SQRT3 / 2, y: 0.5 },         // 2: abajo-derecha
  { x: 0, y: 1 },                   // 3: abajo
  { x: -SQRT3 / 2, y: 0.5 },        // 4: abajo-izquierda
  { x: -SQRT3 / 2, y: -0.5 },       // 5: arriba-izquierda
];

// Posición del centro de un hex axial (q, r) en coordenadas lógicas.
export function hexCenter(q: number, r: number): { x: number; y: number } {
  return {
    x: SQRT3 * (q + r / 2),
    y: 1.5 * r,
  };
}

// Devuelve las 6 posiciones cartesianas de los vértices de un hex.
export function hexVertices(q: number, r: number): Array<{ x: number; y: number }> {
  const c = hexCenter(q, r);
  return VERTEX_OFFSETS.map((o) => ({ x: c.x + o.x, y: c.y + o.y }));
}

// Distancia axial entre dos hexes (0 = mismo hex).
export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// ────────────────────────────────────────────────────────────────────────────
// PRNG seedable (mulberry32) para que el tablero sea reproducible por semilla
// ────────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ────────────────────────────────────────────────────────────────────────────
// Generación del tablero
// ────────────────────────────────────────────────────────────────────────────

// Lista de coordenadas axiales para un tablero en forma de gran hexágono
// de radio N (N=2 → 19 hexes: disposición 3-4-5-4-3).
function axialHexes(radius: number): Array<{ q: number; r: number }> {
  const out: Array<{ q: number; r: number }> = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) out.push({ q, r });
  }
  return out;
}

// Clave estable para des-duplicar vértices por posición (redondeo a 3 decimales).
function posKey(x: number, y: number): string {
  return `${Math.round(x * 1000)}_${Math.round(y * 1000)}`;
}

/**
 * Genera un tablero completo de Catán:
 * - 19 hexágonos con terreno y número asignados aleatoriamente (seedable).
 * - Vértices des-duplicados por posición (~54).
 * - Aristas des-duplicadas por par de vértices (~72).
 * El robador empieza sobre el desierto.
 */
export function generateBoard(seed?: number): Board {
  const rng = mulberry32(seed ?? (Math.random() * 1e9) | 0);
  const coords = axialHexes(2);
  const terrains = shuffle(HEX_TERRAINS, rng);
  const numbers = shuffle(HEX_NUMBERS, rng);

  // 1. Crear los 19 hexágonos
  const hexes: Hex[] = [];
  let numIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const { q, r } = coords[i];
    const terrain = terrains[i];
    const number = terrain === 'desert' ? null : numbers[numIdx++];
    hexes.push({
      id: `h${i}`,
      q,
      r,
      terrain,
      number,
      hasRobber: terrain === 'desert',
    });
  }
  // Seguridad: si no hubiese desierto (imposible), el robador empieza en h0.
  if (!hexes.some((h) => h.hasRobber)) hexes[0].hasRobber = true;

  // 2. Crear vértices des-duplicando por posición.
  // Mantenemos un mapa posición → vértice, y un mapa vértice → hexes adyacentes.
  const vertexByPos = new Map<string, Vertex>();
  const vertexHexesMap = new Map<string, string[]>();

  for (const hex of hexes) {
    const pts = hexVertices(hex.q, hex.r);
    for (let v = 0; v < 6; v++) {
      const p = pts[v];
      const k = posKey(p.x, p.y);
      if (!vertexByPos.has(k)) {
        vertexByPos.set(k, {
          id: `v${vertexByPos.size}`,
          q: hex.q,
          r: hex.r,
          v,
          building: null,
        });
      }
      const list = vertexHexesMap.get(k) ?? [];
      list.push(hex.id);
      vertexHexesMap.set(k, list);
    }
  }
  const vertices = [...vertexByPos.values()];

  // Resolver ids de vértice a su lista de hexes adyacentes.
  const vertexHexes = new Map<string, string[]>();
  for (const [k, vx] of vertexByPos.entries()) {
    vertexHexes.set(vx.id, vertexHexesMap.get(k) ?? []);
  }

  // 3. Crear aristas: para cada hex, unir sus 6 vértices consecutivos.
  const edgeByKey = new Map<string, Edge>();
  for (const hex of hexes) {
    const pts = hexVertices(hex.q, hex.r);
    const vIds: string[] = pts.map((p) => vertexByPos.get(posKey(p.x, p.y))!.id);
    for (let v = 0; v < 6; v++) {
      const a = vIds[v];
      const b = vIds[(v + 1) % 6];
      const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!edgeByKey.has(ek)) {
        edgeByKey.set(ek, {
          id: `e${edgeByKey.size}`,
          a,
          b,
          road: null,
        });
      }
    }
  }
  const edges = [...edgeByKey.values()];

  return { hexes, vertices, edges };
}

// ────────────────────────────────────────────────────────────────────────────
// Relaciones del tablero (derivadas, útiles para validar construcciones)
// ────────────────────────────────────────────────────────────────────────────

/** Mapa vértice → ids de vértices adyacentes (conectados por una arista). */
export function buildVertexNeighbors(edges: Edge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    m.set(e.a, [...(m.get(e.a) ?? []), e.b]);
    m.set(e.b, [...(m.get(e.b) ?? []), e.a]);
  }
  return m;
}

/** Mapa vértice → ids de aristas que lo tocan. */
export function buildVertexEdges(edges: Edge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    m.set(e.a, [...(m.get(e.a) ?? []), e.id]);
    m.set(e.b, [...(m.get(e.b) ?? []), e.id]);
  }
  return m;
}

/** Mapa vértice → ids de hexágonos cuyas esquinas son ese vértice. */
export function buildVertexHexes(board: Board): Map<string, string[]> {
  // Construye posición → idVértice, y luego asigna cada hex a sus 6 vértices.
  const posToId = new Map<string, string>();
  for (const vx of board.vertices) {
    const pts = hexVertices(vx.q, vx.r);
    const p = pts[vx.v];
    posToId.set(posKey(p.x, p.y), vx.id);
  }
  const m = new Map<string, string[]>();
  for (const hex of board.hexes) {
    const pts = hexVertices(hex.q, hex.r);
    for (const p of pts) {
      const id = posToId.get(posKey(p.x, p.y));
      if (!id) continue;
      m.set(id, [...(m.get(id) ?? []), hex.id]);
    }
  }
  return m;
}
