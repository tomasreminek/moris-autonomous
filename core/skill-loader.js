/**
 * Skill Loader & Executor
 * Loads and executes skills from the skill store
 */

const { logger } = require('./logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class SkillLoader {
  constructor(skillPaths = []) {
    this.skillPaths = skillPaths;
    this.skills = new Map();
    this.loadedSkills = new Map();
  }

  // Load all available skills
  async loadAllSkills() {
    const skillStorePath = '/opt/openclaw/app/skills';
    
    try {
      const entries = await fs.readdir(skillStorePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadSkill(entry.name, path.join(skillStorePath, entry.name));
        }
      }
      
      logger.info(`Loaded ${this.skills.size} skills from appstore`);
    } catch (error) {
      logger.error('Failed to load skills from appstore:', error);
    }
    
    return this.skills;
  }

  // Load a single skill
  async loadSkill(skillName, skillPath) {
    try {
      const skillFile = path.join(skillPath, 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf8');
      
      // Parse frontmatter
      const skill = this.parseSkillMd(content);
      skill.path = skillPath;
      skill.name = skillName;
      
      // Check for bundled resources
      skill.hasScripts = await this.pathExists(path.join(skillPath, 'scripts'));
      skill.hasReferences = await this.pathExists(path.join(skillPath, 'references'));
      skill.hasAssets = await this.pathExists(path.join(skillPath, 'assets'));
      
      this.skills.set(skillName, skill);
      logger.debug(`Skill loaded: ${skillName}`);
      
      return skill;
    } catch (error) {
      logger.warn(`Failed to load skill ${skillName}:`, error.message);
      return null;
    }
  }

  // Parse SKILL.md frontmatter and body
  parseSkillMd(content) {
    const lines = content.split('\n');
    const skill = { metadata: {}, body: '' };
    
    // Check for frontmatter
    if (lines[0] === '---') {
      let i = 1;
      while (i < lines.length && lines[i] !== '---') {
        const line = lines[i];
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          skill.metadata[match[1]] = match[2].trim();
        }
        i++;
      }
      skill.body = lines.slice(i + 1).join('\n');
    } else {
      skill.body = content;
    }
    
    return skill;
  }

  // Get skill by name
  getSkill(name) {
    return this.skills.get(name);
  }

  // Get all skills
  getAllSkills() {
    return Array.from(this.skills.values());
  }

  // Execute a skill command
  async execute(skillName, command, args = {}) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    logger.info(`Executing skill: ${skillName} - ${command}`);

    switch (skillName) {
      case 'weather':
        return this.executeWeatherSkill(command, args);
      case 'healthcheck':
        return this.executeHealthcheckSkill(command, args);
      case 'skill-creator':
        return this.executeSkillCreator(command, args);
      default:
        throw new Error(`Unknown skill: ${skillName}`);
    }
  }

  // Execute weather skill
  async executeWeatherSkill(command, args) {
    const { location = 'Prague', format = 'compact' } = args;
    
    try {
      let url;
      if (format === 'compact') {
        url = `wttr.in/${encodeURIComponent(location)}?format=3`;
      } else if (format === 'full') {
        url = `wttr.in/${encodeURIComponent(location)}?T`;
      } else {
        url = `wttr.in/${encodeURIComponent(location)}?format=%l:+%c+%t+%h+%w`;
      }
      
      const { stdout } = await execAsync(`curl -s "${url}"`);
      return {
        success: true,
        skill: 'weather',
        location,
        data: stdout.trim()
      };
    } catch (error) {
      return {
        success: false,
        skill: 'weather',
        error: error.message
      };
    }
  }

  // Execute healthcheck skill
  async executeHealthcheckSkill(command, args) {
    const results = {
      success: true,
      skill: 'healthcheck',
      checks: {}
    };

    try {
      // Run system checks
      const { stdout: osInfo } = await execAsync('uname -a');
      results.checks.os = osInfo.trim();
      
      // Check disk space
      const { stdout: diskInfo } = await execAsync('df -h / | tail -1');
      results.checks.disk = diskInfo.trim();
      
      // Check memory
      const { stdout: memInfo } = await execAsync('free -h | grep Mem');
      results.checks.memory = memInfo.trim();
      
      // Check OpenClaw status
      try {
        const { stdout: ocStatus } = await execAsync('openclaw status 2>/dev/null || echo "OpenClaw not available"');
        results.checks.openclaw = ocStatus.trim();
      } catch (e) {
        results.checks.openclaw = 'Not available';
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        skill: 'healthcheck',
        error: error.message
      };
    }
  }

  // Execute skill creator
  async executeSkillCreator(command, args) {
    const { name, description, resources = [] } = args;
    
    if (!name || !description) {
      return {
        success: false,
        skill: 'skill-creator',
        error: 'Name and description required'
      };
    }

    const skillDir = path.join('./skills', name);
    
    try {
      // Create skill directory
      await fs.mkdir(skillDir, { recursive: true });
      
      // Create SKILL.md
      const skillMd = `---
name: ${name}
description: ${description}
---

# ${name}

${description}

## Usage

[Add usage instructions here]
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd);
      
      // Create resource directories
      for (const resource of resources) {
        await fs.mkdir(path.join(skillDir, resource), { recursive: true });
      }
      
      return {
        success: true,
        skill: 'skill-creator',
        message: `Skill "${name}" created at ${skillDir}`,
        path: skillDir
      };
    } catch (error) {
      return {
        success: false,
        skill: 'skill-creator',
        error: error.message
      };
    }
  }

  // Helper: Check if path exists
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  // Get skill catalog
  getCatalog() {
    return this.getAllSkills().map(skill => ({
      name: skill.name,
      description: skill.metadata.description || 'No description',
      hasScripts: skill.hasScripts,
      hasReferences: skill.hasReferences,
      hasAssets: skill.hasAssets
    }));
  }
}

module.exports = { SkillLoader };