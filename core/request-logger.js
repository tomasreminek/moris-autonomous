/**
 * Request Logger
 * Enhanced request/response logging
 */

const { logger } = require('./logger');
const { HTTP_STATUS } = require('./constants');

class RequestLogger {
  constructor(options = {}) {
    this.options = {
      logBody: options.logBody || false,
      logHeaders: options.logHeaders || false,
      sensitiveFields: options.sensitiveFields || ['password', 'token', 'secret', 'apiKey', 'api_key'],
      ...options
    };
  }

  // Middleware for request logging
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = req.requestId || req.context?.requestId;
      const correlationId = req.correlationId || req.context?.correlationId;

      // Log request
      this.logRequest(req, { requestId, correlationId });

      // Capture response
      const originalSend = res.send;
      res.send = function(body) {
        res.responseBody = body;
        return originalSend.call(this, body);
      };

      // Log on finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logResponse(req, res, duration, { requestId, correlationId });
      });

      next();
    };
  }

  // Log incoming request
  logRequest(req, context = {}) {
    const logData = {
      type: 'request',
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      ...context
    };

    // Add body if enabled (and mask sensitive data)
    if (this.options.logBody && req.body) {
      logData.body = this.maskSensitiveData(req.body);
    }

    // Add headers if enabled
    if (this.options.logHeaders) {
      logData.headers = this.sanitizeHeaders(req.headers);
    }

    logger.info(`→ ${req.method} ${req.path}`, logData);
  }

  // Log response
  logResponse(req, res, duration, context = {}) {
    const statusCode = res.statusCode;
    const logData = {
      type: 'response',
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      ...context
    };

    // Determine log level based on status code
    let logLevel = 'info';
    if (statusCode >= 500) logLevel = 'error';
    else if (statusCode >= 400) logLevel = 'warn';

    // Add response body for errors
    if (statusCode >= 400 && res.responseBody) {
      try {
        const body = typeof res.responseBody === 'string' 
          ? JSON.parse(res.responseBody) 
          : res.responseBody;
        logData.error = body.error || body.message;
      } catch (e) {
        // Ignore parse errors
      }
    }

    logger[logLevel](`← ${req.method} ${req.path} ${statusCode} (${duration}ms)`, logData);
  }

  // Mask sensitive data in objects
  maskSensitiveData(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.options.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = '***masked***';
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  // Sanitize headers for logging
  sanitizeHeaders(headers) {
    const sanitized = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***masked***';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Static method for quick setup
  static create(options = {}) {
    const logger = new RequestLogger(options);
    return logger.middleware();
  }
}

module.exports = { RequestLogger };