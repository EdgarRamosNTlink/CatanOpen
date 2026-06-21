import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El cliente se sirve en 5173 y se conecta al servidor Colyseus en 2567.
// En desarrollo, el proxy evita problemas de CORS/WebSocket.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // El SDK de Colyseus ya gestiona WebSocket directamente contra el servidor,
    // pero dejamos el proxy para el endpoint HTTP de salud/monitor si hiciera falta.
    proxy: {
      '/colyseus': {
        target: 'http://localhost:2567',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
