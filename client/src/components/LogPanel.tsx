// Historial de eventos del juego (logs enviados por el servidor).

import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';

export default function LogPanel() {
  const logs = useGameStore((s) => s.logs);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llega un nuevo mensaje.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="hud-panel fixed top-4 right-4 w-72 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700 p-2 shadow-lg">
      <h3 className="text-xs uppercase tracking-wider text-slate-400 px-1 mb-1">Registro</h3>
      <div ref={ref} className="max-h-48 overflow-y-auto text-xs space-y-1 px-1">
        {logs.map((l) => (
          <div
            key={l.id}
            className={
              l.level === 'warn' ? 'text-amber-300' : l.level === 'error' ? 'text-rose-300' : 'text-slate-300'
            }
          >
            {l.message}
          </div>
        ))}
      </div>
    </div>
  );
}
