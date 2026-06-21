# Dockerfile para desplegar el servidor Colyseus a Railway.
# Railway detecta este Dockerfile en la raíz del repo y lo build-a.
# Necesitamos la raíz (no solo server/) porque el server depende de
# @catan/shared, que es otro workspace del monorepo.

FROM node:20-bookworm-slim

WORKDIR /app

# Copiamos primero los manifests de dependencias para aprovechar
# la cache de Docker: si no cambian package*.json, no reinstala.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json

# Instala las dependencias de los tres workspaces (shared, server, client).
# --ignore-scripts evita ejecutar postinstall de Phaser/Vite en el server.
RUN npm ci --ignore-scripts

# Copiamos el código fuente de shared y server (lo mínimo necesario).
COPY shared/ shared/
COPY server/ server/

# Compilamos shared primero (server importa @catan/shared/dist/index.js).
RUN npm -w shared run build && npm -w server run build

# Railway inyecta la variable PORT. Colyseus la lee en src/index.ts.
ENV PORT=2567
EXPOSE 2567

# Arranca el servidor compilado.
CMD ["node", "server/dist/index.js"]
