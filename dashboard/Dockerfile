FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
RUN npm install --production

# Copy source
COPY server.js ./
COPY public ./public

EXPOSE 3005

CMD ["node", "server.js"]