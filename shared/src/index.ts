// Punto de entrada del paquete @catan/shared.
// Re-exporta todo lo que el cliente y el servidor consumen en común.

export * from './types.js';
export * from './messages.js';
export {
  generateBoard,
  hexCenter,
  hexVertices,
  hexDistance,
  buildVertexNeighbors,
  buildVertexEdges,
  buildVertexHexes,
  HEX_SIZE,
  VERTEX_OFFSETS,
} from './board.js';
