// Vista de partida: Phaser de fondo + HUD superpuesto.
// Gestiona el "modo" de interacción y traduce clics del tablero en acciones
// del store (construir, mover bandolero, etc.).

import { useEffect, useState } from 'react';
import { hexVertices, type ResourceType } from '@catan/shared';
import { useGameStore } from '../state/gameStore';
import PhaserGame from '../phaser/PhaserGame';
import type { InteractionMode } from '../phaser/BoardScene';
import type { ClientGameState } from '../state/types';
import GameHUD from './GameHUD';
import PlayersPanel from './PlayersPanel';
import LogPanel from './LogPanel';
import ResourceBar from './ResourceBar';
import ActionPanel from './ActionPanel';
import TradeModal from './TradeModal';
import VictimModal from './VictimModal';
import VictoryModal from './VictoryModal';
import HostResetButton from './HostResetButton';
import SettingsButton from './SettingsButton';

interface Victim {
  id: string;
  name: string;
  color: string;
  cards: number;
}

/** Calcula qué jugadores tienen construcciones adyacentes al hex (excepto local). */
function computeVictims(state: ClientGameState, hexId: string, exceptId: string): Victim[] {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return [];
  const pts = hexVertices(hex.q, hex.r);
  const victimIds = new Set<string>();
  for (const p of pts) {
    for (const v of state.vertices) {
      const vp = hexVertices(v.q, v.r)[v.v];
      if (
        Math.round(vp.x * 1000) === Math.round(p.x * 1000) &&
        Math.round(vp.y * 1000) === Math.round(p.y * 1000)
      ) {
        if (v.buildingType !== '' && v.owner !== '' && v.owner !== exceptId) {
          victimIds.add(v.owner);
        }
        break;
      }
    }
  }
  return [...victimIds].map((id) => {
    const p = state.players.get(id)!;
    const cards = (['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).reduce(
      (acc, k) => acc + (p as any)[k],
      0,
    );
    return { id, name: p.name, color: p.color, cards };
  });
}

export default function Game() {
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  const buildSettlement = useGameStore((s) => s.buildSettlement);
  const buildCity = useGameStore((s) => s.buildCity);
  const buildRoad = useGameStore((s) => s.buildRoad);
  const moveRobber = useGameStore((s) => s.moveRobber);

  const [mode, setMode] = useState<InteractionMode>('idle');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [robberHex, setRobberHex] = useState<string | null>(null);
  const [victims, setVictims] = useState<Victim[]>([]);

  const phase = state?.phase ?? 'lobby';

  // Resetea el modo de interacción cuando cambia la fase del juego.
  useEffect(() => {
    setMode('idle');
  }, [phase]);

  const handleAction = (type: string, id: string) => {
    switch (type) {
      case 'buildSettlement':
        buildSettlement(id, false);
        setMode('idle');
        break;
      case 'buildSettlementFree':
        buildSettlement(id, true);
        // En setup, tras el poblado viene el camino: auto-activamos ese modo.
        setMode('placeRoadFree');
        break;
      case 'buildRoad':
        buildRoad(id, false);
        setMode('idle');
        break;
      case 'buildRoadFree':
        buildRoad(id, true);
        setMode('idle');
        break;
      case 'buildCity':
        buildCity(id);
        setMode('idle');
        break;
      case 'moveRobber':
        if (state) {
          const list = computeVictims(state, id, localId);
          if (list.length === 0) {
            moveRobber(id, null);
            setMode('idle');
          } else {
            setRobberHex(id);
            setVictims(list);
            // El modo sigue 'moveRobber' hasta que se elija víctima.
          }
        }
        break;
    }
  };

  const handleChooseVictim = (victimId: string | null) => {
    if (robberHex) moveRobber(robberHex, victimId);
    setRobberHex(null);
    setVictims([]);
    setMode('idle');
  };

  return (
    <>
      <PhaserGame mode={mode} onAction={handleAction} />
      <div id="hud-root">
        <GameHUD />
        <PlayersPanel />
        <LogPanel />
        <ResourceBar />
        <ActionPanel
          mode={mode}
          setMode={setMode}
          onTrade={() => setTradeOpen(true)}
        />
        <HostResetButton />
        <SettingsButton />
      </div>

      {tradeOpen && <TradeModal onClose={() => setTradeOpen(false)} />}
      {robberHex && (
        <VictimModal hexId={robberHex} victims={victims} onChoose={handleChooseVictim} />
      )}
      <VictoryModal />
    </>
  );
}
