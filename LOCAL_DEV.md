# 🏠 Development Local - Avant de déployer sur Railway

**Durée setup**: ~10 minutes

---

## ✅ ÉTAPE 1: Installer PostgreSQL Local

### Windows

1. Télécharge: https://www.postgresql.org/download/windows/
2. Lance l'installateur
3. Pendant l'installation:
   - **Password** (pour user `postgres`): `postgres` (pour dev)
   - **Port**: `5432` (défaut, ne change pas)
4. Finish

**Vérifie**: Ouvre PowerShell/CMD:
```bash
psql --version
```

Doit afficher: `psql (PostgreSQL) 15.X` ou plus

---

## ✅ ÉTAPE 2: Créer une Database Local

Ouvre PowerShell en tant qu'admin:

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans le prompt psql:
CREATE DATABASE tradingcockpit;
\q
```

(Tape `\q` pour quitter)

---

## ✅ ÉTAPE 3: Configurer .env Local

### Backend

Ouvre `backend/.env`:

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradingcockpit
API_KEY=dev_key_12345
```

### Frontend

Ouvre `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_KEY=dev_key_12345
```

**Les API_KEY doivent être identiques!**

---

## ✅ ÉTAPE 4: Installer les Dépendances

### Root
```bash
npm install
```

### Backend
```bash
cd backend
npm install
cd ..
```

### Frontend
```bash
cd frontend
npm install
cd ..
```

---

## ✅ ÉTAPE 5: Lancer le Serveur Local

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Tu devrais voir:
```
✅ Database connected: ...
🚀 TradingCockpit backend running on http://localhost:5000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Attends 30-60 secondes, le navigateur s'ouvre automatiquement sur:
```
http://localhost:3000
```

---

## ✅ ÉTAPE 6: Tester l'App Local

1. **Dashboard charge** → Tu vois les stats ✅
2. **Déclare un trade** → Form fonctionne ✅
3. **Vérifie les logs** → Terminal backend affiche les requêtes ✅

Si tout est vert → **Ready pour déployer sur Railway!**

---

## 🆘 Dépannage Local

### "Cannot connect to database"
```bash
# Vérifie que PostgreSQL tourne
psql -U postgres
\q

# Ou lance PostgreSQL Service (Windows)
# Services → PostgreSQL → Start
```

### "Port 5000 already in use"
```bash
# Kill le process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Ou change PORT dans backend/.env
PORT=5001
```

### "Module not found"
```bash
# Clean install
cd backend && rm -rf node_modules && npm install && cd ..
cd frontend && rm -rf node_modules && npm install && cd ..
```

### Frontend affiche "Cannot reach API"
- Vérifie que le backend Terminal affiche "🚀 running"
- Vérifie `REACT_APP_API_URL` dans `frontend/.env`
- Regarde la console du navigateur (F12) pour voir l'erreur

---

## ✅ Une fois que ça marche local:

Suis le guide `DEPLOYMENT_RAILWAY.md` pour déployer en production! 🚀

---

**T'es bloqué?** Dis-moi le message d'erreur exact du Terminal. 🛠️
