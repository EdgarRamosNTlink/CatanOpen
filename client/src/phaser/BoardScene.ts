// Escena principal del tablero de Catán en Phaser.
// Dibuja hexágonos con tiles PNG, tokens de número, vértices y aristas a
// partir del snapshot del store. El fondo es un TileSprite de océano que
// rodea todo el tablero. Los ajustes visuales (escala, offsets) llegan
// desde React vía setAdjustments().

import Phaser from 'phaser';
import {
  hexCenter,
  hexVertices,
  VERTEX_OFFSETS,
  type TerrainType,
} from '@catan/shared';
import type {
  ClientEdge,
  ClientGameState,
  ClientHex,
  ClientVertex,
} from '../state/types';
import { ALL_TEXTURES, TILE_KEYS, TERRAIN_TEXTURES } from './terrainTiles';
import type { BoardSettings } from '../state/settingsStore';

export type InteractionMode =
  | 'idle'
  | 'placeSettlement' // cuesta recursos (fase play)
  | 'placeCity'
  | 'placeRoad'
  | 'placeSettlementFree' // fase setup (gratis)
  | 'placeRoadFree'
  | 'moveRobber';

export interface BoardSnapshot {
  state: ClientGameState;
  localId: string;
}

// Colores de fallback por si una textura no carga (paleta Catán).
const TERRAIN_FALLBACK: Record<TerrainType, number> = {
  forest: 0x2e6b3a,
  hills: 0xa04b2f,
  pasture: 0x7fb858,
  fields: 0xd6c14a,
  mountains: 0x7d7f86,
  desert: 0xe0c98b,
};

const SEA_COLOR = 0x1e3a5f;
const HIGHLIGHT = 0xffd166;
const ROAD_THICKNESS = 8;

export class BoardScene extends Phaser.Scene {
  private snap: BoardSnapshot | null = null;
  private mode: InteractionMode = 'idle';
  // Asignado por el componente React propietario.
  onAction: (type: string, id: string) => void = () => {};

  private hexPixels = 60;
  private offsetX = 0; // centrado automático
  private offsetY = 0;

  // Ajustes visuales configurables desde React (settingsStore).
  private settings: BoardSettings = {
    tileScale: 1.0,
    offsetX: 0,
    offsetY: 0,
    tileOffsetX: 0,
    tileOffsetY: 0,
    oceanScale: 1.0,
  };

  // Mapas id → GameObject para actualizar sin recrear todo.
  // Los hexes ahora son Image (sprites de tile) + un Graphics invisible como
  // hit area con forma de hexágono (no rectangular).
  // hexMasks guarda la geometría hexagonal que recorta el sprite para que
  // el océano se vea entre los huecos de los tiles (si el PNG es cuadrado).
  private hexSprites = new Map<string, Phaser.GameObjects.Image>();
  private hexHits = new Map<string, Phaser.GameObjects.Graphics>();
  private hexHitData = new Map<string, { pts: Phaser.Math.Vector2[]; color: number }>();
  private hexMasks = new Map<string, Phaser.GameObjects.Graphics>();
  private vertexHits = new Map<string, Phaser.GameObjects.Arc>();
  private vertexMarks = new Map<string, Phaser.GameObjects.Container>();
  private edgeHits = new Map<string, Phaser.GameObjects.Rectangle>();
  private edgeMarks = new Map<string, Phaser.GameObjects.Rectangle>();
  private numberTokens: Phaser.GameObjects.Container[] = [];
  private robber: Phaser.GameObjects.Container | null = null;
  private hoverHint: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('board');
  }

  init(data?: { onAction?: (type: string, id: string) => void; hexPixels?: number }) {
    // PhaserGame también puede asignar `this.onAction` directamente tras crear
    // la escena, así que aquí solo aplicamos si llega data.
    if (data?.onAction) this.onAction = data.onAction;
    if (data?.hexPixels) this.hexPixels = data.hexPixels;
  }

  preload(): void {
    // Cargar todas las texturas de tiles. Las URLs vienen de Vite (imports).
    for (const t of ALL_TEXTURES) {
      if (!this.textures.exists(t.key)) this.load.image(t.key, t.url);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(SEA_COLOR);
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();

    // Si las texturas aún están cargando, redibujar cuando terminen para
    // reemplazar los fallbacks de color por los tiles PNG.
    this.load.once('loadcomplete', () => {
      if (this.snap) this.redraw();
    });

    // Texto de ayuda que muestra el modo activo.
    this.hoverHint = this.add
      .text(10, 10, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color: '#fbbf24',
        backgroundColor: 'rgba(15,23,42,0.75)',
        padding: { x: 6, y: 4 },
      })
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /** Recibe ajustes visuales desde React y redibuja en vivo. */
  setAdjustments(settings: BoardSettings): void {
    this.settings = settings;
    // Si la escena aún no ha arrancado (this.scale no listo), guardamos los
    // ajustes y se aplicarán en create()/handleResize(). Esto evita el crash
    // cuando el efecto de React se ejecuta antes del boot de Phaser.
    if (!this.scale) return;
    // Recalcular offsets del tablero (centrado + offset manual del usuario)
    // ANTES de redibujar, porque redraw() usa this.offsetX/Y.
    this.offsetX = this.scale.width / 2 + this.settings.offsetX;
    this.offsetY = this.scale.height / 2 + this.settings.offsetY;
    if (this.snap) this.redraw();
  }

  /** Recibe un nuevo snapshot desde React y redibuja el tablero. */
  setSnapshot(snap: BoardSnapshot): void {
    this.snap = snap;
    this.redraw();
    this.applyMode();
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.applyMode();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Resize: centra el tablero al tamaño del canvas.
  // ──────────────────────────────────────────────────────────────────────────

  private handleResize(): void {
    // Centrado automático + offset manual del usuario.
    this.offsetX = this.scale.width / 2 + this.settings.offsetX;
    this.offsetY = this.scale.height / 2 + this.settings.offsetY;
    if (this.snap) this.redraw();
  }

  private toPixel(x: number, y: number): { x: number; y: number } {
    return { x: x * this.hexPixels + this.offsetX, y: y * this.hexPixels + this.offsetY };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Redibujo completo del tablero (se llama solo cuando cambia el snapshot).
  // ──────────────────────────────────────────────────────────────────────────

  private redraw(): void {
    if (!this.snap) return;
    const { state } = this.snap;

    // Limpieza de capas.
    this.hexSprites.forEach((o) => o.destroy());
    this.hexSprites.clear();
    this.hexHits.forEach((o) => o.destroy());
    this.hexHits.clear();
    this.hexHitData.clear();
    this.hexMasks.forEach((o) => o.destroy());
    this.hexMasks.clear();
    this.vertexHits.forEach((o) => o.destroy());
    this.vertexHits.clear();
    this.vertexMarks.forEach((o) => o.destroy());
    this.vertexMarks.clear();
    this.edgeHits.forEach((o) => o.destroy());
    this.edgeHits.clear();
    this.edgeMarks.forEach((o) => o.destroy());
    this.edgeMarks.clear();
    this.numberTokens.forEach((o) => o.destroy());
    this.numberTokens = [];
    if (this.robber) { this.robber.destroy(); this.robber = null; }

    // 1. Hexágonos. Se ordenan de ABAJO → ARRIBA (y descendente) para que
    //    los hexes de arriba se dibujen después y queden POR ENCIMA de los
    //    de abajo, corrigiendo el solapamiento visual de los tiles PNG.
    const sortedHexes = [...state.hexes].sort((a, b) => {
      const ya = hexCenter(a.q, a.r).y;
      const yb = hexCenter(b.q, b.r).y;
      return yb - ya; // y mayor (abajo) primero → se dibuja primero (detrás)
    });
    for (const hex of sortedHexes) this.drawHex(hex);
    // 2. Tokens de número (encima de todos los hexes).
    for (const hex of state.hexes) this.drawNumberToken(hex);
    // 3. Aristas (camino + área de clic).
    for (const edge of state.edges) this.drawEdge(edge);
    // 4. Vértices (poblado/ciudad + área de clic).
    for (const vx of state.vertices) this.drawVertex(vx);
    // 5. Bandolero.
    const robberHex = state.hexes.find((h) => h.hasRobber);
    if (robberHex) this.drawRobber(robberHex);
  }

  private drawHex(hex: ClientHex): void {
    const c = hexCenter(hex.q, hex.r);
    const p = this.toPixel(c.x, c.y);
    const terrain = hex.terrain as TerrainType;
    const color = TERRAIN_FALLBACK[terrain] ?? 0x333333;
    const key = TILE_KEYS[terrain];

    // Puntos del hex en coordenadas absolutas de pantalla (para hit y máscara).
    const hexPts = VERTEX_OFFSETS.map(
      (o) => new Phaser.Math.Vector2(p.x + o.x * this.hexPixels, p.y + o.y * this.hexPixels),
    );

    // 1. Sprite del tile centrado en el hex. Si la textura no existe aún
    //    (está cargando), usamos un rectángulo de color como fallback.
    //    Se aplican tileOffsetX/Y para corregir si el arte del PNG no está
    //    centrado dentro de la imagen cuadrada.
    if (this.textures.exists(key)) {
      const tex = this.textures.get(key).getSourceImage();
      // Un hex pointy-top tiene altura = 2*hexPixels y ancho = sqrt(3)*hexPixels.
      // Escala para que la textura encaje; tileScale es un multiplicador del usuario.
      const targetH = this.hexPixels * 2 * this.settings.tileScale;
      const scale = targetH / tex.height;
      const sprite = this.add
        .image(p.x + this.settings.tileOffsetX, p.y + this.settings.tileOffsetY, key)
        .setScale(scale)
        .setDepth(0);

      // Máscara hexagonal: recorta el sprite PNG a la forma del hex para que
      // el océano de fondo se vea en los huecos entre tiles (las esquinas
      // cuadradas del PNG no deben tapar el agua). Usamos beginPath/fillPath
      // explícito en lugar de fillPoints, que es más fiable con GeometryMask.
      const maskG = this.add.graphics();
      maskG.fillStyle(0xffffff, 1);
      maskG.beginPath();
      maskG.moveTo(hexPts[0].x, hexPts[0].y);
      for (let i = 1; i < hexPts.length; i++) maskG.lineTo(hexPts[i].x, hexPts[i].y);
      maskG.closePath();
      maskG.fillPath();
      const geomMask = maskG.createGeometryMask();
      sprite.setMask(geomMask);
      maskG.setVisible(false); // la geometría de máscara no necesita verse
      this.hexMasks.set(hex.id, maskG);

      this.hexSprites.set(hex.id, sprite);
    } else {
      // Fallback: Graphics con polígono de color mientras carga la textura.
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.lineStyle(2, 0x0b1f33, 0.7);
      g.beginPath();
      g.moveTo(hexPts[0].x, hexPts[0].y);
      for (let i = 1; i < hexPts.length; i++) g.lineTo(hexPts[i].x, hexPts[i].y);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.setDepth(0);
      // Guardamos como "sprite" ficticio para limpieza uniforme.
      this.hexSprites.set(hex.id, g as unknown as Phaser.GameObjects.Image);
    }

    // 2. Hit area invisible con forma de hexágono (polígono, no rectángulo)
    //    para que el clic solo cuente dentro del hex.
    const hit = this.add.graphics();
    // Sin fill ni stroke → invisible, pero sirve de zona interactiva.
    hit.setInteractive(new Phaser.Geom.Polygon(hexPts), Phaser.Geom.Polygon.Contains);
    hit.setDepth(5);
    hit.on('pointerover', () => {
      if (this.mode === 'moveRobber' && !hex.hasRobber) {
        const sprite = this.hexSprites.get(hex.id);
        if (sprite && 'setAlpha' in sprite) sprite.setAlpha(0.7);
      }
    });
    hit.on('pointerout', () => {
      const sprite = this.hexSprites.get(hex.id);
      if (sprite && 'setAlpha' in sprite) sprite.setAlpha(1);
    });
    hit.on('pointerdown', () => {
      if (this.mode === 'moveRobber' && !hex.hasRobber) {
        this.onAction('moveRobber', hex.id);
      }
    });
    this.hexHits.set(hex.id, hit);
    this.hexHitData.set(hex.id, { pts: hexPts, color });
  }

  private drawNumberToken(hex: ClientHex): void {
    if (hex.number <= 0) return; // desierto
    const c = hexCenter(hex.q, hex.r);
    const p = this.toPixel(c.x, c.y);
    const container = this.add.container(p.x, p.y);
    const isHigh = hex.number === 6 || hex.number === 8;
    const circle = this.add.circle(0, 0, 16, 0xffffff, 0.95);
    circle.setStrokeStyle(2, isHigh ? 0xc0263a : 0x1f2937, 1);
    const txt = this.add
      .text(0, -2, String(hex.number), {
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: isHigh ? '#c0263a' : '#0f172a',
      })
      .setOrigin(0.5);
    // Puntos de probabilidad: 1 pto si 2/12, 2 si 3/11, ... 5 si 6/8.
    const dots = Math.min(5, 6 - Math.abs(7 - hex.number));
    const dotColor = isHigh ? 0xc0263a : 0x1f2937;
    const dotY = 12;
    for (let i = 0; i < dots; i++) {
      const dx = (i - (dots - 1) / 2) * 4;
      container.add(this.add.circle(dx, dotY, 1.5, dotColor, 1));
    }
    container.add([circle, txt]);
    this.numberTokens.push(container);
  }

  private drawRobber(hex: ClientHex): void {
    const c = hexCenter(hex.q, hex.r);
    const p = this.toPixel(c.x, c.y);
    const cont = this.add.container(p.x, p.y);
    const body = this.add.rectangle(0, 0, 18, 26, 0x111827, 1);
    body.setStrokeStyle(2, 0x6b7280, 1);
    const head = this.add.circle(0, -14, 7, 0x111827, 1);
    cont.add([body, head]);
    cont.setDepth(50);
    this.robber = cont;
  }

  private drawEdge(edge: ClientEdge): void {
    const a = this.snap!.state.vertices.find((v) => v.id === edge.a);
    const b = this.snap!.state.vertices.find((v) => v.id === edge.b);
    if (!a || !b) return;
    const pa = this.vertexPixel(a);
    const pb = this.vertexPixel(b);
    const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);

    // Camino si lo hay. Se dibuja a longitud completa para que conecte
    // exactamente con los poblados en los vértices.
    if (edge.owner) {
      const color = this.playerColor(edge.owner);
      const road = this.add
        .rectangle(mid.x, mid.y, len, ROAD_THICKNESS, color, 1)
        .setRotation(angle)
        .setDepth(20);
      this.edgeMarks.set(edge.id, road);
    }
    // Área de clic (alargada, semitransparente).
    const hit = this.add
      .rectangle(mid.x, mid.y, len, ROAD_THICKNESS + 6, 0xffffff, 0.001)
      .setRotation(angle)
      .setInteractive()
      .setDepth(30);
    hit.on('pointerover', () => {
      if (this.isEdgeMode() && edge.owner === '') hit.setFillStyle(HIGHLIGHT, 0.5);
    });
    hit.on('pointerout', () => hit.setFillStyle(0xffffff, 0.001));
    hit.on('pointerdown', () => {
      if (this.isEdgeMode() && edge.owner === '') this.onAction(this.mode === 'placeRoadFree' ? 'buildRoadFree' : 'buildRoad', edge.id);
    });
    this.edgeHits.set(edge.id, hit);
  }

  private drawVertex(vx: ClientVertex): void {
    const p = this.vertexPixel(vx);
    // Marca de poblado/ciudad: dibujada con Graphics dentro de un contenedor
    // en el vértice. Graphics usa coordenadas absolutas relativas al contenedor
    // (que está en el punto exacto del vértice), sin el offset de displayOrigin
    // que sufren add.triangle / add.polygon.
    if (vx.buildingType && vx.owner) {
      const color = this.playerColor(vx.owner);
      const cont = this.add.container(p.x, p.y).setDepth(40);
      const g = this.add.graphics();
      g.lineStyle(2, 0x111827, 0.85);
      g.fillStyle(color, 1);
      if (vx.buildingType === 'settlement') {
        // Casa centrada en (0,0): cuerpo + tejado.
        // Cuerpo: 18×12 centrado en (0, 3).
        g.fillRect(-9, -3, 18, 12);
        g.strokeRect(-9, -3, 18, 12);
        // Tejado: triángulo apuntando arriba.
        g.fillTriangle(-11, -3, 11, -3, 0, -14);
        g.strokeTriangle(-11, -3, 11, -3, 0, -14);
      } else {
        // Ciudad: cuerpo ancho + torre (más grande que el poblado).
        g.fillRect(-11, -3, 22, 14);
        g.strokeRect(-11, -3, 22, 14);
        g.fillRect(-13, -9, 8, 8);
        g.strokeRect(-13, -9, 8, 8);
      }
      cont.add(g);
      this.vertexMarks.set(vx.id, cont);
    }
    // Área de clic (círculo centrado en el vértice — add.circle es fiable).
    const hit = this.add
      .circle(p.x, p.y, 14, 0xffffff, 0.001)
      .setInteractive()
      .setDepth(45);
    hit.on('pointerover', () => {
      if (this.isVertexMode() && this.vertexAccepts(vx)) hit.setFillStyle(HIGHLIGHT, 0.6);
    });
    hit.on('pointerout', () => hit.setFillStyle(0xffffff, 0.001));
    hit.on('pointerdown', () => {
      if (this.isVertexMode() && this.vertexAccepts(vx)) {
        const t = this.mode === 'placeCity' ? 'buildCity' : this.mode === 'placeSettlementFree' ? 'buildSettlementFree' : 'buildSettlement';
        this.onAction(t, vx.id);
      }
    });
    this.vertexHits.set(vx.id, hit);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private vertexPixel(vx: ClientVertex): { x: number; y: number } {
    const pts = hexVertices(vx.q, vx.r);
    const pt = pts[vx.v];
    return this.toPixel(pt.x, pt.y);
  }

  private playerColor(id: string): number {
    const p = this.snap?.state.players.get(id);
    if (!p) return 0x888888;
    // Convierte #rrggbb a número.
    return parseInt(p.color.replace('#', ''), 16);
  }

  private isVertexMode(): boolean {
    return (
      this.mode === 'placeSettlement' ||
      this.mode === 'placeSettlementFree' ||
      this.mode === 'placeCity'
    );
  }

  private isEdgeMode(): boolean {
    return this.mode === 'placeRoad' || this.mode === 'placeRoadFree';
  }

  /** ¿El vértice admite la acción del modo actual? (validación simple de UX) */
  private vertexAccepts(vx: ClientVertex): boolean {
    if (this.mode === 'placeCity') {
      return vx.buildingType === 'settlement' && vx.owner === this.snap?.localId;
    }
    // Poblado: vértice vacío.
    return vx.buildingType === '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Aplicar el modo actual: muestra el hint y refresca estilos.
  // ──────────────────────────────────────────────────────────────────────────

  private modeLabel(): string {
    switch (this.mode) {
      case 'placeSettlement': return 'Elige dónde construir un poblado';
      case 'placeSettlementFree': return 'Coloca tu poblado inicial';
      case 'placeCity': return 'Elige qué poblado mejorar a ciudad';
      case 'placeRoad': return 'Elige dónde construir un camino';
      case 'placeRoadFree': return 'Coloca tu camino inicial junto al poblado';
      case 'moveRobber': return 'Mueve el bandolero a un nuevo hexágono';
      default: return '';
    }
  }

  private applyMode(): void {
    if (this.hoverHint) {
      const label = this.modeLabel();
      this.hoverHint.setText(label).setVisible(label !== '');
    }
  }
}
