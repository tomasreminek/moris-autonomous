/**
 * Agent Collaboration Protocol
 * Enables agents to communicate and work together
 */

const { logger } = require('./logger');
const { EventEmitter } = require('events');

class CollaborationHub extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.channels = new Map();
    this.messageHistory = [];
    this.maxHistory = 1000;
  }

  // Register agent to hub
  registerAgent(agent) {
    this.agents.set(agent.id, {
      agent,
      channels: new Set(),
      status: 'available',
      lastActive: Date.now()
    });
    
    logger.info(`Agent registered to hub: ${agent.name} (${agent.id})`);
    this.emit('agent:registered', { agentId: agent.id, name: agent.name });
  }

  // Unregister agent
  unregisterAgent(agentId) {
    const entry = this.agents.get(agentId);
    if (entry) {
      // Leave all channels
      entry.channels.forEach(channel => this.leaveChannel(agentId, channel));
      this.agents.delete(agentId);
      logger.info(`Agent unregistered from hub: ${agentId}`);
      this.emit('agent:unregistered', { agentId });
    }
  }

  // Create/join channel
  joinChannel(agentId, channelName) {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }

    this.channels.get(channelName).add(agentId);
    entry.channels.add(channelName);
    
    logger.debug(`Agent ${agentId} joined channel: ${channelName}`);
    this.emit('channel:joined', { agentId, channel: channelName });
    return true;
  }

  // Leave channel
  leaveChannel(agentId, channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.delete(agentId);
      if (channel.size === 0) {
        this.channels.delete(channelName);
      }
    }

    const entry = this.agents.get(agentId);
    if (entry) {
      entry.channels.delete(channelName);
    }

    logger.debug(`Agent ${agentId} left channel: ${channelName}`);
    this.emit('channel:left', { agentId, channel: channelName });
  }

  // Send direct message
  sendDirectMessage(fromId, toId, message) {
    const recipient = this.agents.get(toId);
    if (!recipient) {
      logger.warn(`Cannot send message - recipient not found: ${toId}`);
      return false;
    }

    const msg = {
      id: `msg_${Date.now()}`,
      type: 'direct',
      from: fromId,
      to: toId,
      content: message,
      timestamp: new Date().toISOString()
    };

    this.storeMessage(msg);
    
    // Emit to recipient agent
    recipient.agent.emit('message', msg);
    this.emit('message:sent', msg);
    
    logger.debug(`Direct message sent from ${fromId} to ${toId}`);
    return true;
  }

  // Broadcast to channel
  broadcastToChannel(fromId, channelName, message) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      logger.warn(`Cannot broadcast - channel not found: ${channelName}`);
      return false;
    }

    const msg = {
      id: `msg_${Date.now()}`,
      type: 'broadcast',
      from: fromId,
      channel: channelName,
      content: message,
      timestamp: new Date().toISOString()
    };

    this.storeMessage(msg);

    // Send to all channel members except sender
    channel.forEach(agentId => {
      if (agentId !== fromId) {
        const entry = this.agents.get(agentId);
        if (entry) {
          entry.agent.emit('message', msg);
        }
      }
    });

    this.emit('message:broadcast', msg);
    logger.debug(`Broadcast sent to ${channelName} from ${fromId}`);
    return true;
  }

  // Request collaboration
  async requestCollaboration(requesterId, task, collaborators = []) {
    const request = {
      id: `collab_${Date.now()}`,
      type: 'collaboration_request',
      requester: requesterId,
      task: task,
      collaborators: collaborators.length > 0 ? collaborators : this.findAvailableAgents(requesterId),
      status: 'pending',
      responses: new Map(),
      createdAt: new Date().toISOString()
    };

    logger.info(`Collaboration request created: ${request.id}`);

    // Send request to all collaborators
    for (const agentId of request.collaborators) {
      const entry = this.agents.get(agentId);
      if (entry) {
        entry.agent.emit('collaboration:request', request);
      }
    }

    this.emit('collaboration:requested', request);
    return request;
  }

  // Respond to collaboration request
  respondToCollaboration(requestId, agentId, accept, response = {}) {
    // This would be implemented with proper request tracking
    logger.info(`Collaboration response from ${agentId}: ${accept ? 'accepted' : 'declined'}`);
    this.emit('collaboration:response', { requestId, agentId, accept, response });
  }

  // Find available agents for collaboration
  findAvailableAgents(excludeId = null) {
    const available = [];
    this.agents.forEach((entry, id) => {
      if (id !== excludeId && entry.status === 'available') {
        available.push(id);
      }
    });
    return available;
  }

  // Store message in history
  storeMessage(message) {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }
  }

  // Get message history
  getMessageHistory(filter = {}) {
    let messages = this.messageHistory;
    
    if (filter.agentId) {
      messages = messages.filter(m => 
        m.from === filter.agentId || m.to === filter.agentId
      );
    }
    
    if (filter.channel) {
      messages = messages.filter(m => m.channel === filter.channel);
    }
    
    if (filter.since) {
      messages = messages.filter(m => 
        new Date(m.timestamp) > new Date(filter.since)
      );
    }

    return messages;
  }

  // Get hub stats
  getStats() {
    return {
      agents: this.agents.size,
      channels: this.channels.size,
      messages: this.messageHistory.length,
      agentDetails: Array.from(this.agents.entries()).map(([id, entry]) => ({
        id,
        name: entry.agent.name,
        status: entry.status,
        channels: Array.from(entry.channels)
      }))
    };
  }
}

module.exports = { CollaborationHub };