// Sala de juego de Catán. Es el componente central del servidor Colyseus:
// mantiene el estado autoritativo y valida cada acción del cliente.

import { Room, Client } from '@colyseus/core';
import {
  BUILD_COST,
  BUILD_POINTS,
  TERRAIN_RESOURCE,
  type ClientMessage,
  type DiceRolledEvent,
  type GameEndedEvent,
  type LogEvent,
  type RobberStolenEvent,
  type ServerEvent,
  generateBoard,
} from '@catan/shared';
import { GameState } from '../state/GameState.js';
import { HexSchema } from '../state/BoardSchema.js';
import { VertexSchema } from '../state/BoardSchema.js';
import { EdgeSchema } from '../state/BoardSchema.js';
import { PlayerSchema } from '../state/PlayerSchema.js';
import {
  assignColors,
  canBuildCity,
  canBuildRoad,
  canBuildSettlement,
  enoughPlayers,
  getEdge,
  getHex,
  getPlayer,
  getVertex,
  hasWinner,
  hexesAtVertex,
  orderedPlayers,
  payResources,
} from '../logic/rules.js';
import {
  computeYields,
  discardHalf,
  rollDice,
  stealRandom,
} from '../logic/dice.js';

// ────────────────────────────────────────────────────────────────────────────
// Configuración de la sala
// ────────────────────────────────────────────────────────────────────────────

export class GameRoom extends Room<GameState> {
  // Número máximo de clientes que pueden unirse.
  maxClients = 4;

  // Estado interno de la fase de setup (no se sincroniza).
  private setupOrder: string[] = [];
  private setupIdx = 0;
  // Por cada paso de setup, registramos si el jugador ya colocó el poblado.
  private setupSettlementPlaced = false;
  // Vértice del último poblado colocado por el jugador en setup (para validar camino).
  private lastSetupVertex: string | null = null;
  // El "host" se guarda en this.state.hostId (sincronizado al cliente).

  // ──────────────────────────────────────────────────────────────────────────
  // Ciclo de vida de la sala
  // ──────────────────────────────────────────────────────────────────────────

  onCreate(): void {
    this.setState(new GameState());
    // El tablero se genera al crear la sala para que el lobby ya lo muestre.
    this.buildBoardIntoState();

    this.registerMessageHandlers();
    this.setPatchRate(50); // 20 fps de sincronización de estado
  }

  onJoin(client: Client, options?: { name?: string }): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('La partida ya ha comenzado');
    }
    const p = new PlayerSchema();
    p.id = client.sessionId;
    p.name = (options?.name ?? `Jugador ${this.state.players.size + 1}`).slice(0, 24);
    this.state.players.set(client.sessionId, p);
    if (this.state.players.size === 1) this.state.hostId = client.sessionId;
    assignColors(this.state);
    this.log(`${p.name} se ha unido.`);
  }

  onLeave(client: Client): void {
    const p = this.state.players.get(client.sessionId);
    if (p) this.log(`${p.name} ha abandonado.`, 'warn');
    // En una versión completa habría que reasignar turno / pasar a IA.
    // Aquí simplemente marcamos; si era el turno, avanza al siguiente.
    if (this.state.currentTurn === client.sessionId && this.state.phase !== 'lobby') {
      this.nextTurn();
    }
    this.state.players.delete(client.sessionId);
    // Reasignar host si se ha ido el actual (pasa al primero que quede).
    if (this.state.hostId === client.sessionId) {
      const next = orderedPlayers(this.state)[0];
      this.state.hostId = next ?? '';
    }
    assignColors(this.state);
  }

  onDispose(): void {
    // Nada que limpiar explícitamente.
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Construcción del tablero en el estado
  // ──────────────────────────────────────────────────────────────────────────

  private buildBoardIntoState(): void {
    const board = generateBoard();
    this.state.hexes.clear();
    this.state.vertices.clear();
    this.state.edges.clear();
    for (const h of board.hexes) {
      const s = new HexSchema();
      s.id = h.id;
      s.q = h.q;
      s.r = h.r;
      s.terrain = h.terrain;
      s.number = h.number ?? -1;
      s.hasRobber = h.hasRobber;
      this.state.hexes.push(s);
      if (h.hasRobber) this.state.robberHexId = h.id;
    }
    for (const v of board.vertices) {
      const s = new VertexSchema();
      s.id = v.id;
      s.q = v.q;
      s.r = v.r;
      s.v = v.v;
      s.buildingType = '';
      s.owner = '';
      this.state.vertices.push(s);
    }
    for (const e of board.edges) {
      const s = new EdgeSchema();
      s.id = e.id;
      s.a = e.a;
      s.b = e.b;
      s.owner = '';
      this.state.edges.push(s);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Registro de mensajes cliente → servidor
  // ──────────────────────────────────────────────────────────────────────────

  private registerMessageHandlers(): void {
    this.onMessage('start', (client) => this.handleStart(client));
    this.onMessage('reset', (client) => this.handleReset(client));
    this.onMessage('roll', (client) => this.handleRoll(client));
    this.onMessage('endTurn', (client) => this.handleEndTurn(client));
    this.onMessage('buildSettlement', (client, msg) => this.handleBuildSettlement(client, msg));
    this.onMessage('buildCity', (client, msg) => this.handleBuildCity(client, msg));
    this.onMessage('buildRoad', (client, msg) => this.handleBuildRoad(client, msg));
    this.onMessage('moveRobber', (client, msg) => this.handleMoveRobber(client, msg));
    this.onMessage('tradeBank', (client, msg) => this.handleTradeBank(client, msg));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Inicio de partida y fase de setup
  // ──────────────────────────────────────────────────────────────────────────

  private handleStart(client: Client): void {
    if (client.sessionId !== this.state.hostId) {
      this.send(client, 'log', { message: 'Solo el host puede iniciar.', level: 'warn' } satisfies LogEvent);
      return;
    }
    if (!enoughPlayers(this.state)) {
      this.send(client, 'log', { message: 'Faltan jugadores (mínimo 2).', level: 'warn' } satisfies LogEvent);
      return;
    }
    // Orden de setup: ida y vuelta (1,2,3,4 → 4,3,2,1).
    const order = orderedPlayers(this.state);
    this.setupOrder = [...order, ...[...order].reverse()];
    this.setupIdx = 0;
    this.setupSettlementPlaced = false;
    this.lastSetupVertex = null;
    this.state.phase = 'setup';
    this.beginSetupStep();
    this.log('Partida iniciada: colocación inicial.');
  }

  /**
   * Reset solicitado por el host: regenera el tablero y reinicia el estado
   * de todos los jugadores (puntos, recursos, piezas), volviendo a fase lobby.
   * Los jugadores conectados se mantienen; el host conservado su rol.
   */
  private handleReset(client: Client): void {
    if (client.sessionId !== this.state.hostId) {
      this.send(client, 'log', { message: 'Solo el host puede reiniciar.', level: 'warn' } satisfies LogEvent);
      return;
    }
    this.resetGame();
    this.log('Partida reiniciada por el host.', 'warn');
  }

  /** Reinicia por completo el estado de la partida manteniendo los jugadores. */
  private resetGame(): void {
    // Regenerar tablero (nueva semilla aleatoria).
    this.buildBoardIntoState();
    // Resetear cada jugador: puntos, recursos, piezas, turno activo.
    for (const pid of this.state.players.keys()) {
      const p = this.state.players.get(pid)!;
      p.points = 0;
      p.wood = 0;
      p.brick = 0;
      p.sheep = 0;
      p.wheat = 0;
      p.ore = 0;
      p.isActive = false;
      p.settlements = 0;
      p.cities = 0;
      p.roads = 0;
    }
    // Resetear campos globales.
    this.state.phase = 'lobby';
    this.state.currentTurn = '';
    this.state.turnIndex = 0;
    this.state.dice1 = 0;
    this.state.dice2 = 0;
    this.state.winner = '';
    // Resetear estado interno de setup.
    this.setupOrder = [];
    this.setupIdx = 0;
    this.setupSettlementPlaced = false;
    this.lastSetupVertex = null;
  }

  private beginSetupStep(): void {
    const pid = this.setupOrder[this.setupIdx];
    if (!pid) return;
    this.state.currentTurn = pid;
    this.setupSettlementPlaced = false;
    this.lastSetupVertex = null;
    this.updateActiveFlag();
    this.log(`Turno de colocación de ${this.state.players.get(pid)?.name}.`);
  }

  private handleSetupSettlement(client: Client, vertexId: string): boolean {
    const pid = client.sessionId;
    if (this.setupOrder[this.setupIdx] !== pid) return false;
    if (this.setupSettlementPlaced) return false;
    const check = canBuildSettlement(this.state, pid, vertexId, true);
    if (!check.ok) {
      this.send(client, 'log', { message: check.reason ?? 'No válido', level: 'warn' } satisfies LogEvent);
      return false;
    }
    const vx = getVertex(this.state, vertexId)!;
    vx.buildingType = 'settlement';
    vx.owner = pid;
    const p = getPlayer(this.state, pid)!;
    p.settlements++;
    p.points += BUILD_POINTS.settlement;
    this.setupSettlementPlaced = true;
    this.lastSetupVertex = vertexId;
    return true;
  }

  private handleSetupRoad(client: Client, edgeId: string): boolean {
    const pid = client.sessionId;
    if (this.setupOrder[this.setupIdx] !== pid) return false;
    if (!this.setupSettlementPlaced) return false;
    const check = canBuildRoad(this.state, pid, edgeId, true, this.lastSetupVertex ?? undefined);
    if (!check.ok) {
      this.send(client, 'log', { message: check.reason ?? 'No válido', level: 'warn' } satisfies LogEvent);
      return false;
    }
    const e = getEdge(this.state, edgeId)!;
    e.owner = pid;
    getPlayer(this.state, pid)!.roads++;

    // En la SEGUNDA vuelta (setupIdx >= numJugadores), el poblado recién
    // colocado reparte recursos iniciales de los hexes adyacentes.
    const totalPlayers = orderedPlayers(this.state).length;
    if (this.setupIdx >= totalPlayers && this.lastSetupVertex) {
      this.grantInitialResources(this.lastSetupVertex);
    }

    // Avanzar al siguiente paso de setup.
    this.setupIdx++;
    if (this.setupIdx >= this.setupOrder.length) {
      this.startMainGame();
    } else {
      this.beginSetupStep();
    }
    return true;
  }

  private grantInitialResources(vertexId: string): void {
    // Recorre los hexes que tocan el vértice y da 1 recurso de cada uno
    // (excepto desierto). Solo a partir del SEGUNDO poblado colocado.
    const vx = getVertex(this.state, vertexId);
    if (!vx) return;
    const p = getPlayer(this.state, vx.owner);
    if (!p) return;
    for (const hid of hexesAtVertex(this.state, vertexId)) {
      const h = getHex(this.state, hid);
      if (!h || h.number === -1) continue;
      const r = TERRAIN_RESOURCE[h.terrain as keyof typeof TERRAIN_RESOURCE];
      if (!r) continue;
      // `r` es un ResourceType que coincide con el nombre del campo en PlayerSchema.
      p[r]++;
    }
  }

  private startMainGame(): void {
    this.state.phase = 'roll';
    this.state.turnIndex = 0;
    this.state.currentTurn = orderedPlayers(this.state)[0];
    this.updateActiveFlag();
    this.log('Colocación finalizada. ¡Que comience el juego!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Fase principal: tirada, construcción, comercio, fin de turno
  // ──────────────────────────────────────────────────────────────────────────

  private handleRoll(client: Client): void {
    if (!this.isCurrentPlayer(client)) return;
    if (this.state.phase !== 'roll') return;
    const [d1, d2] = rollDice();
    this.state.dice1 = d1;
    this.state.dice2 = d2;
    const sum = d1 + d2;
    if (sum === 7) {
      // Activar el robador: descartes + movimiento.
      discardHalf(this.state);
      this.state.phase = 'robber';
      this.broadcast('log', { message: '¡Salió un 7! Mueve el bandolero.' } satisfies LogEvent);
    } else {
      const yields = computeYields(this.state, sum);
      this.state.phase = 'play';
      this.broadcast('diceRolled', { dice: [d1, d2], yields } satisfies DiceRolledEvent);
      this.log(`Tirada: ${d1}+${d2}=${sum}.`);
    }
  }

  private handleEndTurn(client: Client): void {
    if (!this.isCurrentPlayer(client)) return;
    if (this.state.phase !== 'play') return;
    const winner = hasWinner(this.state);
    if (winner) {
      this.endGame(winner);
      return;
    }
    this.nextTurn();
  }

  private nextTurn(): void {
    const order = orderedPlayers(this.state);
    if (order.length === 0) return;
    this.state.turnIndex = (this.state.turnIndex + 1) % order.length;
    this.state.currentTurn = order[this.state.turnIndex];
    this.state.phase = 'roll';
    this.state.dice1 = 0;
    this.state.dice2 = 0;
    this.updateActiveFlag();
    this.log(`Turno de ${this.state.players.get(this.state.currentTurn)?.name}.`);
  }

  private handleBuildSettlement(
    client: Client,
    msg: Extract<ClientMessage, { type: 'buildSettlement' }>,
  ): void {
    const pid = client.sessionId;
    if (this.state.phase === 'setup') {
      this.handleSetupSettlement(client, msg.vertexId);
      return;
    }
    if (!this.isCurrentPlayer(client) || this.state.phase !== 'play') return;
    const check = canBuildSettlement(this.state, pid, msg.vertexId, false);
    if (!check.ok) {
      this.send(client, 'log', { message: check.reason ?? 'No válido', level: 'warn' } satisfies LogEvent);
      return;
    }
    const p = getPlayer(this.state, pid)!;
    if (!payResources(p, BUILD_COST.settlement)) {
      this.send(client, 'log', { message: 'Sin recursos.', level: 'warn' } satisfies LogEvent);
      return;
    }
    const vx = getVertex(this.state, msg.vertexId)!;
    vx.buildingType = 'settlement';
    vx.owner = pid;
    p.settlements++;
    p.points += BUILD_POINTS.settlement;
    this.checkVictory(pid);
  }

  private handleBuildCity(
    client: Client,
    msg: Extract<ClientMessage, { type: 'buildCity' }>,
  ): void {
    const pid = client.sessionId;
    if (this.state.phase === 'setup') return; // no se mejora a ciudad en setup
    if (!this.isCurrentPlayer(client) || this.state.phase !== 'play') return;
    const check = canBuildCity(this.state, pid, msg.vertexId);
    if (!check.ok) {
      this.send(client, 'log', { message: check.reason ?? 'No válido', level: 'warn' } satisfies LogEvent);
      return;
    }
    const p = getPlayer(this.state, pid)!;
    if (!payResources(p, BUILD_COST.city)) {
      this.send(client, 'log', { message: 'Sin recursos.', level: 'warn' } satisfies LogEvent);
      return;
    }
    const vx = getVertex(this.state, msg.vertexId)!;
    vx.buildingType = 'city';
    // La ciudad reemplaza al poblado: liberamos un "settlement" del contador.
    p.settlements--;
    p.cities++;
    p.points += BUILD_POINTS.city; // +2 totales (ya tenía +1 del poblado)
    this.checkVictory(pid);
  }

  private handleBuildRoad(
    client: Client,
    msg: Extract<ClientMessage, { type: 'buildRoad' }>,
  ): void {
    const pid = client.sessionId;
    if (this.state.phase === 'setup') {
      this.handleSetupRoad(client, msg.edgeId);
      return;
    }
    if (!this.isCurrentPlayer(client) || this.state.phase !== 'play') return;
    const check = canBuildRoad(this.state, pid, msg.edgeId, false);
    if (!check.ok) {
      this.send(client, 'log', { message: check.reason ?? 'No válido', level: 'warn' } satisfies LogEvent);
      return;
    }
    const p = getPlayer(this.state, pid)!;
    if (!payResources(p, BUILD_COST.road)) {
      this.send(client, 'log', { message: 'Sin recursos.', level: 'warn' } satisfies LogEvent);
      return;
    }
    getEdge(this.state, msg.edgeId)!.owner = pid;
    p.roads++;
  }

  private handleTradeBank(
    client: Client,
    msg: Extract<ClientMessage, { type: 'tradeBank' }>,
  ): void {
    const pid = client.sessionId;
    if (!this.isCurrentPlayer(client) || this.state.phase !== 'play') return;
    const p = getPlayer(this.state, pid)!;
    if (p[msg.give] < 4) {
      this.send(client, 'log', { message: 'Necesitas 4 del mismo recurso.', level: 'warn' } satisfies LogEvent);
      return;
    }
    p[msg.give] -= 4;
    p[msg.get] += 1;
    this.log(`${p.name} comercio 4:1 ${msg.give}→${msg.get}.`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Robador (bandolero)
  // ──────────────────────────────────────────────────────────────────────────

  private handleMoveRobber(
    client: Client,
    msg: Extract<ClientMessage, { type: 'moveRobber' }>,
  ): void {
    const pid = client.sessionId;
    if (!this.isCurrentPlayer(client) || this.state.phase !== 'robber') return;
    const target = getHex(this.state, msg.hexId);
    if (!target) return;
    if (target.hasRobber) return; // debe mover a un hex distinto
    // Mover el robador.
    const old = this.state.hexes.find((h) => h.hasRobber);
    if (old) old.hasRobber = false;
    target.hasRobber = true;
    this.state.robberHexId = target.id;

    // Robar a la víctima indicada (si la hay).
    if (msg.victimId) {
      const from = getPlayer(this.state, msg.victimId);
      const to = getPlayer(this.state, pid);
      if (from && to && from.id !== to.id) {
        const r = stealRandom(from, to);
        this.broadcast('robberStolen', {
          fromId: from.id,
          toId: to.id,
          resource: r,
        } satisfies RobberStolenEvent);
        this.log(`${to.name} robó a ${from.name}.`);
      }
    }
    this.state.phase = 'play';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilidades internas
  // ──────────────────────────────────────────────────────────────────────────

  private isCurrentPlayer(client: Client): boolean {
    return this.state.currentTurn === client.sessionId;
  }

  private updateActiveFlag(): void {
    for (const id of this.state.players.keys()) {
      const p = this.state.players.get(id)!;
      p.isActive = id === this.state.currentTurn;
    }
  }

  private checkVictory(pid: string): void {
    const winner = hasWinner(this.state);
    if (winner) this.endGame(winner);
    void pid;
  }

  private endGame(winnerId: string): void {
    this.state.phase = 'ended';
    this.state.winner = winnerId;
    this.broadcast('gameEnded', { winnerId } satisfies GameEndedEvent);
    this.log(`¡${this.state.players.get(winnerId)?.name} ha ganado!`);
  }

  private log(message: string, level: LogEvent['level'] = 'info'): void {
    const ev: ServerEvent = { message, level } satisfies LogEvent;
    this.broadcast('log', ev);
  }
}
