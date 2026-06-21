// Store global del cliente con Zustand. Mantiene:
// - La conexión a Colyseus (Client + Room).
// - Un snapshot plano del estado del juego, reconstruido en cada cambio.
// - Los logs y eventos puntuales (tirada, robo del bandolero, fin de partida).
// - Acciones que envían mensajes al servidor.

import { create } from 'zustand';
import { Client, Room } from 'colyseus.js';
import {
  type ClientGameState,
  type ClientPlayer,
  type LogEntry,
} from './types';

// URL del servidor Colyseus. En desarrollo es localhost:2567.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:2567';

interface GameStore {
  // Estado de conexión.
  client: Client | null;
  room: Room | null;
  localId: string;
  connecting: boolean;
  error: string | null;

  // Snapshot del estado del juego (null hasta que entre en una sala).
  state: ClientGameState | null;

  // Logs y eventos.
  logs: LogEntry[];
  lastDice: { d1: number; d2: number; yields: Record<string, Partial<Record<string, number>>> } | null;
  lastSteal: { fromId: string; toId: string; resource: string | null } | null;
  winnerId: string | null;

  // Acciones.
  connectAndJoin: (name: string) => Promise<void>;
  start: () => Promise<void>;
  reset: () => void;
  roll: () => void;
  endTurn: () => void;
  buildSettlement: (vertexId: string, free?: boolean) => void;
  buildCity: (vertexId: string) => void;
  buildRoad: (edgeId: string, free?: boolean) => void;
  moveRobber: (hexId: string, victimId?: string | null) => void;
  tradeBank: (give: string, get: string) => void;
  leave: () => Promise<void>;
  clearError: () => void;
}

let logCounter = 0;

// Construye un snapshot plano del estado Schema de Colyseus.
// Se llama en cada onStateChange para que React reciba datos inmutables.
function snapshotFromState(s: any): ClientGameState {
  const players = new Map<string, ClientPlayer>();
  // MapSchema expone forEach((value, key)) al estilo Map.
  s.players.forEach((p: any, id: string) => {
    players.set(id, {
      id: p.id,
      name: p.name,
      color: p.color,
      points: p.points,
      wood: p.wood,
      brick: p.brick,
      sheep: p.sheep,
      wheat: p.wheat,
      ore: p.ore,
      isActive: p.isActive,
      settlements: p.settlements,
      cities: p.cities,
      roads: p.roads,
    });
  });
  const mapHex = (h: any) => ({
    id: h.id, q: h.q, r: h.r, terrain: h.terrain,
    number: h.number, hasRobber: h.hasRobber,
  });
  const mapVx = (v: any) => ({
    id: v.id, q: v.q, r: v.r, v: v.v,
    buildingType: v.buildingType, owner: v.owner,
  });
  const mapEdge = (e: any) => ({ id: e.id, a: e.a, b: e.b, owner: e.owner });
  return {
    players,
    hexes: s.hexes.map(mapHex),
    vertices: s.vertices.map(mapVx),
    edges: s.edges.map(mapEdge),
    phase: s.phase,
    currentTurn: s.currentTurn,
    turnIndex: s.turnIndex,
    dice1: s.dice1,
    dice2: s.dice2,
    winner: s.winner,
    robberHexId: s.robberHexId,
    hostId: s.hostId,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  client: null,
  room: null,
  localId: '',
  connecting: false,
  error: null,
  state: null,
  logs: [],
  lastDice: null,
  lastSteal: null,
  winnerId: null,

  connectAndJoin: async (name: string) => {
    if (get().connecting || get().room) return;
    set({ connecting: true, error: null });
    try {
      const client = get().client ?? new Client(SERVER_URL);
      // Conectar/crear una sala "game". Si no existe, Colyseus crea una nueva.
      const room = await client.joinOrCreate('game', { name });

      // Suscribirse a cambios de estado: reconstruimos el snapshot.
      room.onStateChange((s) => {
        set({ state: snapshotFromState(s) });
      });

      // Logs y eventos del servidor.
      room.onMessage('log', (msg: any) => {
        const entry: LogEntry = {
          id: logCounter++,
          message: msg.message,
          level: msg.level ?? 'info',
          ts: Date.now(),
        };
        set((st) => ({ logs: [...st.logs, entry].slice(-200) }));
      });
      room.onMessage('diceRolled', (msg: any) => {
        set({ lastDice: { d1: msg.dice[0], d2: msg.dice[1], yields: msg.yields } });
      });
      room.onMessage('robberStolen', (msg: any) => {
        set({ lastSteal: { fromId: msg.fromId, toId: msg.toId, resource: msg.resource } });
      });
      room.onMessage('gameEnded', (msg: any) => {
        set({ winnerId: msg.winnerId });
      });

      // Si el servidor nos desconecta o se cae, lo señalamos.
      room.onError((code: number, message?: string) => {
        set({ error: `Error de sala (${code}): ${message ?? 'desconocido'}` });
      });
      room.onLeave(() => {
        set({ room: null, state: null });
      });

      set({
        client,
        room,
        localId: room.sessionId,
        connecting: false,
      });
    } catch (e: any) {
      set({ connecting: false, error: e?.message ?? 'No se pudo conectar' });
    }
  },

  start: async () => {
    await get().room?.send('start', {});
  },
  reset: () => {
    get().room?.send('reset', {});
  },
  roll: () => {
    get().room?.send('roll', { type: 'roll' });
  },
  endTurn: () => {
    get().room?.send('endTurn', { type: 'endTurn' });
  },
  buildSettlement: (vertexId, free) => {
    get().room?.send('buildSettlement', { type: 'buildSettlement', vertexId, free });
  },
  buildCity: (vertexId) => {
    get().room?.send('buildCity', { type: 'buildCity', vertexId });
  },
  buildRoad: (edgeId, free) => {
    get().room?.send('buildRoad', { type: 'buildRoad', edgeId, free });
  },
  moveRobber: (hexId, victimId) => {
    get().room?.send('moveRobber', { type: 'moveRobber', hexId, victimId: victimId ?? null });
  },
  tradeBank: (give, get2) => {
    get().room?.send('tradeBank', { type: 'tradeBank', give, get: get2 });
  },
  leave: async () => {
    const room = get().room;
    if (room) await room.leave(true);
    set({ room: null, state: null, logs: [], winnerId: null });
  },
  clearError: () => set({ error: null }),
}));
