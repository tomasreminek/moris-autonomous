FROM node:18-alpine

WORKDIR /app

# Copy and install dependencies
COPY package.json ./
RUN npm install --production

# Copy all source code
COPY core/ ./
COPY skills ./skills

# Create data directories
RUN mkdir -p data logs reports

# Health check - uses PORT env variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT:-3001}/health || exit 1

# Expose ports (API + WebSocket)
EXPOSE 3001 3002 3003

# Start the application
CMD ["node", "main.js"]
