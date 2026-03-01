/**
 * Security Manager
 * Authentication, authorization, and security utilities
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

class SecurityManager {
  constructor(config = {}) {
    const jwtSecret = config.jwtSecret || process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required. Set it in environment variables or config.');
    }
    
    this.config = {
      jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn || '24h',
      apiKeyHeader: config.apiKeyHeader || 'x-api-key',
      bcryptRounds: config.bcryptRounds || 10,
      ...config
    };
    
    this.apiKeys = new Map();
    this.sessions = new Map();
    this.rateLimits = new Map();
  }

  // Generate API key
  generateApiKey(name, permissions = ['read']) {
    const key = `mor_${crypto.randomBytes(32).toString('hex')}`;
    const apiKey = {
      key,
      name,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      active: true
    };
    
    this.apiKeys.set(key, apiKey);
    logger.info(`API key generated: ${name}`);
    return apiKey;
  }

  // Validate API key
  validateApiKey(key) {
    const apiKey = this.apiKeys.get(key);
    
    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!apiKey.active) {
      return { valid: false, error: 'API key is deactivated' };
    }
    
    // Update usage stats
    apiKey.lastUsed = new Date().toISOString();
    apiKey.usageCount++;
    
    return { 
      valid: true, 
      apiKey,
      permissions: apiKey.permissions 
    };
  }

  // Revoke API key
  revokeApiKey(key) {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.active = false;
      logger.info(`API key revoked: ${apiKey.name}`);
      return true;
    }
    return false;
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // Hash password
  async hashPassword(password) {
    // In production, use bcrypt
    // For now, simple hash
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Verify password
  async verifyPassword(password, hash) {
    const hashed = await this.hashPassword(password);
    return hashed === hash;
  }

  // Generate secure random string
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Check rate limit
  checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let limit = this.rateLimits.get(identifier);
    
    if (!limit) {
      limit = { requests: [], windowStart: now };
      this.rateLimits.set(identifier, limit);
    }
    
    // Clean old requests
    limit.requests = limit.requests.filter(time => time > windowStart);
    
    // Check if over limit
    if (limit.requests.length >= maxRequests) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((limit.requests[0] + windowMs - now) / 1000)
      };
    }
    
    // Add current request
    limit.requests.push(now);
    
    return { 
      allowed: true, 
      remaining: maxRequests - limit.requests.length 
    };
  }

  // Sanitize input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .trim();
  }

  // Validate email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check permissions
  checkPermission(userPermissions, requiredPermission) {
    if (userPermissions.includes('admin')) return true;
    return userPermissions.includes(requiredPermission);
  }

  // Create session
  createSession(userId, data = {}) {
    const sessionId = this.generateSecureToken(16);
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...data
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  // Get session
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Destroy session
  destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Clean up old sessions
  cleanupSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, session] of this.sessions) {
      const lastActivity = new Date(session.lastActivity).getTime();
      if (now - lastActivity > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old sessions`);
    }
    
    return cleaned;
  }

  // Middleware for Express
  middleware() {
    return {
      // API key authentication
      apiKey: (req, res, next) => {
        const key = req.headers[this.config.apiKeyHeader.toLowerCase()];
        
        if (!key) {
          return res.status(401).json({ error: 'API key required' });
        }
        
        const result = this.validateApiKey(key);
        
        if (!result.valid) {
          return res.status(401).json({ error: result.error });
        }
        
        req.apiKey = result.apiKey;
        req.permissions = result.permissions;
        next();
      },

      // JWT authentication
      jwt: (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Bearer token required' });
        }
        
        const token = authHeader.substring(7);
        const payload = this.verifyToken(token);
        
        if (!payload) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        req.user = payload;
        next();
      },

      // Rate limiting
      rateLimit: (maxRequests = 100, windowMs = 60000) => {
        return (req, res, next) => {
          const identifier = req.ip || req.connection.remoteAddress;
          const result = this.checkRateLimit(identifier, maxRequests, windowMs);
          
          if (!result.allowed) {
            return res.status(429).json({
              error: 'Too many requests',
              retryAfter: result.retryAfter
            });
          }
          
          res.setHeader('X-RateLimit-Remaining', result.remaining);
          next();
        };
      },

      // Permission check
      requirePermission: (permission) => {
        return (req, res, next) => {
          const permissions = req.permissions || (req.user && req.user.permissions) || [];
          
          if (!this.checkPermission(permissions, permission)) {
            return res.status(403).json({ error: 'Permission denied' });
          }
          
          next();
        };
      }
    };
  }

  // Get security stats
  getStats() {
    return {
      apiKeys: {
        total: this.apiKeys.size,
        active: Array.from(this.apiKeys.values()).filter(k => k.active).length
      },
      sessions: {
        total: this.sessions.size
      },
      rateLimits: {
        tracked: this.rateLimits.size
      }
    };
  }
}

module.exports = { SecurityManager };