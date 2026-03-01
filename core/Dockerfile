FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy source
COPY *.js ./

# Create directories
RUN mkdir -p data logs reports

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

EXPOSE 3001 3002

CMD ["node", "main.js"]