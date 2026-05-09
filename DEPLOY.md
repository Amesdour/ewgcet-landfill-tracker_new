# Déploiement EWGCET Landfill Tracker — Railway (Gratuit)

## Étapes

### 1. Créer un compte GitHub (si vous n'en avez pas)
- Allez sur https://github.com et créez un compte gratuit.

### 2. Créer un dépôt GitHub
- Cliquez sur **New repository**
- Nom : `ewgcet-landfill-tracker`
- Visibilité : **Private** (recommandé)
- Cliquez **Create repository**

### 3. Uploader les fichiers
- Cliquez **uploading an existing file**
- Glissez tous les fichiers du zip dans la page
- Cliquez **Commit changes**

### 4. Créer un compte Railway
- Allez sur https://railway.app
- Cliquez **Start a New Project**
- Connectez-vous avec votre compte GitHub

### 5. Créer le projet
- Cliquez **Deploy from GitHub repo**
- Sélectionnez `ewgcet-landfill-tracker`
- Railway détecte automatiquement le Dockerfile

### 6. Ajouter la base de données PostgreSQL
- Dans votre projet Railway, cliquez **+ New**
- Choisissez **Database → PostgreSQL**
- Railway crée automatiquement la base et définit `DATABASE_URL`

### 7. Vérifier les variables d'environnement
- Dans l'onglet **Variables** de votre service Node.js :
  - `DATABASE_URL` → ajouté automatiquement par Railway
  - `NODE_ENV` → `production`

### 8. Déployer
- Railway lance automatiquement le build et le déploiement
- En 2-3 minutes, votre app est en ligne
- L'URL s'affiche dans l'onglet **Settings → Domains**

## Comptes par défaut
| Rôle     | Email                        | Mot de passe |
|----------|------------------------------|--------------|
| Admin    | admin@ewgcet-jijel.dz        | admin123     |
| Opérateur| k.boudali@ewgcet-jijel.dz   | op1234       |

**⚠️ Changez les mots de passe après la première connexion.**

## Support
En cas de problème, consultez https://docs.railway.app
