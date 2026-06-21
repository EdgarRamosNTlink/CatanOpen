# AGENTS.md — CatanOpen

Comandos verificados para trabajar en este monorepo.

## Desarrollo

```bash
npm install              # instala dependencias de los 3 workspaces
npm run dev              # arranca shared (watch), server (tsx watch) y client (vite) a la vez
npm run dev:server       # solo servidor (http://localhost:2567)
npm run dev:client       # solo cliente (http://localhost:5173)
```

## Verificación (ejecutar siempre tras tocar código)

```bash
npm run typecheck        # typecheck de shared + server + client
npm run build            # build de los tres paquetes (genera dist/)
```

Si solo cambias un paquete:

```bash
npm -w shared  run typecheck
npm -w server  run typecheck
npm -w client  run typecheck
```

## Arquitectura

- `shared/`  — tipos, constantes y generación del tablero. ESM con `NodeNext` (imports internos con `.js`).
- `server/`  — Colyseus 0.16 + `@colyseus/schema` 3.x. Requiere `experimentalDecorators`. Estado autoritativo en `GameRoom`.
- `client/`  — React 18 + Vite + Phaser 3 + Tailwind 3 + zustand. Consume `colyseus.js`.

## Notas técnicas

- El `shared` compila con `module: NodeNext` para que Node (servidor) resuelva los imports ESM. Vite (cliente) también lo maneja vía `exports` del `package.json`.
- Los esquemas de Colyseus (`@type`) necesitan `experimentalDecorators: true` (ya configurado en `server/tsconfig.json`).
- El servidor usa `colyseus@^0.16` y el cliente `colyseus.js@^0.16.22` (versiones alineadas por compatibilidad).
