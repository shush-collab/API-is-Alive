FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/fake-api/package.json ./apps/fake-api/package.json
RUN npm install --legacy-peer-deps
COPY tsconfig.json ./tsconfig.json
COPY apps/fake-api ./apps/fake-api
RUN npm --workspace apps/fake-api run build
WORKDIR /app/apps/fake-api
ENV FAKE_API_PORT=5000
EXPOSE 5000
CMD ["npm", "run", "start"]
