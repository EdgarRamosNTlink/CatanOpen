// Botón flotante abajo a la izquierda que abre el diálogo de reset.
// Solo se muestra si el jugador local es el host de la sala.

import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import ResetDialog from './ResetDialog';

export default function HostResetButton() {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  const [open, setOpen] = useState(false);

  // Oculto si aún no hay estado o si no soy el host.
  if (!state || state.hostId !== localId) return null;

  return (
    <>
      <button
        className="hud-panel fixed bottom-4 left-28 px-3 py-2 rounded-lg bg-rose-700/90 hover:bg-rose-600 text-white text-sm font-medium shadow-lg flex items-center gap-1.5"
        title="Reiniciar la partida (solo host)"
        onClick={() => setOpen(true)}
      >
        <span className="text-base leading-none">↻</span>
        Reiniciar
      </button>
      {open && <ResetDialog onClose={() => setOpen(false)} />}
    </>
  );
}
