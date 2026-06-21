# CatanOpen

Catán multijugador web construido con **React + Phaser + Tailwind** (cliente visual) y **Colyseus** (servidor con sincronización de estado en tiempo real).

## Arquitectura

```
CatanOpen/
├── shared/   # Tipos, constantes y generación del tablero (compartido)
├── server/   # Servidor Colyseus con la lógica del juego (autoritativo)
└── client/   # Frontend React + Vite + Phaser + Tailwind (visual)
```

### Stack

- **Frontend**: React 18, Vite, TypeScript, Phaser 3, Tailwind CSS, colyseus.js
- **Backend**: Colyseus, Express, TypeScript
- **Común**: paquete `shared` con tipos y lógica de tablero reutilizada por ambos extremos

### Flujo de datos

1. El cliente (React) muestra un lobby; al entrar, se conecta a una `GameRoom` de Colyseus.
2. El servidor genera el tablero hexagonal y lo replica a todos los clientes como estado sincronizado (`Schema`).
3. Phaser dibuja el tablero a partir del estado y emite mensajes al servidor (colocar poblado, tirar dados...).
4. El servidor valida cada acción, muta el estado, y Colyseus propaga los cambios a todos los clientes en tiempo real.
5. El HUD de React/Tailwind muestra recursos, puntos, turno actual y acciones disponibles.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Esto arranca en paralelo:
- Cliente: http://localhost:5173
- Servidor: http://localhost:2567

## Producción

```bash
npm run build
npm start
```

## Reglas implementadas (versión simplificada pero jugable)

- Tablero hexagonal procedural con 19 hexágonos (bosque, ladrillo, ovejas, trigo, montaña, desierto).
- Números 2–12 con fichas y probabilidad (puntos).
- 2–4 jugadores con colores distintos.
- Fase de colocación inicial: 2 poblados + 2 caminos por jugador.
- Fase de turno: tirada de dados → recolección → construcción → comercio con banco (4:1).
- Construcciones: poblado (1 pto), ciudad (2 pts), camino.
- Robador al sacar 7: roba recurso al jugador con +7 cartas y bloquea un hexágono.
- Victoria: primer jugador en alcanzar 10 puntos.

## Estructura detallada

Ver `shared/`, `server/` y `client/` para detalles de cada paquete.
