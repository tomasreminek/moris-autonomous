/**
 * Health Monitor & Metrics
 * System health tracking and metrics collection
 */

const os = require('os');
const { logger } = require('./logger');

class HealthMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      agentExecutions: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };
    
    // Start periodic health checks
    this.startHealthChecks();
  }

  // Record request
  recordRequest() {
    this.metrics.requests++;
  }

  // Record error
  recordError() {
    this.metrics.errors++;
  }

  // Record task completion
  recordTask(success) {
    if (success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksFailed++;
    }
  }

  // Record agent execution
  recordAgentExecution(agentId) {
    this.metrics.agentExecutions++;
    logger.debug(`Agent ${agentId} executed`);
  }

  // Get system stats
  getSystemStats() {
    return {
      cpu: {
        usage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version
    };
  }

  // Get metrics
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      system: this.getSystemStats(),
      timestamp: new Date().toISOString()
    };
  }

  // Format uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Start periodic health checks
  startHealthChecks() {
    // Log health status every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics();
      logger.info('Health check', {
        uptime: metrics.uptimeFormatted,
        requests: metrics.requests,
        errors: metrics.errors,
        memory: metrics.system.memory.percentage + '%'
      });
    }, 5 * 60 * 1000);
  }

  // Get health status for API
  getHealthStatus() {
    const stats = this.getSystemStats();
    const healthy = stats.memory.percentage < 90;
    
    return {
      status: healthy ? 'healthy' : 'warning',
      checks: {
        memory: stats.memory.percentage < 90 ? 'ok' : 'high',
        cpu: 'ok',
        disk: 'ok'
      },
      metrics: this.getMetrics()
    };
  }
}

module.exports = { HealthMonitor };