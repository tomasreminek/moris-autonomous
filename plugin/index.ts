/**
 * MORIS Autonomous - OpenClaw Plugin
 * 21-Agent AI Workforce System
 */

import { spawn } from 'child_process';
import path from 'path';

let serverProcess: any = null;
let isRunning = false;

export default function register(api: any) {
  const logger = api.logger;
  const pluginConfig = api.config.plugins?.entries?.['moris-autonomous'] || {};
  const port = pluginConfig.config?.port || 3001;

  logger.info('MORIS Autonomous plugin registering...');

  // Register Gateway RPC methods
  api.registerGatewayMethod('moris.status', ({ respond }: any) => {
    respond(null, {
      ok: true,
      running: isRunning,
      agents: 21,
      version: '2.0.0',
      port: port,
      url: `http://localhost:${port}`
    });
  });

  api.registerGatewayMethod('moris.start', ({ respond }: any) => {
    if (isRunning) {
      respond(null, { ok: true, message: 'Already running' });
      return;
    }

    startServer(api, port);
    respond(null, { ok: true, message: 'Starting server...' });
  });

  api.registerGatewayMethod('moris.stop', ({ respond }: any) => {
    stopServer();
    respond(null, { ok: true, message: 'Server stopped' });
  });

  // Register agent tools
  api.registerAgentTool({
    name: 'moris_delegate_task',
    description: 'Delegate a task to a specialized agent (coder, copywriter, cfo, security, etc.)',
    parameters: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        agent_type: { 
          type: 'string', 
          enum: ['moris', 'dahlia', 'coder', 'copywriter', 'marketing', 'cfo', 'security', 'designer', 'analyst', 'lawyer', 'devops', 'qa'],
          description: 'Agent to delegate to'
        },
        priority: { type: 'number', minimum: 1, maximum: 10, default: 5 },
        deadline: { type: 'string', description: 'ISO 8601 deadline' }
      },
      required: ['task', 'agent_type']
    },
    async execute({ task, agent_type, priority = 5, deadline }: any) {
      logger.info(`Delegating to ${agent_type}: ${task.substring(0, 50)}...`);
      
      // Call MORIS API
      try {
        const response = await fetch(`http://localhost:${port}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.substring(0, 100),
            description: task,
            agent_id: agent_type,
            priority,
            deadline
          })
        });
        
        const result = await response.json();
        return {
          success: result.success,
          task_id: result.task?.id,
          assigned_to: agent_type,
          message: `Task delegated to ${agent_type}. Task ID: ${result.task?.id}`
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to delegate: ${error}`,
          fallback: `Task queued for ${agent_type} manually`
        };
      }
    }
  });

  api.registerAgentTool({
    name: 'moris_create_project',
    description: 'Create a project with multiple agents assigned',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string' },
        agents: { type: 'array', items: { type: 'string' }, description: 'Agent IDs' },
        deadline: { type: 'string' }
      },
      required: ['name']
    },
    async execute({ name, description = '', agents = [], deadline }: any) {
      try {
        const response = await fetch(`http://localhost:${port}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, agents, deadline })
        });
        
        const result = await response.json();
        return {
          success: result.success,
          project_id: result.project?.id,
          agents_assigned: agents.length,
          message: `Project "${name}" created with ${agents.length} agents`
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });

  api.registerAgentTool({
    name: 'moris_agents_status',
    description: 'Get status of all agents and their workload',
    parameters: { type: 'object', properties: {} },
    async execute() {
      try {
        const response = await fetch(`http://localhost:${port}/api/agents`);
        const result = await response.json();
        
        const agents = result.agents || [];
        const busy = agents.filter((a: any) => a.status === 'active').length;
        
        return {
          success: true,
          total_agents: agents.length,
          active_agents: busy,
          available_agents: agents.length - busy,
          agents: agents.slice(0, 5).map((a: any) => ({
            name: a.name,
            role: a.role,
            status: a.status
          }))
        };
      } catch (error) {
        return { 
          success: false, 
          error: 'Could not fetch agent status',
          agents: ['moris', 'dahlia', 'coder', 'copywriter', 'cfo']
        };
      }
    }
  });

  // Register slash commands
  api.registerCommand({
    name: 'moris',
    description: 'Open MORIS dashboard URL',
    requireAuth: false,
    handler: () => ({
      text: `🚀 MORIS Autonomous Dashboard\nhttp://localhost:${port}\n\nAvailable endpoints:\n- /api/agents - List agents\n- /api/tasks - View tasks\n- /api/projects - Project management`
    })
  });

  api.registerCommand({
    name: 'moris-agents',
    description: 'List all 21 MORIS agents',
    requireAuth: false,
    handler: () => ({
      text: `🧠 MORIS Agents (21 total)\n\nCore:\n• moris - CEO/Orchestrator\n• dahlia - Personal Assistant\n\nBusiness:\n• cfo - Financial Officer\n• marketing - Marketing Lead\n• analyst - Data Analyst\n• lawyer - Legal Counsel\n\nTechnical:\n• coder - Lead Developer\n• devops - Infrastructure\n• security - Security Auditor\n• qa - QA Tester\n\nCreative:\n• copywriter - Content Creator\n• designer - Visual Designer\n• arthema - Creative Director\n\nView all: http://localhost:${port}/api/agents`
    })
  });

  api.registerCommand({
    name: 'moris-tasks',
    description: 'Show active tasks',
    requireAuth: true,
    handler: async () => {
      try {
        const response = await fetch(`http://localhost:${port}/api/tasks`);
        const result = await response.json();
        const tasks = result.tasks?.slice(0, 5) || [];
        
        if (tasks.length === 0) {
          return { text: 'No active tasks. Create one at /api/tasks' };
        }
        
        const list = tasks.map((t: any) => `• ${t.title} (${t.status}) - ${t.agent_id || 'unassigned'}`).join('\n');
        return { text: `📋 Active Tasks:\n${list}` };
      } catch {
        return { text: 'Could not fetch tasks. Server may be starting...' };
      }
    }
  });

  // Register background service
  api.registerService({
    id: 'moris-server',
    start: () => {
      if (pluginConfig.enabled !== false) {
        startServer(api, port);
      }
    },
    stop: () => stopServer()
  });

  // Auto-start server
  if (pluginConfig.enabled !== false) {
    startServer(api, port);
  }

  function startServer(api: any, port: number) {
    if (isRunning) return;
    
    const serverPath = path.join(__dirname, '..', 'core', 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
      detached: false
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      logger.info(`[MORIS] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      logger.error(`[MORIS] ${data.toString().trim()}`);
    });

    serverProcess.on('exit', (code: number) => {
      logger.info(`MORIS server exited with code ${code}`);
      isRunning = false;
    });

    isRunning = true;
    logger.info(`MORIS server starting on port ${port}...`);
  }

  function stopServer() {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    isRunning = false;
    logger.info('MORIS server stopped');
  }

  logger.info('MORIS Autonomous plugin registered ✓');
}
