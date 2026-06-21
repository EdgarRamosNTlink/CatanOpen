// Barra de recursos del jugador local. Muestra las 5 materias primas con
// su cantidad, animando un "pop" cuando cambia.

import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import type { ResourceType } from '@catan/shared';

const ORDER: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

const META: Record<ResourceType, { label: string; bg: string; ring: string; emoji: string }> = {
  wood: { label: 'Madera', bg: 'bg-wood/20', ring: 'ring-wood', emoji: '🌲' },
  brick: { label: 'Arcilla', bg: 'bg-brick/20', ring: 'ring-brick', emoji: '🧱' },
  sheep: { label: 'Lana', bg: 'bg-sheep/20', ring: 'ring-sheep', emoji: '🐑' },
  wheat: { label: 'Trigo', bg: 'bg-wheat/20', ring: 'ring-wheat', emoji: '🌾' },
  ore: { label: 'Mineral', bg: 'bg-ore/20', ring: 'ring-ore', emoji: '⛏️' },
};

export default function ResourceBar() {
  const localId = useGameStore((s) => s.localId);
  const state = useGameStore((s) => s.state);
  const me = state?.players.get(localId);
  const prev = useRef<Record<string, number>>({});

  // Detecta cambios para animar.
  useEffect(() => {
    if (!me) return;
    const cur: Record<string, number> = {
      wood: me.wood, brick: me.brick, sheep: me.sheep, wheat: me.wheat, ore: me.ore,
    };
    prev.current = cur;
  }, [me?.wood, me?.brick, me?.sheep, me?.wheat, me?.ore]);

  if (!me) return null;

  return (
    <div className="hud-panel fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-900/80 backdrop-blur rounded-xl px-3 py-2 border border-slate-700 shadow-lg">
      {ORDER.map((r) => {
        const m = META[r];
        const value = (me as any)[r] as number;
        const changed = prev.current[r] !== undefined && prev.current[r] !== value;
        return (
          <div
            key={r}
            className={`flex items-center gap-1.5 rounded-lg ${m.bg} ring-1 ${m.ring} px-2.5 py-1.5 min-w-[84px] ${changed ? 'pop-anim' : ''}`}
            title={m.label}
          >
            <span className="text-lg leading-none">{m.emoji}</span>
            <span className="text-xs text-slate-300">{m.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
