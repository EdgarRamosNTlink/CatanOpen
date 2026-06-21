// Modal para comerciar con el banco (4:1). El jugador elige qué recurso
// dar y cuál recibir; el servidor valida que tenga 4 del recurso dado.

import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { RESOURCE_LABEL, type ResourceType } from '@catan/shared';

const RES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

interface Props {
  onClose: () => void;
}

export default function TradeModal({ onClose }: Props) {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  const tradeBank = useGameStore((s) => s.tradeBank);
  const [give, setGive] = useState<ResourceType>('wood');
  const [get, setGet] = useState<ResourceType>('ore');
  const me = state?.players.get(localId);
  if (!me) return null;
  const have = (me as any)[give] as number;
  const canTrade = have >= 4 && give !== get;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-80 shadow-2xl">
        <h2 className="font-display text-xl text-amber-300 mb-4">Comercio con el banco (4:1)</h2>
        <label className="block text-xs text-slate-400 mb-1">Dar (4)</label>
        <select
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 mb-3"
          value={give}
          onChange={(e) => setGive(e.target.value as ResourceType)}
        >
          {RES.map((r) => (
            <option key={r} value={r}>
              {RESOURCE_LABEL[r]} (tienes {(me as any)[r]})
            </option>
          ))}
        </select>
        <label className="block text-xs text-slate-400 mb-1">Recibir (1)</label>
        <select
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 mb-4"
          value={get}
          onChange={(e) => setGet(e.target.value as ResourceType)}
        >
          {RES.map((r) => (
            <option key={r} value={r} disabled={r === give}>
              {RESOURCE_LABEL[r]}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            disabled={!canTrade}
            className="px-3 py-1.5 rounded-lg bg-amber-500 disabled:bg-slate-600 text-slate-900 font-medium text-sm"
            onClick={() => {
              tradeBank(give, get);
              onClose();
            }}
          >
            Intercambiar
          </button>
        </div>
        {!canTrade && (
          <p className="text-xs text-rose-300 mt-2">
            Necesitas 4 {RESOURCE_LABEL[give]} y elegir un recurso distinto.
          </p>
        )}
      </div>
    </div>
  );
}
