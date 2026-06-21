// Esquema de estado de un jugador (sincronizado por Colyseus).
// Los recursos como campos planos permiten deltas granulares al cliente.

import { Schema, type } from '@colyseus/schema';

export class PlayerSchema extends Schema {
  /** ID de sesión de Colyseus. */
  @type('string')
  id = '';

  @type('string')
  name = '';

  /** Color CSS (#rrggbb) del jugador. */
  @type('string')
  color = '';

  /** Puntos de victoria visibles. */
  @type('number')
  points = 0;

  // Recursos como campos planos para que los cambios se sincronicen uno a uno.
  @type('number')
  wood = 0;

  @type('number')
  brick = 0;

  @type('number')
  sheep = 0;

  @type('number')
  wheat = 0;

  @type('number')
  ore = 0;

  /** True si es el turno actual del jugador. */
  @type('boolean')
  isActive = false;

  /** Número de poblados colocados (para validar límites: 5 por jugador). */
  @type('number')
  settlements = 0;

  /** Número de ciudades colocadas (máx 4). */
  @type('number')
  cities = 0;

  /** Número de caminos colocados (máx 15). */
  @type('number')
  roads = 0;
}
