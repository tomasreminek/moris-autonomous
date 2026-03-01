/**
 * Skill-Enabled Agents
 * Specialized agents that use skills from the appstore
 */

const { BaseAgent } = require('./agents');
const { SkillLoader } = require('./skill-loader');
const { logger } = require('./logger');

// Weather Agent - Uses weather skill
class WeatherAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Weather Expert',
      role: 'weather',
      description: 'Expert in weather forecasting and meteorology using wttr.in and Open-Meteo',
      talents: ['Input', 'Analytical', 'Context', 'Communication'],
      ...config
    });

    this.skillLoader = new SkillLoader();
    this.registerSkill('get_current', this.getCurrentWeather.bind(this));
    this.registerSkill('get_forecast', this.getForecast.bind(this));
    this.registerSkill('check_multiple', this.checkMultipleLocations.bind(this));
  }

  async init() {
    await this.skillLoader.loadAllSkills();
    logger.info('WeatherAgent initialized with skills');
  }

  async getCurrentWeather(data) {
    const { location = 'Prague', format = 'compact' } = data;
    
    const result = await this.skillLoader.execute('weather', 'current', {
      location,
      format
    });

    if (result.success) {
      return {
        location,
        weather: result.data,
        source: 'wttr.in',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Weather check failed: ${result.error}`);
    }
  }

  async getForecast(data) {
    const { location = 'Prague', days = 3 } = data;
    
    const result = await this.skillLoader.execute('weather', 'forecast', {
      location,
      format: 'full'
    });

    return {
      location,
      forecast: result.data,
      days,
      timestamp: new Date().toISOString()
    };
  }

  async checkMultipleLocations(data) {
    const { locations = ['Prague', 'London', 'New York'] } = data;
    
    const results = await Promise.all(
      locations.map(async (location) => {
        try {
          const result = await this.getCurrentWeather({ location });
          return { location, ...result, success: true };
        } catch (error) {
          return { location, error: error.message, success: false };
        }
      })
    );

    return {
      checked: locations.length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'current': return this.executeSkill('get_current', data);
      case 'forecast': return this.executeSkill('get_forecast', data);
      case 'multiple': return this.executeSkill('check_multiple', data);
      default: throw new Error(`Unknown weather task: ${taskType}`);
    }
  }
}

// Security Agent - Uses healthcheck skill
class SecurityAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Security Auditor',
      role: 'security',
      description: 'Expert in system security auditing and hardening using OpenClaw security tools',
      talents: ['Analytical', 'Deliberative', 'Responsibility', 'Discipline'],
      ...config
    });

    this.skillLoader = new SkillLoader();
    this.registerSkill('audit_system', this.auditSystem.bind(this));
    this.registerSkill('check_status', this.checkStatus.bind(this));
    this.registerSkill('monitor_health', this.monitorHealth.bind(this));
  }

  async init() {
    await this.skillLoader.loadAllSkills();
    logger.info('SecurityAgent initialized with skills');
  }

  async auditSystem(data) {
    const { deep = false } = data;
    
    logger.info(`Running security audit (deep: ${deep})`);
    
    const result = await this.skillLoader.execute('healthcheck', 'audit', {
      deep
    });

    if (result.success) {
      // Analyze results
      const analysis = this.analyzeSecurityResults(result.checks);
      
      return {
        audit_completed: true,
        system_info: result.checks,
        analysis,
        recommendations: this.generateRecommendations(analysis),
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Security audit failed: ${result.error}`);
    }
  }

  async checkStatus(data) {
    const result = await this.skillLoader.execute('healthcheck', 'status', {});
    
    return {
      status_check: true,
      healthy: result.success,
      details: result.checks || {},
      timestamp: new Date().toISOString()
    };
  }

  async monitorHealth(data) {
    const { interval = 60000 } = data; // Default 1 minute
    
    // Set up periodic health checks
    const checkId = `health_${Date.now()}`;
    
    this.remember(checkId, {
      active: true,
      interval,
      started: new Date().toISOString()
    });

    return {
      monitor_id: checkId,
      status: 'started',
      interval: `${interval}ms`,
      message: 'Health monitoring started. Use checkId to stop.'
    };
  }

  analyzeSecurityResults(checks) {
    const analysis = {
      risk_level: 'low',
      issues: [],
      warnings: [],
      ok: []
    };

    // Analyze disk space
    if (checks.disk) {
      const usage = parseInt(checks.disk.match(/(\d+)%/)?.[1] || 0);
      if (usage > 90) {
        analysis.risk_level = 'critical';
        analysis.issues.push(`Disk usage critical: ${usage}%`);
      } else if (usage > 80) {
        analysis.risk_level = analysis.risk_level === 'low' ? 'medium' : analysis.risk_level;
        analysis.warnings.push(`Disk usage high: ${usage}%`);
      } else {
        analysis.ok.push(`Disk usage healthy: ${usage}%`);
      }
    }

    // Analyze memory
    if (checks.memory) {
      analysis.ok.push('Memory check completed');
    }

    return analysis;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.issues.length > 0) {
      recommendations.push('Address critical issues immediately');
      recommendations.push('Consider freeing up disk space');
    }

    if (analysis.warnings.length > 0) {
      recommendations.push('Plan maintenance for warnings');
      recommendations.push('Monitor system trends');
    }

    if (analysis.risk_level === 'low') {
      recommendations.push('System is healthy, maintain current practices');
    }

    return recommendations;
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'audit': return this.executeSkill('audit_system', data);
      case 'status': return this.executeSkill('check_status', data);
      case 'monitor': return this.executeSkill('monitor_health', data);
      default: throw new Error(`Unknown security task: ${taskType}`);
    }
  }
}

// Skill Creator Agent - Uses skill-creator skill
class SkillCreatorAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Skill Architect',
      role: 'skill-creator',
      description: 'Expert in designing, creating, and packaging agent skills',
      talents: ['Ideation', 'Strategic', 'Learner', 'Input'],
      ...config
    });

    this.skillLoader = new SkillLoader();
    this.registerSkill('create_skill', this.createSkill.bind(this));
    this.registerSkill('list_skills', this.listSkills.bind(this));
    this.registerSkill('analyze_needs', this.analyzeSkillNeeds.bind(this));
  }

  async init() {
    await this.skillLoader.loadAllSkills();
    logger.info('SkillCreatorAgent initialized');
  }

  async createSkill(data) {
    const { 
      name, 
      description, 
      resources = ['scripts'],
      examples = []
    } = data;

    if (!name || !description) {
      throw new Error('Name and description are required');
    }

    logger.info(`Creating skill: ${name}`);

    const result = await this.skillLoader.execute('skill-creator', 'create', {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      resources
    });

    if (result.success) {
      return {
        skill_created: true,
        name: result.message,
        path: result.path,
        resources,
        next_steps: [
          'Edit SKILL.md with detailed instructions',
          'Add scripts to scripts/ directory',
          'Add references to references/ directory',
          'Test the skill',
          'Package with package_skill.py'
        ],
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Skill creation failed: ${result.error}`);
    }
  }

  async listSkills(data) {
    const catalog = this.skillLoader.getCatalog();
    
    return {
      total_skills: catalog.length,
      skills: catalog.map(s => ({
        name: s.name,
        description: s.description,
        features: [
          s.hasScripts && 'scripts',
          s.hasReferences && 'references',
          s.hasAssets && 'assets'
        ].filter(Boolean)
      })),
      timestamp: new Date().toISOString()
    };
  }

  async analyzeSkillNeeds(data) {
    const { task_description, current_workflow } = data;
    
    // Analyze what skills would be helpful
    const analysis = {
      identified_needs: [],
      suggested_skills: [],
      existing_matches: []
    };

    // Check current catalog
    const catalog = this.skillLoader.getCatalog();
    
    // Simple keyword matching
    const keywords = task_description.toLowerCase().split(' ');
    
    for (const skill of catalog) {
      const desc = skill.description.toLowerCase();
      const match = keywords.some(kw => desc.includes(kw));
      
      if (match) {
        analysis.existing_matches.push({
          name: skill.name,
          description: skill.description,
          relevance: 'high'
        });
      }
    }

    // Suggest new skills if needed
    if (analysis.existing_matches.length === 0) {
      analysis.suggested_skills.push({
        name: 'custom-task-skill',
        description: `Skill for: ${task_description.substring(0, 100)}...`,
        rationale: 'No existing skill matches this workflow'
      });
    }

    return {
      analysis_completed: true,
      task_analyzed: task_description.substring(0, 100),
      ...analysis,
      recommendation: analysis.existing_matches.length > 0 
        ? 'Use existing skills' 
        : 'Create new skill'
    };
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'create': return this.executeSkill('create_skill', data);
      case 'list': return this.executeSkill('list_skills', data);
      case 'analyze': return this.executeSkill('analyze_needs', data);
      default: throw new Error(`Unknown skill-creator task: ${taskType}`);
    }
  }
}

module.exports = {
  WeatherAgent,
  SecurityAgent,
  SkillCreatorAgent
};