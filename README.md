<div align="center">
  <img src="public/uploads/logo.png" alt="SWGuilds Logo" width="200"/>
  
  **Complete web application for Summoners War guild management**
  
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-Private-red)]()
</div>

This documentation is available in [French](README.fr.md) and in [English](README.md)

---

## 🎯 About

**SWGuilds** is a full-stack web application designed to help **Summoners War: Sky Arena** guilds efficiently manage their defenses, counters, calendar, guild map, and much more.

The application offers a modern and intuitive interface, available in French and English, with a granular permissions system for optimal guild management.

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick Installation with Docker](#-quick-installation-with-docker)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Technologies Used](#-technologies-used)
- [Maintenance and Troubleshooting](#-maintenance-and-troubleshooting)
- [Support](#-support)

---

## ✨ Features

### 🛡️ Defense Management

- **Full CRUD** : Create, modify, delete, and view all your defenses
- **Tag system** : Organize your defenses with custom tags
- **Detailed notes** : Add notes on strengths, weaknesses
- **Voting** : Like/dislike system to evaluate defenses

**Access** : "Defenses" menu → Create a new defense

### ⚔️ Counter System

- **Counters per defense** : Add multiple counters for each defense
- **Complete details** : Notes, monsters used, creator and creation date
- **Voting system** : Members can like/dislike counters to identify the best strategies
- **History** : Track who created and modified each counter

**Access** : From a defense page → "Counters" tab

### 📅 Calendar

- **Absence management** : Record guild member absences
- **Custom events** : Create custom events with notes
- **Monthly view** : Monthly display with multi-day event support
- **Discord notifications** : Option to send Discord notifications when creating absences
- **Multi-user management** : Administrators can create events for other members

**Access** : "Calendar" menu

### 🗺️ Interactive Map

- **Guild plan** : Visualize and manage your guild plan with an interactive map
- **Draggable towers** : Move and resize towers directly on the map
- **Defense assignment** : Assign specific defenses to each tower
- **Map modes** : Support for normal map and tournament map
- **User assignment** : Assign members to specific towers

**Access** : "Map" menu

### 👥 Assignment Management

- **Defense assignment** : Assign specific defenses to multiple guild members
- **Automatic verification** : The system automatically checks which members have the monsters needed for each defense
- **Multiple assignments** : Assign the same defense to multiple members simultaneously
- **Assignment management** : View all existing assignments or filter to see only your assignments
- **Modification** : Modify or delete existing assignments
- **Overview** : View all assigned defenses with monsters and concerned members
- **Permissions** : Access control via the `canEditAssignments` permission

**Access** : "Management" menu (`canEditAssignments` permission required to create/modify)

### 👹 Monster Database

- **Advanced search** : Search among all Summoners War monsters
- **Filters** : Filter by attribute, type, family, etc.
- **Swarfarm images** : Access to official images from Swarfarm
- **Local cache** : Images are cached for fast loading
- **JSON upload** : Import your monsters from SWExporter (via JSON)

**Access** : "Monsters" menu

### 📰 News

- **Post system** : Create and manage news for your guild
- **Markdown support** : Use Markdown to format your posts
- **Discord webhook** : Option to automatically publish on Discord
- **Permission management** : Control who can create posts

**Access** : "News" menu (permission required to create)

### 👥 User Management

- **Role system** : Administrators and standard users
- **Approval** : New users must be approved by an admin
- **Granular permissions** :
  - `canEditAllDefenses` : Edit all defenses
  - `canEditMap` : Edit the guild map
  - `canEditAssignments` : Manage assignments
  - `canEditNews` : Create news posts
- **Custom profiles** : Avatar, name, preferred language
- **API keys** : Generate API keys for SWExporter

**Access** : Administration panel (admin only)

### 🔧 Administration

- **Complete panel** : Full administration interface
- **User management** : Creation, modification, deletion, approval
- **Activity logs** : Track all user actions
- **Database export** : Export your database for backup
- **Settings** : Logo configuration, instance name, Discord webhooks
- **Protected admin account** : The account created via environment variables is protected

**Access** : "Administration" menu (admin only)

### 🌐 Multilingual

- **FR/EN support** : Interface available in French and English
- **User preference** : Each user can choose their preferred language
- **Global configuration** : Default language configurable via environment variables

### 🔐 Authentication

- **Registration** : New users can register
- **Secure login** : Authentication via NextAuth.js
- **Profile management** : Profile modification, avatar, password
- **Sessions** : Automatic session management

---

## 📸 Screenshots

| Feature | Screenshot |
|---------|------------|
| 🔐 **Authentication** - Login page | ![Login page](screenshots/login.png) |
| 📰 **News** - News page | ![News page](screenshots/news.png) |
| 🛡️ **Defenses** - Defense list | ![Defense list](screenshots/defenses.png) |
| 🔐 Administration** - Branding| ![Create a defense](screenshots/defense-create.png) |
| 🗺️ **Map** - Interactive guild map  - List towers | ![Defense details](screenshots/defense-detail.png) |
| ⚔️ **Management** - Assignment management | ![Defense counters](screenshots/counters.png) |
| 🗺️ **Map** - Interactive guild map | ![Guild map](screenshots/map.png) |
| 👹 **Monsters** - Monster database | ![Assignment management](screenshots/gestion.png) |
| 📅 **Calendar** - Monthly view | ![Monster search](screenshots/monsters.png) |
| 👤 **Profile** - User profile | ![Monthly calendar view](screenshots/calendar.png) |
| 🔧 **Administration** - User management | ![Admin panel](screenshots/admin.png) |
| 🔧 **Administration** - Logs | ![User management](screenshots/admin-users.png) |
| 🔧 **Administration** - Tags | ![Admin settings](screenshots/admin-settings.png) |
| 🔧 **Administration** - Reminder | ![User profile](screenshots/profile.png) |

---

## 🚀 Quick Installation with Docker

The simplest way to deploy SWGuilds is to use the pre-built Docker image available on GitHub Container Registry.

### Prerequisites

- Docker and Docker Compose installed
- A configured `.env` file (see [Configuration](#-configuration))

### Installation Steps

1. **Download the `docker-compose.yml` file** :

```bash
curl -O https://raw.githubusercontent.com/votre-repo/SWGuilds/main/docker-compose.yml
```

Or clone the repository :

```bash
git clone https://github.com/votre-repo/SWGuilds.git
cd SWGuilds
```

2. **Create your `.env` file** :

```bash
cp .env.example .env
```

3. **Configure environment variables** (see [Configuration](#-configuration) section)

4. **Launch the application** :

```bash
docker-compose -f docker-compose-prod.yml up -d
```

5. **Access the application** :

Open your browser at: `http://your-ip:3020` (or the port configured in `EXTERNAL_PORT`)

To use the application after going live, go to **Administration** -> **Settings** -> **Update from SwarFarm** (this will download the information and icons locally, this button should be used for example when adding new monsters).

### Docker Volumes

The application uses named Docker volumes to persist data :

- `prisma_data` : SQLite database
- `data_public` : Uploaded files (logos, maps, avatars, etc.)

These volumes are automatically created on first startup.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file at the project root with the following variables :

#### Required Variables

```env
# Locale
LOCALE=en
# Timezone
TIMEZONE=Europe/London
# Admin (optional - to automatically create an admin account)
ADMIN_ID=admin
ADMIN_PASSWORD=change-me
ADMIN_NAME=Admin
# External PORT
EXTERNAL_PORT=3020
# Database
DATABASE_URL="file:./prisma/dev.db"
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-secret-in-production"
```

### Generating NEXTAUTH_SECRET

To generate a secure secret :

```bash
openssl rand -base64 32
```

### Administrator Account Configuration

The account created via environment variables (`ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_NAME`) is **protected** and cannot be modified by other administrators. It cannot be :

- Deleted
- Locked/unlocked
- Renamed
- Demoted (role change)
- Modified (password change by other admins)

**Important** : If you don't configure these variables, you'll need to create an admin account manually via the database.

### Discord Webhook Configuration

In the administration panel, you can configure :

- **Discord webhook for absences** : Automatic notifications when creating absences
- **Discord webhook for news** : Automatic publication of posts on Discord

To get a Discord webhook URL :

1. Go to your Discord server settings
2. Integrations → Webhooks → New webhook
3. Copy the webhook URL

---

## 📖 Usage

### First Login

1. Access the application via your browser
2. Click "Register" if you don't have an account
3. Fill out the registration form
4. Wait for approval by an administrator (if necessary)
5. Log in with your credentials

### Creating a Defense

1. Go to "Defenses" → "Create a defense"
2. Select the 3 monsters for your defense
3. Fill in the information (strengths, weaknesses, attack sequence)
4. Add tags if necessary
5. Click "Create"

### Adding a Counter

1. Open a defense
2. Go to the "Counters" tab
3. Click "Add a counter"
4. Select the counter monsters
5. Add notes
6. Save

### Using the Calendar

1. Go to "Calendar"
2. Click "Add an event"
3. Select the type (Absence or Other)
4. Choose start and end dates
5. Add an optional note
6. Save

Multi-day events are automatically displayed on multiple lines.

### Map Configuration

1. Go to "Map"
2. Select the mode (Normal or Tournament)
3. Click on a tower to configure it
4. Move and resize towers with the mouse
5. Assign defenses and users
6. Positions are automatically saved

### User Management (admin)

1. Go to "Administration"
2. "Users" section
3. Approve, modify permissions or delete users
4. Configure granular permissions as needed

---

## 🛠️ Technologies Used

### Main Stack

- **[Next.js 14](https://nextjs.org/)** : React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** : Static typing
- **[Prisma](https://www.prisma.io/)** : ORM for the database
- **[SQLite](https://www.sqlite.org/)** : Database
- **[NextAuth.js](https://next-auth.js.org/)** : Authentication
- **[Tailwind CSS](https://tailwindcss.com/)** : Styling
- **[React](https://react.dev/)** : UI library

### Main Dependencies

- `react-draggable` : Drag & drop for the map
- `react-resizable` : Tower resizing
- `react-markdown` : Markdown rendering for notes
- `bcryptjs` : Password hashing

---

## 🔧 Maintenance and Troubleshooting

### View Docker Logs

```bash
# Real-time logs
docker-compose -f docker-compose-prod.yml logs -f

# Last 100 lines of logs
docker-compose -f docker-compose-prod.yml logs --tail=100
```

### Backup Database

```bash
# With named volumes
docker-compose -f docker-compose-prod.yml exec app cp /app/prisma/dev.db /app/prisma/dev.db.backup

# With local volumes
cp prisma/dev.db prisma/dev.db.backup
```

### Restore Database

```bash
# With named volumes
docker-compose -f docker-compose-prod.yml exec app cp /app/prisma/dev.db.backup /app/prisma/dev.db

# With local volumes
cp prisma/dev.db.backup prisma/dev.db
```

### Update Docker Image

```bash
# Stop the container
docker-compose -f docker-compose-prod.yml down

# Download the new image
docker-compose -f docker-compose-prod.yml pull

# Restart
docker-compose -f docker-compose-prod.yml up -d
```

### Restart Application

```bash
docker-compose -f docker-compose-prod.yml restart
```

### Common Issues

#### Application Won't Start

1. Check logs : `docker-compose -f docker-compose-prod.yml logs`
2. Check that the port is not already in use
3. Check that the `.env` file is correctly configured
4. Check volume permissions

#### Permission Error

If you have permission errors with volumes :

```bash
# Adjust permissions (Linux)
sudo chown -R 1001:1001 ./prisma ./public/uploads
```

#### Database Not Created

1. Check that the `prisma_data` volume exists : `docker volume ls`
2. Check logs for migration errors
3. Delete and recreate the volume if necessary

#### Images Not Loading

1. Check that the `data_public` volume exists
2. Check permissions of the `public/uploads` folder
3. Check logs for loading errors

---

## 📞 Support

### GitHub Issues

To report a bug or request a feature, open an issue on GitHub.

### Documentation

Complete documentation is available in the repository.

### Contact

For any questions or support, contact the development team.

---

<div align="center">
  <p>Made with ❤️ for Summoners War guilds</p>
  <p>© 2024 SWGuilds - All rights reserved</p>
</div>

