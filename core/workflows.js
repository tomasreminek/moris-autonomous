/**
 * Workflow Templates
 * Predefined workflows for common tasks
 */

const { logger } = require('./logger');

class WorkflowEngine {
  constructor(db, taskQueue, agentRegistry) {
    this.db = db;
    this.taskQueue = taskQueue;
    this.agentRegistry = agentRegistry;
    this.templates = new Map();
    this.activeWorkflows = new Map();
    
    this.registerDefaultTemplates();
  }

  // Register default workflow templates
  registerDefaultTemplates() {
    // Content Creation Workflow
    this.registerTemplate('content-creation', {
      name: 'Content Creation',
      description: 'Research, write, and review content',
      steps: [
        {
          id: 'research',
          name: 'Research Topic',
          agent: 'researcher',
          action: 'research',
          input: { topic: '{{topic}}' },
          next: ['write']
        },
        {
          id: 'write',
          name: 'Write Content',
          agent: 'copywriter',
          action: 'write',
          input: { 
            topic: '{{topic}}',
            research: '{{research.results}}',
            tone: '{{tone}}',
            length: '{{length}}'
          },
          next: ['review']
        },
        {
          id: 'review',
          name: 'Review Content',
          agent: 'qa-tester',
          action: 'review',
          input: { 
            content: '{{write.content}}',
            criteria: ['grammar', 'clarity', 'seo']
          },
          next: ['approve', 'revise']
        },
        {
          id: 'revise',
          name: 'Revise Content',
          agent: 'copywriter',
          action: 'edit',
          input: {
            content: '{{write.content}}',
            feedback: '{{review.feedback}}'
          },
          next: ['review']
        },
        {
          id: 'approve',
          name: 'Approve Content',
          agent: 'moris',
          action: 'approve',
          input: { content: '{{write.content}}' },
          next: []
        }
      ]
    });

    // Code Development Workflow
    this.registerTemplate('code-development', {
      name: 'Code Development',
      description: 'Develop, test, and deploy code',
      steps: [
        {
          id: 'design',
          name: 'Design Solution',
          agent: 'moris',
          action: 'plan',
          input: { requirements: '{{requirements}}' },
          next: ['implement']
        },
        {
          id: 'implement',
          name: 'Implement Code',
          agent: 'coder',
          action: 'write',
          input: {
            language: '{{language}}',
            requirements: '{{requirements}}',
            design: '{{design.plan}}'
          },
          next: ['test']
        },
        {
          id: 'test',
          name: 'Test Code',
          agent: 'qa-tester',
          action: 'test',
          input: { code: '{{implement.code}}' },
          next: ['fix', 'review']
        },
        {
          id: 'fix',
          name: 'Fix Issues',
          agent: 'coder',
          action: 'debug',
          input: {
            code: '{{implement.code}}',
            errors: '{{test.errors}}'
          },
          next: ['test']
        },
        {
          id: 'review',
          name: 'Code Review',
          agent: 'coder',
          action: 'review',
          input: { code: '{{implement.code}}' },
          next: ['deploy']
        },
        {
          id: 'deploy',
          name: 'Deploy',
          agent: 'devops',
          action: 'deploy',
          input: { code: '{{implement.code}}' },
          next: []
        }
      ]
    });

    // Data Analysis Workflow
    this.registerTemplate('data-analysis', {
      name: 'Data Analysis',
      description: 'Process and analyze data',
      steps: [
        {
          id: 'collect',
          name: 'Collect Data',
          agent: 'data-analyst',
          action: 'collect',
          input: { source: '{{dataSource}}' },
          next: ['process']
        },
        {
          id: 'process',
          name: 'Process Data',
          agent: 'data-analyst',
          action: 'process',
          input: { data: '{{collect.data}}' },
          next: ['analyze']
        },
        {
          id: 'analyze',
          name: 'Analyze Data',
          agent: 'data-analyst',
          action: 'analyze',
          input: { data: '{{process.data}}' },
          next: ['visualize']
        },
        {
          id: 'visualize',
          name: 'Create Visualizations',
          agent: 'data-analyst',
          action: 'visualize',
          input: { data: '{{analyze.results}}' },
          next: ['report']
        },
        {
          id: 'report',
          name: 'Generate Report',
          agent: 'moris',
          action: 'report',
          input: { analysis: '{{analyze.results}}' },
          next: []
        }
      ]
    });

    logger.info('Default workflow templates registered');
  }

  // Register a workflow template
  registerTemplate(id, template) {
    this.templates.set(id, {
      id,
      ...template,
      registeredAt: new Date().toISOString()
    });
    logger.debug(`Workflow template registered: ${id}`);
  }

  // Get all templates
  getTemplates() {
    return Array.from(this.templates.values());
  }

  // Get single template
  getTemplate(id) {
    return this.templates.get(id);
  }

  // Start a workflow
  async startWorkflow(templateId, inputs = {}, options = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`);
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow = {
      id: workflowId,
      templateId,
      name: template.name,
      status: 'running',
      inputs,
      steps: template.steps.map(s => ({
        ...s,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        result: null
      })),
      currentStep: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      options
    };

    this.activeWorkflows.set(workflowId, workflow);
    
    // Start first step
    await this.executeStep(workflowId, 0);

    logger.info(`Workflow started: ${workflowId} (${template.name})`);
    return workflow;
  }

  // Execute a workflow step
  async executeStep(workflowId, stepIndex) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const step = workflow.steps[stepIndex];
    if (!step) {
      // Workflow complete
      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      logger.info(`Workflow completed: ${workflowId}`);
      return;
    }

    step.status = 'running';
    step.startedAt = new Date().toISOString();

    try {
      // Resolve inputs (handle template variables)
      const resolvedInputs = this.resolveInputs(step.input, workflow);

      // Execute step
      const result = await this.executeAgentTask(
        step.agent,
        step.action,
        resolvedInputs
      );

      step.result = result;
      step.status = 'completed';
      step.completedAt = new Date().toISOString();

      logger.info(`Step completed: ${step.name} (${workflowId})`);

      // Determine next step
      const nextSteps = step.next || [];
      if (nextSteps.length === 0) {
        // Workflow complete
        workflow.status = 'completed';
        workflow.completedAt = new Date().toISOString();
        logger.info(`Workflow completed: ${workflowId}`);
      } else if (nextSteps.length === 1) {
        // Single next step
        const nextStepIndex = workflow.steps.findIndex(s => s.id === nextSteps[0]);
        if (nextStepIndex >= 0) {
          workflow.currentStep = nextStepIndex;
          await this.executeStep(workflowId, nextStepIndex);
        }
      } else {
        // Branching - needs decision logic
        // For now, take first path
        const nextStepIndex = workflow.steps.findIndex(s => s.id === nextSteps[0]);
        if (nextStepIndex >= 0) {
          workflow.currentStep = nextStepIndex;
          await this.executeStep(workflowId, nextStepIndex);
        }
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      workflow.status = 'failed';
      
      logger.error(`Step failed: ${step.name} (${workflowId})`, error);
    }
  }

  // Execute agent task
  async executeAgentTask(agentId, action, inputs) {
    // Find or create agent
    let agent = this.agentRegistry.get(agentId);
    
    if (!agent) {
      // Create agent on demand
      agent = this.agentRegistry.create('base', { id: agentId, name: agentId });
    }

    // Execute action
    return await agent.execute(action, inputs);
  }

  // Resolve template variables
  resolveInputs(inputs, workflow) {
    const resolved = {};
    
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Template variable
        const path = value.slice(2, -2).trim();
        
        if (path.startsWith('workflow.inputs.')) {
          // From workflow inputs
          const inputKey = path.replace('workflow.inputs.', '');
          resolved[key] = workflow.inputs[inputKey];
        } else if (path.includes('.')) {
          // From previous step results
          const [stepId, resultKey] = path.split('.');
          const step = workflow.steps.find(s => s.id === stepId);
          if (step && step.result) {
            resolved[key] = step.result[resultKey];
          }
        }
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  // Get workflow status
  getWorkflow(id) {
    return this.activeWorkflows.get(id);
  }

  // Get all active workflows
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  // Cancel a workflow
  cancelWorkflow(id) {
    const workflow = this.activeWorkflows.get(id);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'cancelled';
      workflow.completedAt = new Date().toISOString();
      logger.info(`Workflow cancelled: ${id}`);
      return true;
    }
    return false;
  }

  // Get workflow stats
  getStats() {
    const workflows = this.getActiveWorkflows();
    return {
      total: workflows.length,
      running: workflows.filter(w => w.status === 'running').length,
      completed: workflows.filter(w => w.status === 'completed').length,
      failed: workflows.filter(w => w.status === 'failed').length,
      templates: this.templates.size
    };
  }
}

module.exports = { WorkflowEngine };