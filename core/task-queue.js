/**
 * Task Queue System
 * Bull queue with Redis for background job processing
 */

const Queue = require('bull');
const { logger } = require('./logger');

class TaskQueue {
  constructor(redisUrl = 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
    this.queues = new Map();
    this.processors = new Map();
  }

  // Create or get queue
  getQueue(name) {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, this.redisUrl, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 50
        }
      });

      // Log queue events
      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed in queue ${name}`, {
          queue: name,
          jobId: job.id,
          result
        });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed in queue ${name}:`, {
          queue: name,
          jobId: job.id,
          error: err.message
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in queue ${name}`);
      });

      this.queues.set(name, queue);
      logger.info(`Queue initialized: ${name}`);
    }

    return this.queues.get(name);
  }

  // Register job processor
  registerProcessor(queueName, processor) {
    const queue = this.getQueue(queueName);
    queue.process(processor);
    this.processors.set(queueName, processor);
    logger.info(`Processor registered for queue: ${queueName}`);
  }

  // Add job to queue
  async addJob(queueName, data, options = {}) {
    const queue = this.getQueue(queueName);
    const job = await queue.add(data, options);
    logger.info(`Job added to ${queueName}: ${job.id}`);
    return job;
  }

  // Get job by ID
  async getJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  // Get queue stats
  async getStats(queueName) {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  // Get all queues stats
  async getAllStats() {
    const stats = {};
    for (const [name, queue] of this.queues) {
      stats[name] = await this.getStats(name);
    }
    return stats;
  }

  // Pause queue
  async pause(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  // Resume queue
  async resume(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  // Clean completed jobs
  async clean(queueName, gracePeriodMs = 86400000) {
    const queue = this.getQueue(queueName);
    await queue.clean(gracePeriodMs, 'completed');
    logger.info(`Queue cleaned: ${queueName}`);
  }

  // Close all queues
  async close() {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }
    this.queues.clear();
  }
}

// Job definitions for different agents
const JobTypes = {
  AGENT_TASK: 'agent-task',
  REPORT_GENERATION: 'report-generation',
  DATA_SYNC: 'data-sync',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup'
};

// Standard job processors
function createAgentTaskProcessor(db, agents) {
  return async (job) => {
    const { agentId, taskType, data } = job.data;
    
    logger.info(`Processing agent task: ${taskType} for ${agentId}`);
    
    // Update task status
    await db.updateTask(job.data.taskId, {
      status: 'running',
      started_at: new Date().toISOString()
    });

    try {
      // Execute agent task
      const agent = agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const result = await agent.execute(taskType, data);

      // Update task as completed
      await db.updateTask(job.data.taskId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: result
      });

      // Log activity
      await db.logActivity({
        agent_id: agentId,
        task_id: job.data.taskId,
        level: 'info',
        message: `Task completed: ${taskType}`,
        metadata: { result }
      });

      return result;

    } catch (error) {
      // Update task as failed
      await db.updateTask(job.data.taskId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message
      });

      // Log error
      await db.logActivity({
        agent_id: agentId,
        task_id: job.data.taskId,
        level: 'error',
        message: `Task failed: ${error.message}`,
        metadata: { error: error.stack }
      });

      throw error;
    }
  };
}

function createReportProcessor(db) {
  return async (job) => {
    const { reportType, options } = job.data;
    
    logger.info(`Generating report: ${reportType}`);

    let data = {};

    switch (reportType) {
      case 'daily':
        data = await generateDailyReport(db);
        break;
      case 'weekly':
        data = await generateWeeklyReport(db);
        break;
      case 'agent-performance':
        data = await generateAgentPerformanceReport(db, options.agentId);
        break;
      default:
        data = await generateCustomReport(db, options);
    }

    // Save report
    const reportId = await db.generateReport(reportType, `${reportType} Report`, data);

    return { reportId, data };
  };
}

// Report generators
async function generateDailyReport(db) {
  const stats = db.getStats();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    date: today,
    summary: stats,
    tasks_completed: stats.tasks_by_status.find(s => s.status === 'completed')?.count || 0,
    tasks_pending: stats.tasks_by_status.find(s => s.status === 'pending')?.count || 0,
    agents_active: stats.agents.count,
    activity_today: stats.recent_activity.count
  };
}

async function generateWeeklyReport(db) {
  const stats = db.getStats();
  const logs = db.getActivityLogs({ since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }, 1000);
  
  return {
    week: 'current',
    summary: stats,
    activity_logs: logs.length,
    top_agents: getTopAgents(logs)
  };
}

async function generateAgentPerformanceReport(db, agentId) {
  const tasks = db.getTasks({ agent_id: agentId });
  const logs = db.getActivityLogs({ agent_id: agentId }, 100);
  
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  
  return {
    agent_id: agentId,
    total_tasks: tasks.length,
    completed,
    failed,
    success_rate: tasks.length > 0 ? ((completed / tasks.length) * 100).toFixed(2) : 0,
    recent_activity: logs.length
  };
}

function getTopAgents(logs) {
  const agentCounts = {};
  logs.forEach(log => {
    if (log.agent_id) {
      agentCounts[log.agent_id] = (agentCounts[log.agent_id] || 0) + 1;
    }
  });
  
  return Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([agentId, count]) => ({ agentId, activity: count }));
}

module.exports = {
  TaskQueue,
  JobTypes,
  createAgentTaskProcessor,
  createReportProcessor
};