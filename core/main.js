/**
 * Enhanced Core Server with Full Infrastructure
 * Integrates Database, WebSocket, Task Queue, and Reporting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const compression = require('compression');
const path = require('path');

const { logger } = require('./logger');
const { errorHandler, notFoundHandler, asyncHandler, AppError, ValidationError } = require('./error-handler');
const { DatabaseManager } = require('./database');
const { WebSocketServer } = require('./websocket');
const { TaskQueue, JobTypes, createAgentTaskProcessor, createReportProcessor } = require('./task-queue');
const { ReportingSystem } = require('./reporting');
const { HealthMonitor } = require('./monitor');
const { AgentRegistry, CoderAgent, CopywriterAgent } = require('./agents');
const { WeatherAgent, SecurityAgent, SkillCreatorAgent } = require('./agents-skilled');
const { SkillLoader } = require('./skill-loader');
const { Validator } = require('./validation');
const { requestContext } = require('./context');
const { RequestLogger } = require('./request-logger');
const { HTTP_STATUS, RATE_LIMIT, LIMITS } = require('./constants');

class MorisCore {
  constructor(config = {}) {
    this.config = {
      port: config.port || parseInt(process.env.PORT) || 3001,
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
    // Trust proxy (for correct IP behind nginx)
    this.app.set('trust proxy', 1);
    
    // Security middleware
    this.app.use(helmet({ 
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    this.app.use(cors({ 
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());

    // Session middleware for authentication
    this.app.use(session({
      secret: process.env.JWT_SECRET || 'moris-secret-demo-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production'
      }
    }));

    // Auth middleware
    this.authMiddleware = (req, res, next) => {
      if (req.session && req.session.authenticated) {
        return next();
      }
      return res.status(401).json({ success: false, error: 'Unauthorized - Please login' });
    };

    // Request context & correlation IDs
    this.app.use(requestContext.middleware());
    
    // Enhanced request logging
    this.app.use(RequestLogger.create({ 
      logBody: process.env.NODE_ENV === 'development',
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'api_key', 'jwt']
    }));
    
    // Rate limiting with different tiers
    const standardLimiter = rateLimit({
      windowMs: RATE_LIMIT.DEFAULT_WINDOW_MS,
      max: RATE_LIMIT.DEFAULT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || req.connection.remoteAddress,
      handler: (req, res) => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          error: { 
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil(RATE_LIMIT.DEFAULT_WINDOW_MS / 1000)
          }
        });
      }
    });
    
    const strictLimiter = rateLimit({
      windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
      max: RATE_LIMIT.AUTH_MAX_REQUESTS,
      handler: (req, res) => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          error: { 
            message: 'Too many authentication attempts',
            code: 'AUTH_RATE_LIMITED'
          }
        });
      }
    });
    
    this.app.use('/api/', standardLimiter);
    this.app.use('/api/auth/', strictLimiter);

    // Body parsing with limits
    this.app.use(express.json({ 
      limit: LIMITS.MAX_JSON_PAYLOAD,
      strict: true // Only accept arrays and objects
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: LIMITS.MAX_JSON_PAYLOAD 
    }));
    
    // Input sanitization
    this.app.use(Validator.sanitizeBody);

    // Routes
    this.setupRoutes();

    // Error handling (must be last)
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  setupRoutes() {
    // Root landing page with Pixel Office
    this.app.get('/', (req, res) => {
      const agents = [
        { id: 'moris', name: 'Moris', role: 'CEO', emoji: '🧠', color: '#00d4ff', desc: 'Chief Executive Officer - Strategic decisions' },
        { id: 'dahlia', name: 'Dahlia', role: 'Personal Assistant', emoji: '🌸', color: '#ff6b9d', desc: 'Personal organization & scheduling' },
        { id: 'coder', name: 'Pro Coder', role: 'Developer', emoji: '💻', color: '#4ade80', desc: 'Software development & code review' },
        { id: 'copywriter', name: 'Copywriter', role: 'Content Creator', emoji: '✍️', color: '#fbbf24', desc: 'Content writing & copy optimization' },
        { id: 'marketing', name: 'Marketing', role: 'Growth', emoji: '📈', color: '#a78bfa', desc: 'Marketing strategy & campaigns' },
        { id: 'finance', name: 'Finance', role: 'CFO', emoji: '💰', color: '#22c55e', desc: 'Financial planning & analysis' },
        { id: 'security', name: 'Security', role: 'Auditor', emoji: '🔒', color: '#ef4444', desc: 'Security audits & compliance' },
        { id: 'qa', name: 'QA Tester', role: 'Quality', emoji: '🔍', color: '#f97316', desc: 'Testing & quality assurance' },
        { id: 'devops', name: 'DevOps', role: 'Infrastructure', emoji: '⚙️', color: '#06b6d4', desc: 'Deployment & infrastructure' },
        { id: 'designer', name: 'Designer', role: 'Creative', emoji: '🎨', color: '#ec4899', desc: 'UI/UX & visual design' },
        { id: 'analyst', name: 'Analyst', role: 'Data', emoji: '📊', color: '#8b5cf6', desc: 'Data analysis & insights' },
        { id: 'support', name: 'Support', role: 'Customer Success', emoji: '🤝', color: '#10b981', desc: 'Customer support & relations' }
      ];
      
      const status = '● Online';
      const uptime = Math.floor(process.uptime() / 60);
      
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MORIS Autonomous | 12-Agent AI System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
      color: #e0e0e0; min-height: 100vh; padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    header { text-align: center; padding: 40px 0; }
    h1 { 
      font-size: 3.5rem; 
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .tagline { color: #888; font-size: 1.2rem; }
    
    /* Status Bar */
    .status-bar {
      background: rgba(26, 26, 46, 0.8);
      border: 1px solid #00d4ff33;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      flex-wrap: wrap;
    }
    .status-item { text-align: center; }
    .status-label { color: #888; font-size: 0.85rem; text-transform: uppercase; }
    .status-value { 
      font-size: 1.5rem; font-weight: bold; color: #4ade80;
    }
    .online { color: #4ade80; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    /* Pixel Office */
    .pixel-office {
      background: #0d1117;
      border-radius: 16px;
      padding: 30px;
      margin: 30px 0;
      border: 2px solid #21262d;
    }
    .office-title {
      text-align: center;
      font-size: 1.5rem;
      color: #00d4ff;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    /* Agent Grid */
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
    }
    .agent-card {
      background: linear-gradient(145deg, #161b22 0%, #0d1117 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .agent-card:hover {
      transform: translateY(-3px);
      border-color: var(--agent-color, #00d4ff);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .agent-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: var(--agent-color, #00d4ff);
    }
    .agent-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .agent-avatar {
      width: 50px; height: 50px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem;
      background: var(--agent-color, #00d4ff)22;
    }
    .agent-info h3 { color: #fff; font-size: 1.1rem; }
    .agent-role {
      color: var(--agent-color, #00d4ff);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .agent-desc { color: #8b949e; font-size: 0.85rem; margin-top: 8px; }
    .agent-status {
      position: absolute; top: 15px; right: 15px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #4ade80; animation: blink 2s infinite;
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    /* API Endpoints */
    .api-section {
      background: rgba(22, 27, 34, 0.8);
      border-radius: 12px; padding: 25px; margin-top: 30px;
    }
    .api-title { color: #00d4ff; margin-bottom: 15px; }
    .endpoint-list { display: flex; flex-wrap: wrap; gap: 10px; }
    .endpoint-badge {
      background: #21262d; color: #58a6ff;
      padding: 8px 16px; border-radius: 6px;
      text-decoration: none; font-family: monospace; font-size: 0.85rem;
      border: 1px solid #30363d; transition: all 0.2s;
    }
    .endpoint-badge:hover {
      background: #1f6feb; color: #fff; border-color: #58a6ff;
    }
    
    /* Footer */
    footer {
      text-align: center; padding: 30px; color: #666;
      border-top: 1px solid #21262d; margin-top: 30px;
    }
    
    /* Mobile */
    @media (max-width: 768px) {
      h1 { font-size: 2rem; }
      .agent-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 MORIS Autonomous</h1>
      <p class="tagline">12-Agent AI Workforce System v2.0</p>
    </header>
    
    <div class="status-bar">
      <div class="status-item">
        <div class="status-label">Status</div>
        <div class="status-value online">● Online</div>
      </div>
      <div class="status-item">
        <div class="status-label">Agents</div>
        <div class="status-value">12</div>
      </div>
      <div class="status-item">
        <div class="status-label">Uptime</div>
        <div class="status-value">${uptime}m</div>
      </div>
      <div class="status-item">
        <div class="status-label">Version</div>
        <div class="status-value">v2.0</div>
      </div>
    </div>
    
    <div class="pixel-office">
      <div class="office-title">
        🏢 Pixel Office — All Agents Active
      </div>
      <div class="agent-grid">
        ${agents.map(a => \`<div class="agent-card" style="--agent-color: ${a.color}">
          <div class="agent-status"></div>
          <div class="agent-header">
            <div class="agent-avatar">${a.emoji}</div>
            <div class="agent-info">
              <h3>${a.name}</h3>
              <span class="agent-role">${a.role}</span>
            </div>
          </div>
          <div class="agent-desc">${a.desc}</div>
        </div>\`).join('')}
      </div>
    </div>
    
    <div class="api-section">
      <h2 class="api-title">⚡ Available Endpoints</h2>
      <div class="endpoint-list">
        <a class="endpoint-badge" href="/health">/health</a>
        <a class="endpoint-badge" href="/api/agents">/api/agents</a>
        <a class="endpoint-badge" href="/api/stats">/api/stats</a>
        <a class="endpoint-badge" href="/api/tasks">/api/tasks</a>
        <a class="endpoint-badge" href="/api/skills">/api/skills</a>
        <a class="endpoint-badge" href="/api/reports">/api/reports</a>
      </div>
    </div>
    
    <footer>
      <p>🔌 WebSocket: ws://${req.headers.host}:3002</p>
      <p style="margin-top:10px;font-size:0.8rem;">Deployed on Coolify • Powered by OpenClaw</p>
    </footer>
  </div>
</body>
</html>`);
    });

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

    // Skill routes
    this.setupSkillRoutes();
  }

  setupSkillRoutes() {
    // Skill catalog
    this.app.get('/api/skills', asyncHandler(async (req, res) => {
      const skillLoader = new SkillLoader();
      await skillLoader.loadAllSkills();
      const catalog = skillLoader.getCatalog();
      
      res.json({
        success: true,
        count: catalog.length,
        skills: catalog
      });
    }));

    // Execute skill
    this.app.post('/api/skills/:name/execute', 
      Validator.validateIdParam,
      asyncHandler(async (req, res) => {
        const { name } = req.params;
        const { command = 'default', args = {} } = req.body;
        
        const skillLoader = new SkillLoader();
        await skillLoader.loadAllSkills();
        
        const result = await skillLoader.execute(name, command, args);
        
        res.json({
          success: result.success,
          skill: name,
          command,
          result
        });
      })
    );

    // Weather agent endpoint
    this.app.post('/api/agents/weather/execute', asyncHandler(async (req, res) => {
      const { task, data = {} } = req.body;
      
      const weatherAgent = new WeatherAgent();
      await weatherAgent.init();
      
      const result = await weatherAgent.execute(task, data);
      
      res.json({
        success: true,
        agent: 'weather',
        task,
        result
      });
    }));

    // Security agent endpoint
    this.app.post('/api/agents/security/execute', asyncHandler(async (req, res) => {
      const { task, data = {} } = req.body;
      
      const securityAgent = new SecurityAgent();
      await securityAgent.init();
      
      const result = await securityAgent.execute(task, data);
      
      res.json({
        success: true,
        agent: 'security',
        task,
        result
      });
    }));

    // Skill creator agent endpoint
    this.app.post('/api/agents/skill-creator/execute', asyncHandler(async (req, res) => {
      const { task, data = {} } = req.body;
      
      const skillCreatorAgent = new SkillCreatorAgent();
      await skillCreatorAgent.init();
      
      const result = await skillCreatorAgent.execute(task, data);
      
      res.json({
        success: true,
        agent: 'skill-creator',
        task,
        result
      });
    }));
  }

  start() {
    return new Promise((resolve) => {
      // Bind to 0.0.0.0 for Docker container accessibility
      this.server = this.app.listen(this.config.port, '0.0.0.0', () => {
        const host = process.env.HOST || '0.0.0.0';
        logger.info(`🚀 MORIS Core v2.0 running on port ${this.config.port}`);
        console.log(`✅ Server: http://${host}:${this.config.port}`);
        console.log(`📊 Health: http://${host}:${this.config.port}/health`);
        console.log(`🔌 WebSocket: ws://${host}:${this.config.wsPort}`);
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