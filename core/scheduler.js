/**
 * Task Scheduler
 * Cron-based scheduling for recurring tasks
 */

const cron = require('node-cron');
const { logger } = require('./logger');

class TaskScheduler {
  constructor(db, taskQueue) {
    this.db = db;
    this.taskQueue = taskQueue;
    this.jobs = new Map();
    this.schedules = new Map();
  }

  // Load schedules from database
  async loadSchedules() {
    // In production, load from database
    logger.info('Loading scheduled tasks...');
  }

  // Schedule a recurring task
  schedule(name, cronExpression, taskConfig) {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Stop existing job if any
    this.unschedule(name);

    const job = cron.schedule(cronExpression, async () => {
      logger.info(`Executing scheduled task: ${name}`);
      
      try {
        await this.executeScheduledTask(name, taskConfig);
      } catch (error) {
        logger.error(`Scheduled task failed: ${name}`, error);
      }
    }, {
      scheduled: true,
      timezone: taskConfig.timezone || 'UTC'
    });

    this.jobs.set(name, job);
    this.schedules.set(name, {
      name,
      cron: cronExpression,
      config: taskConfig,
      createdAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    });

    logger.info(`Task scheduled: ${name} (${cronExpression})`);
    return { name, cron: cronExpression, status: 'scheduled' };
  }

  // Execute scheduled task
  async executeScheduledTask(name, config) {
    const schedule = this.schedules.get(name);
    
    // Create task in database
    const taskId = `scheduled_${name}_${Date.now()}`;
    
    this.db.createTask({
      id: taskId,
      title: config.title || `Scheduled: ${name}`,
      description: config.description || 'Auto-generated scheduled task',
      agent_id: config.agentId,
      priority: config.priority || 5,
      data: {
        type: 'scheduled',
        scheduleName: name,
        ...config.data
      }
    });

    // Add to queue if agent specified
    if (config.agentId && this.taskQueue) {
      await this.taskQueue.addJob('agent-task', {
        taskId,
        agentId: config.agentId,
        taskType: config.taskType || 'execute',
        data: config.data
      });
    }

    // Update schedule stats
    if (schedule) {
      schedule.lastRun = new Date().toISOString();
      schedule.runCount++;
    }

    logger.info(`Scheduled task executed: ${name}`);
  }

  // Unschedule a task
  unschedule(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      this.schedules.delete(name);
      logger.info(`Task unscheduled: ${name}`);
      return true;
    }
    return false;
  }

  // Pause a scheduled task
  pause(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      logger.info(`Task paused: ${name}`);
      return true;
    }
    return false;
  }

  // Resume a paused task
  resume(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`Task resumed: ${name}`);
      return true;
    }
    return false;
  }

  // Get all schedules
  getSchedules() {
    return Array.from(this.schedules.values());
  }

  // Get single schedule
  getSchedule(name) {
    return this.schedules.get(name);
  }

  // Get scheduler stats
  getStats() {
    const schedules = this.getSchedules();
    return {
      total: schedules.length,
      active: schedules.filter(s => this.jobs.has(s.name)).length,
      paused: schedules.filter(s => !this.jobs.get(s.name)).length,
      totalRuns: schedules.reduce((sum, s) => sum + (s.runCount || 0), 0),
      schedules
    };
  }

  // Run a task immediately (one-time)
  async runOnce(name, config) {
    logger.info(`Running one-time task: ${name}`);
    await this.executeScheduledTask(name, config);
    return { name, status: 'executed', timestamp: new Date().toISOString() };
  }

  // Validate cron expression
  validateCron(expression) {
    return cron.validate(expression);
  }

  // Get next run time
  getNextRun(cronExpression) {
    // This is a simplified version
    // In production, use a library like cron-parser
    return new Date(Date.now() + 60000); // Placeholder: 1 minute from now
  }

  // Stop all scheduled tasks
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Task stopped: ${name}`);
    });
    this.jobs.clear();
  }
}

// Common cron patterns
const CronPatterns = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY: '0 0 * * *',
  EVERY_WEEK: '0 0 * * 0',
  EVERY_MONTH: '0 0 1 * *'
};

module.exports = { TaskScheduler, CronPatterns };