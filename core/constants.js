/**
 * Constants
 * Application-wide constants
 */

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Task Status
  TASK_STATUS: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  // Agent Status
  AGENT_STATUS: {
    IDLE: 'idle',
    WORKING: 'working',
    ERROR: 'error',
    OFFLINE: 'offline'
  },

  // Log Levels
  LOG_LEVEL: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },

  // Priority Levels
  PRIORITY: {
    CRITICAL: 1,
    HIGH: 3,
    MEDIUM: 5,
    LOW: 7,
    LOWEST: 10
  },

  // Rate Limiting
  RATE_LIMIT: {
    DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    DEFAULT_MAX_REQUESTS: 100,
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 5
  },

  // Timeouts
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    LONG: 120000,   // 2 minutes
    SHORT: 5000     // 5 seconds
  },

  // Limits
  LIMITS: {
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE_SIZE: 20,
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_JSON_PAYLOAD: 10 * 1024 * 1024 // 10MB
  },

  // Validation Patterns
  PATTERNS: {
    ID: /^[a-z0-9_-]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  // Webhook Events
  WEBHOOK_EVENTS: {
    AGENT_CREATED: 'agent.created',
    AGENT_UPDATED: 'agent.updated',
    AGENT_STATUS_CHANGED: 'agent.status_changed',
    TASK_CREATED: 'task.created',
    TASK_STARTED: 'task.started',
    TASK_COMPLETED: 'task.completed',
    TASK_FAILED: 'task.failed',
    SYSTEM_HEALTH_CHECK: 'system.health_check',
    SYSTEM_ALERT: 'system.alert',
    REPORT_GENERATED: 'report.generated',
    BACKUP_CREATED: 'backup.created',
    WORKFLOW_STARTED: 'workflow.started',
    WORKFLOW_COMPLETED: 'workflow.completed'
  },

  // Job Types
  JOB_TYPES: {
    AGENT_TASK: 'agent-task',
    REPORT_GENERATION: 'report-generation',
    DATA_SYNC: 'data-sync',
    NOTIFICATION: 'notification',
    CLEANUP: 'cleanup'
  },

  // Cron Patterns
  CRON: {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_HOUR: '0 * * * *',
    EVERY_DAY: '0 0 * * *',
    EVERY_WEEK: '0 0 * * 0',
    EVERY_MONTH: '0 0 1 * *'
  },

  // Cache Keys
  CACHE_KEYS: {
    STATS: 'cache:stats',
    AGENTS: 'cache:agents',
    TASKS: 'cache:tasks',
    HEALTH: 'cache:health'
  },

  // Cache TTL (seconds)
  CACHE_TTL: {
    SHORT: 60,    // 1 minute
    MEDIUM: 300,  // 5 minutes
    LONG: 3600    // 1 hour
  }
};