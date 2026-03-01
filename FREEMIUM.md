# 🆓 Freemium Model — MORIS Autonomous

Jednoduchá instalace jako WooCommerce. Něco zdarma, něco placené.

---

## 🎁 FREE Tier (Vždy zdarma)

### ✅ Zahrnuto zdarma:
- **Moris (CEO)** — Orchestrace, strategie, delegace
- **Dahlia (Personal Assistant)** — Kalendář, úkoly, organizace
- **Basic Project Management** — 3 projekty, 10 tasků/projekt
- **Community Support** — Discord, dokumentace
- **Self-hosted** — Plná kontrola nad daty

### 🚫 Free omezení:
- Max 2 aktivní agenti (Moris + 1 další)
- 3 projekty
- 10 tasků na projekt
- Bez RAG (PDF learning)
- Bez pokročilých reportů
- Watermark "MORIS Free" na dashboardu

---

## 💎 STARTER — $19/mo

Pro jednotlivce:
- **5 agentů** dle výběru
- **10 projektů**
- **50 tasků** na projekt
- **Basic RAG** — 10 PDF dokumentů
- Email support

---

## 🚀 PRO — $49/mo  

Pro malé týmy:
- **12 agentů**
- **Neomezené projekty**
- **Neomezené tasky**
- **Full RAG** — 100 dokumentů
- **API přístup**
- Priority support

---

## 🏢 ENTERPRISE — $149/mo

Pro organizace:
- **Všech 21 agentů**
- **Neomezené vše**
- **White-label** — vlastní branding
- **SSO / SAML**
- **On-premise** deployment
- **SLA support**

---

## 🔧 Instalace (Jako WooCommerce)

### 1️⃣ One-Click Install

```bash
# Via OpenClaw CLI
openclaw plugins install moris-autonomous

# Via npm
npm install -g @community/moris-autonomous
```

### 2️⃣ Setup Wizard

```bash
openclaw plugins setup moris-autonomous
```

Spustí interaktivní průvodce:
- ✅ Kontrola prerekvizit
- ✅ Vytvoření admin účtu
- ✅ Výběr tieru (Free/Starter/Pro/Enterprise)
- ✅ Konfigurace portů
- ✅ Povolení features

### 3️⃣ Hotovo!

```
🚀 MORIS Autonomous běží na http://localhost:3001

📊 Dashboard: http://localhost:3001/admin
🔑 Login: admin / [váše heslo]

Příkazy:
  /moris         — Otevřít dashboard
  /moris-agents — Seznam agentů
  /moris-tasks  — Aktivní úkoly
```

---

## 🔄 Upgrade Flow

### Z Free na Starter

```bash
# V dashboardu:
1. Settings → Billing → Upgrade
2. Zadat email + kartu
3. Automaticky aktivováno
```

### Trial (14 dní Pro)

Každý nový uživatel dostane 14 dní Pro zdarma.

---

## 📦 Struktura Pluginu

```
moris-autonomous/
├── core/
│   ├── free/           # Vždy dostupné
│   ├── starter/        # Od $19
│   ├── pro/           # Od $49
│   └── enterprise/    # Od $149
├── plugin/
│   └── index.ts       # OpenClaw entry
├── install.js         # Setup wizard
├── upgrade.js         # Billing integration
└── openclaw.plugin.json
```

---

## 🔐 Licence Kontrola

### Online (výchozí)
- Kontrola licence při startu
- Cache na 24h
- Grace period 7 dní při výpadku

### Offline (Enterprise)
- Licenční soubor
- 30-denní synchronizace

---

## 💳 Platební Brány

- Stripe (primary)
- PayPal
- Bitcoin/Lightning (Enterprise)

---

## 📊 Usage Tracking

```javascript
// Volitelné, anonymizované
{
  "agents_used": ["moris", "dahlia"],
  "tasks_created": 150,
  "projects_active": 5,
  "documents_uploaded": 12,
  "tier": "pro"
}
```

---

## 🎯 Cíl

> "Nainstaluješ za 2 minuty jako WooCommerce. Funguje okamžitě. Rozšíříš když potřebuješ."

---

*Freemium spec v1.0 | 2026-03-01*
