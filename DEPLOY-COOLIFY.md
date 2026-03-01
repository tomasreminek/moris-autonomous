# 🚀 Návod: Nasazení MORIS na Coolify

## 📋 Předpoklady
- Přístup na https://31.97.126.27:8000 (Coolify)
- GitHub účet

---

## Krok 1: Vytvoření GitHub repozitáře

1. Jdi na https://github.com/new
2. **Repository name**: `moris-autonomous`
3. **Visibility**: Public
4. **Initialize with**: ✅ README
5. Click **Create repository**

---

## Krok 2: Nahrání kódu

### Možnost A: Přes ZIP (jednodušší)
```bash
# Na serveru vytvořím ZIP:
cd /data/workspace/moris-autonomous
zip -r ~/moris-autonomous.zip .

# Stáhni si ZIP a nahraj na GitHub přes web
```

### Možnost B: Přes Git (rychlejší)
```bash
# Na serveru:
cd /data/workspace/moris-autonomous
git remote add origin https://github.com/tomasreminek/moris-autonomous.git

# Nastav přístupové údaje:
git config user.email "tomas@reminek.cz"
git config user.name "Tomas Reminek"

# Pushni na GitHub (budeš muset zadat token):
git push -u origin main
```

---

## Krok 3: Nastavení v Coolify

1. **Přihlas se** na https://31.97.126.27:8000
2. **Projects** → **Add New**
3. **Source**: GitHub
4. **Repository**: `tomasreminek/moris-autonomous`
5. **Branch**: `main`
6. **Base Directory**: `/`

---

## Krok 4: Konfigurace Build

### Build Command:
```bash
# Nic - Docker Compose to řeší
```

### Start Command:
```bash
docker-compose up -d
```

### Environment Variables:
```
COMPOSE_FILE=docker-compose.yml
```

---

## Krok 5: Porty

| Služba | Port | Popis |
|--------|------|-------|
| nginx | 80 | Hlavní vstup (landing) |
| core | 3001 | API (interní) |
| dashboard | 3005 | Dashboard (interní) |

**V Coolify nastav:**
- Exposed Port: `80`
- Domain: `zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io`

---

## Krok 6: Deploy

1. Click **Save** 
2. Click **Deploy** 🚀
3. Počkej na dokončení (1-2 minuty)

---

## ✅ Ověření

Po deploy by měly fungovat tyto URL:

```
http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/
→ Landing page s menu

http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/dashboard
→ Dashboard (pokud je nasazený)

http://zwcsc4404c4c8og08wgs0ksw.31.97.126.27.sslip.io/api
→ API odpověď
```

---

## 🔧 Řešení problémů

### Pokud nefunguje landing page:
```bash
# SSH na server:
docker ps  # Zobraz kontejnery
docker logs moris-nginx  # Logy nginx
docker logs moris-core   # Logy API
```

### Pokud chybí port 80:
V Coolify → Settings → Ports → přidej `80:80`

---

## 📸 Potvrzení

Když vše funguje, pošli screenshot landing page!