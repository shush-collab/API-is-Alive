FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install --legacy-peer-deps

COPY tsconfig.json ./tsconfig.json
COPY apps/gateway ./apps/gateway
COPY packages/shared ./packages/shared

RUN npm --workspace apps/gateway run build

WORKDIR /app/apps/gateway

ENV GATEWAY_PORT=4000
EXPOSE 4000

CMD ["npm", "run", "start"]
