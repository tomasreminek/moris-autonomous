# MORIS Autonomous - Deploy Guide

## 🚀 Rychlý deploy (Coolify)

### Předpoklady
- Docker a Docker Compose nainstalováno
- Přístup na Coolify dashboard: http://31.97.126.27:8000
- Resource UUID: `zwcsc4404c4c8og08wgs0ksw`

---

## Možnost 1: Automatický deploy (Doporučeno)

### Krok 1: Vytvořit .env soubor
```bash
cd /data/workspace/moris-autonomous

# Zkopírovat env template
cp .env.example .env

# Upravit podle potřeby (editor: nano, vim, nebo editovat ve VS Code)
# Hlavně nastavit:
# - REDIS_PASSWORD (silné heslo)
# - JWT_SECRET (náhodný string)
# - API_KEY (pro přístup k API)
```

### Krok 2: Spustit deploy script
```bash
cd /data/workspace
./deploy-coolify.sh
```

Tento script automaticky:
- ✅ Zkontroluje Docker
- ✅ Nahraje kód do Coolify
- ✅ Vytvoří služby včetně Redis
- ✅ Spustí `npm install`
- ✅ Provede databázové migrace
- ✅ Ověří health endpoint

---

## Možnost 2: Manuální deploy

### Krok 1: Export do Coolify
```bash
# Krok 1: Připravit deploy package
cd /data/workspace/moris-autonomous
git archive --format=zip HEAD -o ../deploy.zip

# Krok 2: Přejít na Coolify dashboard
# Otevřít: http://31.97.126.27:8000
# Projekt: MORIS Autonomous
# Resource: zwcsc4404c4c8og08wgs0ksw
```

### Krok 2: Nastavení v Coolify
```
Build Command: npm install
Start Command: npm start
Port: 8080
```

### Krok 3: Environment variables
V Coolify dashboard → Environment přidat:
```
NODE_ENV=production
PORT=8080
DB_PATH=/data/db
JWT_SECRET=<náhodný string 32+ znaků>
API_KEY=<váš API klíč>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<silné heslo>
WEBSOCKET_PORT=8081
```

### Krok 4: Deploy
Kliknout "Deploy" v Coolify dashboard

---

## Ověření deploymentu

### 1. Health check (počkat 30 sekund)
```bash
curl http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/health

# Očekávaná odpověď:
{"status":"ok","timestamp":"..."}
```

### 2. API test
```bash
curl -H "X-API-Key: VÁŠ_API_KEY" \
  http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/api/v1/agents
```

### 3. Dashboard
Otevřít v prohlížeči:
```
http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/
```

---

## 🧪 Testování po deploy

### Test 1: Ověření všech agentů
```bash
# Nahrát test skript
cd /data/workspace/moris-autonomous

# Test všech agentů
node scripts/test-agents.js
```

### Test 2: Simulace multi-agent konverzace
```bash
# Test simulace engine
curl -X POST \
  http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/api/v1/simulate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VÁŠ_API_KEY" \
  -d '{
    "mode": "collaborative",
    "topic": "How to improve marketing strategy",
    "agents": ["researcher", "data_analyst", "copywriter"],
    "turns": 3
  }'
```

### Test 3: Skill pack
```bash
# Nainstalovat marketing skill pack
curl -X POST \
  http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/api/v1/skills/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VÁŠ_API_KEY" \
  -d '{
    "skill": "marketing-team"
  }'
```

### Test 4: RAG test
```bash
# Test PDF knowledge base
curl -X POST \
  http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/api/v1/rag/ingest \
  -H "X-API-Key: VÁŠ_API_KEY" \
  -F "file=@test-document.pdf"
```

---

## 🔧 Troubleshooting

### Chyba: "Cannot connect to Redis"
```bash
# Řešení: Redis přes Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Chyba: "Port already in use"
```bash
# Změnit port v .env nebo Coolify
PORT=8080 → PORT=3000
```

### Chyba: "Database permission denied"
```bash
# Vytvořit adresář pro databázi
mkdir -p /tmp/moris-data
# A nastavit DB_PATH=/tmp/moris-data v env
```

### Chyba: "JWT secret not set"
```bash
# Vygenerovat náhodný secret
openssl rand -base64 32
```

---

## 📋 Post-deploy checklist

- [ ] Health endpoint vrací 200 OK
- [ ] Dashboard se načte v prohlížeči
- [ ] API klíč funguje (test s curl)
- [ ] Všech 12 agentů je dostupných
- [ ] Redis je připojený (zkontrolovat logs)
- [ ] WebSocket server naslouchá (port 8081)
- [ ] Skill packy jsou nahrány
- [ ] RAG systém funguje (test s PDF)

---

## 🔄 Rollback (pokud něco nefunguje)

```bash
# V Coolify dashboard:
Deployments → Vybrat předchozí verzi → "Rollback"

# Nebo lokálně:
cd /data/workspace/moris-autonomous
git log --oneline -10  # najít předchozí commit
git reset --hard <commit-hash>
./deploy-coolify.sh
```

---

## ✅ Hotovo!

Po úspěšném deploy:
1. Dashboard: http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/
2. API endpoint: /api/v1/
3. WebSocket: ws://...:8081

---

**Potřebuješ pomoc?**
Napiš mi a pošlu ti upřesněné příkazy.
