FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install

COPY tsconfig.json ./tsconfig.json
COPY apps/worker ./apps/worker
COPY packages/shared ./packages/shared

WORKDIR /app/apps/worker

CMD ["npm", "run", "dev"]
