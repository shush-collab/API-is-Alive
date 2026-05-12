FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
ENV GATEWAY_PORT=4000
EXPOSE 4000
CMD ["npm", "run", "dev"]
