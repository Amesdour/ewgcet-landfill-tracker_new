FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build 2>&1 | tee /tmp/build.log; exit 0
RUN cat /tmp/build.log && grep -i "error" /tmp/build.log && exit 1
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
