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

ENV PORT=3003
ENV NODE_ENV=production

# Expose ports
EXPOSE 3003 3002

# Health check on port 3003 using 127.0.0.1
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3003/health || exit 1

# Start the application
CMD ["node", "main.js"]
