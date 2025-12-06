<div align="center">
  <img src="public/uploads/logo.png" alt="SWGuilds Logo" width="200"/>
  
  # SWGuilds
  
  **Application web complète pour la gestion de guildes Summoners War**
  
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-Private-red)]()
</div>

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Installation rapide avec Docker](#-installation-rapide-avec-docker)
- [Installation avec Docker Compose (build local)](#-installation-avec-docker-compose-build-local)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Technologies utilisées](#-technologies-utilisées)
- [Structure du projet](#-structure-du-projet)
- [Maintenance et dépannage](#-maintenance-et-dépannage)
- [Support](#-support)

---

## 🎯 À propos

**SWGuilds** est une application web full-stack conçue pour aider les guildes de **Summoners War: Sky Arena** à gérer efficacement leurs défenses, contres, calendrier, carte de guilde et bien plus encore.

L'application offre une interface moderne et intuitive, disponible en français et en anglais, avec un système de permissions granulaires pour une gestion optimale de votre guilde.

---

## ✨ Fonctionnalités

### 🛡️ Gestion des défenses

- **CRUD complet** : Créez, modifiez, supprimez et consultez toutes vos défenses
- **Épinglage** : Épinglez vos défenses favorites sur le tableau de bord pour un accès rapide
- **Système de tags** : Organisez vos défenses avec des étiquettes personnalisées
- **Notes détaillées** : Ajoutez des notes sur les forces, faiblesses et séquences d'attaque
- **Visibilité** : Définissez si vos défenses sont publiques ou privées
- **Votes** : Système de likes/dislikes pour évaluer les défenses

**Accès** : Menu "Défenses" → Créer une nouvelle défense

### ⚔️ Système de contres

- **Contres par défense** : Ajoutez plusieurs contres pour chaque défense
- **Détails complets** : Notes, monstres utilisés, créateur et date de création
- **Système de votes** : Les membres peuvent liker/disliker les contres pour identifier les meilleures stratégies
- **Historique** : Suivez qui a créé et modifié chaque contre

**Accès** : Depuis la page d'une défense → Onglet "Contres"

### 📅 Calendrier

- **Gestion des absences** : Enregistrez les absences des membres de la guilde
- **Événements personnalisés** : Créez des événements personnalisés avec notes
- **Vue mensuelle** : Affichage mensuel avec support des événements multi-jours
- **Segments automatiques** : Les événements s'étalant sur plusieurs semaines sont automatiquement segmentés
- **Notifications Discord** : Option pour envoyer des notifications Discord lors de la création d'absences
- **Gestion multi-utilisateurs** : Les administrateurs peuvent créer des événements pour d'autres membres

**Accès** : Menu "Calendrier"

### 🗺️ Carte interactive

- **Plan de guilde** : Visualisez et gérez votre plan de guilde avec une carte interactive
- **Tours draggables** : Déplacez et redimensionnez les tours directement sur la carte
- **Assignation de défenses** : Assignez des défenses spécifiques à chaque tour
- **Gestion des positions** : Sauvegardez automatiquement les positions des tours
- **Modes de carte** : Support pour carte normale et carte de tournoi
- **Assignation d'utilisateurs** : Assignez des membres à des tours spécifiques

**Accès** : Menu "Carte"

### 👹 Base de données des monstres

- **Recherche avancée** : Recherchez parmi tous les monstres de Summoners War
- **Filtres** : Filtrez par attribut, type, famille, etc.
- **Images Swarfarm** : Accès aux images officielles depuis Swarfarm
- **Cache local** : Les images sont mises en cache pour un chargement rapide
- **Upload JSON** : Importez vos monstres depuis SWExporter (via JSON)

**Accès** : Menu "Monstres"

### 📰 Actualités (News)

- **Système de posts** : Créez et gérez des actualités pour votre guilde
- **Markdown supporté** : Utilisez Markdown pour formater vos posts
- **Webhook Discord** : Option pour publier automatiquement sur Discord
- **Gestion des permissions** : Contrôlez qui peut créer des posts

**Accès** : Menu "News" (permission requise pour créer)

### 👥 Gestion des utilisateurs

- **Système de rôles** : Administrateurs et utilisateurs standards
- **Approbation** : Les nouveaux utilisateurs doivent être approuvés par un admin
- **Permissions granulaires** :
  - `canEditAllDefenses` : Modifier toutes les défenses
  - `canEditMap` : Modifier la carte de guilde
  - `canEditAssignments` : Gérer les assignations
  - `canEditNews` : Créer des posts d'actualités
- **Profils personnalisés** : Avatar, nom, langue préférée
- **Clés API** : Génération de clés API pour SWExporter

**Accès** : Panel d'administration (admin uniquement)

### 🔧 Administration

- **Panel complet** : Interface d'administration complète
- **Gestion des utilisateurs** : Création, modification, suppression, approbation
- **Logs d'activité** : Suivez toutes les actions des utilisateurs
- **Export de base de données** : Exportez votre base de données pour sauvegarde
- **Paramètres** : Configuration du logo, nom d'instance, webhooks Discord
- **Compte admin protégé** : Le compte créé via variables d'environnement est protégé

**Accès** : Menu "Administration" (admin uniquement)

### 🌐 Multilingue

- **Support FR/EN** : Interface disponible en français et en anglais
- **Préférence utilisateur** : Chaque utilisateur peut choisir sa langue préférée
- **Configuration globale** : Langue par défaut configurable via variables d'environnement

### 🔐 Authentification

- **Inscription** : Les nouveaux utilisateurs peuvent s'inscrire
- **Connexion sécurisée** : Authentification via NextAuth.js
- **Gestion de profil** : Modification du profil, avatar, mot de passe
- **Sessions** : Gestion automatique des sessions

---

## 🚀 Installation rapide avec Docker

La méthode la plus simple pour déployer SWGuilds est d'utiliser l'image Docker pré-construite disponible sur GitHub Container Registry.

### Prérequis

- Docker et Docker Compose installés
- Un fichier `.env` configuré (voir [Configuration](#-configuration))

### Étapes d'installation

1. **Téléchargez le fichier `docker-compose-prod.yml`** :

```bash
curl -O https://raw.githubusercontent.com/votre-repo/SWGuilds/main/docker-compose-prod.yml
```

Ou clonez le repository :

```bash
git clone https://github.com/votre-repo/SWGuilds.git
cd SWGuilds
```

2. **Créez votre fichier `.env`** :

```bash
cp .env.example .env
```

3. **Configurez les variables d'environnement** (voir section [Configuration](#-configuration))

4. **Lancez l'application** :

```bash
docker-compose -f docker-compose-prod.yml up -d
```

5. **Accédez à l'application** :

Ouvrez votre navigateur à l'adresse : `http://votre-ip:3020` (ou le port configuré dans `EXTERNAL_PORT`)

### Volumes Docker

L'application utilise des volumes Docker nommés pour persister les données :

- `prisma_data` : Base de données SQLite
- `data_public` : Fichiers uploadés (logos, cartes, avatars, etc.)

Ces volumes sont automatiquement créés lors du premier démarrage.

---

## 🛠️ Installation avec Docker Compose (build local)

Si vous préférez construire l'image localement ou développer l'application :

### Prérequis

- Docker et Docker Compose installés
- Node.js 20+ (pour développement local)

### Étapes d'installation

1. **Clonez le repository** :

```bash
git clone https://github.com/votre-repo/SWGuilds.git
cd SWGuilds
```

2. **Créez votre fichier `.env`** :

```bash
cp .env.example .env
```

3. **Configurez les variables d'environnement**

4. **Construisez et lancez avec Docker Compose** :

```bash
docker-compose up -d --build
```

### Volumes locaux

Avec `docker-compose.yml`, les données sont stockées localement :

- `./prisma` : Base de données SQLite
- `./public` : Fichiers uploadés

---

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

#### Variables requises

```env
# Locale par défaut (fr ou en)
LOCALE=fr

# Base de données (ne pas modifier pour Docker)
DATABASE_URL="file:./prisma/dev.db"

# URL de l'application (remplacer par votre IP/domaine)
NEXTAUTH_URL="http://localhost:3020"

# Secret pour NextAuth (générer une clé sécurisée)
NEXTAUTH_SECRET="votre-secret-tres-securise-ici"
```

#### Variables optionnelles

```env
# Port externe (par défaut 3020)
EXTERNAL_PORT=3020

# Compte administrateur initial (protégé)
ADMIN_ID="admin"
ADMIN_PASSWORD="mot-de-passe-securise"
ADMIN_NAME="Administrateur"

# Timezone (par défaut Europe/Paris)
TIMEZONE=Europe/Paris
```

### Génération de NEXTAUTH_SECRET

Pour générer un secret sécurisé :

```bash
openssl rand -base64 32
```

Ou en ligne :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configuration du compte administrateur

Le compte créé via les variables d'environnement (`ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_NAME`) est **protégé** et ne peut pas être modifié par d'autres administrateurs. Il ne peut pas être :

- Supprimé
- Verrouillé/déverrouillé
- Renommé
- Rétrogradé (changement de rôle)
- Modifié (changement de mot de passe par d'autres admins)

**Important** : Si vous ne configurez pas ces variables, vous devrez créer un compte admin manuellement via la base de données.

### Configuration des webhooks Discord

Dans le panel d'administration, vous pouvez configurer :

- **Webhook Discord pour absences** : Notifications automatiques lors de la création d'absences
- **Webhook Discord pour actualités** : Publication automatique des posts sur Discord

Pour obtenir l'URL d'un webhook Discord :

1. Allez dans les paramètres de votre serveur Discord
2. Intégrations → Webhooks → Nouveau webhook
3. Copiez l'URL du webhook

---

## 📖 Utilisation

### Première connexion

1. Accédez à l'application via votre navigateur
2. Cliquez sur "S'inscrire" si vous n'avez pas de compte
3. Remplissez le formulaire d'inscription
4. Attendez l'approbation par un administrateur (si nécessaire)
5. Connectez-vous avec vos identifiants

### Création d'une défense

1. Allez dans "Défenses" → "Créer une défense"
2. Sélectionnez les 3 monstres de votre défense
3. Remplissez les informations (forces, faiblesses, séquence d'attaque)
4. Ajoutez des tags si nécessaire
5. Cliquez sur "Créer"

### Ajout d'un contre

1. Ouvrez une défense
2. Allez dans l'onglet "Contres"
3. Cliquez sur "Ajouter un contre"
4. Sélectionnez les monstres du contre
5. Ajoutez des notes
6. Enregistrez

### Utilisation du calendrier

1. Allez dans "Calendrier"
2. Cliquez sur "Ajouter un évènement"
3. Sélectionnez le type (Absence ou Autre)
4. Choisissez les dates de début et de fin
5. Ajoutez une note optionnelle
6. Enregistrez

Les événements multi-jours s'affichent automatiquement sur plusieurs lignes.

### Configuration de la carte

1. Allez dans "Carte"
2. Sélectionnez le mode (Normal ou Tournoi)
3. Cliquez sur une tour pour la configurer
4. Déplacez et redimensionnez les tours avec la souris
5. Assignez des défenses et des utilisateurs
6. Les positions sont sauvegardées automatiquement

### Gestion des utilisateurs (admin)

1. Allez dans "Administration"
2. Section "Utilisateurs"
3. Approuvez, modifiez les permissions ou supprimez des utilisateurs
4. Configurez les permissions granulaires selon les besoins

---

## 🛠️ Technologies utilisées

### Stack principal

- **[Next.js 14](https://nextjs.org/)** : Framework React avec App Router
- **[TypeScript](https://www.typescriptlang.org/)** : Typage statique
- **[Prisma](https://www.prisma.io/)** : ORM pour la base de données
- **[SQLite](https://www.sqlite.org/)** : Base de données
- **[NextAuth.js](https://next-auth.js.org/)** : Authentification
- **[Tailwind CSS](https://tailwindcss.com/)** : Styling
- **[React](https://react.dev/)** : Bibliothèque UI

### Dépendances principales

- `react-draggable` : Drag & drop pour la carte
- `react-resizable` : Redimensionnement des tours
- `react-markdown` : Rendu Markdown pour les notes
- `bcryptjs` : Hashage des mots de passe

---

## 📁 Structure du projet

```
SWGuilds/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Routes d'authentification
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Routes protégées
│   │   ├── admin/               # Panel d'administration
│   │   ├── calendar/            # Calendrier
│   │   ├── defenses/            # Gestion des défenses
│   │   ├── gestion/             # Gestion des assignations
│   │   ├── map/                 # Carte interactive
│   │   ├── monsters/            # Base de données monstres
│   │   ├── news/                # Actualités
│   │   └── profile/             # Profil utilisateur
│   ├── api/                     # API Routes
│   │   ├── admin/               # Endpoints admin
│   │   ├── calendar/            # Endpoints calendrier
│   │   ├── defenses/            # Endpoints défenses
│   │   └── ...
│   └── layout.tsx               # Layout principal
├── components/                   # Composants React
│   ├── admin/                   # Composants admin
│   ├── defenses/                # Composants défenses
│   ├── map/                     # Composants carte
│   ├── ui/                      # Composants UI réutilisables
│   └── layout/                  # Composants de layout
├── lib/                         # Utilitaires
│   ├── prisma.ts                # Client Prisma
│   ├── auth.ts                  # Configuration NextAuth
│   ├── auth-helpers.ts          # Helpers authentification
│   ├── i18n.ts                  # Système de traduction
│   └── monster-cache.ts         # Cache des monstres
├── locales/                     # Fichiers de traduction
│   ├── fr.json                  # Traductions françaises
│   └── en.json                  # Traductions anglaises
├── prisma/                      # Schéma Prisma
│   ├── schema.prisma            # Schéma de base de données
│   └── migrations/              # Migrations
├── public/                      # Fichiers statiques
│   └── uploads/                 # Uploads utilisateurs
│       ├── logo.png             # Logo de l'application
│       ├── map.png              # Carte normale
│       ├── map_tournament.png   # Carte tournoi
│       └── ...
├── scripts/                     # Scripts utilitaires
│   ├── create-admin.ts          # Création compte admin
│   ├── download-all-monsters-and-images.ts
│   └── reminder-cron.js        # Cron rappels
├── docker-compose.yml           # Docker Compose (build local)
├── docker-compose-prod.yml      # Docker Compose (image pré-construite)
├── Dockerfile                   # Image Docker
└── package.json                 # Dépendances npm
```

---

## 🔧 Maintenance et dépannage

### Voir les logs Docker

```bash
# Logs en temps réel
docker-compose -f docker-compose-prod.yml logs -f

# Logs des 100 dernières lignes
docker-compose -f docker-compose-prod.yml logs --tail=100
```

### Sauvegarder la base de données

```bash
# Avec volumes nommés
docker-compose -f docker-compose-prod.yml exec app cp /app/prisma/dev.db /app/prisma/dev.db.backup

# Avec volumes locaux
cp prisma/dev.db prisma/dev.db.backup
```

### Restaurer la base de données

```bash
# Avec volumes nommés
docker-compose -f docker-compose-prod.yml exec app cp /app/prisma/dev.db.backup /app/prisma/dev.db

# Avec volumes locaux
cp prisma/dev.db.backup prisma/dev.db
```

### Mettre à jour l'image Docker

```bash
# Arrêter le container
docker-compose -f docker-compose-prod.yml down

# Télécharger la nouvelle image
docker-compose -f docker-compose-prod.yml pull

# Redémarrer
docker-compose -f docker-compose-prod.yml up -d
```

### Redémarrer l'application

```bash
docker-compose -f docker-compose-prod.yml restart
```

### Problèmes courants

#### L'application ne démarre pas

1. Vérifiez les logs : `docker-compose -f docker-compose-prod.yml logs`
2. Vérifiez que le port n'est pas déjà utilisé
3. Vérifiez que le fichier `.env` est correctement configuré
4. Vérifiez les permissions des volumes

#### Erreur de permissions

Si vous avez des erreurs de permissions avec les volumes :

```bash
# Ajuster les permissions (Linux)
sudo chown -R 1001:1001 ./prisma ./public/uploads
```

#### La base de données ne se crée pas

1. Vérifiez que le volume `prisma_data` existe : `docker volume ls`
2. Vérifiez les logs pour les erreurs de migration
3. Supprimez le volume et recréez-le si nécessaire

#### Les images ne se chargent pas

1. Vérifiez que le volume `data_public` existe
2. Vérifiez les permissions du dossier `public/uploads`
3. Vérifiez les logs pour les erreurs de chargement

---

## 📞 Support

### Issues GitHub

Pour signaler un bug ou demander une fonctionnalité, ouvrez une issue sur GitHub.

### Documentation

La documentation complète est disponible dans le repository.

### Contact

Pour toute question ou support, contactez l'équipe de développement.

---

<div align="center">
  <p>Made with ❤️ for Summoners War guilds</p>
  <p>© 2024 SWGuilds - Tous droits réservés</p>
</div>

