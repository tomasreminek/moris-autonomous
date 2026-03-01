# 🔥 MORIS Autonomous v2.1

> **Enterprise AI Agent Ecosystem** — Production-ready autonomous system with database, real-time communication, intelligent orchestration, and extensive integrations.

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/tomasreminek/moris-autonomous)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/tomasreminek/moris-autonomous.git
cd moris-autonomous

# Copy environment config
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Access the system:**
- 🌐 **Landing Page**: http://localhost/
- 📊 **Dashboard**: http://localhost/dashboard
- 🔌 **API**: http://localhost/api
- ❤️ **Health**: http://localhost/health

---

## 📁 Project Structure

```
moris-autonomous/
├── core/                       # Core API & Infrastructure
│   ├── main.js                 # Main server (integrated)
│   ├── database.js             # SQLite database layer
│   ├── websocket.js            # Real-time communication
│   ├── task-queue.js           # Bull queue with Redis
│   ├── reporting.js            # Reporting system
│   ├── agents.js               # Agent framework
│   ├── logger.js               # Winston logging
│   ├── error-handler.js        # Error handling
│   ├── monitor.js              # Health monitoring
│   ├── Dockerfile              # Container config
│   └── package.json
│
├── dashboard/                  # Dashboard UI
│   ├── server.js               # Dashboard server
│   ├── public/
│   │   └── dashboard.html      # Dashboard UI
│   ├── Dockerfile
│   └── package.json
│
├── public/                     # Landing page
│   └── index.html
│
├── docker-compose.yml          # Full orchestration
├── nginx.conf                  # Reverse proxy
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🏗️ Architecture

### Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80 | Reverse proxy, landing page |
| moris-core | 3001 | REST API, WebSocket |
| moris-dashboard | 3005 | Dashboard UI |
| redis | 6379 | Task queue backing |

### Infrastructure Components

- **💾 Database**: SQLite with better-sqlite3 (WAL mode)
- **🌐 WebSocket**: Real-time updates for dashboard
- **📋 Task Queue**: Bull queue with Redis, auto-retry
- **📊 Reporting**: Automated reports with exports
- **🤖 Agents**: Base class with skill registry
- **🔒 Security**: Helmet, rate limiting, CORS
- **📝 Logging**: Winston with rotation

---

## 🔌 API Reference

### Agents
```
GET    /api/agents           # List all agents
GET    /api/agents/:id       # Get agent details
```

### Tasks
```
GET    /api/tasks            # List tasks
POST   /api/tasks            # Create task
GET    /api/tasks/:id        # Get task
```

### Reports
```
GET    /api/reports          # List reports
POST   /api/reports          # Generate report
GET    /api/reports/:id      # Get report
```

### Logs
```
GET    /api/logs             # Activity logs
```

### Stats
```
GET    /api/stats            # System statistics
GET    /api/websocket        # WebSocket stats
GET    /health               # Health check
```

---

## 🤖 Agent System

### Built-in Agents

| Agent | Role | Skills |
|-------|------|--------|
| Moris | Orchestrator | Task routing, decision making |
| Dahlia | Assistant | General assistance |
| Pro Coder | Developer | Code writing, review, debug |
| Copywriter | Content | Writing, editing, brainstorming |

### Creating Custom Agents

```javascript
const { BaseAgent } = require('./core/agents');

class MyAgent extends BaseAgent {
  constructor(config) {
    super({ name: 'MyAgent', role: 'custom', ...config });
    this.registerSkill('my_task', this.myTask.bind(this));
  }
  
  async myTask(data) {
    // Your logic here
    return { result: 'success' };
  }
}
```

---

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost/health
```

### System Stats
```bash
curl http://localhost/api/stats
```

### WebSocket Status
```bash
curl http://localhost/api/websocket
```

---

## 🚀 Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Development
```bash
# Terminal 1: Core
cd core && npm install && node main.js

# Terminal 2: Dashboard
cd dashboard && npm install && node server.js

# Terminal 3: Redis
docker run -p 6379:6379 redis:7-alpine
```

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | production | Environment mode |
| PORT | 3001 | Core API port |
| WS_PORT | 3002 | WebSocket port |
| DB_PATH | ./data/moris.db | Database location |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| LOG_LEVEL | info | Logging level |

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Redis (for task queue)

### Commands
```bash
# Install dependencies
cd core && npm install

# Run tests
npm test

# Lint code
npm run lint

# Build for production
docker-compose build
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with ❤️ by MORIS AI