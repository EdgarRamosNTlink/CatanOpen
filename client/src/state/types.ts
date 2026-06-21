// Tipos de "lectura" del estado que Colyseus materializa en el cliente.
// El servidor define los esquemas con @colyseus/schema; aquí los reflejamos
// como interfaces planas para que React y Phaser los consuman con tipos.

export interface ClientPlayer {
  id: string;
  name: string;
  color: string;
  points: number;
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
  isActive: boolean;
  settlements: number;
  cities: number;
  roads: number;
}

export interface ClientHex {
  id: string;
  q: number;
  r: number;
  terrain: string;
  number: number; // -1 si desierto
  hasRobber: boolean;
}

export interface ClientVertex {
  id: string;
  q: number;
  r: number;
  v: number;
  buildingType: '' | 'settlement' | 'city';
  owner: string; // '' si vacío
}

export interface ClientEdge {
  id: string;
  a: string;
  b: string;
  owner: string; // '' si vacío
}

export interface ClientGameState {
  players: Map<string, ClientPlayer>;
  hexes: ClientHex[];
  vertices: ClientVertex[];
  edges: ClientEdge[];
  phase: string;
  currentTurn: string;
  turnIndex: number;
  dice1: number;
  dice2: number;
  winner: string;
  robberHexId: string;
  hostId: string;
}

export interface LogEntry {
  id: number;
  message: string;
  level: 'info' | 'warn' | 'error';
  ts: number;
}
