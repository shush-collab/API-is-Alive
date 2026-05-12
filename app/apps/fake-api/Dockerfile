FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
ENV FAKE_API_PORT=5000
EXPOSE 5000
CMD ["npm", "run", "dev"]
