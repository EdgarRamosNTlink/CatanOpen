// Diálogo de confirmación para reiniciar la partida. Solo el host puede
// ejecutar el reset; el botón flotante para abrirlo se renderiza aparte
// (HostResetButton) para que viva en el HUD sin acoplar el modal al árbol
// de Phaser.

import { useGameStore } from '../state/gameStore';

interface Props {
  onClose: () => void;
}

export default function ResetDialog({ onClose }: Props) {
  const reset = useGameStore((s) => s.reset);
  const state = useGameStore((s) => s.state);
  const players = state ? [...state.players.values()] : [];

  const handleConfirm = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-6 pl-8">
      <div className="bg-slate-800 rounded-2xl border border-amber-500/40 p-6 w-96 shadow-2xl">
        <h2 className="font-display text-xl text-amber-300 mb-2">Reiniciar partida</h2>
        <p className="text-sm text-slate-300 mb-3">
          Se generará un nuevo tablero y se reiniciarán los puntos, recursos y
          construcciones de todos los jugadores. Volveréis a la sala de espera.
        </p>
        {players.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-1">Jugadores afectados:</p>
            <ul className="flex flex-wrap gap-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1.5 bg-slate-900 rounded-full px-2 py-1 text-xs"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm"
            onClick={handleConfirm}
          >
            Sí, reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}
