/**
 * WebSocket Server
 * Real-time communication for dashboard updates
 */

const WebSocket = require('ws');
const http = require('http');
const { logger } = require('./logger');

class WebSocketServer {
  constructor(port = 3002) {
    this.port = port;
    this.wss = null;
    this.clients = new Map();
    this.eventHandlers = new Map();
  }

  init() {
    // Create HTTP server
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'moris-websocket',
        status: 'running',
        connections: this.clients.size
      }));
    });

    // Create WebSocket server
    this.wss = new WebSocket.Server({ server });

    // Handle connections
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws: ws,
        subscribed: new Set(),
        connectedAt: new Date()
      };

      this.clients.set(clientId, clientInfo);
      logger.info(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: {
          clientId: clientId,
          message: 'Connected to MORIS WebSocket'
        }
      });

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('WebSocket message parse error:', error);
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid message format' }
          });
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });
    });

    // Start server
    server.listen(this.port, () => {
      logger.info(`WebSocket server running on port ${this.port}`);
    });

    return this;
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, message) {
    const { type, data } = message;

    switch (type) {
      case 'subscribe':
        this.handleSubscribe(clientId, data);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, data);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        // Broadcast to event handlers
        if (this.eventHandlers.has(type)) {
          this.eventHandlers.get(type)(clientId, data);
        }
    }
  }

  handleSubscribe(clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const channelsArray = Array.isArray(channels) ? channels : [channels];
    channelsArray.forEach(channel => {
      client.subscribed.add(channel);
    });

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channels: Array.from(client.subscribed) }
    });

    logger.debug(`Client ${clientId} subscribed to: ${channelsArray.join(', ')}`);
  }

  handleUnsubscribe(clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const channelsArray = Array.isArray(channels) ? channels : [channels];
    channelsArray.forEach(channel => {
      client.subscribed.delete(channel);
    });

    logger.debug(`Client ${clientId} unsubscribed from: ${channelsArray.join(', ')}`);
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(channel, data) {
    const message = {
      type: 'broadcast',
      channel: channel,
      timestamp: Date.now(),
      data: data
    };

    this.clients.forEach((client, clientId) => {
      if (client.subscribed.has(channel) || client.subscribed.has('all')) {
        this.sendToClient(clientId, message);
      }
    });

    logger.debug(`Broadcast to channel ${channel}:`, data);
  }

  // Event registration
  on(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  // Agent events
  notifyAgentStatus(agentId, status, data = {}) {
    this.broadcast('agents', {
      event: 'status_change',
      agentId: agentId,
      status: status,
      data: data
    });
  }

  notifyTaskUpdate(taskId, status, data = {}) {
    this.broadcast('tasks', {
      event: 'task_update',
      taskId: taskId,
      status: status,
      data: data
    });
  }

  notifySystemAlert(level, message, data = {}) {
    this.broadcast('system', {
      event: 'alert',
      level: level,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  getStats() {
    return {
      connections: this.clients.size,
      channels: this.getChannelStats()
    };
  }

  getChannelStats() {
    const channelStats = {};
    this.clients.forEach(client => {
      client.subscribed.forEach(channel => {
        channelStats[channel] = (channelStats[channel] || 0) + 1;
      });
    });
    return channelStats;
  }
}

module.exports = { WebSocketServer };