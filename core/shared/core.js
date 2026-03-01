/**
 * MORIS Shared Core
 * Common code for all deployment types
 */

// Agent System
const { BaseAgent, CoderAgent, CopywriterAgent } = require('./agents');
const { WeatherAgent, SecurityAgent, SkillCreatorAgent } = require('./agents-skilled');
const { DocumentAgent } = require('./rag-system');

// Task Management
const { TaskQueue, JobTypes } = require('./task-queue');
const { WorkflowEngine } = require('./workflows');
const { TaskScheduler, CronPatterns } = require('./scheduler');

// RAG & Knowledge
const { RAGSystem } = require('./rag-system');

// Simulation
const { SimulationEngine } = require('./simulation/engine');

// Utilities
const { logger } = require('./logger');
const { DatabaseManager } = require('./database');
const { Validator } = require('./validation');
const { HTTP_STATUS, RATE_LIMIT, LIMITS } = require('./constants');

class MORISCore {
  constructor(config = {}) {
    this.config = config;
    this.db = null;
    this.taskQueue = null;
    this.agentRegistry = null;
    this.workflowEngine = null;
    this.scheduler = null;
    this.rag = null;
    this.simulation = null;
  }

  async init() {
    logger.info('Initializing MORIS Core...');

    // Database (always needed)
    this.db = new DatabaseManager(this.config.dbPath);

    // Task Queue (if not external)
    if (this.config.components?.queue?.enabled !== false) {
      this.taskQueue = new TaskQueue(this.config.redisUrl);
    }

    // Workflow Engine
    this.workflowEngine = new WorkflowEngine(
      this.db,
      this.taskQueue,
      this.agentRegistry
    );

    // Scheduler
    this.scheduler = new TaskScheduler(this.db, this.taskQueue);

    // RAG System
    if (this.config.components?.rag?.enabled) {
      this.rag = new RAGSystem();
    }

    // Simulation
    if (this.config.components?.simulation?.enabled) {
      this.simulation = new SimulationEngine();
    }

    // Register all agents
    this.registerAgents();

    logger.info('MORIS Core initialized');
    return this;
  }

  registerAgents() {
    // Base registry
    this.agentRegistry = new (require('./agents').AgentRegistry)();

    // Register all 12 agents
    const agentConfigs = [
      { id: 'moris', name: 'Moris', type: 'base', role: 'orchestrator' },
      { id: 'dahlia', name: 'Dahlia', type: 'base', role: 'assistant' },
      { id: 'coder', name: 'Pro Coder', type: 'coder', role: 'developer' },
      { id: 'copywriter', name: 'Copywriter', type: 'copywriter', role: 'content' },
      { id: 'researcher', name: 'Researcher', type: 'base', role: 'research' },
      { id: 'qa', name: 'QA Tester', type: 'base', role: 'quality' },
      { id: 'data', name: 'Data Analyst', type: 'base', role: 'data' },
      { id: 'devops', name: 'DevOps Engineer', type: 'base', role: 'devops' },
      { id: 'weather', name: 'Weather Expert', type: 'weather', role: 'weather' },
      { id: 'security', name: 'Security Auditor', type: 'security', role: 'security' },
      { id: 'skill-creator', name: 'Skill Architect', type: 'skill-creator', role: 'skill-creator' },
      { id: 'document', name: 'Document Expert', type: 'document', role: 'documents' }
    ];

    for (const config of agentConfigs) {
      try {
        switch (config.type) {
          case 'coder':
            this.agentRegistry.create('coder', config);
            break;
          case 'copywriter':
            this.agentRegistry.create('copywriter', config);
            break;
          case 'weather':
            this.agentRegistry.create('base', config);
            break;
          case 'security':
            this.agentRegistry.create('base', config);
            break;
          case 'skill-creator':
            this.agentRegistry.create('base', config);
            break;
          case 'document':
            this.agentRegistry.create('base', config);
            break;
          default:
            this.agentRegistry.create('base', config);
        }
      } catch (error) {
        logger.warn(`Failed to register agent ${config.id}:`, error.message);
      }
    }

    logger.info(`Registered ${this.agentRegistry.agents.size} agents`);
  }

  // Execute task through agent
  async executeTask(agentId, taskType, data) {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Create task record
    const taskId = `task_${Date.now()}`;
    this.db.createTask({
      id: taskId,
      title: `${agentId}: ${taskType}`,
      agent_id: agentId,
      status: 'running',
      data: { type: taskType, ...data }
    });

    try {
      // Execute
      const result = await agent.execute(taskType, data);

      // Update task
      this.db.updateTask(taskId, {
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString()
      });

      return result;
    } catch (error) {
      this.db.updateTask(taskId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  // Delegate to best agent
  async delegate(task, context = {}) {
    // Simple delegation logic
    const taskKeywords = {
      'code': 'coder',
      'write': 'copywriter',
      'research': 'researcher',
      'weather': 'weather',
      'security': 'security',
      'pdf': 'document',
      'analyze': 'data',
      'deploy': 'devops'
    };

    // Find matching agent
    let agentId = 'moris'; // default
    for (const [keyword, agent] of Object.entries(taskKeywords)) {
      if (task.toLowerCase().includes(keyword)) {
        agentId = agent;
        break;
      }
    }

    logger.info(`Delegating to ${agentId}: ${task.substring(0, 50)}...`);

    return this.executeTask(agentId, 'execute', { task, context });
  }

  // Get status
  getStatus() {
    return {
      initialized: true,
      agents: this.agentRegistry?.agents.size || 0,
      tasks: this.db?.getStats().tasks.count || 0,
      components: {
        database: !!this.db,
        taskQueue: !!this.taskQueue,
        workflowEngine: !!this.workflowEngine,
        scheduler: !!this.scheduler,
        rag: !!this.rag,
        simulation: !!this.simulation
      }
    };
  }
}

module.exports = { MORISCore };
