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

/**
 * Vide le cache en mémoire pour forcer un rechargement
 */
export function clearCache(): void {
  cache = null
}

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
    
    // Côté client : toujours essayer de charger le fichier (ne plus utiliser fileLoadAttempted)
    // car plusieurs composants peuvent appeler cette fonction en parallèle
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
        // On retournera un tableau vide et getMonstersFromCache() essaiera l'API
      } else {
        console.warn(`Erreur lors du chargement de monsters.json: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      // Erreur réseau ou autre, retourner un tableau vide
      // getMonstersFromCache() essaiera l'API en fallback
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
  const normalizedName = normalizeFileName(monsterName).toLowerCase()
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
  // Utiliser une clé composite "nom|id" pour identifier de manière unique chaque variante
  monsters.forEach((monster: Monster) => {
    const key = `${monster.name}|${monster.id}`
    images[key] = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
    // Garder aussi la clé par nom seul pour compatibilité avec les anciennes données
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
  
  // Si le fichier est vide ou n'existe pas, essayer de charger depuis l'API
  // Cela permet de fonctionner même si le fichier n'a pas encore été téléchargé
  if (!monsters || monsters.length === 0) {
    // Côté client : utiliser l'API qui peut retourner les données même si le fichier n'existe pas
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/monsters?refresh=false', {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          monsters = data.monsters || []
        }
      } catch (error) {
        // Ignorer les erreurs silencieusement
        monsters = []
      }
    } else {
      // Côté serveur : retourner un tableau vide (le fichier doit être téléchargé d'abord)
      monsters = []
    }
  }

  // Initialiser le cache
  cache = initializeCache(monsters)
  
  return monsters
}

export function getMonsterImage(nameOrKey: string): string | null {
  if (!cache) return null
  // Essayer d'abord avec la clé exacte (peut être "nom|id" ou "nom")
  if (cache.images[nameOrKey]) {
    return cache.images[nameOrKey]
  }
  // Si c'est une clé composite, essayer de trouver par nom seul (pour compatibilité)
  if (nameOrKey.includes('|')) {
    const [name] = nameOrKey.split('|')
    return cache.images[name] || null
  }
  return null
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
 * @param monsterNameOrKey Le nom du monstre ou la clé composite "nom|id"
 * @param localUrl L'URL locale de l'image
 */
export async function updateMonsterImageCache(monsterNameOrKey: string, localUrl: string): Promise<void> {
  // S'assurer que le cache est initialisé
  if (!cache) {
    await getMonstersFromCache()
  }
  
  // Mettre à jour le cache avec l'URL locale
  if (cache) {
    cache.images[monsterNameOrKey] = localUrl
    // Si c'est une clé composite, mettre à jour aussi avec le nom seul pour compatibilité
    if (monsterNameOrKey.includes('|')) {
      const [name] = monsterNameOrKey.split('|')
      cache.images[name] = localUrl
    }
  }
}

// Fonction pour précharger les images des monstres spécifiés
// Accepte soit des noms simples, soit des clés composites "nom|id"
export async function preloadMonsterImages(monsterNamesOrKeys: string[]): Promise<Record<string, string>> {
  const monsters = await getMonstersFromCache()
  const images: Record<string, string> = {}
  
  // Assigner les URLs (locales en priorité, Swarfarm en fallback)
  for (const monsterNameOrKey of monsterNamesOrKeys) {
    // Extraire le nom et l'ID si c'est une clé composite
    let monsterName: string
    let monsterId: number | undefined
    if (monsterNameOrKey.includes('|')) {
      const [name, idStr] = monsterNameOrKey.split('|')
      monsterName = name
      monsterId = parseInt(idStr, 10)
    } else {
      monsterName = monsterNameOrKey
    }
    
    // Trouver le monstre correspondant (avec l'ID si disponible pour être précis)
    const monster = monsters.find(m => {
      if (monsterId !== undefined) {
        return m.name === monsterName && m.id === monsterId
      }
      return m.name === monsterName
    })
    
    if (!monster) continue
    
    // Construire le nom de fichier local basé sur le nom normalisé et l'extension de l'image_filename
    const normalizedName = normalizeFileName(monster.name).toLowerCase()
    const fileExtension = monster.image_filename.split('.').pop() || 'png'
    const monsterFileName = `${normalizedName}.${fileExtension}`
    const localPath = `/uploads/monsters/${monsterFileName}`
    const swarfarmUrl = `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`
    
    // Priorité aux images locales
    let imageUrl: string
    if (typeof window === 'undefined') {
      // Côté serveur : vérifier si l'image existe localement
      const localUrl = await checkLocalImageExists(monster.name, monster.image_filename)
      imageUrl = localUrl || swarfarmUrl
    } else {
      // Côté client : vérifier dans le cache si on sait déjà que l'image existe localement
      // Sinon, utiliser l'image locale en priorité (le navigateur gérera le fallback via onError)
      // On évite les requêtes HEAD qui génèrent des erreurs 404 dans la console
      if (cache?.images && cache.images[monsterNameOrKey]?.startsWith('/uploads/')) {
        // Si on a déjà une URL locale dans le cache, l'utiliser
        imageUrl = cache.images[monsterNameOrKey]
      } else {
        // Sinon, essayer l'image locale (le composant gérera le fallback vers Swarfarm si nécessaire)
        imageUrl = localPath
      }
    }
    
    // Utiliser la clé originale (composite ou simple) pour stocker l'image (locale en priorité)
    images[monsterNameOrKey] = imageUrl
    
    // Stocker aussi avec la clé composite si ce n'était pas déjà une clé composite
    if (!monsterNameOrKey.includes('|')) {
      const compositeKey = `${monster.name}|${monster.id}`
      images[compositeKey] = imageUrl
    }
    
    // Stocker aussi l'URL Swarfarm pour le fallback dans les gestionnaires d'erreur
    // Utiliser une clé spéciale pour le fallback Swarfarm
    const swarfarmKey = `${monsterNameOrKey}_swarfarm`
    images[swarfarmKey] = swarfarmUrl
    // Stocker aussi avec le nom simple pour compatibilité
    const swarfarmKeySimple = `${monster.name}_swarfarm`
    images[swarfarmKeySimple] = swarfarmUrl
    
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
  
  // Mettre à jour le cache avec les URLs (locales en priorité)
  if (cache) {
    cache.images = { ...cache.images, ...images }
  }
  
  return images
}
