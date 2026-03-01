/**
 * Webhook System
 * Handle outgoing webhooks for integrations
 */

const { logger } = require('./logger');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

class WebhookManager {
  constructor(db) {
    this.db = db;
    this.hooks = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Register a webhook
  async registerWebhook(config) {
    const { 
      url, 
      events = [], 
      headers = {}, 
      secret = null,
      name = null,
      active = true 
    } = config;

    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid webhook URL');
    }

    const id = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const webhook = {
      id,
      url,
      events,
      headers,
      secret,
      name: name || `Webhook ${id.substr(0, 8)}`,
      active,
      created_at: new Date().toISOString(),
      delivery_count: 0,
      failure_count: 0
    };

    this.hooks.set(id, webhook);
    
    // Store in database if available
    if (this.db) {
      this.db.createWebhook?.(webhook);
    }

    logger.info(`Webhook registered: ${id} (${url})`);
    return webhook;
  }

  // Unregister a webhook
  unregisterWebhook(id) {
    const hook = this.hooks.get(id);
    if (hook) {
      this.hooks.delete(id);
      logger.info(`Webhook unregistered: ${id}`);
      return true;
    }
    return false;
  }

  // Trigger webhook for event
  async trigger(event, payload) {
    const hooks = this.getHooksForEvent(event);
    
    if (hooks.length === 0) {
      return { triggered: 0, event };
    }

    const results = await Promise.allSettled(
      hooks.map(hook => this.deliver(hook, event, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Webhook delivery: ${successful} succeeded, ${failed} failed for event ${event}`);

    return {
      triggered: hooks.length,
      successful,
      failed,
      event
    };
  }

  // Deliver webhook payload
  async deliver(hook, event, payload) {
    if (!hook.active) {
      throw new Error('Webhook is inactive');
    }

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      payload
    });

    const signature = hook.secret 
      ? this.generateSignature(body, hook.secret)
      : null;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MORIS-Event': event,
        'X-MORIS-Delivery': `delivery_${Date.now()}`,
        'User-Agent': 'MORIS-Webhook/2.1.0',
        ...hook.headers,
        ...(signature && { 'X-MORIS-Signature': signature })
      }
    };

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.makeRequest(hook.url, options, body);
        
        hook.delivery_count++;
        
        logger.debug(`Webhook delivered to ${hook.url} (attempt ${attempt})`);
        
        return {
          success: true,
          hookId: hook.id,
          attempt,
          statusCode: result.statusCode
        };

      } catch (error) {
        lastError = error;
        logger.warn(`Webhook delivery failed (attempt ${attempt}): ${error.message}`);
        
        if (attempt < this.retryAttempts) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    hook.failure_count++;
    throw lastError;
  }

  // Make HTTP request
  makeRequest(url, options, body) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // Generate HMAC signature
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // Get webhooks for event
  getHooksForEvent(event) {
    return Array.from(this.hooks.values()).filter(hook => 
      hook.active && (hook.events.length === 0 || hook.events.includes(event))
    );
  }

  // Validate URL
  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get webhook stats
  getStats() {
    const hooks = Array.from(this.hooks.values());
    return {
      total: hooks.length,
      active: hooks.filter(h => h.active).length,
      total_deliveries: hooks.reduce((sum, h) => sum + h.delivery_count, 0),
      total_failures: hooks.reduce((sum, h) => sum + h.failure_count, 0),
      webhooks: hooks.map(h => ({
        id: h.id,
        name: h.name,
        url: h.url,
        active: h.active,
        deliveries: h.delivery_count,
        failures: h.failure_count
      }))
    };
  }

  // List all webhooks
  listWebhooks() {
    return Array.from(this.hooks.values());
  }

  // Get single webhook
  getWebhook(id) {
    return this.hooks.get(id);
  }

  // Update webhook
  updateWebhook(id, updates) {
    const hook = this.hooks.get(id);
    if (!hook) return null;

    Object.assign(hook, updates);
    logger.info(`Webhook updated: ${id}`);
    return hook;
  }
}

// Event types
const WebhookEvents = {
  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  
  // Task events
  TASK_CREATED: 'task.created',
  TASK_STARTED: 'task.started',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  
  // System events
  SYSTEM_HEALTH_CHECK: 'system.health_check',
  SYSTEM_ALERT: 'system.alert',
  
  // Report events
  REPORT_GENERATED: 'report.generated'
};

module.exports = { WebhookManager, WebhookEvents };