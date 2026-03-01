/**
 * Dashboard Server
 * Serves dashboard UI and API
 */

const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { logger } = require('../core/logger');

class DashboardServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3005,
      apiUrl: config.apiUrl || 'http://localhost:3001',
      wsPort: config.wsPort || 3002
    };
    
    this.app = express();
    this.server = null;
    this.wss = null;
  }

  init() {
    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // API proxy to core
    this.app.use('/api', (req, res) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: req.url,
        method: req.method,
        headers: req.headers
      };
      
      const proxy = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxy.on('error', (err) => {
        logger.error('Dashboard API proxy error:', err);
        res.status(502).json({ error: 'Core service unavailable' });
      });
      
      req.pipe(proxy);
    });

    // Serve dashboard
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });

    logger.info('Dashboard server initialized');
    return this;
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        logger.info(`📊 Dashboard server running on port ${this.config.port}`);
        console.log(`🌐 Dashboard: http://localhost:${this.config.port}`);
        resolve(this);
      });
    });
  }
}

module.exports = { DashboardServer };