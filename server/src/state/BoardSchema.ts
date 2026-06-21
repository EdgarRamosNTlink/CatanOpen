// Esquemas del tablero: hexágono, vértice y arista.
// Colyseus no admite `number | null`, así que el desierto usa number = -1.

import { Schema, type } from '@colyseus/schema';

export class HexSchema extends Schema {
  @type('string')
  id = '';

  @type('number')
  q = 0;

  @type('number')
  r = 0;

  /** Tipo de terreno: forest | hills | pasture | fields | mountains | desert. */
  @type('string')
  terrain = '';

  /** Número del token (2-12), o -1 si es desierto. */
  @type('number')
  number = -1;

  @type('boolean')
  hasRobber = false;
}

export class VertexSchema extends Schema {
  @type('string')
  id = '';

  @type('number')
  q = 0;

  @type('number')
  r = 0;

  /** Índice de vértice (0..5) dentro de su hex de referencia. */
  @type('number')
  v = 0;

  /** 'settlement' | 'city' | '' */
  @type('string')
  buildingType = '';

  /** PlayerId propietario, o '' si vacío. */
  @type('string')
  owner = '';
}

export class EdgeSchema extends Schema {
  @type('string')
  id = '';

  @type('string')
  a = '';

  @type('string')
  b = '';

  /** PlayerId con camino aquí, o '' si vacío. */
  @type('string')
  owner = '';
}
