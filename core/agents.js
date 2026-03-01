/**
 * Base Agent Class
 * Foundation for all AI agents in MORIS
 */

const { logger } = require('./logger');
const { v4: uuidv4 } = require('uuid');

class BaseAgent {
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.name = config.name || 'Agent';
    this.role = config.role || 'assistant';
    this.description = config.description || '';
    this.status = 'idle';
    this.config = config;
    this.skills = new Map();
    this.memory = new Map();
    this.taskHistory = [];
    this.createdAt = new Date().toISOString();
    
    // Gallup talents (if specified)
    this.talents = config.talents || [];
    
    logger.info(`Agent created: ${this.name} (${this.id})`);
  }

  // Register a skill
  registerSkill(name, handler) {
    this.skills.set(name, handler);
    logger.debug(`Skill registered: ${name} on ${this.name}`);
  }

  // Check if agent has skill
  hasSkill(name) {
    return this.skills.has(name);
  }

  // Execute a skill
  async executeSkill(skillName, data = {}) {
    if (!this.hasSkill(skillName)) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    this.status = 'working';
    const startTime = Date.now();

    try {
      const handler = this.skills.get(skillName);
      const result = await handler(data, this);
      
      const executionTime = Date.now() - startTime;
      
      // Record in history
      this.taskHistory.push({
        skill: skillName,
        data,
        result,
        status: 'success',
        executionTime,
        timestamp: new Date().toISOString()
      });

      this.status = 'idle';
      
      logger.info(`Skill executed: ${skillName} on ${this.name} (${executionTime}ms)`);
      
      return result;

    } catch (error) {
      this.status = 'error';
      
      this.taskHistory.push({
        skill: skillName,
        data,
        error: error.message,
        status: 'failed',
        timestamp: new Date().toISOString()
      });

      logger.error(`Skill execution failed: ${skillName} on ${this.name}:`, error);
      throw error;
    }
  }

  // Store in memory
  remember(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date().toISOString()
    });
  }

  // Retrieve from memory
  recall(key) {
    const item = this.memory.get(key);
    return item ? item.value : null;
  }

  // Get agent info
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      description: this.description,
      status: this.status,
      skills: Array.from(this.skills.keys()),
      talents: this.talents,
      taskCount: this.taskHistory.length,
      createdAt: this.createdAt
    };
  }

  // Get performance stats
  getStats() {
    const total = this.taskHistory.length;
    const successful = this.taskHistory.filter(t => t.status === 'success').length;
    const failed = this.taskHistory.filter(t => t.status === 'failed').length;
    
    const avgExecutionTime = total > 0
      ? this.taskHistory.reduce((sum, t) => sum + (t.executionTime || 0), 0) / total
      : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0,
      avgExecutionTime: avgExecutionTime.toFixed(2),
      recentTasks: this.taskHistory.slice(-5)
    };
  }

  // Main execution method (to be overridden)
  async execute(taskType, data) {
    throw new Error('Execute method must be implemented by subclass');
  }

  // Lifecycle hooks (can be overridden)
  async onInit() {
    logger.debug(`Agent initialized: ${this.name}`);
  }

  async onShutdown() {
    logger.debug(`Agent shutdown: ${this.name}`);
  }

  // Health check
  async healthCheck() {
    return {
      id: this.id,
      status: this.status,
      healthy: this.status !== 'error',
      lastActivity: this.taskHistory.length > 0 
        ? this.taskHistory[this.taskHistory.length - 1].timestamp 
        : null
    };
  }
}

// Specialized agent types
class CoderAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Pro Coder',
      role: 'developer',
      description: 'Expert in software development and coding tasks',
      talents: ['Strategic', 'Achiever', 'Learner', 'Analytical'],
      ...config
    });

    this.registerSkill('write_code', this.writeCode.bind(this));
    this.registerSkill('review_code', this.reviewCode.bind(this));
    this.registerSkill('debug', this.debug.bind(this));
    this.registerSkill('refactor', this.refactor.bind(this));
  }

  async writeCode(data) {
    const { language, requirements } = data;
    logger.info(`Writing ${language} code for: ${requirements}`);
    
    // Placeholder - in real implementation, this would use an LLM
    return {
      code: `// ${language} code generated for: ${requirements}\n// Implementation would go here`,
      language,
      lines: 0
    };
  }

  async reviewCode(data) {
    const { code } = data;
    logger.info('Reviewing code...');
    
    return {
      issues: [],
      suggestions: ['Consider adding more comments'],
      quality_score: 85
    };
  }

  async debug(data) {
    const { error, context } = data;
    logger.info('Debugging error:', error);
    
    return {
      root_cause: 'Analysis would go here',
      solution: 'Solution would go here',
      prevention: 'Prevention tips'
    };
  }

  async refactor(data) {
    const { code, goals } = data;
    logger.info('Refactoring code for:', goals);
    
    return {
      refactored_code: code,
      changes_made: [],
      improvements: []
    };
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'write':
        return this.executeSkill('write_code', data);
      case 'review':
        return this.executeSkill('review_code', data);
      case 'debug':
        return this.executeSkill('debug', data);
      case 'refactor':
        return this.executeSkill('refactor', data);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}

class CopywriterAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Copywriter',
      role: 'content',
      description: 'Expert in writing and content creation',
      talents: ['Communication', 'Ideation', 'Input', 'Connectedness'],
      ...config
    });

    this.registerSkill('write_copy', this.writeCopy.bind(this));
    this.registerSkill('edit_text', this.editText.bind(this));
    this.registerSkill('brainstorm', this.brainstorm.bind(this));
  }

  async writeCopy(data) {
    const { topic, tone, length } = data;
    logger.info(`Writing copy about: ${topic}`);
    
    return {
      content: `Content about ${topic} in ${tone} tone. Length: ${length}`,
      word_count: 0,
      seo_score: 75
    };
  }

  async editText(data) {
    const { text, improvements } = data;
    logger.info('Editing text...');
    
    return {
      edited_text: text,
      changes: [],
      readability_score: 80
    };
  }

  async brainstorm(data) {
    const { topic, count } = data;
    logger.info(`Brainstorming ideas for: ${topic}`);
    
    return {
      ideas: Array(count).fill(`Idea about ${topic}`),
      count
    };
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'write':
        return this.executeSkill('write_copy', data);
      case 'edit':
        return this.executeSkill('edit_text', data);
      case 'brainstorm':
        return this.executeSkill('brainstorm', data);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }
}

// Agent Registry
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.agentTypes = new Map();
    
    // Register built-in types
    this.registerType('coder', CoderAgent);
    this.registerType('copywriter', CopywriterAgent);
    this.registerType('base', BaseAgent);
  }

  registerType(name, AgentClass) {
    this.agentTypes.set(name, AgentClass);
  }

  create(type, config = {}) {
    const AgentClass = this.agentTypes.get(type);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agent = new AgentClass(config);
    this.agents.set(agent.id, agent);
    
    return agent;
  }

  get(id) {
    return this.agents.get(id);
  }

  getAll() {
    return Array.from(this.agents.values());
  }

  remove(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.onShutdown();
      this.agents.delete(id);
    }
  }

  getStats() {
    const agents = this.getAll();
    return {
      total: agents.length,
      by_role: this.groupByRole(agents),
      by_status: this.groupByStatus(agents),
      total_tasks: agents.reduce((sum, a) => sum + a.taskHistory.length, 0)
    };
  }

  groupByRole(agents) {
    const groups = {};
    agents.forEach(a => {
      groups[a.role] = (groups[a.role] || 0) + 1;
    });
    return groups;
  }

  groupByStatus(agents) {
    const groups = {};
    agents.forEach(a => {
      groups[a.status] = (groups[a.status] || 0) + 1;
    });
    return groups;
  }
}

module.exports = {
  BaseAgent,
  CoderAgent,
  CopywriterAgent,
  AgentRegistry
};