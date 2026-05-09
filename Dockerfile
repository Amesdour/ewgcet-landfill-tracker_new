FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=512" npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js schema.sql ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
