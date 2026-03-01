/**
 * Agent Simulation System
 * Multi-agent autonomous conversation and collaboration
 */

const { EventEmitter } = require('events');
const { logger } = require('../logger');
const { v4: uuidv4 } = require('uuid');

class SimulationEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxTurns: config.maxTurns || 50,
      turnDelay: config.turnDelay || 2000, // ms between turns
      minParticipants: config.minParticipants || 2,
      maxParticipants: config.maxParticipants || 5,
      consensusThreshold: config.consensusThreshold || 0.7,
      ...config
    };
    
    this.simulations = new Map();
    this.active = false;
  }

  // Start a new simulation
  async startSimulation(config) {
    const {
      topic,
      agents,
      mode = 'collaborative', // collaborative, debate, brainstorm, critique
      duration = 300, // seconds
      context = {},
      goals = []
    } = config;

    const simulationId = `sim_${Date.now()}_${uuidv4().substr(0, 8)}`;
    
    logger.info(`Starting simulation: ${simulationId}`);
    logger.info(`Topic: ${topic}`);
    logger.info(`Agents: ${agents.join(', ')}`);
    logger.info(`Mode: ${mode}`);

    const simulation = {
      id: simulationId,
      topic,
      mode,
      agents: agents.map(id => ({
        id,
        name: this.getAgentName(id),
        role: this.getAgentRole(id),
        personality: this.getAgentPersonality(id),
        mood: 'neutral',
        engagement: 1.0,
        lastMessage: null,
        contribution: []
      })),
      context,
      goals,
      messages: [],
      ideas: [],
      decisions: [],
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      currentTurn: 0,
      maxTurns: Math.min(duration / 5, this.config.maxTurns) // Rough estimate
    };

    this.simulations.set(simulationId, simulation);
    
    // Start simulation loop
    this.runSimulationLoop(simulationId);
    
    return simulation;
  }

  // Main simulation loop
  async runSimulationLoop(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) return;

    this.emit('simulation:started', { simulationId, topic: simulation.topic });

    // Initial message - topic introduction
    await this.addMessage(simulation, {
      speaker: 'system',
      type: 'intro',
      content: `Welcome! Today's topic: "${simulation.topic}"\n\nMode: ${simulation.mode}\nParticipants: ${simulation.agents.map(a => a.name).join(', ')}\n\nLet's begin!`,
      timestamp: Date.now()
    });

    // Run turns
    while (this.shouldContinue(simulation)) {
      simulation.currentTurn++;
      
      // Select next speaker
      const speaker = this.selectNextSpeaker(simulation);
      
      // Generate message
      const message = await this.generateMessage(simulation, speaker);
      
      // Add to conversation
      await this.addMessage(simulation, message);
      
      // Check for emergent behaviors
      await this.checkEmergentBehaviors(simulation);
      
      // Delay between turns
      await this.delay(this.config.turnDelay);
    }

    // Simulation complete
    await this.finalizeSimulation(simulation);
  }

  // Check if simulation should continue
  shouldContinue(simulation) {
    if (simulation.status !== 'running') return false;
    if (simulation.currentTurn >= simulation.maxTurns) return false;
    
    const elapsed = (Date.now() - simulation.startTime) / 1000;
    // Add 30 second buffer
    if (elapsed > (simulation.maxTurns * 5) + 30) return false;
    
    // Check if consensus reached in collaborative mode
    if (simulation.mode === 'collaborative' && simulation.decisions.length > 0) {
      const lastDecision = simulation.decisions[simulation.decisions.length - 1];
      if (lastDecision.consensus > this.config.consensusThreshold) {
        logger.info(`Consensus reached: ${lastDecision.topic}`);
        return false;
      }
    }
    
    return true;
  }

  // Select next speaker based on conversation dynamics
  selectNextSpeaker(simulation) {
    const agents = simulation.agents;
    
    // Don't let same agent speak twice in a row
    const lastSpeaker = simulation.messages.length > 0 
      ? simulation.messages[simulation.messages.length - 1].speaker
      : null;
    
    const available = agents.filter(a => a.id !== lastSpeaker);
    
    // Weight by engagement and personality
    const weighted = available.map(agent => ({
      agent,
      weight: agent.engagement * (1 + Math.random() * 0.5)
    }));
    
    // Select based on weight
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { agent, weight } of weighted) {
      random -= weight;
      if (random <= 0) return agent;
    }
    
    return available[0];
  }

  // Generate message for agent
  async generateMessage(simulation, speaker) {
    const recentMessages = simulation.messages.slice(-5);
    const context = this.buildContext(simulation, speaker, recentMessages);
    
    let content = '';
    let type = 'message';
    
    // Generate based on mode and personality
    switch (simulation.mode) {
      case 'collaborative':
        content = this.generateCollaborativeMessage(context, speaker);
        break;
      case 'debate':
        content = this.generateDebateMessage(context, speaker);
        break;
      case 'brainstorm':
        content = this.generateBrainstormMessage(context, speaker);
        break;
      case 'critique':
        content = this.generateCritiqueMessage(context, speaker);
        break;
      default:
        content = this.generateNeutralMessage(context, speaker);
    }
    
    // Check for special actions
    if (Math.random() < 0.1) {
      type = 'idea';
      const idea = this.generateIdea(simulation, speaker);
      content = `💡 **Idea**: ${idea}\n\n${content}`;
      simulation.ideas.push({
        id: `idea_${Date.now()}`,
        content: idea,
        author: speaker.id,
        timestamp: Date.now(),
        votes: 0
      });
    }
    
    // Update speaker state
    speaker.lastMessage = content;
    speaker.contribution.push({ turn: simulation.currentTurn, type });
    
    return {
      speaker: speaker.id,
      speakerName: speaker.name,
      type,
      content,
      timestamp: Date.now(),
      turn: simulation.currentTurn
    };
  }

  // Build context for message generation
  buildContext(simulation, speaker, recentMessages) {
    return {
      topic: simulation.topic,
      mode: simulation.mode,
      goals: simulation.goals,
      speaker: {
        name: speaker.name,
        role: speaker.role,
        personality: speaker.personality
      },
      conversation: recentMessages.map(m => ({
        speaker: m.speakerName || m.speaker,
        content: m.content.substring(0, 200)
      })),
      ideas: simulation.ideas.slice(-3),
      decisions: simulation.decisions
    };
  }

  // Message generators for different modes
  generateCollaborativeMessage(context, speaker) {
    const responses = [
      `I think we should consider ${context.topic} from the perspective of ${speaker.role}. What if we...`,
      `Building on what was said, I suggest we...`,
      `That makes sense! Maybe we could also...`,
      `I agree with the direction. Let me add...`,
      `From my experience as ${speaker.role}, I've found that...`,
      `Great point! To make it even better, we could...`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  generateDebateMessage(context, speaker) {
    const responses = [
      `I have to disagree here. The issue with that approach is...`,
      `But consider this counterargument...`,
      `From ${speaker.role}'s perspective, that won't work because...`,
      `I see your point, however...`,
      `Actually, data suggests otherwise...`,
      `There's a flaw in that reasoning...`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  generateBrainstormMessage(context, speaker) {
    const responses = [
      `Here's a wild idea: What if we...`,
      `Thinking outside the box - what about...`,
      `Combining those ideas, we could...`,
      `Another angle: imagine if...`,
      `What if we completely reimagined...`,
      `Crazy thought, but hear me out...`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  generateCritiqueMessage(context, speaker) {
    const responses = [
      `I see potential issues with this. Specifically...`,
      `Have we considered the risks? For example...`,
      `The problem with that approach is...`,
      `We should be careful about...`,
      `That might work, but let's stress-test it by considering...`,
      `I want to challenge that assumption...`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  generateNeutralMessage(context, speaker) {
    return `As ${speaker.name}, I think ${context.topic} is interesting because...`;
  }

  // Generate an idea
  generateIdea(simulation, speaker) {
    const templates = [
      `Create a ${simulation.topic} that uses AI to predict user behavior`,
      `Build a decentralized ${simulation.topic} with blockchain verification`,
      `Design ${simulation.topic} with focus on accessibility and inclusion`,
      `Implement ${simulation.topic} using edge computing for speed`,
      `Combine ${simulation.topic} with gamification principles`,
      `Use ${simulation.topic} to solve climate-related challenges`,
      `Create ${simulation.topic} with zero-knowledge privacy`,
      `Develop ${simulation.topic} that learns from user feedback`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Check for emergent behaviors
  async checkEmergentBehaviors(simulation) {
    // Check for consensus
    if (simulation.mode === 'collaborative' && simulation.messages.length > 5) {
      const lastMessages = simulation.messages.slice(-3);
      const agreements = lastMessages.filter(m => 
        m.content.toLowerCase().includes('agree') ||
        m.content.toLowerCase().includes('yes') ||
        m.content.toLowerCase().includes('perfect')
      ).length;
      
      if (agreements >= 2) {
        simulation.decisions.push({
          topic: simulation.topic,
          consensus: agreements / 3,
          timestamp: Date.now(),
          basedOn: lastMessages.map(m => m.content.substring(0, 100))
        });
        
        this.emit('consensus:reached', {
          simulationId: simulation.id,
          decision: simulation.decisions[simulation.decisions.length - 1]
        });
      }
    }
    
    // Check for conflict
    const recent = simulation.messages.slice(-3);
    const disagreements = recent.filter(m =>
      m.content.toLowerCase().includes('disagree') ||
      m.content.toLowerCase().includes('but') ||
      m.content.toLowerCase().includes('however')
    ).length;
    
    if (disagreements >= 2) {
      this.emit('conflict:detected', {
        simulationId: simulation.id,
        severity: disagreements / 3
      });
    }
  }

  // Add message to simulation
  async addMessage(simulation, message) {
    simulation.messages.push(message);
    
    this.emit('message', {
      simulationId: simulation.id,
      ...message
    });
    
    logger.debug(`[${simulation.id}] ${message.speakerName || message.speaker}: ${message.content.substring(0, 50)}...`);
  }

  // Finalize simulation
  async finalizeSimulation(simulation) {
    simulation.status = 'completed';
    simulation.endTime = Date.now();
    
    // Generate summary
    const summary = this.generateSummary(simulation);
    simulation.summary = summary;
    
    // Add final system message
    await this.addMessage(simulation, {
      speaker: 'system',
      type: 'summary',
      content: summary,
      timestamp: Date.now()
    });
    
    this.emit('simulation:completed', {
      simulationId: simulation.id,
      summary: summary,
      stats: {
        duration: (simulation.endTime - simulation.startTime) / 1000,
        turns: simulation.currentTurn,
        ideas: simulation.ideas.length,
        decisions: simulation.decisions.length,
        messages: simulation.messages.length
      }
    });
    
    logger.info(`Simulation completed: ${simulation.id}`);
    logger.info(`Stats: ${simulation.messages.length} messages, ${simulation.ideas.length} ideas`);
  }

  // Generate summary
  generateSummary(simulation) {
    const parts = [
      `📊 **Simulation Summary**\n`,
      `Topic: ${simulation.topic}\n`,
      `Duration: ${((simulation.endTime - simulation.startTime) / 1000).toFixed(1)}s\n`,
      `Messages: ${simulation.messages.length}\n`,
      `Ideas generated: ${simulation.ideas.length}\n`,
      `Decisions made: ${simulation.decisions.length}\n\n`
    ];
    
    if (simulation.ideas.length > 0) {
      parts.push(`💡 **Top Ideas:**\n`);
      simulation.ideas.slice(0, 3).forEach((idea, i) => {
        parts.push(`${i + 1}. ${idea.content}\n`);
      });
      parts.push(`\n`);
    }
    
    if (simulation.decisions.length > 0) {
      parts.push(`✅ **Decisions:**\n`);
      simulation.decisions.forEach((dec, i) => {
        parts.push(`${i + 1}. ${dec.topic} (consensus: ${(dec.consensus * 100).toFixed(0)}%)\n`);
      });
    }
    
    parts.push(`\n👥 **Agent Contributions:**\n`);
    simulation.agents.forEach(agent => {
      const msgs = agent.contribution.length;
      parts.push(`- ${agent.name}: ${msgs} contributions\n`);
    });
    
    return parts.join('');
  }

  // Utility: Get agent name
  getAgentName(id) {
    const names = {
      'moris': 'Moris',
      'dahlia': 'Dahlia',
      'coder': 'Pro Coder',
      'copywriter': 'Copywriter',
      'researcher': 'Researcher',
      'qa': 'QA Tester',
      'data': 'Data Analyst',
      'devops': 'DevOps Engineer',
      'weather': 'Weather Expert',
      'security': 'Security Auditor',
      'skill-creator': 'Skill Architect',
      'document': 'Document Expert'
    };
    return names[id] || id;
  }

  // Utility: Get agent role
  getAgentRole(id) {
    const roles = {
      'moris': 'Orchestrator',
      'coder': 'Developer',
      'copywriter': 'Content Creator',
      'researcher': 'Researcher',
      'data': 'Data Analyst'
    };
    return roles[id] || 'Specialist';
  }

  // Utility: Get agent personality
  getAgentPersonality(id) {
    const personalities = {
      'moris': { trait: 'strategic', style: 'directive' },
      'coder': { trait: 'analytical', style: 'precise' },
      'copywriter': { trait: 'creative', style: 'expressive' },
      'researcher': { trait: 'thorough', style: 'inquisitive' },
      'dahlia': { trait: 'helpful', style: 'supportive' }
    };
    return personalities[id] || { trait: 'balanced', style: 'neutral' };
  }

  // Utility: delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get simulation status
  getSimulation(id) {
    return this.simulations.get(id);
  }

  // Get all simulations
  getAllSimulations() {
    return Array.from(this.simulations.values());
  }

  // Stop simulation
  stopSimulation(id) {
    const simulation = this.simulations.get(id);
    if (simulation) {
      simulation.status = 'stopped';
      logger.info(`Simulation stopped: ${id}`);
      return true;
    }
    return false;
  }
}

module.exports = { SimulationEngine };