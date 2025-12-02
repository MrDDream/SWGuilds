import { join } from 'path'

interface Monster {
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

interface MonsterCache {
  monsters: Monster[]
  images: Record<string, string>
}

let cache: MonsterCache | null = null
let fileLoadAttempted = false // Track si on a déjà tenté de charger le fichier côté client

async function loadMonstersFromFile(): Promise<Monster[]> {
  try {
    // Côté serveur : lire directement le fichier
    if (typeof window === 'undefined') {
      try {
        const { readFileSync } = await import('fs')
        const { existsSync } = await import('fs')
        const filePath = join(process.cwd(), 'public', 'data', 'monsters.json')
        if (existsSync(filePath)) {
          const fileContent = readFileSync(filePath, 'utf-8')
          const data = JSON.parse(fileContent)
          
          // Support de l'ancien format (tableau direct)
          if (Array.isArray(data) && data.length > 0) {
            return data
          }
          
          // Support du nouveau format avec métadonnées
          if (data && typeof data === 'object' && Array.isArray(data.monsters) && data.monsters.length > 0) {
            return data.monsters
          }
        }
      } catch (error) {
        // Ignorer les erreurs côté serveur
      }
      return []
    }
    
    // Côté client : utiliser fetch uniquement si on n'a pas encore tenté
    if (fileLoadAttempted) {
      // On a déjà tenté de charger le fichier, ne plus faire de requête
      return []
    }
    
    // Marquer qu'on a tenté de charger le fichier
    fileLoadAttempted = true
    
    try {
      const response = await fetch('/data/monsters.json', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Support de l'ancien format (tableau direct)
        if (Array.isArray(data) && data.length > 0) {
          return data
        }
        
        // Support du nouveau format avec métadonnées
        if (data && typeof data === 'object' && Array.isArray(data.monsters) && data.monsters.length > 0) {
          return data.monsters
        }
      } else if (response.status === 404) {
        // Le fichier n'existe pas encore, c'est normal au premier démarrage
        // Pas de log nécessaire, le fallback vers l'API se fera automatiquement
      } else {
        console.warn(`Erreur lors du chargement de monsters.json: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      // Erreur réseau ou autre, on laissera le fallback vers l'API se faire
      // Ne pas logger pour éviter le spam dans la console
    }
  } catch (error) {
    console.error('Erreur lors du chargement du fichier monsters.json:', error)
  }
  return []
}

async function loadMonstersFromAPI(): Promise<Monster[]> {
  try {
    // Côté serveur : utiliser directement la fonction Swarfarm
    if (typeof window === 'undefined') {
      return await fetchAllMonstersFromSwarfarm()
    }
    
    // Côté client : utiliser fetch
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/monsters`)
    if (response.ok) {
      const data = await response.json()
      return data.monsters || []
    }
  } catch (error) {
    console.error('Erreur lors du chargement depuis l\'API:', error)
  }
  return []
}

async function fetchAllMonstersFromSwarfarm(): Promise<Monster[]> {
  const allMonsters: Monster[] = []
  let nextUrl: string | null = 'https://swarfarm.com/api/v2/monsters/'

  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`Erreur lors de la récupération des monstres: ${response.status}`)
        break
      }

      const data: any = await response.json()
      allMonsters.push(...data.results.map((m: any) => {
        // Construire bestiary_slug si non disponible dans l'API
        const bestiarySlug = m.bestiary_slug || `${m.id}-${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
        return {
          id: m.id,
          name: m.name,
          image_filename: m.image_filename,
          element: m.element,
          base_stars: m.base_stars,
          natural_stars: m.natural_stars,
          com2us_id: m.com2us_id,
          is_second_awakened: m.is_second_awakened || m.awaken_level === 2 || false,
          awaken_level: m.awaken_level,
          bestiary_slug: bestiarySlug,
        }
      }))
      nextUrl = data.next
    } catch (error) {
      console.error('Erreur lors de la récupération des monstres:', error)
      break
    }
  }

  return allMonsters
}

/**
 * Normalise un nom de fichier en supprimant les caractères spéciaux
 */
function normalizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplacer les caractères spéciaux par _
    .replace(/_+/g, '_') // Remplacer les _ multiples par un seul
    .replace(/^_|_$/g, '') // Supprimer les _ en début et fin
}

/**
 * Vérifie si une image existe localement
 */
async function checkLocalImageExists(monsterName: string, imageFilename: string): Promise<string | null> {
  const normalizedName = normalizeFileName(monsterName)
  const fileExtension = imageFilename.split('.').pop() || 'png'
  const monsterFileName = `${normalizedName}.${fileExtension}`
  const localUrl = `/uploads/monsters/${monsterFileName}`
  
  // Côté serveur : vérifier directement avec fs
  if (typeof window === 'undefined') {
    try {
      const { existsSync } = await import('fs')
      const { join } = await import('path')
      const localPath = join(process.cwd(), 'public', 'uploads', 'monsters', monsterFileName)
      if (existsSync(localPath)) {
        return localUrl
      }
    } catch (error) {
      // Ignorer les erreurs
    }
    return null
  }
  
  // Côté client : utiliser l'API pour vérifier
  // Pour l'instant, on retourne null et on laissera preloadMonsterImages gérer la vérification en batch
  return null
}

/**
 * Vérifie quelles images existent localement pour une liste de monstres (côté client)
 */
async function checkLocalImagesBatch(monsterNames: string[]): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {}
  }
  
  try {
    const response = await fetch(`/api/monsters/images?monsters=${monsterNames.join(',')}`)
    if (response.ok) {
      const data = await response.json()
      return data.availableImages || {}
    }
  } catch (error) {
    // Ignorer les erreurs
  }
  
  return {}
}

function initializeCache(monsters: Monster[]): MonsterCache {
  const images: Record<string, string> = {}
  
  // Initialiser avec Swarfarm par défaut (sera mis à jour lors du preload)
  monsters.forEach((monster: Monster) => {
    images[monster.name] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
  })
  
  return {
    monsters,
    images
  }
}

export async function getMonstersFromCache(): Promise<Monster[]> {
  if (cache) {
    return cache.monsters
  }

  // Essayer de charger depuis le fichier local d'abord
  let monsters = await loadMonstersFromFile()
  
  // Si le fichier est vide ou n'existe pas, charger depuis l'API
  if (!monsters || monsters.length === 0) {
    monsters = await loadMonstersFromAPI()
  }

  // Initialiser le cache
  cache = initializeCache(monsters)
  
  return monsters
}

export function getMonsterImage(name: string): string | null {
  if (!cache) return null
  return cache.images[name] || null
}

export function getMonsterImageUrl(name: string): string {
  const cached = getMonsterImage(name)
  if (cached) return cached
  
  // Si pas dans le cache, retourner une URL par défaut (sera mise à jour quand le cache sera chargé)
  return ''
}

export function getAllMonsterImages(): Record<string, string> {
  return cache?.images || {}
}

/**
 * Met à jour le cache en mémoire avec une URL locale pour un monstre
 * @param monsterName Le nom du monstre
 * @param localUrl L'URL locale de l'image
 */
export async function updateMonsterImageCache(monsterName: string, localUrl: string): Promise<void> {
  // S'assurer que le cache est initialisé
  if (!cache) {
    await getMonstersFromCache()
  }
  
  // Mettre à jour le cache avec l'URL locale
  if (cache) {
    cache.images[monsterName] = localUrl
  }
}

// Fonction pour précharger les images des monstres spécifiés
export async function preloadMonsterImages(monsterNames: string[]): Promise<Record<string, string>> {
  const monsters = await getMonstersFromCache()
  const images: Record<string, string> = {}
  
  // Vérifier d'abord les images locales en batch (plus efficace)
  let localImages: Record<string, string> = {}
  
  if (typeof window !== 'undefined') {
    // Côté client : vérifier en batch via l'API
    localImages = await checkLocalImagesBatch(monsterNames)
  } else {
    // Côté serveur : vérifier une par une
    for (const monsterName of monsterNames) {
      const monster = monsters.find(m => m.name === monsterName)
      if (!monster) continue
      
      const localUrl = await checkLocalImageExists(monsterName, monster.image_filename)
      if (localUrl) {
        localImages[monsterName] = localUrl
      }
    }
  }
  
  // Assigner les URLs (locales en priorité, Swarfarm en fallback)
  monsterNames.forEach((monsterName) => {
    const monster = monsters.find(m => m.name === monsterName)
    if (!monster) return
    
    // Utiliser l'image locale si disponible, sinon Swarfarm
    if (localImages[monsterName]) {
      images[monsterName] = localImages[monsterName]
    } else {
      const swarfarmUrl = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
      images[monsterName] = swarfarmUrl
      
      // Télécharger l'image localement en arrière-plan (sans bloquer)
      if (typeof window !== 'undefined') {
        fetch('/api/monsters/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageFilename: monster.image_filename }),
        }).catch(() => {
          // Ignorer les erreurs de téléchargement en arrière-plan
        })
      }
    }
  })
  
  // Mettre à jour le cache avec les URLs (locales en priorité)
  if (cache) {
    cache.images = { ...cache.images, ...images }
  }
  
  return images
}
