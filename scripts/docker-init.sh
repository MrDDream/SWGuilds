#!/bin/sh
set -e

# Créer les dossiers nécessaires (au cas où les volumes sont vides)
mkdir -p /app/public/uploads/profiles
mkdir -p /app/public/uploads/monsters
mkdir -p /app/public/uploads/json
mkdir -p /app/public/data

# Copier les fichiers par défaut si nécessaire
if [ ! -f /app/public/uploads/map.png ] && [ -d /app/public/uploads_default ]; then
    cp /app/public/uploads_default/*.png /app/public/uploads/ 2>/dev/null || true
fi

# Ajuster les permissions pour les volumes montés
chown -R 1001:1001 /app/public/uploads /app/public/data /app/prisma 2>/dev/null || true
chmod -R 755 /app/public/uploads /app/public/data 2>/dev/null || true
chmod -R 755 /app/prisma 2>/dev/null || true

# Fonction pour exécuter une commande en tant que nextjs
run_as_nextjs() {
    if command -v su-exec >/dev/null 2>&1; then
        su-exec nextjs sh -c "cd /app && $*"
    else
        su -s /bin/sh nextjs -c "cd /app && $*"
    fi
}

# Exécuter les migrations Prisma en tant que nextjs
# Fonction pour exécuter une commande Prisma et masquer l'erreur P3005 si elle apparaît
run_prisma_cmd() {
    local cmd="$1"
    local output
    local exit_code
    
    # Exécuter la commande et capturer la sortie et le code de sortie
    output=$(run_as_nextjs "$cmd" 2>&1) || exit_code=$?
    
    # Filtrer l'erreur P3005 de la sortie (c'est une erreur attendue dans certains cas)
    echo "$output" | grep -v "P3005" | grep -v "The database schema is not empty" || true
    
    # Si le code de sortie est 0 ou si la seule erreur était P3005, considérer comme succès
    if [ -z "$exit_code" ] || [ "$exit_code" -eq 0 ]; then
        return 0
    fi
    
    # Vérifier si l'erreur était uniquement P3005
    if echo "$output" | grep -q "P3005"; then
        # Si c'est la seule erreur, ignorer (c'est attendu)
        if ! echo "$output" | grep -v "P3005" | grep -v "The database schema is not empty" | grep -q "Error"; then
            return 0
        fi
    fi
    
    return $exit_code
}

# Vérifier si la base existe et si elle a déjà des migrations
if [ ! -f /app/prisma/dev.db ]; then
    echo "Base de données inexistante, création avec db push..."
    if ! run_prisma_cmd "npx prisma db push --accept-data-loss"; then
        echo "Tentative avec migrate deploy..."
        run_prisma_cmd "npx prisma migrate deploy" || {
            echo "ERREUR: Impossible d'appliquer les migrations Prisma"
            exit 1
        }
    fi
else
    echo "Application des migrations Prisma..."
    # Essayer migrate deploy d'abord (recommandé pour les bases existantes)
    if ! run_prisma_cmd "npx prisma migrate deploy"; then
        echo "Avertissement: migrate deploy a échoué, tentative avec db push..."
        run_prisma_cmd "npx prisma db push --accept-data-loss" || {
            echo "ERREUR: Impossible d'appliquer les migrations Prisma"
            exit 1
        }
    fi
fi

# Créer l'admin si nécessaire en tant que nextjs
run_as_nextjs "npx tsx scripts/create-admin.ts" || true

# Démarrer le cron de rappels en arrière-plan en tant que nextjs
run_as_nextjs "node scripts/reminder-cron.js" &

# Passer à l'utilisateur nextjs et exécuter la commande principale
# Utiliser su avec shell non-interactif si su-exec n'est pas disponible
if command -v su-exec >/dev/null 2>&1; then
    exec su-exec nextjs "$@"
else
    # Utiliser su avec -c pour exécuter la commande
    exec su -s /bin/sh nextjs -c "cd /app && exec \"\$@\"" -- "$@"
fi

