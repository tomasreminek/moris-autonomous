/**
 * MORIS OpenClaw Extension
 * Primary deployment mode after OpenAI acquisition
 */

const { logger } = require('../logger');
const { MORISCore } = require('../shared/core');

/**
 * OpenClaw Extension Entry Point
 * This module integrates MORIS into OpenClaw ecosystem
 */

class MORISOpenClawExtension {
  constructor(openclawContext) {
    this.openclaw = openclawContext;
    this.moris = null;
    this.initialized = false;
  }

  /**
   * Initialize extension
   * Called by OpenClaw on startup
   */
  async init() {
    logger.info('🚀 MORIS Extension initializing...');

    // Initialize MORIS core with OpenClaw integration
    this.moris = new MORISCore({
      deployment: 'openclaw-extension',
      dbPath: process.env.MORIS_DB_PATH || './data/moris.db',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      components: {
        queue: { enabled: true, external: false },
        rag: { enabled: true },
        simulation: { enabled: true }
      },
      external: {
        openclaw: {
          enabled: true,
          useGateway: true,
          useChannels: true,
          useAuth: true,
          useTools: true
        }
      }
    });

    await this.moris.init();

    // Register with OpenClaw
    this.registerCommands();
    this.registerEventHandlers();
    this.registerTools();

    this.initialized = true;
    logger.info('✅ MORIS Extension ready');

    return this;
  }

  /**
   * Register OpenClaw commands
   */
  registerCommands() {
    const commands = [
      {
        name: 'moris',
        description: 'Access MORIS agent system',
        handler: this.handleCommand.bind(this)
      },
      {
        name: 'moris-delegate',
        description: 'Delegate task to MORIS agent',
        handler: this.handleDelegate.bind(this)
      },
      {
        name: 'moris-agents',
        description: 'List available MORIS agents',
        handler: this.handleAgents.bind(this)
      },
      {
        name: 'moris-status',
        description: 'Show MORIS system status',
        handler: this.handleStatus.bind(this)
      }
    ];

    for (const cmd of commands) {
      this.openclaw.registerCommand(cmd.name, cmd);
    }

    logger.info(`Registered ${commands.length} MORIS commands`);
  }

  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // Handle incoming messages
    this.openclaw.on('message', async (message) => {
      // Auto-detect if message should go to MORIS
      if (this.shouldHandleMessage(message)) {
        await this.handleMessage(message);
      }
    });

    // Handle tool calls
    this.openclaw.on('tool:call', async (tool) => {
      if (tool.name.startsWith('moris.')) {
        await this.handleToolCall(tool);
      }
    });
  }

  /**
   * Register MORIS tools with OpenClaw
   */
  registerTools() {
    const tools = [
      {
        name: 'moris.delegate',
        description: 'Delegate task to specialized MORIS agent',
        parameters: {
          task: { type: 'string', description: 'Task description' },
          agent: { type: 'string', description: 'Agent ID (optional)', optional: true },
          context: { type: 'object', description: 'Additional context', optional: true }
        },
        handler: this.toolDelegate.bind(this)
      },
      {
        name: 'moris.rag.query',
        description: 'Query MORIS knowledge base',
        parameters: {
          query: { type: 'string', description: 'Query text' },
          kbId: { type: 'string', description: 'Knowledge base ID', optional: true }
        },
        handler: this.toolRAGQuery.bind(this)
      },
      {
        name: 'moris.simulation.start',
        description: 'Start multi-agent simulation',
        parameters: {
          topic: { type: 'string', description: 'Discussion topic' },
          agents: { type: 'array', description: 'Agent IDs' },
          mode: { type: 'string', description: 'collaborative|debate|brainstorm' }
        },
        handler: this.toolSimulation.bind(this)
      }
    ];

    for (const tool of tools) {
      this.openclaw.registerTool(tool);
    }

    logger.info(`Registered ${tools.length} MORIS tools`);
  }

  /**
   * Handle /moris command
   */
  async handleCommand(args, context) {
    const subcommand = args[0] || 'help';

    switch (subcommand) {
      case 'help':
        return this.getHelpText();
      case 'agents':
        return this.handleAgents(args.slice(1), context);
      case 'status':
        return this.handleStatus(args.slice(1), context);
      default:
        return `Unknown command: ${subcommand}. Use /moris help`;
    }
  }

  /**
   * Handle task delegation
   */
  async handleDelegate(args, context) {
    const task = args.join(' ');

    if (!task) {
      return '❌ Please specify a task. Example: /moris-delegate "Analyze this PDF"';
    }

    // Send acknowledgment
    await context.sendMessage('🤖 Delegating to MORIS agent...');

    try {
      // Delegate to MORIS
      const result = await this.moris.delegate(task, {
        sender: context.user,
        channel: context.channel,
        session: context.session
      });

      // Format result
      let response = '✅ **Task Completed**\n\n';
      response += `Agent: ${result.agent}\n`;
      response += `Task: ${task}\n\n`;
      response += `**Result:**\n${result.output}`;

      return response;
    } catch (error) {
      logger.error('Delegation failed:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Handle /moris-agents command
   */
  async handleAgents(args, context) {
    const agents = this.moris.agentRegistry.getAll();

    let response = '🤖 **Available MORIS Agents**\n\n';

    const agentEmojis = {
      'moris': '🧠',
      'dahlia': '🌸',
      'coder': '💻',
      'copywriter': '✍️',
      'researcher': '🔬',
      'qa': '🧪',
      'data': '📊',
      'devops': '🚀',
      'weather': '🌦️',
      'security': '🔒',
      'skill-creator': '🛠️',
      'document': '📚'
    };

    for (const agent of agents) {
      const emoji = agentEmojis[agent.id] || '🤖';
      response += `${emoji} **${agent.name}** (${agent.role})\n`;
      response += `   ${agent.description || 'Ready for tasks'}\n\n`;
    }

    response += '\n**Usage:** /moris-delegate "task" to [agent]';

    return response;
  }

  /**
   * Handle /moris-status command
   */
  async handleStatus(args, context) {
    const status = this.moris.getStatus();

    let response = '📊 **MORIS Status**\n\n';
    response += `Initialized: ${status.initialized ? '✅' : '❌'}\n`;
    response += `Agents: ${status.agents}\n`;
    response += `Tasks: ${status.tasks}\n\n`;

    response += '**Components:**\n';
    for (const [comp, enabled] of Object.entries(status.components)) {
      response += `${enabled ? '✅' : '❌'} ${comp}\n`;
    }

    return response;
  }

  /**
   * Tool: Delegate task
   */
  async toolDelegate(params) {
    const { task, agent: agentId, context: ctx } = params;

    const result = await this.moris.executeTask(
      agentId || 'moris',
      'execute',
      { task, context: ctx }
    );

    return {
      success: true,
      result: result
    };
  }

  /**
   * Tool: RAG Query
   */
  async toolRAGQuery(params) {
    const { query, kbId } = params;

    const documentAgent = this.moris.agentRegistry.get('document');
    if (!documentAgent) {
      return { success: false, error: 'Document agent not available' };
    }

    const result = await documentAgent.execute('query', {
      query,
      kbId
    });

    return {
      success: true,
      context: result.context,
      sources: result.results?.map(r => r.document) || []
    };
  }

  /**
   * Tool: Start simulation
   */
  async toolSimulation(params) {
    const { topic, agents, mode } = params;

    if (!this.moris.simulation) {
      return { success: false, error: 'Simulation not enabled' };
    }

    const sim = await this.moris.simulation.startSimulation({
      topic,
      agents,
      mode: mode || 'collaborative'
    });

    return {
      success: true,
      simulationId: sim.id,
      message: `Simulation started: ${topic}`,
      participants: agents.join(', ')
    };
  }

  /**
   * Check if message should be handled by MORIS
   */
  shouldHandleMessage(message) {
    const triggers = [
      'moris',
      'agent',
      'task',
      'delegate',
      'analyze',
      'research',
      'code',
      'write'
    ];

    const text = message.text?.toLowerCase() || '';
    return triggers.some(t => text.includes(t));
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message) {
    // Determine best agent for message
    const text = message.text?.toLowerCase() || '';
    
    const keywords = {
      'code': 'coder',
      'write': 'copywriter',
      'research': 'researcher',
      'analyze': 'data',
      'weather': 'weather',
      'security': 'security',
      'pdf': 'document',
      'document': 'document'
    };

    let agentId = 'moris';
    for (const [kw, agent] of Object.entries(keywords)) {
      if (text.includes(kw)) {
        agentId = agent;
        break;
      }
    }

    // Optional: Auto-delegate
    if (message.autoDelegate !== false) {
      try {
        const result = await this.moris.executeTask(
          agentId,
          'execute',
          { task: message.text, context: message }
        );

        await this.openclaw.sendMessage(message.chat.id, result.output);
      } catch (error) {
        logger.error('Auto-delegation failed:', error);
      }
    }
  }

  /**
   * Get help text
   */
  getHelpText() {
    return `🤖 **MORIS Extension** v2.1.0

**Commands:**
• /moris-delegate "task" - Assign task to agent
• /moris-agents - List available agents
• /moris-status - System status

**Agents:**
💻 coder | ✍️ copywriter | 🔬 researcher
🌦️ weather | 🔒 security | 📚 document
+ 6 more specialized agents

**Usage Examples:**
• "/moris-delegate Write Python function for X"
• "/moris-delegate Analyze this PDF to agent document"
• "/moris-delegate Check weather in Prague"

Powered by OpenClaw + OpenAI`;
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    logger.info('Shutting down MORIS Extension...');

    if (this.moris) {
      // Graceful shutdown
      await this.moris.shutdown?.();
    }

    this.initialized = false;
    logger.info('MORIS Extension stopped');
  }
}

// Export for OpenClaw
module.exports = {
  // Extension factory
  createExtension: (openclawContext) => {
    return new MORISOpenClawExtension(openclawContext);
  },

  // Metadata
  metadata: {
    name: 'moris',
    version: '2.1.0',
    description: 'Multi-agent autonomous system with RAG and simulation',
    author: 'MORIS Team',
    requires: {
      openclaw: '>=2.0.0',
      redis: '>=6.0',
      node: '>=18.0'
    }
  }
};