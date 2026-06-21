// Definición de los mensajes que intercambian cliente (Colyseus SDK) y
// servidor (GameRoom). Centralizarlos aquí garantiza que ambos extremos
// usen exactamente el mismo nombre y forma de payload.

import type { ResourceType } from './types.js';

// ────────────────────────────────────────────────────────────────────────────
// Cliente → Servidor (acciones del jugador)
// ────────────────────────────────────────────────────────────────────────────

export interface RollDiceMsg {
  type: 'roll';
}

export interface EndTurnMsg {
  type: 'endTurn';
}

export interface BuildSettlementMsg {
  type: 'buildSettlement';
  vertexId: string;
  /** En fase de setup no cuesta recursos; en play sí. */
  free?: boolean;
}

export interface BuildCityMsg {
  type: 'buildCity';
  vertexId: string;
}

export interface BuildRoadMsg {
  type: 'buildRoad';
  edgeId: string;
  free?: boolean;
}

export interface MoveRobberMsg {
  type: 'moveRobber';
  hexId: string;
  /** Jugador del que robar (puede ser null si nadie tiene ciudad/poblado adyacente). */
  victimId?: string | null;
}

export interface TradeWithBankMsg {
  type: 'tradeBank';
  give: ResourceType;
  get: ResourceType;
}

export type ClientMessage =
  | RollDiceMsg
  | EndTurnMsg
  | BuildSettlementMsg
  | BuildCityMsg
  | BuildRoadMsg
  | MoveRobberMsg
  | TradeWithBankMsg;

// ────────────────────────────────────────────────────────────────────────────
// Servidor → Cliente (eventos puntuales, además del estado sincronizado)
// ────────────────────────────────────────────────────────────────────────────

/** Resultado de la tirada de dados, enviado como evento para animarlo en UI. */
export interface DiceRolledEvent {
  dice: [number, number];
  /** Recursos repartidos a cada jugador (playerId → {recurso: cantidad}). */
  yields: Record<string, Partial<Record<ResourceType, number>>>;
}

/** Notificación de chat / log del juego. */
export interface LogEvent {
  message: string;
  level?: 'info' | 'warn' | 'error';
}

/** Notificación cuando un jugador roba a otro con el robador. */
export interface RobberStolenEvent {
  fromId: string;
  toId: string;
  resource: ResourceType | null;
}

/** Fin de partida. */
export interface GameEndedEvent {
  winnerId: string;
}

export type ServerEvent =
  | DiceRolledEvent
  | LogEvent
  | RobberStolenEvent
  | GameEndedEvent;
