# 🚀 MORIS Autonomous

**21-Agent AI Workforce System** — Multi-agent orchestration plugin for OpenClaw

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue)](https://docs.openclaw.ai)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-orange)](package.json)

MORIS Autonomous brings a complete **21-agent AI workforce** to OpenClaw. Each agent specializes in a different domain and can be purchased individually or as part of team packages.

---

## ✨ Features

### 🤖 21 Specialized Agents

| Agent | Role | Price |
|-------|------|-------|
| 🧠 **Moris** | CEO / Orchestrator | Included |
| 🌸 **Dahlia** | Personal Assistant | $19/mo |
| 💻 **Coder** | Lead Developer | $24/mo |
| 💰 **CFO** | Financial Officer | $29/mo |
| ✍️ **Copywriter** | Content Creator | $24/mo |
| 📈 **Marketing** | Growth Manager | $24/mo |
| 🔒 **Security** | Security Auditor | $24/mo |
| 🔍 **QA** | QA Tester | $24/mo |
| ⚙️ **DevOps** | Infrastructure | $24/mo |
| 🎨 **Designer** | Creative Director | $24/mo |
| 📊 **Analyst** | Data Analyst | $24/mo |
| ⚖️ **Legal** | Legal Counsel | $24/mo |
| ...and 9 more! | | |

### 🏢 Pricing Tiers

| Package | Agents | Price | Savings |
|---------|--------|-------|---------|
| **Individual** | 1 agent | $19-29/mo | — |
| **Startup** | 5 agents | $49/mo | 45% |
| **Business** | 12 agents | $89/mo | 52% |
| **Enterprise** | 21 agents | $149/mo | 64% |

### 🔧 Core Features

- **📄 RAG Learning** — Upload PDFs, documents for agents to learn from
- **📋 Project Management** — Create projects, assign tasks to agents, track progress
- **🔌 OpenClaw Integration** — Native plugin with slash commands, agent tools, RPC
- **🌐 Self-Hosted** — Deploy on your own infrastructure (Docker, Coolify, etc.)
- **⚡ WebSocket Real-time** — Live updates across all agents
- **🔐 Authentication** — Multi-user support with subscription management

---

## 🚀 Quick Start

### Prerequisites
- OpenClaw Gateway installed
- Node.js 18+ (for self-hosted mode)
- Docker (optional)

### Installation

```bash
# Install as OpenClaw plugin
openclaw plugins install @community/moris-autonomous

# Or install from local directory
openclaw plugins install ./moris-autonomous

# Enable in config
openclaw plugins enable moris-autonomous
```

### Configuration

Add to your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "moris-autonomous": {
        "enabled": true,
        "config": {
          "port": 3001,
          "adminPassword": "your-secure-password",
          "features": {
            "rag": true,
            "projectManagement": true,
            "pricing": true
          }
        }
      }
    }
  }
}
```

### Access Dashboard

Once installed and running:
- **Dashboard**: `http://localhost:3001` (or your configured port)
- **API**: `http://localhost:3001/api/`
- **WebSocket**: `ws://localhost:3002`

---

## 🎮 Usage

### Slash Commands

| Command | Description |
|---------|-------------|
| `/moris` | Open dashboard URL |
| `/moris-agents` | List all 21 agents |
| `/moris-tasks` | Show active tasks |
| `/moris-buy [package]` | Purchase agent/package |

### Agent Tools (Auto-available in OpenClaw)

```
@moris Delegate task "Write a blog post about AI" to copywriter priority:8
@moris Create project "Q4 Marketing" with agents: marketing, copywriter, designer
@moris Get agents status
@moris Upload document "annual-report.pdf" for cfo
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health |
| `/api/agents` | GET | List all agents |
| `/api/agents/:id` | GET | Agent details |
| `/api/tasks` | GET/POST | Task management |
| `/api/projects` | GET/POST | Project management |
| `/api/documents` | POST | Upload documents (RAG) |

---

## 🐳 Self-Hosted Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  moris:
    image: tomasreminek/moris-autonomous:latest
    ports:
      - "3003:3001"
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - ADMIN_PASSWORD=admin-password
    volumes:
      - ./data:/app/data
      - ./documents:/app/documents
    restart: unless-stopped
```

### Coolify Deployment

1. Create new application in Coolify
2. Source: `https://github.com/tomasreminek/moris-autonomous`
3. Port: `3001`
4. Environment variables:
   - `JWT_SECRET` — Secure random string
   - `ADMIN_PASSWORD` — Demo admin password

---

## 📚 Documentation

- [Agent Capabilities](docs/agents.md)
- [RAG System](docs/rag.md)
- [Project Management](docs/pm.md)
- [API Reference](docs/api.md)
- [Pricing Model](docs/pricing.md)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🔗 Links

- [OpenClaw Docs](https://docs.openclaw.ai)
- [Plugin Community](https://docs.openclaw.ai/plugins/community)
- [GitHub](https://github.com/tomasreminek/moris-autonomous)
- [Discord](https://discord.gg/moris)

---

Made with 💙 for the OpenClaw community
