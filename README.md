# MORIS Autonomous - Quick Deploy

## 🚀 Rychlé nasazení na Coolify / sslip.io

### 1. Naklonuj repozitář
```bash
git clone https://github.com/tomasreminek/moris-autonomous.git
cd moris-autonomous
```

### 2. Spusť přes Docker
```bash
docker-compose up -d
```

### 3. Otevři v prohlížeči
- **Landing page**: http://your-ip.sslip.io/
- **Dashboard**: http://your-ip.sslip.io/dashboard
- **API**: http://your-ip.sslip.io/api

---

## 📁 Struktura

```
.
├── docker-compose.yml    # Hlavní orchestrace
├── nginx.conf           # Reverse proxy
├── public/              # Landing page
│   └── index.html
└── README.md           # Tento soubor
```

## 🐳 Služby

| Služba | Popis | Port |
|--------|-------|------|
| nginx | Reverse proxy + landing page | 80 |
| moris-core | Hlavní API | 3001 |
| moris-dashboard | Web UI | 3005 |

---

**Vytvořeno**: 2026-03-01
**Autor**: MORIS AI
