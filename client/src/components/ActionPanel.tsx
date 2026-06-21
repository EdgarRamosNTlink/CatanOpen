// Panel de acciones contextuales: botones que cambian según la fase y el
// turno. Cambian el "modo" de interacción de Phaser o envían acciones
// directas al servidor.

import { useGameStore } from '../state/gameStore';
import type { InteractionMode } from '../phaser/BoardScene';
import { BUILD_COST } from '@catan/shared';

interface Props {
  mode: InteractionMode;
  setMode: (m: InteractionMode) => void;
  onTrade: () => void;
}

export default function ActionPanel({ mode, setMode, onTrade }: Props) {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  const roll = useGameStore((s) => s.roll);
  const endTurn = useGameStore((s) => s.endTurn);
  const start = useGameStore((s) => s.start);

  if (!state) return null;
  const me = state.players.get(localId);
  const isMyTurn = state.currentTurn === localId;
  const phase = state.phase;

  const btn = (active: boolean, label: string, onClick: () => void, hint?: string) => (
    <button
      onClick={onClick}
      disabled={!isMyTurn && phase !== 'lobby'}
      title={hint}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
        active
          ? 'bg-amber-500 text-slate-900 border-amber-400'
          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800/80'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="hud-panel fixed bottom-4 right-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700 p-3 w-64 shadow-lg">
      <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Acciones</h3>

      {phase === 'lobby' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Jugadores: {state.players.size}. El host puede iniciar.
          </p>
          {btn(false, 'Iniciar partida', () => start())}
        </div>
      )}

      {phase === 'setup' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            {isMyTurn ? 'Coloca 1 poblado y 1 camino.' : 'Espera tu turno de colocación.'}
          </p>
          {btn(
            mode === 'placeSettlementFree',
            'Colocar poblado',
            () => setMode('placeSettlementFree'),
            'Gratis durante la colocación inicial',
          )}
          {btn(
            mode === 'placeRoadFree',
            'Colocar camino',
            () => setMode('placeRoadFree'),
            'Junto a tu último poblado',
          )}
        </div>
      )}

      {phase === 'roll' && (
        <div className="space-y-2">
          {btn(false, '🎲 Tirar dados', () => roll(), 'Inicia tu turno')}
        </div>
      )}

      {phase === 'play' && (
        <div className="space-y-2">
          {btn(
            mode === 'placeSettlement',
            '🏠 Poblado',
            () => setMode(mode === 'placeSettlement' ? 'idle' : 'placeSettlement'),
            `Coste: ${fmtCost(BUILD_COST.settlement)}`,
          )}
          {btn(
            mode === 'placeCity',
            '🏛️ Ciudad',
            () => setMode(mode === 'placeCity' ? 'idle' : 'placeCity'),
            `Coste: ${fmtCost(BUILD_COST.city)}`,
          )}
          {btn(
            mode === 'placeRoad',
            '🛤️ Camino',
            () => setMode(mode === 'placeRoad' ? 'idle' : 'placeRoad'),
            `Coste: ${fmtCost(BUILD_COST.road)}`,
          )}
          {btn(false, '🔄 Comerciar (4:1)', onTrade, 'Intercambio con el banco')}
          {btn(false, '➡️ Terminar turno', () => endTurn(), 'Pasa al siguiente jugador')}
        </div>
      )}

      {phase === 'robber' && (
        <div className="space-y-2">
          <p className="text-xs text-amber-300">¡Salió un 7! Mueve el bandolero.</p>
          {btn(
            mode === 'moveRobber',
            '♟️ Elegir hexágono',
            () => setMode('moveRobber'),
            'Haz clic en un hexágono sin el bandolero',
          )}
        </div>
      )}

      {phase === 'ended' && (
        <p className="text-xs text-amber-300">Partida finalizada.</p>
      )}

      {me && phase === 'play' && (
        <p className="mt-2 text-[10px] text-slate-500">
          Tienes {me.points} puntos · victoria a 10.
        </p>
      )}
    </div>
  );
}

function fmtCost(cost: Partial<Record<string, number>>): string {
  return Object.entries(cost)
    .map(([k, v]) => `${v} ${es(k)}`)
    .join(', ');
  function es(k: string) {
    return k === 'wood' ? '🪵' : k === 'brick' ? '🧱' : k === 'sheep' ? '🐑' : k === 'wheat' ? '🌾' : '⛏️';
  }
}
