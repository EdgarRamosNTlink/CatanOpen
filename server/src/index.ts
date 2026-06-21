// Punto de entrada del servidor Colyseus.
// Define la sala "game" y la expone vía HTTP + WebSocket.

import { Server } from 'colyseus';
import { GameRoom } from './rooms/GameRoom.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 2567);

  // El servidor de Colyseus gestiona salas, transporte WebSocket y un
  // servidor HTTP embebido. Con `define` registramos la sala con un nombre
  // que los clientes usarán al conectarse (`client.join('game')`).
  const gameServer = new Server();
  gameServer.define('game', GameRoom);

  await gameServer.listen(port);

  // eslint-disable-next-line no-console
  console.log(`CatanOpen server escuchando en http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Error arrancando el servidor:', err);
  process.exit(1);
});
