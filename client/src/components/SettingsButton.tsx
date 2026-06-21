// Botón flotante arriba a la derecha que abre el modal de ajustes visuales.
// Visible para todos los jugadores (los ajustes son locales de cada cliente).

import { useState } from 'react';
import SettingsModal from './SettingsModal';

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="hud-panel fixed bottom-4 left-4 px-2.5 py-2 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-100 text-sm shadow-lg flex items-center gap-1.5"
        title="Ajustes visuales del tablero"
        onClick={() => setOpen(true)}
      >
        <span className="text-base leading-none">⚙</span>
        Ajustes
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
