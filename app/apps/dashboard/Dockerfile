FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY index.html ./
COPY postcss.config.cjs ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
