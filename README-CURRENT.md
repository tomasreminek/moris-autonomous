# 🤖 MORIS for OpenClaw
## Multi-Agent System Extension

**Primary deployment:** OpenClaw Extension  
**Status:** Ready for review  
**Version:** 2.1.0

---

## 🎯 What Is This?

MORIS brings **12 specialized AI agents** to OpenClaw, enabling complex multi-agent workflows, document analysis, and autonomous task execution.

---

## ✨ Features

### 12 Specialized Agents
| Agent | Icon | Specialty |
|-------|------|-----------|
| Moris | 🧠 | Orchestrator |
| Pro Coder | 💻 | Code & Development |
| Copywriter | ✍️ | Content Creation |
| Researcher | 🔬 | Research & Analysis |
| QA Tester | 🧪 | Testing |
| Data Analyst | 📊 | Data Processing |
| DevOps Engineer | 🚀 | Infrastructure |
| Weather Expert | 🌦️ | Weather & Forecasts |
| Security Auditor | 🔒 | Security Analysis |
| Skill Architect | 🛠️ | Skill Creation |
| Document Expert | 📚 | PDF & Documents |
| Assistant | 🌸 | General Tasks |

### Core Capabilities
- ✅ **Task Delegation** - Auto-route to best agent
- ✅ **RAG System** - Learn from PDFs and documents
- ✅ **Multi-Agent Simulation** - Agents collaborate
- ✅ **Workflow Engine** - Complex multi-step tasks
- ✅ **Knowledge Bases** - Persistent learning

---

## 🚀 Installation

```yaml
# Add to your OpenClaw config.yaml
extensions:
  moris:
    enabled: true
    version: 2.1.0
    config:
      redis_url: redis://localhost:6379
      db_path: ./data/moris.db
```

---

## 💬 Commands

### `/moris-delegate "task"`
Delegate any task to MORIS agents.

**Examples:**
```
/moris-delegate "Write Python function for fibonacci"
→ 💻 Coder agent executes

/moris-delegate "Research latest AI trends"
→ 🔬 Researcher agent works

/moris-delegate "Analyze security of this code"
→ 🔒 Security agent audits

/moris-delegate "Check weather in Prague"
→ 🌦️ Weather agent responds
```

### `/moris-agents`
List all 12 available agents with descriptions.

### `/moris-status`
Show system health and statistics.

---

## 🏗️ Architecture

```
OpenClaw Platform
├── Gateway (Telegram, Signal, Web)
├── Session Management
├── Tool System
└── MORIS Extension
    ├── Core (12 Agents)
    ├── RAG System
    ├── Task Queue
    ├── Workflow Engine
    └── Simulation Engine
```

**MORIS uses OpenClaw for:**
- ✅ Gateway & Channels
- ✅ Authentication
- ✅ Tool Execution
- ✅ Message Routing

**MORIS provides:**
- 🧠 Agent Orchestration
- 📚 Knowledge Management
- 🎮 Multi-Agent Workflows
- 🔄 Task Automation

---

## 📊 Project Status

### Completed ✅
- [x] 12 Specialized Agents
- [x] OpenClaw Extension Integration
- [x] RAG System (PDF Learning)
- [x] Multi-Agent Simulation
- [x] Task Queue (Redis)
- [x] Workflow Engine
- [x] Commands: /moris-delegate, /moris-agents, /moris-status
- [x] Auto-detection of best agent
- [x] Standalone version (on hold)

### In Progress 🔄
- [ ] Marketplace submission
- [ ] User testing
- [ ] Documentation

### Planned 📋
- [ ] Progress indicators
- [ ] Rich responses (buttons, cards)
- [ ] Team features
- [ ] Analytics dashboard

---

## 📁 Repository Structure

```
moris-autonomous/
├── adapters/
│   └── openclaw/          # ⭐ Primary: Extension
│       ├── extension.js   # Main entry point
│       └── README.md      # Documentation
│
├── core/shared/           # Shared components
│   ├── core.js            # MORIS Core
│   ├── agents.js          # Base agents
│   ├── agents-skilled.js  # Skilled agents
│   ├── rag-system.js      # RAG implementation
│   ├── simulation/        # Simulation engine
│   └── ...
│
├── standalone-archived/   # ⏸️ On hold
│   # (Preserved for future)
│
├── docs/                  # Documentation
│   ├── SYSTEM-REVIEW.md
│   ├── STANDALONE-ON-HOLD.md
│   └── ...
│
└── config/
    └── openclaw-extension.json  # Configuration
```

---

## 💰 Business Model

### OpenClaw Extension
- **Price:** $29/month
- **Split:** 70% Developer / 30% OpenClaw
- **Marketplace:** OpenClaw Marketplace

### Enterprise (Future)
- **Price:** $5,000+/year
- **Deployment:** On-premise
- **Target:** Large organizations

---

## 🔗 Links

- **Source:** `/data/workspace/moris-autonomous/`
- **Docs:** `docs/`
- **Extension:** `adapters/openclaw/`
- **Review:** `SYSTEM-REVIEW.md`

---

## 🎯 Next Steps

1. Review `SYSTEM-REVIEW.md` for improvements
2. Test extension functionality
3. Prepare marketplace submission
4. Launch! 🚀

---

**Created by:** MORIS Team  
**Powered by:** OpenClaw + OpenAI  
**License:** MIT (Extension code)

🦞 The claw is the law!
