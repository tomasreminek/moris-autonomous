# 🏗️ MORIS Architecture Proposal
## OpenClaw Integration vs Standalone

---

## 💭 Současný stav
**MORIS je standalone systém** (Docker-based)
- ✅ Nezávislý na OpenClaw
- ✅ Může běžet kdekoliv (VPS, Coolify, lokálně)
- ✅ Plná kontrola nad aktualizacemi
- ❌ Duplicitní infrastruktura (pokud už máš OpenClaw)

---

## 🔀 Tři možné přístupy

### 1️⃣ **Standalone** (současné řešení)
```
┌─────────────────┐
│   MORIS Stack   │
├─────────────────┤
│ MORIS Core      │
│ Redis           │
│ SQLite          │
│ Dashboard       │
└─────────────────┘
       ↕
   OpenClaw (volitelně)
```
**Kdy použít:** Produční nasazení, nezávislost

---

### 2️⃣ **OpenClaw Plugin** (návrh)
```
┌─────────────────────────┐
│      OpenClaw           │
├─────────────────────────┤
│ Gateway                 │
│ Channels                │
├─────────────────────────┤
│ 🤖 MORIS Agent          │ ← Plugin
│ - Task Queue            │
│ - Agent Orchestration   │
│ - RAG System            │
└─────────────────────────┘
```

**Výhody:**
- Použiješ existující OpenClaw infrastrukturu
- Jednotná správa (jeden config file)
- Automatické aktualizace OpenClaw gateway
- Přístup k historii konverzací
- Jednodušší maintenance

**Nevýhody:**
- Vázanost na OpenClaw release cyklus
- Sdílené resource limits
- Méně kontroly nad prostředím

---

### 3️⃣ **Hybrid** (doporučuji!)
```
┌─────────────────────────────────────┐
│         OpenClaw                    │
│  ┌─────────────────────────────┐   │
│  │  MORIS Agent (Plugin)       │   │
│  │  - Command dispatcher       │   │
│  │  - Task delegation          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   MORIS Core (Standalone)           │
│  - Agent execution                  │
│  - Task queue (Redis)               │
│  - RAG system                       │
│  - Database                         │
└─────────────────────────────────────┘
```

**Výhody:**
- OpenClaw jako interface/frontend
- MORIS jako backend pro heavy lifting
- Nejlepší z obou světů
- Easy migration path

---

## 🎯 Doporučení

### Pro produkci: **Standalone** (současné řešení)
**Důvody:**
1. **Stabilita** - Nezávisíš na OpenClaw aktualizacích
2. **Škálovatelnost** - Můžeš škálovat MORIS separátně
3. **Kontrola** - Plný control nad verzemi
4. **Multi-user** - Jeden MORIS může obsluhovat více lidí

### Pro jednoduchost: **OpenClaw Plugin** (návrh)
**Kdy ano:**
- Používáš OpenClaw jen ty
- Chceš jednoduchou správu
- Nemáš problém s aktualizacemi

### Pro flexibilitu: **Hybrid** (návrh)
**Kdy ano:**
- Chceš UI v Telegram/Signal
- Měl bys backend pro těžké výpočty
- Plánuješ škálování

---

## 🔧 Jak by vypadal OpenClaw Plugin

### Struktura:
```
openclaw/
└── skills/
    └── moris-integration/
        ├── SKILL.md
        └── scripts/
            └── moris-bridge.js
```

### SKILL.md:
```yaml
name: moris-integration
description: |
  Integrate MORIS Autonomous agents into OpenClaw.
  Use to delegate complex tasks to specialized AI agents
  with knowledge bases, task queues, and collaborative workflows.
  
  Requires: Running MORIS Core instance
```

### Jak by to fungovalo:

1. **Uživatel napíše v Telegram:**
   ```
   "Potřebuji analyzovat tento PDF"
   ```

2. **OpenClaw Skill zachytí:**
   ```javascript
   // moris-bridge.js
   if (message.includes('PDF') || message.includes('analyze')) {
     // Deleguje MORIS
     const result = await morisAPI.delegate({
       agent: 'document',
       task: 'learn',
       data: { pdfPath: attachment.path }
     });
     
     // Vrátí výsledek do Telegram
     return `MORIS Document Expert analyzoval PDF:\n${result.summary}`;
   }
   ```

3. **Uživatel dostane odpověď:**
   ```
   📄 PDF analyzován!
   - 15 stran
   - 3 klíčové body identifikovány
   - Zodpovězeno 5 otázek
   ```

---

## 🚀 Implementační plán

### Fáze 1: Standalone (✅ HOTOVÉ)
- ✅ Kompletní MORIS stack
- ✅ 12 agentů
- ✅ API
- ✅ Dashboard

### Fáze 2: OpenClaw Bridge (🔄 NÁVRH)
- [ ] Vytvořit OpenClaw skill
- [ ] REST API bridge
- [ ] Command dispatcher
- [ ] State synchronization

### Fáze 3: Hybrid Mode (🔄 NÁVRH)
- [ ] Bi-directional events
- [ ] Shared context
- [ ] Unified logging

---

## 💡 Moje doporučení

**Zachovat současný standalone přístup** ale přidat:

### 1. **Optionální OpenClaw Integration**
```javascript
// MORIS Core config
{
  "openclawIntegration": {
    "enabled": true,
    "webhookUrl": "https://your-openclaw/webhook",
    "syncConversations": true,
    "forwardMessages": true
  }
}
```

### 2. **OpenClaw "Gateway Plugin"**
- Malý skill, který forwarduje zprávy do MORIS
- Ne duplikovat funkci, jen propojit

### 3. **Jeden config soubor**
```yaml
# moris-openclaw.yaml
openclaw:
  useExisting: true  # použít tvou instanci
  channels: [telegram]
  
moris:
  mode: standalone   # nebo: plugin, hybrid
  exposeApi: true
  dashboard: true
```

---

## 🎯 Co chceš implementovat?

### A) Zachovat standalone (doporučuji)
- ✅ Produčně stabilní
- ✅ Nezávislé aktualizace
- ✅ Plná kontrola

### B) Vytvořit OpenClaw plugin
- 🔄 Sloučit do jednoho systému
- 🔄 Závislost na OpenClaw release
- 🔄 Jednodušší pro jednoho uživatele

### C) Hybrid
- 🔄 OpenClaw jako frontend
- 🔄 MORIS jako backend
- 🔄 Nejflexibilnější

---

**Co preferuješ? 🤔**
- A) Zůstat standalone?
- B) Udělat OpenClaw plugin?
- C) Hybrid s obojím?

Můžu implementovat jakoukoliv variantu!