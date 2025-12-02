import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface SwarfarmMonster {
  id: number
  name: string
  image_filename: string
  element?: string
  base_stars?: number
  natural_stars?: number
  com2us_id?: number
  is_second_awakened?: boolean
  awaken_level?: number
  bestiary_slug?: string
}

interface MonsterFileCache {
  lastUpdated: string
  monsters: SwarfarmMonster[]
}

const CACHE_FILE_PATH = join(process.cwd(), 'public', 'data', 'monsters.json')
const DEFAULT_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 180 // 180 jours en millisecondes

/**
 * Charge les monstres depuis le fichier de cache local
 * @returns Les monstres chargés ou null si le fichier n'existe pas ou est invalide
 */
export function loadMonstersFromFile(): SwarfarmMonster[] | null {
  try {
    if (!existsSync(CACHE_FILE_PATH)) {
      return null
    }

    const fileContent = readFileSync(CACHE_FILE_PATH, 'utf-8')
    const data = JSON.parse(fileContent)

    // Support de l'ancien format (tableau direct)
    if (Array.isArray(data)) {
      if (data.length > 0) {
        return data
      }
      return null
    }

    // Nouveau format avec métadonnées
    if (data && typeof data === 'object' && Array.isArray(data.monsters)) {
      if (data.monsters.length > 0) {
        return data.monsters
      }
      return null
    }

    return null
  } catch (error) {
    console.error('Erreur lors du chargement du fichier de cache:', error)
    return null
  }
}

/**
 * Sauvegarde les monstres dans le fichier de cache avec un timestamp
 * @param monsters Les monstres à sauvegarder
 */
export function saveMonstersToFile(monsters: SwarfarmMonster[]): void {
  try {
    // Créer le dossier s'il n'existe pas
    const dataDir = join(process.cwd(), 'public', 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    const cacheData: MonsterFileCache = {
      lastUpdated: new Date().toISOString(),
      monsters,
    }

    writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2), 'utf-8')
    console.log(`Cache sauvegardé: ${monsters.length} monstres dans ${CACHE_FILE_PATH}`)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du cache:', error)
    throw error
  }
}

/**
 * Retourne l'âge du cache en millisecondes
 * @returns L'âge du cache en ms, ou null si le fichier n'existe pas ou est invalide
 */
export function getFileCacheAge(): number | null {
  try {
    if (!existsSync(CACHE_FILE_PATH)) {
      return null
    }

    const fileContent = readFileSync(CACHE_FILE_PATH, 'utf-8')
    const data = JSON.parse(fileContent)

    // Ancien format (pas de timestamp)
    if (Array.isArray(data)) {
      // Utiliser la date de modification du fichier comme fallback
      const { statSync } = require('fs')
      const stats = statSync(CACHE_FILE_PATH)
      return Date.now() - stats.mtimeMs
    }

    // Nouveau format avec métadonnées
    if (data && typeof data === 'object' && data.lastUpdated) {
      const lastUpdated = new Date(data.lastUpdated).getTime()
      return Date.now() - lastUpdated
    }

    return null
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'âge du cache:', error)
    return null
  }
}

/**
 * Vérifie si le cache est expiré
 * @param maxAge Durée maximale en millisecondes (défaut: 180 jours)
 * @returns true si le cache est expiré ou n'existe pas, false sinon
 */
export function isCacheExpired(maxAge: number = DEFAULT_CACHE_MAX_AGE): boolean {
  const age = getFileCacheAge()
  
  // Si le fichier n'existe pas ou l'âge ne peut pas être déterminé, considérer comme expiré
  if (age === null) {
    return true
  }

  return age > maxAge
}

/**
 * Retourne la date de dernière mise à jour du cache
 * @returns La date ISO string ou null si non disponible
 */
export function getCacheLastUpdated(): string | null {
  try {
    if (!existsSync(CACHE_FILE_PATH)) {
      return null
    }

    const fileContent = readFileSync(CACHE_FILE_PATH, 'utf-8')
    const data = JSON.parse(fileContent)

    // Ancien format
    if (Array.isArray(data)) {
      const { statSync } = require('fs')
      const stats = statSync(CACHE_FILE_PATH)
      return new Date(stats.mtime).toISOString()
    }

    // Nouveau format
    if (data && typeof data === 'object' && data.lastUpdated) {
      return data.lastUpdated
    }

    return null
  } catch (error) {
    console.error('Erreur lors de la récupération de la date de mise à jour:', error)
    return null
  }
}

