// Barra superior con fase actual, jugador en turno y la última tirada de dados.

import { useGameStore } from '../state/gameStore';

const PHASE_LABEL: Record<string, string> = {
  lobby: 'En sala',
  setup: 'Colocación inicial',
  roll: 'Tirada de dados',
  play: 'Turno de juego',
  robber: 'Bandolero activo',
  ended: 'Partida finalizada',
};

export default function GameHUD() {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  if (!state) return null;
  const current = state.players.get(state.currentTurn);
  const isMine = state.currentTurn === localId;

  return (
    <div className="hud-panel fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700 px-4 py-2 flex items-center gap-4 shadow-lg">
      <div className="text-xs text-slate-400 uppercase tracking-wider">
        {PHASE_LABEL[state.phase] ?? state.phase}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: current?.color ?? '#888' }}
        />
        <span className="text-sm">{current?.name ?? '—'}</span>
        {isMine && <span className="text-amber-300 text-xs">(tú)</span>}
      </div>
      {(state.dice1 > 0 || state.dice2 > 0) && (
        <div className="flex items-center gap-1.5">
          <Die value={state.dice1} />
          <Die value={state.dice2} />
          <span className="ml-1 text-amber-300 font-semibold tabular-nums">
            = {state.dice1 + state.dice2}
          </span>
        </div>
      )}
    </div>
  );
}

function Die({ value }: { value: number }) {
  return (
    <div className="w-7 h-7 rounded-md bg-white text-slate-900 grid place-items-center font-bold text-sm shadow">
      {value || '–'}
    </div>
  );
}
