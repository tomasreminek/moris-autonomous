# 🚀 Možnosti Instalace MORIS Autonomous

## Varianty

### 1️⃣ ALL-IN-ONE (Doporučeno)
**OpenClaw + MORIS Plugin v jednom Docker image**

```bash
# One-liner install
curl -fsSL https://moris.sh/install | bash

# Nebo ručně
git clone https://github.com/tomasreminek/moris-autonomous.git
cd moris-autonomous
docker-compose -f docker-compose.standalone.yml up -d
```

**Co dostaneš:**
- ✅ OpenClaw Gateway (port 3456)
- ✅ MORIS Dashboard (port 3001)
- ✅ WebSocket (port 3002)
- ✅ Auto-updates (každou hodinu)
- ✅ Pre-configured, připraveno k použití

**Pro koho:**
- Nováčci, kteří nemají OpenClaw
- Chtějí "one-click" řešení
- Chtějí auto-updates

---

### 2️⃣ PLUGIN ONLY
**Jen plugin do existujícího OpenClaw**

```bash
# Přes OpenClaw CLI
openclaw plugins install @community/moris-autonomous
openclaw plugins enable moris-autonomous

# Restart
openclaw restart
```

**Co dostaneš:**
- 🔄 Plugin se připojí k existující OpenClaw instanci
- 🔄 Použiješ existující config
- 🔄 Manuální updates

**Pro koho:**
- Máš už OpenClaw
- Chceš full control
- Nechceš duplicitní instance

---

## 🔧 Podrobnosti

### ALL-IN-ONE Docker

```yaml
docker-compose.standalone.yml
├─ openclaw:latest        # Gateway + CLI
├─ moris-autonomous:latest # Plugin vestavěný
└─ volumes:
   ├─ openclaw-data      # Perzistentní data
   └─ config.yaml        # Auto-generated
```

**Auto-update mechanismus:**
1. Každých 60 minut kontrola
2. Git pull z main branch
3. npm install --production
4. Restart pluginu (Graceful reload)

**Porty:**
- `3456` — OpenClaw Gateway API
- `3001` — MORIS Dashboard Web
- `3002` — MORIS WebSocket

---

### PLUGIN ONLY Workflow

```
Uživatel má OpenClaw
        ↓
openclaw plugins install moris-autonomous
        ↓
Plugin se nakopíruje do ~/.openclaw/extensions/
        ↓
Přidá se do config.yaml plugins.entries
        ↓
Restart OpenClaw
        ↓
✅ K dispozici slash commands: /moris, /moris-agents
```

---

## 🆚 Porovnání

| Funkce | ALL-IN-ONE | PLUGIN ONLY |
|--------|------------|-------------|
| Instalace | `curl \| bash` | `openclaw plugins install` |
| Čas | 2 minuty | 30 sekund |
| Auto-update | ✅ Ano | ❌ Ručně |
| Config | Managed | User controlled |
| Data | Docker volume | Host path |
| Restart | Auto | Manual |
| Cena | Zdarma (oba) | Zdarma (oba) |

---

## 📦 Hosting Možnosti

### Coolify (Doporučeno)

1. Vytvoř App v Coolify
2. Source: GitHub → `tomasreminek/moris-autonomous`
3. Docker Compose: `docker-compose.standalone.yml`
4. Environment: `MORIS_TIER=pro`
5. Deploy

### VPS / Server

```bash
# One-liner
curl -fsSL https://moris.sh/install | bash -s -- --tier pro

# Manual
docker-compose -f docker-compose.standalone.yml up -d
```

### Replit / Railway / Render

```yaml
# railway.yml
build:
  dockerfile: Dockerfile.openclaw

deploy:
  startCommand: /entrypoint.sh
  healthcheckPath: /health
  healthcheckTimeout: 100
```

---

## 🔄 Aktualizace

### ALL-IN-ONE
```bash
# Auto (vestavěné)
# Každých 60 minut kontrola

# Manual
/home/user/.moris/update.sh
```

### PLUGIN ONLY
```bash
openclaw plugins update moris-autonomous
```

---

## 🛟 Troubleshooting

### Porty jsou obsazeny?
```bash
# Změň porty v docker-compose.standalone.yml
ports:
  - "3457:3456"  # OpenClaw
  - "3003:3001"  # MORIS Dashboard
```

### Plugin se nenačte?
```bash
# Logs
docker-compose logs openclaw

# Ruční reload
openclaw plugins reload moris-autonomous
```

---

## 🎯 Rychlý Start

```bash
# Nejrychlejší cesta k MORIS:

curl -fsSL https://moris.sh/install | bash

# → Otevři browser
# → http://localhost:3001
# → Login: admin / (vygenerováno)
# → Hotovo! 🚀
```

---

Made with 💙 by MORIS Team
