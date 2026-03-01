# 🔄 MORIS Update Strategy
## Bezstarostné aktualizace bez práce

---

## ❌ Problém: Ruční aktualizace

**Co bys musel dělat ručně:**
```bash
# Každý týden?
git pull
npm install
docker-compose build
docker-compose up -d
# Testovat, řešit konflikty...
```

**To je:** ❌ Otravné ❌ Riskantní ❌ Časově náročné

---

## ✅ Řešení 1: Auto-Updater (doporučuji)

### Automatické aktualizace bez tvé práce

```javascript
// core/auto-updater.js
class AutoUpdater {
  constructor(config) {
    this.checkInterval = config.checkInterval || '0 2 * * 0'; // Neděle 2:00
    this.autoUpdate = config.autoUpdate !== false; // default: true
    this.backupBeforeUpdate = true;
  }

  async checkForUpdates() {
    // Kontrola nové verze na GitHub
    const latest = await this.getLatestVersion();
    const current = require('../package.json').version;
    
    if (semver.gt(latest, current)) {
      logger.info(`New version available: ${latest}`);
      
      if (this.autoUpdate) {
        await this.performUpdate(latest);
      } else {
        await this.notifyAdmin(latest);
      }
    }
  }

  async performUpdate(version) {
    // 1. Backup
    await this.createBackup();
    
    // 2. Update
    await exec('git pull origin main');
    await exec('npm install --production');
    await exec('docker-compose build');
    
    // 3. Rolling restart (zero downtime)
    await this.rollingRestart();
    
    // 4. Health check
    const healthy = await this.healthCheck();
    if (!healthy) {
      await this.rollback();
    }
  }
}
```

### Výhody:
- ✅ Běží samo (v cronu)
- ✅ Vytvoří backup před aktualizací
- ✅ Rolling restart = žádný downtime
- ✅ Auto-rollback při problému
- ✅ Notifikace do Telegram/Email

---

## ✅ Řešení 2: Managed Hosting (pro SaaS)

### Ty neřešíš nic - já spravuji

**Jak to funguje:**
```
┌─────────────────────────────────────┐
│  Moje infrastruktura (Moris Cloud)  │
│  ┌─────────────────────────────┐   │
│  │  MORIS Instance (tvá)       │   │
│  │  - Auto-updates             │   │
│  │  - Monitoring               │   │
│  │  - Backup                   │   │
│  └─────────────────────────────┘   │
│           ↓                         │
│  ┌─────────────────────────────┐   │
│  │  Správa (mnou)              │   │
│  │  - Aktualizace testuji      │   │
│  │  - Nasazuji postupně        │   │
│  │  - Řeším problémy           │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              ↑
         Ty platíš $29/měsíc
         Nemusíš řešit nic
```

**Co dostaneš:**
- ✅ Automatic updates (testované před nasazením)
- ✅ 99.9% uptime SLA
- ✅ Auto-backup denně
- ✅ Monitoring 24/7
- ✅ Support při problémech

---

## ✅ Řešení 3: Semantic Versioning + Stability

### Aktualizace jen když potřebuješ

**Strategie:**
```
main branch
├── stable (produkce)     ← Nasadíš jednou za 3 měsíce
├── release-candidate     ← Testování
└── develop               ← Aktivní vývoj
```

**Produkční server:**
```yaml
# docker-compose.yml
services:
  moris-core:
    image: moris/moris-core:v2.1.0  # Pinned version!
    # Ne latest! Konkrétní verze.
```

**Aktualizace jen:**
- 🐛 Critical security fix
- 💥 Fatal bug
- 🎯 Nová funkce, kterou POTŘEBUJEŠ

**Jinak:** Necháš běžet stabilní verzi měsíce/rok

---

## 📊 Srovnání řešení

| Řešení | Práce | Cena | Kontrola | VHODNÉ PRO |
|--------|-------|------|----------|------------|
| **Auto-updater** | 0h/týden | Zdarma | Vysoká | Tech savvy uživatele |
| **Managed** | 0h/týden | $29/měs | Střední | Firmy, nezávislost |
| **Pinned** | 1h/měsíc | Zdarma | Nejvyšší | Stabilní prostředí |

---

## 🎯 Doporučení pro tebe

### Kombinace: **Pinned + Auto-updater (security only)**

**Nastavení:**
```json
{
  "autoUpdate": {
    "enabled": true,
    "strategy": "security-only",  // Jen critical security updates
    "schedule": "0 3 * * 0",      // Každou neděli 3:00
    "backup": true,
    "rollback": true,
    "notify": {
      "telegram": true,
      "email": false
    }
  }
}
```

**Co se stane:**
1. Běžíš na stabilní verzi (např. v2.1.0)
2. Auto-updater kontroluje security advisories
3. Pokud je critical CVE:
   - Automaticky backup
   - Aktualizace
   - Health check
   - Notifikace: "Aktualizováno kvůli bezpečnosti"
4. Nové feature updates? Ignoruje je

**Jak často aktualizace:**
- Security: ~1-2× za měsíc (automaticky)
- Feature: Když BUDEŠ chtít (ručně)

---

## 🔧 Implementace auto-updateru

### 1. Skript pro update
```bash
#!/bin/bash
# scripts/update.sh

set -e

echo "🔍 Checking for updates..."
cd /data/workspace/moris-autonomous

# Fetch latest
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "📦 Update found!"
    
    # Backup
    echo "💾 Creating backup..."
    ./scripts/backup.sh
    
    # Update
    echo "⬇️  Updating..."
    git pull origin main
    npm install --production
    
    # Rebuild
    echo "🔨 Rebuilding..."
    docker-compose build
    
    # Rolling restart
    echo "🔄 Restarting services..."
    docker-compose up -d
    
    # Health check
    echo "🏥 Health check..."
    sleep 10
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Update successful!"
        # Notify Telegram
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=✅ MORIS updated successfully!"
    else
        echo "❌ Health check failed, rolling back..."
        ./scripts/rollback.sh
    fi
else
    echo "✓ Already up to date"
fi
```

### 2. Cron job
```bash
# Aktualizace: Neděle 3:00 ráno
0 3 * * 0 /data/workspace/moris-autonomous/scripts/update.sh >> /var/log/moris-update.log 2>&1
```

### 3. Rollback script
```bash
#!/bin/bash
# scripts/rollback.sh

echo "↩️  Rolling back..."
docker-compose down
git reset --hard HEAD~1
docker-compose up -d
echo "✅ Rollback complete"
```

---

## 💡 Jak to bude v praxi?

### Scénář: Bezstarostný provoz

**1. Nainstaluješ MORIS:**
```bash
curl -fsSL https://moris.sh/install | bash
# Hotovo, běží to samo
```

**2. Konfiguruješ auto-update:**
```bash
moris config set auto-update.enabled true
moris config set auto-update.strategy security-only
```

**3. Zapomeneš na to:**
- Aktualizace běží samy
- Dostaneš notifikaci: "Aktualizováno"
- Rollback pokud problém
- Ty neděláš nic

**4. Když chceš novou funkci:**
```bash
moris update --major  # Ručně, když chceš
```

---

## 🎓 Best practices

### produkce = stability
```
❌ NE: Vždy latest
✅ ANO: Pinned version

❌ NE: Aktualizovat každý týden  
✅ ANO: Aktualizovat když potřeba

❌ NE: Ruční aktualizace v noci
✅ ANO: Automated s monitoringem
```

---

## 🏆 Konečné doporučení

**Pro tebe (jako vývojář):**
- Pinned verze (ty kontroluješ)
- Auto-updater (security only)
- Samotný rozhoduješ o feature updates

**Pro zákazníky (SaaS):**
- Managed hosting (starám se já)
- On-premise = auto-updater
- Enterprise = ruční podle jejich volby

---

**Chceš, abych implementoval auto-updater?**
Potřebuji ~30 minut a budeš mít bezstarostný provoz! 🚀