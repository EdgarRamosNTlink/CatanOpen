// Pantalla de entrada: pide un nombre y se conecta a una sala "game".
// Explica brevemente la arquitectura (React + Phaser + Tailwind + Colyseus).

import { useState } from 'react';
import { useGameStore } from '../state/gameStore';

export default function Lobby() {
  const connectAndJoin = useGameStore((s) => s.connectAndJoin);
  const connecting = useGameStore((s) => s.connecting);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const [name, setName] = useState('');

  const handleJoin = async () => {
    const trimmed = name.trim() || 'Jugador';
    await connectAndJoin(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl border border-slate-700 p-8">
        <h1 className="font-display text-4xl text-amber-300 text-center mb-2">
          CatanOpen
        </h1>
        <p className="text-slate-300 text-center mb-6 text-sm">
          Catán multijugador · React + Phaser + Tailwind + Colyseus
        </p>

        <label className="block text-sm text-slate-300 mb-1">Tu nombre</label>
        <input
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
          value={name}
          maxLength={24}
          placeholder="Capitán"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />

        <button
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 text-slate-900 font-semibold py-2.5 transition-colors"
          disabled={connecting}
          onClick={handleJoin}
        >
          {connecting ? 'Conectando…' : 'Entrar a una sala'}
        </button>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-900/60 border border-rose-700 text-rose-100 px-3 py-2 text-sm flex items-start justify-between">
            <span>{error}</span>
            <button className="ml-2 underline" onClick={clearError}>
              cerrar
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-slate-400 space-y-1">
          <p>• El primer jugador en entrar es el <em>host</em> y puede iniciar la partida.</p>
          <p>• Mínimo 2, máximo 4 jugadores por sala.</p>
          <p>• Asegúrate de que el servidor (<code>npm run dev:server</code>) esté en marcha.</p>
        </div>
      </div>
    </div>
  );
}
