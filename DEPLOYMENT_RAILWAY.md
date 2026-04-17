# 🚀 Déploiement Complet sur Railway - Guide Débutant

**Durée**: ~30 minutes | **Coût**: Gratuit (free tier) ou €5-10/mois pour uptime 24/7

---

## 📋 Ce qu'on va faire

1. Créer un compte Railway
2. Connecter GitHub (où on va pusher le code)
3. Déployer le backend sur Railway
4. Déployer le frontend sur Vercel
5. Configurer la communication sécurisée

---

## ✅ ÉTAPE 1: Préparer le Code pour Railway

### 1.1 Installer Git sur ta machine

Télécharge et installe: https://git-scm.com/download/win

Vérifie: Ouvre terminal et tape:
```bash
git --version
```

Tu dois voir: `git version X.XX.X`

### 1.2 Créer un compte GitHub (gratuit)

Va sur: https://github.com/signup

- Email: d.ahamadi@gmail.com
- Password: Quelque chose de fort
- Username: Quelconque (ex: diego-trading)

**C'est facile, juste un formulaire.**

### 1.3 Créer un repo GitHub pour ton app

Sur GitHub (après te connecter):
1. Clique le **+** en haut à droite → **New repository**
2. **Repository name**: `tradingcockpit-v31` (ou ce que tu veux)
3. **Description**: `TradingCockpit - Discipline Engine for FundingPips`
4. **Public** (pour que Railway puisse l'accéder)
5. Clique **Create repository**

**La page t'affiche des commandes** → C'est normal, on les utilise juste après.

### 1.4 Pusher ton code sur GitHub

Dans ta machine, ouvre un terminal dans le dossier `tradingcockpit`:

```bash
# Initialise Git
git init

# Ajoute tout ton code
git add .

# Crée un "commit" (une version)
git commit -m "Initial commit - TradingCockpit v3.1"

# Ajoute le "remote" (l'adresse GitHub)
git remote add origin https://github.com/TON_USERNAME/tradingcockpit-v31.git

# Pousse vers GitHub
git branch -M main
git push -u origin main
```

**Replace `TON_USERNAME` par ton vrai username GitHub.**

Si ça demande un password:
- Utilise un **Personal Access Token** (pas ton password)
- Va sur: GitHub Settings → Developer settings → Personal access tokens → Generate new token
- Copie/colle le token quand Git demande

---

## ✅ ÉTAPE 2: Configurer le Backend pour Railway

### 2.1 Mettre à jour `backend/package.json`

Ouvre le fichier `backend/package.json` et remplace la section `scripts`:

```json
"scripts": {
  "dev": "ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate deploy"
}
```

Ajoute aussi une ligne `"engines"` après `"version"`:

```json
{
  "name": "tradingcockpit-backend",
  "version": "3.1.0",
  "engines": {
    "node": "18"
  },
  ...
}
```

### 2.2 Créer un fichier `railway.json`

Crée le fichier: `tradingcockpit/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "always",
    "restartPolicyMaxRetries": 5
  }
}
```

### 2.3 Créer un `.env.production`

Crée: `backend/.env.production`

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/tradingcockpit
```

Railway va **remplacer automatiquement** `DATABASE_URL`.

---

## ✅ ÉTAPE 3: Créer un compte Railway

1. Va sur: https://railway.app
2. Clique **Sign Up** (en haut à droite)
3. **Connecte avec GitHub** (c'est plus facile)
4. Autorise Railway à accéder à tes repos

**C'est tout, maintenant tu es inscrit.**

---

## ✅ ÉTAPE 4: Déployer sur Railway

### 4.1 Créer un nouveau projet

1. Sur Railway dashboard, clique **New Project**
2. Sélectionne **Deploy from GitHub repo**
3. Connecte ton compte GitHub (si pas déjà fait)
4. Cherche `tradingcockpit-v31` → Clique dessus
5. Railway va scanner et trouver le `railway.json`

### 4.2 Ajouter une Database PostgreSQL

Railway détecte pas automatiquement PostgreSQL, on doit l'ajouter:

1. Dans le projet Railway, clique **+ Add**
2. Sélectionne **Provision PostgreSQL**
3. Valide

**Railway va créer la DB automatiquement** et ajouter `DATABASE_URL` aux variables d'environnement.

### 4.3 Variables d'Environnement

Dans le project Railway:
1. Clique sur le service **Backend** (celui qu'on vient de créer)
2. Va dans l'onglet **Variables**
3. Ajoute:

```
NODE_ENV=production
PORT=3000
```

**Le `DATABASE_URL` est déjà là** (Railway l'ajoute automatiquement).

### 4.4 Déploiement

Retourne sur le service Backend:
1. Onglet **Deployments**
2. Tu devrais voir un déploiement en cours (couleur bleue = en cours)
3. Attends qu'il finisse (couleur verte = succès)

**Regarde les logs** en temps réel pour voir si y'a des erreurs:
- Clique sur le déploiement
- Vois les messages en bas

---

## ✅ ÉTAPE 5: Tester le Backend sur Railway

Une fois déployé:

1. Va dans le service Backend
2. Onglet **Settings**
3. Sous **Domains**, tu vois quelque chose comme: `tradingcockpit-production-1234.up.railway.app`

**Copie cette URL**, on l'utilise pour le frontend.

Teste dans un navigateur:
```
https://tradingcockpit-production-1234.up.railway.app/health
```

Tu devrais voir:
```json
{
  "status": "ok",
  "timestamp": "2024-04-17T..."
}
```

Si ça marche → ✅ Backend est vivant!

---

## ✅ ÉTAPE 6: Déployer le Frontend sur Vercel

### 6.1 Créer un compte Vercel

1. Va sur: https://vercel.com/signup
2. Clique **Continue with GitHub**
3. Autorise

### 6.2 Importer le projet

1. Dans Vercel dashboard, clique **New Project**
2. Importe le repo `tradingcockpit-v31`
3. Configure les paramètres:

**Root Directory**: `frontend`

**Build Command**: `npm run build`

**Output Directory**: `build`

**Environment Variables**: Ajoute:
```
REACT_APP_API_URL=https://tradingcockpit-production-1234.up.railway.app/api
```

(Replace l'URL par celle de ton Backend Railway)

### 6.3 Déployer

Clique **Deploy**

Vercel va:
1. Builder le frontend
2. Déployer les fichiers
3. Te donner une URL comme: `tradingcockpit-v31.vercel.app`

---

## ✅ ÉTAPE 7: Tester l'App Complète

1. Va sur: `https://tradingcockpit-v31.vercel.app`
2. La page devrait charger
3. Tu devrais voir le dashboard
4. Essaie de déclarer un trade

Si ça marche → **🎉 Tout est connecté!**

---

## 🔒 ÉTAPE 8: Ajouter l'Authentification (SÉCURITÉ)

Pour que personne ne puisse modifier tes trades:

### 8.1 Créer une clé API

Dans `backend/src/index.ts`, ajoute:

```typescript
// Middleware d'authentification
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### 8.2 Ajouter la clé à Railway

1. Va dans le service Backend sur Railway
2. **Variables** → Ajoute:

```
API_KEY=supersecretkey123456
```

(Utilise quelque chose de vraiment aléatoire)

### 8.3 Envoyer la clé du Frontend

Dans `frontend/src/context/EngineContext.tsx`, modifie les fetch:

```typescript
const response = await fetch(`${API_BASE}/engine/state`, {
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.REACT_APP_API_KEY // Ajoute ça
  }
});
```

### 8.4 Ajouter la clé à Vercel

Dans Vercel project settings:
1. **Settings** → **Environment Variables**
2. Ajoute:

```
REACT_APP_API_KEY=supersecretkey123456
```

(Même clé qu'à Railway)

**Redéploie Vercel** (Vercel redéploie auto quand tu changes les vars)

---

## 🚨 ÉTAPE 9: Ajouter les Alertes au Téléphone (OPTIONNEL)

Pour recevoir des notifications push sur ton téléphone:

### Option Simple (Email):

Dans `backend/src/routes/engine.ts`, ajoute après un hard lock:

```typescript
if (decision.type === "HARD_LOCK") {
  // Envoie un email
  sendEmail(process.env.USER_EMAIL, "HARD LOCK: " + decision.message);
}
```

On peut ajouter SendGrid (gratuit pour 100 emails/jour).

### Option Mobile (Plus compliqué):

- Utiliser Firebase Cloud Messaging
- Ou OneSignal (push notifications)
- On peut le faire après si tu veux

---

## 📱 Utiliser l'App sur Téléphone

1. Va sur: `https://tradingcockpit-v31.vercel.app` depuis ton téléphone
2. Ajoute à l'écran d'accueil (**Add to Home Screen**)
3. C'est comme une app native

**Les alertes** vont arriver par email (ou SMS si on ajoute Twilio).

---

## 🆘 Dépannage

### "Cannot connect to backend"
- Vérifie l'URL du Backend dans Vercel env vars
- Vérifie que le Backend sur Railway est vert (déployé)

### "Unauthorized 401"
- Vérifie que `REACT_APP_API_KEY` = `API_KEY` sur Railway
- Redéploie Vercel après changer les vars

### "Database connection failed"
- Sur Railway, va dans PostgreSQL service
- Vérifies que c'est vert
- Les variables `DATABASE_URL` sont auto-générées

### "Build failed on Railway"
- Clique sur le déploiement rouge
- Regarde les logs en bas
- Copie l'erreur, dis-moi

---

## ✅ Checklist Finale

- [ ] Compte GitHub créé
- [ ] Repo poussé sur GitHub
- [ ] Compte Railway créé
- [ ] Backend déployé sur Railway (vert)
- [ ] PostgreSQL créé sur Railway
- [ ] Backend URL testée dans navigateur
- [ ] Compte Vercel créé
- [ ] Frontend déployé sur Vercel
- [ ] Frontend URL teste et affiche le dashboard
- [ ] API_KEY configurée sur les deux côtés
- [ ] App accessible sur téléphone

---

## 🎯 Après le Déploiement

Chaque fois que tu modifies le code:

```bash
# Dans le dossier tradingcockpit
git add .
git commit -m "Description des changements"
git push
```

Railway et Vercel se **redéploient automatiquement**.

---

**Besoin d'aide?** Dis-moi à quelle étape t'es bloqué. 🚀
