# 🚀 MORIS OpenClaw Extension

**Primary deployment mode** after OpenAI acquisition.

## Overview

MORIS integrated directly into OpenClaw platform, leveraging its infrastructure while providing multi-agent capabilities.

## What You Get

✅ **12 Specialized Agents** - Coder, Researcher, Security, etc.
✅ **RAG System** - PDF knowledge bases
✅ **Task Queue** - Redis-backed execution
✅ **Workflow Engine** - Complex automation
✅ **Simulation** - Multi-agent conversations
✅ **OpenClaw Integration** - Gateway, channels, auth

## Installation

### From OpenClaw Marketplace (when available)
```yaml
# config.yaml
extensions:
  moris:
    enabled: true
    version: 2.1.0
    config:
      redis_url: redis://localhost:6379
      db_path: ./data/moris.db
```

### Manual Installation
```bash
# Copy to OpenClaw extensions
cp -r adapters/openclaw /path/to/openclaw/extensions/moris

# Edit OpenClaw config
vim /path/to/openclaw/config.yaml

# Add:
extensions:
  moris:
    enabled: true
    path: ./extensions/moris

# Restart OpenClaw
openclaw restart
```

## Configuration

### Environment Variables
```bash
# Required
MORIS_DB_PATH=./data/moris.db
REDIS_URL=redis://localhost:6379

# Optional
MORIS_LOG_LEVEL=info
MORIS_OPENAI_ENABLED=true
```

### OpenClaw Config
```yaml
extensions:
  moris:
    enabled: true
    auto_delegate: true  # Auto-detect tasks
    default_agent: moris
    features:
      rag: true
      simulation: true
      workflows: true
```

## Usage

### Commands
```
/moris-delegate "Your task here"
  → Delegates to best agent automatically

/moris-delegate "Your task" to [agent]
  → Specific agent

/moris-agents
  → List all 12 agents

/moris-status
  → System health
```

### Examples
```
/moris-delegate "Write Python function to calculate fibonacci"
  → 💻 Coder agent executes

/moris-delegate "Analyze this security report" to security
  → 🔒 Security agent handles

/moris-delegate "Research latest AI trends"
  → 🔬 Researcher agent works

/moris-delegate "What's the weather in Prague?"
  → 🌦️ Weather agent responds
```

### Auto-Delegation
MORIS automatically intercepts messages containing:
- "code", "write", "debug" → Coder
- "research", "analyze" → Researcher
- "security", "audit" → Security
- "weather", "forecast" → Weather

## Architecture

```
OpenClaw
├── Gateway (handles Telegram, Signal)
├── Session Management
└── MORIS Extension
    ├── Task Queue (Redis)
    ├── 12 Specialized Agents
    ├── RAG System (PDF learning)
    ├── Workflow Engine
    └── Simulation Engine
```

## Advantages

### vs Standalone
- ❌ No gateway to maintain
- ❌ No auth system needed
- ❌ No channel integrations
- ✅ OpenClaw team handles infrastructure
- ✅ Automatic updates via OpenClaw
- ✅ Integrated with OpenAI ecosystem

### vs OpenClaw Native Skills
- ✅ Full multi-agent orchestration
- ✅ RAG with persistent knowledge
- ✅ Complex workflows
- ✅ Multi-agent simulations

## Migration from Standalone

### If you had standalone MORIS:
```bash
# Backup data
cp -r data/moris.db moris-backup/

# Switch to extension
vim config.yaml
# Change deployment from "standalone" to "openclaw-extension"

# Restart - data preserved
openclaw restart
```

## Development

### Testing Extension
```bash
# In OpenClaw directory
npm test extensions/moris

# Or
openclaw test-extension moris
```

### Logs
```bash
# View MORIS logs
openclaw logs --extension=moris

# Follow
openclaw logs --extension=moris --follow
```

## Support

- **Issues**: github.com/tomasreminek/moris-autonomous/issues
- **Docs**: /docs/OPENCLAW-EXTENSION.md
- **License**: MIT (for extension code)

---

**Powered by MORIS + OpenClaw + OpenAI** 🚀