FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev --no-audit --no-fund --loglevel=verbose
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]
