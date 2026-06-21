// Componente raíz: muestra el Lobby si no hay sala, o el Game si ya se conectó.
// El modal de victoria vive dentro de Game para tener contexto del estado.

import { useGameStore } from './state/gameStore';
import Lobby from './components/Lobby';
import Game from './components/Game';

export default function App() {
  const room = useGameStore((s) => s.room);
  if (!room) return <Lobby />;
  return <Game />;
}
