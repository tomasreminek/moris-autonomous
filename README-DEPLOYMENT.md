# 🚀 MORIS Deployment Options

## Choose Your Adventure

MORIS supports **three deployment modes** - pick what fits your needs:

---

## 1️⃣ STANDALONE (Recommended for Production)

**For:** Entrepreneurs, SaaS providers, businesses

```bash
node install.js
# Select: 1 (Standalone)
```

**What you get:**
- ✅ Full control over infrastructure
- ✅ Can sell as SaaS or on-premise
- ✅ Independent of any platform
- ✅ All 12 agents + RAG + Simulation
- ✅ Web dashboard + REST API
- ✅ Docker deployment

**Architecture:**
```
MORIS Stack (Docker)
├── Core Server (Express)
├── 12 Agents
├── Redis Queue
├── SQLite Database
└── Web Dashboard
```

**License:** MIT + Can sell commercially

---

## 2️⃣ OPENCLAW EXTENSION (Personal Use)

**For:** Personal productivity, existing OpenClaw users

```bash
node install.js
# Select: 2 (OpenClaw Extension)
```

**What you get:**
- ✅ Uses OpenClaw infrastructure (gateway, channels, auth)
- ✅ Less code to maintain
- ✅ Integrated with your OpenClaw setup
- ✅ All 12 agents + RAG + Simulation
- ❌ No standalone server
- ❌ Cannot sell as product (relies on OpenClaw)

**Architecture:**
```
OpenClaw Platform
├── Gateway (shared)
├── Channels (shared)
└── MORIS Extension
    ├── 12 Agents
    ├── RAG System
    └── Task Queue
```

**License:** Personal use only (MIT base, but coupled to OpenClaw)

---

## 3️⃣ HYBRID (Power Users)

**For:** Developers, power users, maximum flexibility

```bash
node install.js
# Select: 3 (Hybrid)
```

**What you get:**
- ✅ Standalone server (for direct access)
- ✅ OpenClaw adapter (for Telegram/Signal)
- ✅ Shared core (same agents, queue, database)
- ✅ Can use both interfaces simultaneously

**Architecture:**
```
                    ┌─────────────────┐
                    │   Shared Core   │
                    │  (Agents, RAG)  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Standalone API  │ │   OpenClaw   │ │  Dashboard   │
│   (Direct use)   │ │   Adapter    │ │   (Web UI)   │
└──────────────────┘ └──────────────┘ └──────────────┘
```

**License:** Standalone part can be sold, adapter is free

---

## 🎯 Quick Decision Guide

| You want to... | Choose |
|---------------|--------|
| Sell MORIS as SaaS | **Standalone** |
| Use with existing OpenClaw | **OpenClaw Extension** |
| Maximum flexibility | **Hybrid** |
| Minimum maintenance | **OpenClaw Extension** |
| Full control | **Standalone** |
| Both web UI and Telegram | **Hybrid** |

---

## 📊 Comparison

| Feature | Standalone | OpenClaw | Hybrid |
|---------|-----------|----------|--------|
| **Gateway** | Own | OpenClaw's | Both |
| **Channels** | API/Webhook | Telegram/Signal | Both |
| **Auth** | JWT | OpenClaw's | Both |
| **Dashboard** | ✅ | ❌ | ✅ |
| **12 Agents** | ✅ | ✅ | ✅ |
| **RAG** | ✅ | ✅ | ✅ |
| **Simulation** | ✅ | ✅ | ✅ |
| **Can Sell** | ✅ | ❌ | Partial |
| **Maintenance** | Medium | Low | Medium |

---

## 🚀 Installation

### Universal Installer
```bash
# Clone repository
git clone https://github.com/tomasreminek/moris-autonomous.git
cd moris-autonomous

# Run interactive installer
node install.js

# Follow prompts...
```

### Manual Selection
```bash
# Copy desired config
cp config/standalone.json moris.config.json   # For standalone
cp config/openclaw.json moris.config.json     # For OpenClaw
cp config/hybrid.json moris.config.json       # For hybrid

# Configure environment
cp .env.example .env
nano .env  # Edit settings

# Start
docker-compose up -d  # Standalone/Hybrid
# OR
cp -r extensions/moris /path/to/openclaw/extensions/  # OpenClaw
```

---

## 🔄 Switching Between Modes

You can switch anytime:

```bash
# Change deployment type
cp config/hybrid.json moris.config.json

# Restart
./scripts/update.sh
```

---

## 💡 Pro Tips

1. **Start with Standalone** - easiest to understand, most flexible
2. **Add OpenClaw later** - can add adapter anytime
3. **Same core** - all modes share agent logic, only infrastructure differs
4. **Migrate data** - SQLite database works across all modes

---

## 📚 Next Steps

- [Standalone Guide](INSTALL.md)
- [OpenClaw Extension](OPENCLAW-EXTENSION.md)
- [Hybrid Setup](HYBRID.md)
- [Architecture Details](ARCHITECTURE-PROPOSAL.md)

---

**Questions?** Open an issue or check the documentation! 🚀
