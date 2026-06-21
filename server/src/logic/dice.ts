// Lógica de dados, reparto de recursos y robo del bandolero.

import type { GameState } from '../state/GameState.js';
import type { PlayerSchema } from '../state/PlayerSchema.js';
import { TERRAIN_RESOURCE, type ResourceType } from '@catan/shared';
import { addResources, getVertex, verticesAtHex } from './rules.js';

/** Tirada de dos D6. */
export function rollDice(): [number, number] {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  return [d1, d2];
}

/**
 * Reparte recursos a todos los jugadores según la suma de los dados.
 * - Ignora el hex con el robador.
 * - El desierto (number = -1) nunca produce.
 * - Poblado → 1 recurso; ciudad → 2 recursos.
 * Devuelve un map playerId → {recurso: cantidad} para el evento de cliente.
 */
export function computeYields(
  state: GameState,
  sum: number,
): Record<string, Partial<Record<ResourceType, number>>> {
  const yields: Record<string, Partial<Record<ResourceType, number>>> = {};

  for (const hex of state.hexes) {
    if (hex.hasRobber) continue; // el robador bloquea producción
    if (hex.number !== sum) continue;
    const resource = TERRAIN_RESOURCE[hex.terrain as keyof typeof TERRAIN_RESOURCE];
    if (!resource) continue; // desierto u otro sin recurso

    for (const vxId of verticesAtHex(state, hex.id)) {
      const vx = getVertex(state, vxId);
      if (!vx || vx.buildingType === '' || vx.owner === '') continue;
      const amount = vx.buildingType === 'city' ? 2 : 1;
      if (!yields[vx.owner]) yields[vx.owner] = {};
      yields[vx.owner][resource] = (yields[vx.owner][resource] ?? 0) + amount;
    }
  }

  // Aplicar al inventario de cada jugador.
  for (const pid of Object.keys(yields)) {
    const p = state.players.get(pid);
    if (p) addResources(p, yields[pid]);
  }

  return yields;
}

export interface DiscardResult {
  playerId: string;
  discarded: Partial<Record<ResourceType, number>>;
}

/** Jugadores con >7 cartas descartan la mitad (redondeo abajo). */
export function discardHalf(state: GameState): DiscardResult[] {
  const results: DiscardResult[] = [];
  for (const pid of state.players.keys()) {
    const p = state.players.get(pid)!;
    const total = p.wood + p.brick + p.sheep + p.wheat + p.ore;
    if (total > 7) {
      const toDiscard = Math.floor(total / 2);
      const discarded = discardRandom(p, toDiscard);
      results.push({ playerId: pid, discarded });
    }
  }
  return results;
}

/** Descarta `n` recursos al azar del jugador. */
function discardRandom(p: PlayerSchema, n: number): Partial<Record<ResourceType, number>> {
  const pool: ResourceType[] = [];
  for (let i = 0; i < p.wood; i++) pool.push('wood');
  for (let i = 0; i < p.brick; i++) pool.push('brick');
  for (let i = 0; i < p.sheep; i++) pool.push('sheep');
  for (let i = 0; i < p.wheat; i++) pool.push('wheat');
  for (let i = 0; i < p.ore; i++) pool.push('ore');
  // Fisher-Yates shuffle.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const take = pool.slice(0, n);
  const discarded: Partial<Record<ResourceType, number>> = {};
  for (const r of take) discarded[r] = (discarded[r] ?? 0) + 1;
  p.wood -= discarded.wood ?? 0;
  p.brick -= discarded.brick ?? 0;
  p.sheep -= discarded.sheep ?? 0;
  p.wheat -= discarded.wheat ?? 0;
  p.ore -= discarded.ore ?? 0;
  return discarded;
}

/** Roba 1 recurso al azar de `from` y se lo da a `to`. Devuelve el recurso robado o null. */
export function stealRandom(from: PlayerSchema, to: PlayerSchema): ResourceType | null {
  const pool: ResourceType[] = [];
  for (let i = 0; i < from.wood; i++) pool.push('wood');
  for (let i = 0; i < from.brick; i++) pool.push('brick');
  for (let i = 0; i < from.sheep; i++) pool.push('sheep');
  for (let i = 0; i < from.wheat; i++) pool.push('wheat');
  for (let i = 0; i < from.ore; i++) pool.push('ore');
  if (pool.length === 0) return null;
  const r = pool[Math.floor(Math.random() * pool.length)];
  switch (r) {
    case 'wood': from.wood--; to.wood++; break;
    case 'brick': from.brick--; to.brick++; break;
    case 'sheep': from.sheep--; to.sheep++; break;
    case 'wheat': from.wheat--; to.wheat++; break;
    case 'ore': from.ore--; to.ore++; break;
  }
  return r;
}

/** Jugadores con construcciones adyacentes a un hex, exceptuando `exceptId`. */
export function playersAdjacentToHex(state: GameState, hexId: string, exceptId: string): string[] {
  const ids = new Set<string>();
  for (const vxId of verticesAtHex(state, hexId)) {
    const vx = getVertex(state, vxId);
    if (vx && vx.buildingType !== '' && vx.owner !== '' && vx.owner !== exceptId) {
      ids.add(vx.owner);
    }
  }
  return [...ids];
}
