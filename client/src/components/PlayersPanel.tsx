// Panel de jugadores: lista a todos con su color, nombre, puntos y piezas
// restantes. Resalta al jugador con el turno activo.

import { useGameStore } from '../state/gameStore';

export default function PlayersPanel() {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  if (!state) return null;
  const players = [...state.players.values()].sort((a, b) => b.points - a.points);

  return (
    <div className="hud-panel fixed top-4 left-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700 p-3 w-60 shadow-lg">
      <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Jugadores</h3>
      <ul className="space-y-1.5">
        {players.map((p) => {
          const mine = p.id === localId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                p.isActive ? 'bg-amber-500/15 ring-1 ring-amber-400/60' : 'bg-slate-800/60'
              }`}
            >
              <span
                className="inline-block w-3 h-3 rounded-full ring-1 ring-slate-900"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">
                  {p.name} {mine && <span className="text-slate-500">(tú)</span>}
                </div>
                <div className="text-[10px] text-slate-400">
                  {p.settlements}🏠 · {p.cities}🏛️ · {p.roads}🛤️
                </div>
              </div>
              <div className="font-display text-lg text-amber-300 tabular-nums">{p.points}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
