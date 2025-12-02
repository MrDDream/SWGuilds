# SWGuilds - Application de gestion de guildes Summoners War

Application web full-stack pour gérer vos défenses, contres, notes et étiquettes pour le jeu Summoners War: Sky Arena.

## Technologies

- **Next.js 14** (App Router) avec TypeScript
- **Prisma** avec SQLite
- **NextAuth.js** pour l'authentification
- **Tailwind CSS** pour le styling
- **Docker** pour le déploiement
- **i18n** pour le support multilingue (FR/EN)

## Prérequis

- Node.js 20+
- Docker et Docker Compose (pour le déploiement)

## Installation locale

1. Cloner le repository

2. Installer les dépendances:
```bash
npm install
```

3. Configurer les variables d'environnement:
```bash
cp .env.example .env
```

Éditer `.env` et configurer:
- `LOCALE=fr` ou `LOCALE=en` (langue de l'interface par défaut)
- `DATABASE_URL="file:./prisma/dev.db"`
- `NEXTAUTH_URL="http://localhost:3000"`
- `NEXTAUTH_SECRET` (générer une clé secrète)
- `ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_NAME` (optionnel - pour créer automatiquement un compte admin protégé)

4. Initialiser la base de données:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Lancer l'application en développement:
```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## Déploiement avec Docker

1. Copier le fichier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Éditer `.env` et configurer:
- `LOCALE=fr` ou `LOCALE=en` (langue de l'interface par défaut)
- `EXTERNAL_PORT=3020` (port exposé à l'extérieur du container, par défaut 3020)
- `NEXTAUTH_URL=http://votre-ip:EXTERNAL_PORT` (remplacer par votre IP et le port externe)
- `NEXTAUTH_SECRET` (générer une clé secrète sécurisée)
- `ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_NAME` (optionnel - pour créer automatiquement un compte admin protégé au premier démarrage)

**Note:** Le port interne du container est fixé à 3000 et ne doit pas être modifié. Seul `EXTERNAL_PORT` contrôle le port accessible depuis l'extérieur.

3. Construire et lancer avec Docker Compose:
```bash
docker-compose up -d --build
```

L'application sera accessible sur http://votre-ip:EXTERNAL_PORT

## Configuration

### Langue (LOCALE)

L'application supporte deux langues :
- `fr` - Français (par défaut)
- `en` - English

La langue est configurée via la variable d'environnement `LOCALE` dans le fichier `.env`.

### Compte Administrateur Initial

**Important** : Seul le compte créé via les variables d'environnement peut être administrateur. Le premier utilisateur créé via l'interface d'inscription ne devient plus automatiquement administrateur.

Vous pouvez créer automatiquement un compte administrateur au premier démarrage en configurant les variables suivantes dans `.env` :
- `ADMIN_ID` - Identifiant du compte admin (requis)
- `ADMIN_PASSWORD` - Mot de passe du compte admin (requis)
- `ADMIN_NAME` - Nom d'affichage du compte admin (optionnel, par défaut "Admin")

Si ces variables sont définies, le compte sera créé (ou mis à jour) automatiquement au démarrage du container Docker.

**Protection** : Le compte administrateur créé via les variables d'environnement est protégé contre toute modification par d'autres administrateurs. Il ne peut pas être :
- Supprimé
- Verrouillé/déverrouillé
- Renommé
- Rétrogradé (changement de rôle)
- Modifié (changement de mot de passe par d'autres admins)

## Structure du projet

```
SWGuilds/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes d'authentification
│   ├── (dashboard)/       # Routes protégées
│   │   └── defenses/     # Gestion des défenses
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/            # Composants React
│   ├── ui/               # Composants UI réutilisables
│   ├── defenses/         # Composants spécifiques défenses
│   └── layout/           # Composants de layout
├── lib/                  # Utilitaires
│   ├── prisma.ts         # Client Prisma
│   ├── auth.ts           # Configuration NextAuth
│   ├── i18n.ts           # Système de traduction
│   └── i18n-provider.tsx # Provider i18n
├── locales/              # Fichiers de traduction
│   ├── fr.json           # Traductions françaises
│   └── en.json           # Traductions anglaises
├── prisma/               # Schéma Prisma
│   └── schema.prisma
└── types/                # Types TypeScript
```

## Fonctionnalités

- ✅ Authentification (inscription/connexion)
- ✅ Gestion des défenses (CRUD)
- ✅ Gestion des contres pour chaque défense
- ✅ Gestion des notes
- ✅ Système d'étiquettes
- ✅ Épingler des défenses au tableau de bord
- ✅ Interface avec onglets (Aperçu, Contres, Notes, Etiquettes)
- ✅ Support multilingue (FR/EN)
- ✅ Plan interactif avec cartes et tours

## Scripts disponibles

- `npm run dev` - Lancer en mode développement
- `npm run build` - Construire pour la production
- `npm run start` - Lancer en mode production
- `npm run prisma:generate` - Générer le client Prisma
- `npm run prisma:migrate` - Créer une migration
- `npm run prisma:studio` - Ouvrir Prisma Studio

## Notes

- La base de données SQLite est stockée dans `prisma/dev.db`
- Pour la production, pensez à changer `NEXTAUTH_SECRET` par une valeur sécurisée
- Les mots de passe sont hashés avec bcrypt
- Le port par défaut est 3020 mais peut être changé via la variable `PORT` dans `.env`
