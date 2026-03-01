# 💰 Komerční využití MORIS
## Analýza licencí a prodejních modelů

---

## 📋 Použité Open Source licence

### 1. **Node.js závislosti**
| Balíček | Licence | Komerční použití |
|---------|---------|------------------|
| express | MIT | ✅ Ano |
| bull (Redis queue) | MIT | ✅ Ano |
| better-sqlite3 | ISC | ✅ Ano |
| winston | MIT | ✅ Ano |
| helmet | MIT | ✅ Ano |
| jsonwebtoken | MIT | ✅ Ano |
| ws (WebSocket) | MIT | ✅ Ano |
| node-cron | MIT | ✅ Ano |
| nodemailer | MIT | ✅ Ano |
| compression | MIT | ✅ Ano |

**Shrnutí:** Všechny závislosti mají **MIT/ISC licence** - ✅ **Vhodné pro komerční použití**

---

## ⚖️ Právní analýza

### Co MIT licence umožňuje:
- ✅ **Obchodní použití**
- ✅ **Distribuci**
- ✅ **Úpravy**
- ✅ **Soukromé použití**
- ✅ **Prodej** (s dodatky - viz níže)

### Co MIT licence požaduje:
- ℹ️ **Zachovat copyright notice**
- ℹ️ **Zachovat licenční text**

---

## 💼 Možné obchodní modely

### 1. **SaaS (Software as a Service)** ⭐ DOPORUČENO
```
Co prodáváš: Hosting + Správa + Podpora
Co neprodáváš: Samotný kód

Příklad:
- $29/měsíc za hostovaný MORIS
- Zákazník nemá přístup ke kódu
- Ty spravuješ infrastrukturu
```
**Legální stav:** ✅ **Bezproblémové**

---

### 2. **Podpora a Konzultace**
```
Co prodáváš: Tvůj čas a expertíza
Co neprodáváš: Software

Příklad:
- $150/hod konzultace
- Implementace MORIS pro firmy
- Školení a training
```
**Legální stav:** ✅ **Bezproblémové**

---

### 3. **Dual Licensing** ⭐ DOPORUČENO
```
Open Source verze: MIT (zdarma)
Enterprise verze: Vlastní licence (placená)

Rozdíly:
- OSS: Basic funkce, výhradně MIT závislosti
- Enterprise: Přídavné moduly (vlastní kód), podpora, SLA

Příklady:
- MySQL (GPL + Commercial)
- MongoDB (SSPL + Commercial)
- Elasticsearch (SSPL + Commercial)
```
**Legální stav:** ✅ **Bezproblémové**

---

### 4. **Prodej Software (on-premise)** ⚠️ MOŽNÉ S OMEZENÍMI
```
Problém: Zákazník musí dostat MIT licenci
Musíš divit zdrojové kódy?
→ Ne, pokud neupravuješ MIT kód

Řešení:
- Prodej jako „appliance" (VM, Docker obraz)
- Přiložit LICENSE soubor
- Vlastní kód můžeš mít proprietární
```

---

## 🏗️ Navrhovaná struktura

### Možnost A: Open Core Model
```
mit-licensed/
├── core/                    # MIT - Základ (zdarma)
│   ├── agents/
│   ├── database/
│   └── api/
│
└── enterprise/              # Vlastní licence - Placené
    ├── advanced-rag/
    ├── multi-tenant/
    ├── sso/
    └── audit-log/
```

**Výhody:**
- Core komunita testuje
- Enterprise platí za extra
- Jasná hranice

---

### Možnost B: SaaS Only
```
Všechno MIT, nikam neposíláš kód
Zákazník platí za:
- Hosting
- Maintenance
- Support
- Updates
```

---

### Možnost C: GPL/AGPL nástrahy ⚠️
**Pokud bys použil GPL kód:**
- ❌ Musel bys zveřejnit celý zdroják
- ❌ Zákazník by mohl redistribuovat
- ❌ Omezilo by to obchodní možnosti

**Naštěstí:** MORIS používá jen MIT/ISC/Apache ✅

---

## 📝 Co je třeba udělat

### 1. **Vytvořit LICENSE soubor**
```
MORIS Autonomous

Copyright (c) 2026 Tomáš Řemínek

Permission is hereby granted, free of charge, to any person obtaining a copy
...(standard MIT text)...

---

THIRD PARTY LICENSES:
- Express: MIT - Copyright (c) StrongLoop...
- Bull: MIT - Copyright (c) Manuel Astudillo...
...(seznam všech závislostí)...
```

---

### 2. **Enterprise Licence** (pro placené přídavky)
```
MORIS Enterprise License

Copyright (c) 2026 Tomáš Řemínek

1. Grant of License
   Subject to payment of fees, Licensee is granted...
   
2. Restrictions
   - No redistribution
   - No reverse engineering
   
3. Support and Updates
   - Included for subscription period
```

---

## 💡 Doporučený business model

### **Open Core + SaaS**

1. **Základní verze (MIT)**
   - Zdarma na GitHubu
   - Základní agenti
   - Command line
   - Self-hosted

2. **Cloud verze (SaaS)** ⭐ Hlavní příjem
   - $29-99/měsíc
   - Managed hosting
   - Auto-updates
   - Multi-tenant
   - Backup

3. **Enterprise licence**
   - $5000-20000 ročně
   - On-premise
   - Advanced features
   - Priority support
   - Custom development

---

## ⚠️ Co pozorovat

### ❌ Co nedělat:
1. **Neměnit licence MIT závislostí**
   - Nesmíš říct "express je nyní proprietární"
   
2. **Nezatajovat závislosti**
   - Musíš uvést v LICENSE
   
3. **Nepoužívat GPL kód**
   - Kontrolovat před přidáním

### ✅ Co dělat:
1. **Vlastní moduly** můžeš mít proprietární
2. **SaaS** je legální bez zveřejnění
3. **Podpora** je legální

---

## 🎯 Konkrétní kroky pro tebe

### Hned:
1. ✅ Přidej LICENSE soubor (MIT)
2. ✅ Přidej LICENSE-3RD-PARTY (seznam závislostí)
3. ✅ Ujisti se, že git log ukazuje tvé copyrighty

### Krátkodobě:
4. 🔄 Rozdělit na core/ vs enterprise/
5. 🔄 Nastavit CI/CD pro dual licensing
6. 🔄 Připravit ceník (SaaS, Enterprise)

### Střednědobě:
7. 🚀 Launch na Product Hunt
8. 🚀 Připravit dokumentaci
9. 🚀 Najít první beta zákazníky

---

## 📊 Příjmy - odhad

### Scénář konzervativní (12 měsíců):
- 10 SaaS zákazníků × $50/měsíc × 12 = $6,000
- 2 Enterprise × $5,000 = $10,000
- **Celkem: ~$16,000/year**

### Scénář optimistický:
- 100 SaaS × $50 × 12 = $60,000
- 10 Enterprise × $10,000 = $100,000
- **Celkem: ~$160,000/year**

---

## 🏆 Doporučení

**Zvol model: Open Core + SaaS**

1. **Core > GitHub (MIT)**
   - Marketing
   - Komunitní testování
   - SEO

2. **SaaS > Placený**
   - Hlavní příjem
   - Opakované platby

3. **Enterprise > Custom**
   - Vysoká marže
   - Vztahy

---

## 🤝 Příklady úspěšných projektů

| Projekt | Licence | Model | Výnosy |
|---------|---------|-------|--------|
| GitLab | MIT | Open Core + SaaS | $100M+ ARR |
| Sentry | Apache | Open Core + SaaS | $100M+ ARR |
| N8N | Apache | Open Core + SaaS | $20M+ ARR |
| Hasura | Apache | Open Core + SaaS | $20M+ ARR |

---

**Závěr:**
✅ **ANO, můžeš prodávat!**
- SaaS je nejjednodušší a legální
- Open Core dává smysl pro škálování
- MIT licence ti nebrání

**Další krok:**
Chceš, abych připravil LICENSE soubory a strukturu pro dual-licensing?