# 🎯 MORIS Installation Guide

## For Non-OpenClaw Users

### Quick Start (Docker)
```bash
# Clone repository
git clone https://github.com/tomasreminek/moris-autonomous.git
cd moris-autonomous

# Set environment variables
cp .env.example .env
# Edit .env with your settings

# Start everything
docker-compose up -d
```

### Requirements
- Docker & Docker Compose
- 4GB RAM minimum
- 2 CPU cores

### Services Included
- **MORIS Core** - Main API & WebSocket (port 3001)
- **Dashboard** - Web UI (port 3005)
- **Redis** - Task queue (port 6379)
- **Nginx** - Reverse proxy (port 80)

### Configuration
Edit `.env` file:
```env
# Required
JWT_SECRET=your-secret-key

# Optional
TELEGRAM_BOT_TOKEN=your-bot-token
GOOGLE_API_KEY=your-google-key
TTS_ENGINE=edge-tts
```

### Access
- Dashboard: http://localhost
- API: http://localhost/api
- Health: http://localhost/health

### For OpenClaw Users
**Note:** MORIS is a standalone system, not an OpenClaw skill.
It runs independently alongside OpenClaw.

## Features
✅ 12 AI Agents
✅ PDF Learning (RAG)
✅ Task Queue
✅ Real-time Dashboard
✅ API & CLI
✅ Docker Ready

---
**Ready for production! 🚀**