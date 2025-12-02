import { NextRequest, NextResponse } from 'next/server'
import {
  loadMonstersFromFile,
  saveMonstersToFile,
  isCacheExpired,
  SwarfarmMonster,
} from '@/lib/monster-file-cache'

// Marquer la route comme dynamique
export const dynamic = 'force-dynamic'

interface SwarfarmResponse {
  count: number
  next: string | null
  previous: string | null
  results: SwarfarmMonster[]
}

// Cache en mémoire comme couche supplémentaire pour les performances
let monstersCache: SwarfarmMonster[] | null = null
let cacheTimestamp: number = 0
const MEMORY_CACHE_DURATION = 1000 * 60 * 60 // 1 heure

// Durée maximale du cache de fichier (180 jours)
const FILE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 180

async function fetchAllMonsters(): Promise<SwarfarmMonster[]> {
  const allMonsters: SwarfarmMonster[] = []
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

      const data: SwarfarmResponse = await response.json()
      allMonsters.push(...data.results)
      nextUrl = data.next
    } catch (error) {
      console.error('Erreur lors de la récupération des monstres:', error)
      break
    }
  }

  return allMonsters
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase() || ''
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Vérifier le cache en mémoire d'abord (pour les performances)
    const now = Date.now()
    if (
      !forceRefresh &&
      monstersCache &&
      (now - cacheTimestamp) < MEMORY_CACHE_DURATION
    ) {
      // Filtrer par recherche si nécessaire
      if (query) {
        const filtered = monstersCache.filter(monster =>
          monster.name.toLowerCase().includes(query)
        )
        return NextResponse.json({ monsters: filtered })
      }
      return NextResponse.json({ monsters: monstersCache })
    }

    // Charger depuis le fichier local en priorité
    let monsters: SwarfarmMonster[] | null = null
    
    if (!forceRefresh) {
      monsters = loadMonstersFromFile()
      
      // Si le fichier existe et n'est pas expiré, l'utiliser directement
      if (monsters && monsters.length > 0 && !isCacheExpired(FILE_CACHE_MAX_AGE)) {
        // Mettre à jour le cache en mémoire
        monstersCache = monsters
        cacheTimestamp = now

        // Filtrer par recherche si nécessaire
        if (query) {
          const filtered = monsters.filter(monster =>
            monster.name.toLowerCase().includes(query)
          )
          return NextResponse.json({ monsters: filtered })
        }
        return NextResponse.json({ monsters })
      }
    }

    // Si le fichier n'existe pas, est vide, ou est expiré, essayer l'API Swarfarm
    let apiMonsters: SwarfarmMonster[] = []
    let apiSuccess = false

    try {
      apiMonsters = await fetchAllMonsters()
      if (apiMonsters && apiMonsters.length > 0) {
        apiSuccess = true
        // Sauvegarder dans le fichier local après un appel réussi
        saveMonstersToFile(apiMonsters)
        monsters = apiMonsters
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel à l\'API Swarfarm:', error)
      apiSuccess = false
    }

    // Si l'API a échoué, utiliser le fichier local comme fallback (même s'il est expiré)
    if (!apiSuccess) {
      const fallbackMonsters = loadMonstersFromFile()
      if (fallbackMonsters && fallbackMonsters.length > 0) {
        console.log('Utilisation du cache local comme fallback (API en panne)')
        monsters = fallbackMonsters
      } else {
        // Si aucun fichier local n'existe et l'API échoue, retourner un tableau vide
        console.warn('Aucune donnée disponible: ni fichier local ni API')
        monsters = []
      }
    }

    // Mettre à jour le cache en mémoire
    if (monsters) {
      monstersCache = monsters
      cacheTimestamp = now
    }

    // Filtrer par recherche si nécessaire
    if (query && monsters) {
      const filtered = monsters.filter(monster =>
        monster.name.toLowerCase().includes(query)
      )
      return NextResponse.json({ monsters: filtered })
    }

    return NextResponse.json({ monsters: monsters || [] })
  } catch (error) {
    console.error('Erreur lors de la récupération des monstres:', error)
    
    // En cas d'erreur, essayer quand même de retourner le cache local
    const fallbackMonsters = loadMonstersFromFile()
    if (fallbackMonsters && fallbackMonsters.length > 0) {
      console.log('Utilisation du cache local après erreur')
      return NextResponse.json({ monsters: fallbackMonsters })
    }

    return NextResponse.json(
      { error: 'Erreur lors de la récupération des monstres', monsters: [] },
      { status: 500 }
    )
  }
}

