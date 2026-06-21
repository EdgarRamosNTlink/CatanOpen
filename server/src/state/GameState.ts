// Estado raíz del juego. Colyseus sincroniza automáticamente cualquier
// cambio en este esquema a todos los clientes de la sala.

import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema';
import { HexSchema, VertexSchema, EdgeSchema } from './BoardSchema.js';
import { PlayerSchema } from './PlayerSchema.js';

export class GameState extends Schema {
  // Mapa playerId → PlayerSchema. MapSchema se sincroniza por entrada.
  @type({ map: PlayerSchema })
  players = new MapSchema<PlayerSchema>();

  @type([HexSchema])
  hexes = new ArraySchema<HexSchema>();

  @type([VertexSchema])
  vertices = new ArraySchema<VertexSchema>();

  @type([EdgeSchema])
  edges = new ArraySchema<EdgeSchema>();

  /** Fase: lobby | setup | roll | play | robber | ended. */
  @type('string')
  phase = 'lobby';

  /** PlayerId del jugador con el turno actual. */
  @type('string')
  currentTurn = '';

  /** Índice del jugador actual en el orden de turnos. */
  @type('number')
  turnIndex = 0;

  /** Última tirada de dados (visible para animarla en el cliente). */
  @type('number')
  dice1 = 0;

  @type('number')
  dice2 = 0;

  /** PlayerId ganador, o '' si la partida no ha terminado. */
  @type('string')
  winner = '';

  /** Hexágono donde está el robador. */
  @type('string')
  robberHexId = '';

  /** PlayerId del host (puede iniciar/resetear la partida). '' si aún no hay. */
  @type('string')
  hostId = '';
}
