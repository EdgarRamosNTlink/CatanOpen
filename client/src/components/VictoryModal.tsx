// Modal de fin de partida. Muestra el ganador y permite salir.

import { useGameStore } from '../state/gameStore';

export default function VictoryModal() {
  const state = useGameStore((s) => s.state);
  const winnerId = useGameStore((s) => s.winnerId);
  const leave = useGameStore((s) => s.leave);
  if (!winnerId || !state) return null;
  const winner = state.players.get(winnerId);
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70">
      <div className="bg-slate-800 rounded-2xl border border-amber-500/40 p-8 w-96 text-center shadow-2xl">
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="font-display text-2xl text-amber-300 mb-1">¡Victoria!</h2>
        <p className="text-lg" style={{ color: winner.color }}>
          {winner.name}
        </p>
        <p className="text-sm text-slate-400 mt-1">ha alcanzado {winner.points} puntos.</p>
        <button
          className="mt-6 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-medium"
          onClick={() => leave()}
        >
          Salir de la sala
        </button>
      </div>
    </div>
  );
}
