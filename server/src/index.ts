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

  // Endpoint mínimo de salud para Railway/CDN.
  // Colyseus no define handler HTTP para GET /, por lo que el proxy inverso
  // de Railway no recibe respuesta y considera el servicio no-ready.
  // El transport por defecto (WebSocketTransport de @colyseus/ws-transport)
  // expone `server`, que es un http.Server de Node.js. Agregamos un listener
  // 'request' que responda 200 OK a /health ANTES de que Colyseus registre
  // sus propias rutas. Los eventos 'request' se emiten para toda petición
  // HTTP que no sea upgrade de WebSocket.
  const httpServer = (gameServer as any).transport.server as import('http').Server;
  httpServer.on('request', (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    }
  });

  await gameServer.listen(port);

  // eslint-disable-next-line no-console
  console.log(`CatanOpen server escuchando en http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Error arrancando el servidor:', err);
  process.exit(1);
});
