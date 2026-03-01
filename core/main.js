/**
 * Enhanced Core Server with Full Infrastructure
 * Integrates Database, WebSocket, Task Queue, and Reporting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { logger } = require('./logger');
const { errorHandler, notFoundHandler, asyncHandler, AppError, ValidationError } = require('./error-handler');
const { DatabaseManager } = require('./database');
const { WebSocketServer } = require('./websocket');
const { TaskQueue, JobTypes, createAgentTaskProcessor, createReportProcessor } = require('./task-queue');
const { ReportingSystem } = require('./reporting');
const { HealthMonitor } = require('./monitor');
const { AgentRegistry, CoderAgent, CopywriterAgent } = require('./agents');

class MorisCore {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3001,
      wsPort: config.wsPort || 3002,
      dbPath: config.dbPath || './data/moris.db',
      redisUrl: config.redisUrl || 'redis://localhost:6379'
    };

    this.app = express();
    this.db = null;
    this.wsServer = null;
    this.taskQueue = null;
    this.reporting = null;
    this.monitor = null;
    this.agentRegistry = null;
  }

  async init() {
    logger.info('Initializing MORIS Core...');

    // Initialize database
    this.db = new DatabaseManager(this.config.dbPath);
    
    // Initialize agent registry
    this.agentRegistry = new AgentRegistry();
    this.setupDefaultAgents();

    // Initialize task queue
    this.taskQueue = new TaskQueue(this.config.redisUrl);
    this.setupQueueProcessors();

    // Initialize WebSocket server
    this.wsServer = new WebSocketServer(this.config.wsPort);
    this.wsServer.init();

    // Initialize reporting
    this.reporting = new ReportingSystem(this.db);

    // Initialize monitor
    this.monitor = new HealthMonitor();

    // Setup Express middleware and routes
    this.setupExpress();

    logger.info('MORIS Core initialized successfully');
    return this;
  }

  setupDefaultAgents() {
    // Create default agents if none exist
    const existingAgents = this.db.getAllAgents();
    
    if (existingAgents.length === 0) {
      logger.info('Creating default agents...');
      
      // Create agents in database
      this.db.createAgent({
        id: 'moris',
        name: 'Moris',
        role: 'orchestrator',
        status: 'active',
        config: { description: 'Main orchestrator agent' }
      });

      this.db.createAgent({
        id: 'dahlia',
        name: 'Dahlia',
        role: 'assistant',
        status: 'active',
        config: { description: 'Personal assistant' }
      });

      this.db.createAgent({
        id: 'coder',
        name: 'Pro Coder',
        role: 'developer',
        status: 'active',
        config: { description: 'Software development expert' }
      });

      this.db.createAgent({
        id: 'copywriter',
        name: 'Copywriter',
        role: 'content',
        status: 'active',
        config: { description: 'Content creation expert' }
      });

      // Register in agent registry
      this.agentRegistry.create('base', { id: 'moris', name: 'Moris', role: 'orchestrator' });
      this.agentRegistry.create('base', { id: 'dahlia', name: 'Dahlia', role: 'assistant' });
      this.agentRegistry.create('coder', { id: 'coder', name: 'Pro Coder' });
      this.agentRegistry.create('copywriter', { id: 'copywriter', name: 'Copywriter' });
    }
  }

  setupQueueProcessors() {
    // Register agent task processor
    this.taskQueue.registerProcessor(
      JobTypes.AGENT_TASK,
      createAgentTaskProcessor(this.db, this.agentRegistry)
    );

    // Register report processor
    this.taskQueue.registerProcessor(
      JobTypes.REPORT_GENERATION,
      createReportProcessor(this.db)
    );
  }

  setupExpress() {
    // Security middleware
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMITED' }}
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // HTTP logging
    this.app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) }}));

    // Routes
    this.setupRoutes();

    // Error handling
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      this.monitor.recordRequest();
      res.json({
        success: true,
        status: 'healthy',
        service: 'moris-core',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        features: ['database', 'websocket', 'task-queue', 'reporting']
      });
    });

    // Dashboard stats
    this.app.get('/api/stats', asyncHandler(async (req, res) => {
      const stats = this.db.getStats();
      const agentStats = this.agentRegistry.getStats();
      const queueStats = await this.taskQueue.getAllStats();
      
      res.json({
        success: true,
        data: {
          database: stats,
          agents: agentStats,
          queues: queueStats,
          system: this.monitor.getMetrics()
        }
      });
    }));

    // Agents routes
    this.app.get('/api/agents', asyncHandler(async (req, res) => {
      const agents = this.db.getAllAgents();
      res.json({ success: true, count: agents.length, agents });
    }));

    this.app.get('/api/agents/:id', asyncHandler(async (req, res) => {
      const agent = this.db.getAgent(req.params.id);
      if (!agent) throw new NotFoundError('Agent not found');
      
      const registryAgent = this.agentRegistry.get(req.params.id);
      if (registryAgent) {
        agent.stats = registryAgent.getStats();
      }
      
      res.json({ success: true, agent });
    }));

    // Tasks routes
    this.app.get('/api/tasks', asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.agent_id) filters.agent_id = req.query.agent_id;
      
      const tasks = this.db.getTasks(filters);
      res.json({ success: true, count: tasks.length, tasks });
    }));

    this.app.post('/api/tasks', asyncHandler(async (req, res) => {
      const { title, description, agent_id, priority = 5, data = {} } = req.body;
      
      if (!title) throw new ValidationError('Title is required');
      
      const taskId = `task_${Date.now()}`;
      
      // Create task in database
      this.db.createTask({
        id: taskId,
        title,
        description,
        agent_id,
        priority,
        data
      });

      // Add to queue if agent specified
      if (agent_id) {
        await this.taskQueue.addJob(JobTypes.AGENT_TASK, {
          taskId,
          agentId: agent_id,
          taskType: data.type || 'execute',
          data
        });
      }

      // Notify via WebSocket
      this.wsServer.notifyTaskUpdate(taskId, 'created', { title, agent_id });

      res.status(201).json({
        success: true,
        message: 'Task created',
        task: this.db.getTask(taskId)
      });
    }));

    this.app.get('/api/tasks/:id', asyncHandler(async (req, res) => {
      const task = this.db.getTask(req.params.id);
      if (!task) throw new NotFoundError('Task not found');
      res.json({ success: true, task });
    }));

    // Reports routes
    this.app.get('/api/reports', asyncHandler(async (req, res) => {
      const reports = this.reporting.listReports(req.query.type, req.query.limit);
      res.json({ success: true, reports });
    }));

    this.app.post('/api/reports', asyncHandler(async (req, res) => {
      const { type = 'dashboard' } = req.body;
      
      let result;
      switch (type) {
        case 'dashboard':
          result = await this.reporting.generateDashboardReport();
          break;
        case 'health':
          result = await this.reporting.generateHealthReport();
          break;
        default:
          throw new ValidationError('Unknown report type');
      }

      res.json({ success: true, report: result });
    }));

    this.app.get('/api/reports/:id', asyncHandler(async (req, res) => {
      const report = this.reporting.getReport(req.params.id);
      if (!report) throw new NotFoundError('Report not found');
      res.json({ success: true, report });
    }));

    // Activity logs
    this.app.get('/api/logs', asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.agent_id) filters.agent_id = req.query.agent_id;
      if (req.query.level) filters.level = req.query.level;
      
      const logs = this.db.getActivityLogs(filters, req.query.limit || 100);
      res.json({ success: true, count: logs.length, logs });
    }));

    // WebSocket stats
    this.app.get('/api/websocket', (req, res) => {
      res.json({
        success: true,
        stats: this.wsServer.getStats()
      });
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        logger.info(`🚀 MORIS Core v2.0 running on port ${this.config.port}`);
        console.log(`✅ Server: http://localhost:${this.config.port}`);
        console.log(`📊 Health: http://localhost:${this.config.port}/health`);
        console.log(`🔌 WebSocket: ws://localhost:${this.config.wsPort}`);
        resolve(this);
      });
    });
  }

  async shutdown() {
    logger.info('Shutting down MORIS Core...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.wsServer) {
      // Close WebSocket connections
    }
    
    if (this.taskQueue) {
      await this.taskQueue.close();
    }
    
    if (this.db) {
      this.db.close();
    }
    
    logger.info('MORIS Core shutdown complete');
  }
}

// Start if run directly
if (require.main === module) {
  const core = new MorisCore();
  
  core.init()
    .then(() => core.start())
    .catch(err => {
      logger.error('Failed to start MORIS Core:', err);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGTERM', () => core.shutdown());
  process.on('SIGINT', () => core.shutdown());
}

module.exports = { MorisCore };