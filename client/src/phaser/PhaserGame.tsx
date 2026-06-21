// Componente React que monta el juego de Phaser y sincroniza el snapshot,
// el modo de interacción y los ajustes visuales con la escena BoardScene.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BoardScene, type InteractionMode } from './BoardScene';
import { useGameStore } from '../state/gameStore';
import { useSettingsStore } from '../state/settingsStore';

interface Props {
  mode: InteractionMode;
  onAction: (type: string, id: string) => void;
}

export default function PhaserGame({ mode, onAction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  // Mantén siempre el último callback sin reinicializar el juego.
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  // Estado y jugador local desde el store.
  const state = useGameStore((s) => s.state);
  const localId = useGameStore((s) => s.localId);
  // Ajustes visuales desde el settingsStore (persistente).
  const settings = useSettingsStore();

  // Crear el juego una sola vez.
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new BoardScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#1e3a5f',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
      },
      scene: [scene],
    });

    // Phaser no admite pasar datos al init desde config; asignamos el
    // callback directamente en la instancia. Los handlers `pointerdown`
    // lo invocan tiempo después de que el juego arranque, por lo que es seguro.
    scene.onAction = (type: string, id: string) => actionRef.current(type, id);

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Empujar el snapshot cuando cambia.
  useEffect(() => {
    if (sceneRef.current && state) {
      sceneRef.current.setSnapshot({ state, localId });
    }
  }, [state, localId]);

  // Empujar el modo cuando cambia.
  useEffect(() => {
    sceneRef.current?.setMode(mode);
  }, [mode]);

  // Empujar los ajustes visuales cuando cambian (redibuja en vivo).
  useEffect(() => {
    sceneRef.current?.setAdjustments({
      tileScale: settings.tileScale,
      offsetX: settings.offsetX,
      offsetY: settings.offsetY,
      tileOffsetX: settings.tileOffsetX,
      tileOffsetY: settings.tileOffsetY,
      oceanScale: settings.oceanScale,
    });
  }, [
    settings.tileScale,
    settings.offsetX,
    settings.offsetY,
    settings.tileOffsetX,
    settings.tileOffsetY,
    settings.oceanScale,
  ]);

  return <div id="phaser-root" ref={containerRef} />;
}
