FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy all JS files from core/
COPY core/*.js ./
COPY core/shared ./shared/ 2>/dev/null || true

# Copy skills
COPY skills ./skills 2>/dev/null || true

# Create directories
RUN mkdir -p data logs reports

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

EXPOSE 3001 3002

CMD ["node", "main.js"]
