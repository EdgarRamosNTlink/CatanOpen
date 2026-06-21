// Store de ajustes visuales del tablero (escala de tiles y offsets).
// Se persiste en localStorage para que los valores del usuario sobrevivan
// entre sesiones. PhaserGame lee estos valores y los empuja a BoardScene.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BoardSettings {
  /** Multiplicador de escala de los tiles respecto al tamaño del hex. 1 = encaje exacto. */
  tileScale: number;
  /** Offset manual en píxeles del tablero entero (para corregir centrado). */
  offsetX: number;
  offsetY: number;
  /** Offset de la imagen del tile DENTRO de cada hex (para corregir si el
   *  arte del PNG no está centrado en la imagen). No afecta a la posición
   *  del hex ni a la hit area, solo al sprite. */
  tileOffsetX: number;
  tileOffsetY: number;
  /** Escala del tile de océano del fondo (independiente del tablero). */
  oceanScale: number;
}

interface SettingsStore extends BoardSettings {
  set: (patch: Partial<BoardSettings>) => void;
  reset: () => void;
}

const DEFAULTS: BoardSettings = {
  tileScale: 1.53,
  offsetX: -45,
  offsetY: -31,
  tileOffsetX: 0,
  tileOffsetY: -30,
  oceanScale: 0.55,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'catan-board-settings',
      version: 4,
      // Al cambiar de versión, descartar valores viejos y usar los nuevos defaults.
      migrate: () => DEFAULTS,
    },
  ),
);
