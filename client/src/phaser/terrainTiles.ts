// Importa los tiles PNG de la carpeta assets/tiles y los mapea a cada tipo
// de terreno. Vite resuelve estos imports a URLs servidas en desarrollo y
// a hashes en producción.

import hexDesert from '../assets/tiles/hexDesert00.png';
import hexDirtClayPit from '../assets/tiles/hexDirtClayPit00.png';
import hexMadera from '../assets/tiles/hexMadera00.png';
import hexMineral from '../assets/tiles/hexMineral00.png';
import hexOcean from '../assets/tiles/hexOcean00.png';
import hexOvejas from '../assets/tiles/hexOvejas00.png';
import hexWheat from '../assets/tiles/hexWheat00.png';

import type { TerrainType } from '@catan/shared';

// Claves bajo las que Phaser registrará las texturas tras el preload.
export const TILE_KEYS = {
  forest: 'tile:forest',
  hills: 'tile:hills',
  pasture: 'tile:pasture',
  fields: 'tile:fields',
  mountains: 'tile:mountains',
  desert: 'tile:desert',
  ocean: 'tile:ocean',
} as const;

// Mapeo terreno → archivo PNG importado por Vite.
// - forest    (bosque/madera) → hexMadera
// - hills     (arcilla)       → hexDirtClayPit
// - pasture   (pasto/ovejas)  → hexOvejas
// - fields    (trigo)         → hexWheat
// - mountains (mineral)       → hexMineral
// - desert    (desierto)      → hexDesert
export const TERRAIN_TEXTURES: Record<TerrainType, string> = {
  forest: hexMadera,
  hills: hexDirtClayPit,
  pasture: hexOvejas,
  fields: hexWheat,
  mountains: hexMineral,
  desert: hexDesert,
};

export const OCEAN_TEXTURE = hexOcean;

// Lista plana para iterar en preload(). El océano no se renderiza, pero
// dejamos la textura cargada por si se vuelve a activar en el futuro.
export const ALL_TEXTURES: Array<{ key: string; url: string }> = [
  ...Object.entries(TERRAIN_TEXTURES).map(([terrain, url]) => ({
    key: TILE_KEYS[terrain as keyof typeof TILE_KEYS],
    url,
  })),
];
