// Modal para elegir a quién robar tras mover el bandolero.
// Muestra solo jugadores con construcciones adyacentes al hex elegido.

import { useGameStore } from '../state/gameStore';
import { RESOURCE_LABEL } from '@catan/shared';

interface Props {
  hexId: string;
  victims: { id: string; name: string; color: string; cards: number }[];
  onChoose: (victimId: string | null) => void;
}

export default function VictimModal({ hexId, victims, onChoose }: Props) {
  const lastSteal = useGameStore((s) => s.lastSteal);
  void hexId;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-80 shadow-2xl">
        <h2 className="font-display text-xl text-amber-300 mb-2">Robo del bandolero</h2>
        <p className="text-sm text-slate-300 mb-4">Elige a quién robar 1 recurso al azar.</p>
        {victims.length === 0 ? (
          <p className="text-sm text-slate-400 mb-4">Nadie tiene construcciones adyacentes.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {victims.map((v) => (
              <li key={v.id}>
                <button
                  className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2"
                  onClick={() => onChoose(v.id)}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: v.color }}
                  />
                  <span className="text-sm">{v.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{v.cards} cartas</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            onClick={() => onChoose(null)}
          >
            No robar
          </button>
        </div>
        {lastSteal && lastSteal.resource && (
          <p className="text-xs text-amber-300 mt-3">
            Robado: {RESOURCE_LABEL[lastSteal.resource as keyof typeof RESOURCE_LABEL] ?? '—'}
          </p>
        )}
      </div>
    </div>
  );
}
