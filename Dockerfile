FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY static ./static
COPY LIFE/engine.js LIFE/management.js LIFE/browser-ui.js LIFE/scenario-mars.json LIFE/management-config.json ./LIFE/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "server"]
