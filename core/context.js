/**
 * Request Context & Correlation
 * Request tracing and context management
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

class RequestContext {
  constructor() {
    this.contexts = new Map();
  }

  // Middleware to set up request context
  middleware() {
    return (req, res, next) => {
      // Generate correlation ID
      const correlationId = req.headers['x-correlation-id'] || 
                           req.headers['x-request-id'] || 
                           uuidv4();

      // Create context
      const context = {
        correlationId,
        requestId: uuidv4(),
        startTime: Date.now(),
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id || null
      };

      // Store context
      this.contexts.set(context.requestId, context);

      // Attach to request
      req.context = context;
      req.correlationId = correlationId;

      // Set response headers
      res.setHeader('X-Correlation-Id', correlationId);
      res.setHeader('X-Request-Id', context.requestId);

      // Log request start
      logger.info(`Request started: ${req.method} ${req.path}`, {
        correlationId,
        requestId: context.requestId,
        ip: context.ip
      });

      // Track response time
      res.on('finish', () => {
        const duration = Date.now() - context.startTime;
        context.duration = duration;
        context.statusCode = res.statusCode;

        // Log request completion
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger[logLevel](`Request completed: ${req.method} ${req.path}`, {
          correlationId,
          requestId: context.requestId,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        });

        // Clean up context after 5 minutes
        setTimeout(() => {
          this.contexts.delete(context.requestId);
        }, 5 * 60 * 1000);
      });

      next();
    };
  }

  // Get current context (for use in non-request contexts)
  getContext(requestId) {
    return this.contexts.get(requestId);
  }

  // Get context by correlation ID
  getByCorrelationId(correlationId) {
    for (const context of this.contexts.values()) {
      if (context.correlationId === correlationId) {
        return context;
      }
    }
    return null;
  }

  // Get active requests count
  getActiveCount() {
    return this.contexts.size;
  }

  // Get statistics
  getStats() {
    const contexts = Array.from(this.contexts.values());
    const now = Date.now();
    
    return {
      active: contexts.length,
      avgDuration: contexts.length > 0
        ? contexts.reduce((sum, c) => sum + (c.duration || (now - c.startTime)), 0) / contexts.length
        : 0,
      byMethod: contexts.reduce((acc, c) => {
        acc[c.method] = (acc[c.method] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Singleton instance
const requestContext = new RequestContext();

module.exports = { RequestContext, requestContext };