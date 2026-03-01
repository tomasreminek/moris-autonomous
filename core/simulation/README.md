# 🎮 Agent Simulation System
# Multi-Agent Conversational Simulation with Emergent Behavior

## Overview
A complete simulation environment where AI agents autonomously interact, 
discuss, create ideas, and solve problems together.

## Features
- Agent-to-agent conversations
- Topic-based discussions
- Emergent idea generation
- Consensus building
- Creative collaboration
- Conflict resolution

## Use Cases
1. Brainstorming sessions
2. Problem solving workshops
3. Creative writing collaboration
4. Debate and argumentation
5. Code architecture discussions
6. Business strategy planning

## Configuration
See SIMULATION.md for full documentation.

## Quick Start
```bash
npm run simulation
```

Or via API:
```bash
POST /api/simulation/start
{
  "topic": "Design a new mobile app",
  "agents": ["coder", "designer", "product-manager"],
  "duration": 300,
  "mode": "collaborative"
}
```