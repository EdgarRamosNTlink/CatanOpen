// Reglas de Catán: validación de construcciones, adyacencia y costes.
// Estas funciones son puras y operan sobre los esquemas de Colyseus.
// El servidor las usa para rechazar movimientos ilegales del cliente.

import type { GameState } from '../state/GameState.js';
import type { EdgeSchema, HexSchema, VertexSchema } from '../state/BoardSchema.js';
import type { PlayerSchema } from '../state/PlayerSchema.js';
import {
  BUILD_COST,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  POINTS_TO_WIN,
  hexVertices,
  type Resources,
} from '@catan/shared';

// Límites físicos de piezas en Catán.
export const LIMIT_SETTLEMENTS = 5;
export const LIMIT_CITIES = 4;
export const LIMIT_ROADS = 15;

// ────────────────────────────────────────────────────────────────────────────
// Helpers de búsqueda sobre el estado
// ────────────────────────────────────────────────────────────────────────────

export function getVertex(state: GameState, id: string): VertexSchema | undefined {
  return state.vertices.find((v) => v.id === id);
}

export function getEdge(state: GameState, id: string): EdgeSchema | undefined {
  return state.edges.find((e) => e.id === id);
}

export function getHex(state: GameState, id: string): HexSchema | undefined {
  return state.hexes.find((h) => h.id === id);
}

export function getPlayer(state: GameState, id: string): PlayerSchema | undefined {
  return state.players.get(id);
}

/** Devuelve los ids de vértices adyacentes (conectados por una arista) al dado. */
export function neighborVertices(state: GameState, vertexId: string): string[] {
  const out: string[] = [];
  for (const e of state.edges) {
    if (e.a === vertexId) out.push(e.b);
    else if (e.b === vertexId) out.push(e.a);
  }
  return out;
}

/** Devuelve los ids de aristas que tocan el vértice dado. */
export function edgesAtVertex(state: GameState, vertexId: string): string[] {
  const out: string[] = [];
  for (const e of state.edges) {
    if (e.a === vertexId || e.b === vertexId) out.push(e.id);
  }
  return out;
}

/** Devuelve los ids de hexágonos que tocan el vértice dado (para recolección). */
export function hexesAtVertex(state: GameState, vertexId: string): string[] {
  const vx = getVertex(state, vertexId);
  if (!vx) return [];
  // Un vértice pertenece a un hex si su posición cartesiana coincide con una
  // de las 6 esquinas del hex. Comparamos con redondeo a 3 decimales.
  const out: string[] = [];
  const vxPos = hexVertices(vx.q, vx.r)[vx.v];
  for (const h of state.hexes) {
    const pts = hexVertices(h.q, h.r);
    for (const p of pts) {
      if (
        Math.round(p.x * 1000) === Math.round(vxPos.x * 1000) &&
        Math.round(p.y * 1000) === Math.round(vxPos.y * 1000)
      ) {
        out.push(h.id);
        break;
      }
    }
  }
  return out;
}

/** Vértices adyacentes a un hex (sus 6 esquinas, por id). */
export function verticesAtHex(state: GameState, hexId: string): string[] {
  const hex = getHex(state, hexId);
  if (!hex) return [];
  const pts = hexVertices(hex.q, hex.r);
  const out: string[] = [];
  for (const p of pts) {
    for (const v of state.vertices) {
      const vp = hexVertices(v.q, v.r)[v.v];
      if (
        Math.round(vp.x * 1000) === Math.round(p.x * 1000) &&
        Math.round(vp.y * 1000) === Math.round(p.y * 1000)
      ) {
        out.push(v.id);
        break;
      }
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Inventario de recursos del jugador (lectura/escritura)
// ────────────────────────────────────────────────────────────────────────────

export function getResources(p: PlayerSchema): Resources {
  return {
    wood: p.wood,
    brick: p.brick,
    sheep: p.sheep,
    wheat: p.wheat,
    ore: p.ore,
  };
}

/** Resta recursos; devuelve false si no hay suficientes. */
export function payResources(p: PlayerSchema, cost: Partial<Resources>): boolean {
  const have = getResources(p);
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    if (have[k] < (cost[k] ?? 0)) return false;
  }
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    p[k] = have[k] - (cost[k] ?? 0);
  }
  return true;
}

/** Suma recursos a un jugador. */
export function addResources(p: PlayerSchema, add: Partial<Resources>): void {
  p.wood += add.wood ?? 0;
  p.brick += add.brick ?? 0;
  p.sheep += add.sheep ?? 0;
  p.wheat += add.wheat ?? 0;
  p.ore += add.ore ?? 0;
}

export function totalResources(p: PlayerSchema): number {
  return p.wood + p.brick + p.sheep + p.wheat + p.ore;
}

// ────────────────────────────────────────────────────────────────────────────
// Validaciones de construcción
// ────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * ¿Puede el jugador colocar un poblado en el vértice?
 * - `free`: true en la fase de setup (no cuesta recursos ni requiere camino adyacente).
 */
export function canBuildSettlement(
  state: GameState,
  playerId: string,
  vertexId: string,
  free: boolean,
): ValidationResult {
  const vx = getVertex(state, vertexId);
  const p = getPlayer(state, playerId);
  if (!vx || !p) return { ok: false, reason: 'Elemento inválido' };
  if (vx.buildingType !== '') return { ok: false, reason: 'Vértice ocupado' };
  // Regla de distancia: ningún vértice adyacente puede tener poblado.
  for (const nid of neighborVertices(state, vertexId)) {
    const nv = getVertex(state, nid);
    if (nv && nv.buildingType !== '') return { ok: false, reason: 'Poblado adyacente' };
  }
  // Límite de piezas.
  if (p.settlements >= LIMIT_SETTLEMENTS) return { ok: false, reason: 'Sin poblados' };
  if (!free) {
    // Debe tener un camino del jugador en alguna arista adyacente.
    const hasRoad = edgesAtVertex(state, vertexId).some((eid) => {
      const e = getEdge(state, eid);
      return e && e.owner === playerId;
    });
    if (!hasRoad) return { ok: false, reason: 'Sin camino adyacente' };
    if (!canAfford(p, BUILD_COST.settlement)) return { ok: false, reason: 'Sin recursos' };
  }
  return { ok: true };
}

/** ¿Puede el jugador mejorar su poblado a ciudad en el vértice? */
export function canBuildCity(
  state: GameState,
  playerId: string,
  vertexId: string,
): ValidationResult {
  const vx = getVertex(state, vertexId);
  const p = getPlayer(state, playerId);
  if (!vx || !p) return { ok: false, reason: 'Elemento inválido' };
  if (vx.buildingType !== 'settlement') return { ok: false, reason: 'No hay poblado' };
  if (vx.owner !== playerId) return { ok: false, reason: 'Poblado ajeno' };
  if (p.cities >= LIMIT_CITIES) return { ok: false, reason: 'Sin ciudades' };
  if (!canAfford(p, BUILD_COST.city)) return { ok: false, reason: 'Sin recursos' };
  return { ok: true };
}

/**
 * ¿Puede el jugador colocar un camino en la arista?
 * - `free`: true en setup (debe ser adyacente al último poblado colocado).
 * - `lastSettlementVertex`: en setup, id del último poblado colocado (validar adyacencia).
 */
export function canBuildRoad(
  state: GameState,
  playerId: string,
  edgeId: string,
  free: boolean,
  lastSettlementVertex?: string,
): ValidationResult {
  const e = getEdge(state, edgeId);
  const p = getPlayer(state, playerId);
  if (!e || !p) return { ok: false, reason: 'Elemento inválido' };
  if (e.owner !== '') return { ok: false, reason: 'Arista ocupada' };
  if (p.roads >= LIMIT_ROADS) return { ok: false, reason: 'Sin caminos' };

  if (free) {
    // En setup: debe ser adyacente al último poblado del jugador.
    if (!lastSettlementVertex) return { ok: false, reason: 'Falta referencia' };
    if (e.a !== lastSettlementVertex && e.b !== lastSettlementVertex) {
      return { ok: false, reason: 'Camino no toca tu poblado' };
    }
  } else {
    // En play: debe conectar con un poblado/ciudad propio o un camino propio.
    const aOk =
      getVertex(state, e.a)?.owner === playerId && getVertex(state, e.a)?.buildingType !== '';
    const bOk =
      getVertex(state, e.b)?.owner === playerId && getVertex(state, e.b)?.buildingType !== '';
    const roadAdj = edgesAtVertex(state, e.a)
      .concat(edgesAtVertex(state, e.b))
      .some((eid) => {
        if (eid === edgeId) return false;
        const ee = getEdge(state, eid);
        return ee && ee.owner === playerId;
      });
    if (!aOk && !bOk && !roadAdj) return { ok: false, reason: 'Sin conexión' };
    if (!canAfford(p, BUILD_COST.road)) return { ok: false, reason: 'Sin recursos' };
  }
  return { ok: true };
}

function canAfford(p: PlayerSchema, cost: Partial<Resources>): boolean {
  return (
    p.wood >= (cost.wood ?? 0) &&
    p.brick >= (cost.brick ?? 0) &&
    p.sheep >= (cost.sheep ?? 0) &&
    p.wheat >= (cost.wheat ?? 0) &&
    p.ore >= (cost.ore ?? 0)
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Utilidades de jugadores
// ────────────────────────────────────────────────────────────────────────────

/** Orden de turnos: lista estable de sessionIds. */
export function orderedPlayers(state: GameState): string[] {
  return Array.from(state.players.keys());
}

/** Reasigna colores a los jugadores según su orden de entrada. */
export function assignColors(state: GameState): void {
  const ids = orderedPlayers(state);
  ids.forEach((id, i) => {
    const p = state.players.get(id);
    if (p) p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });
}

export function enoughPlayers(state: GameState): boolean {
  return state.players.size >= MIN_PLAYERS && state.players.size <= MAX_PLAYERS;
}

export function hasWinner(state: GameState): string | null {
  for (const id of state.players.keys()) {
    const p = state.players.get(id)!;
    if (p.points >= POINTS_TO_WIN) return id;
  }
  return null;
}
