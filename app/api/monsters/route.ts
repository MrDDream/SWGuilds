import { NextRequest, NextResponse } from 'next/server'
import {
  loadMonstersFromFile,
  saveMonstersToFile,
  isCacheExpired,
  SwarfarmMonster,
} from '@/lib/monster-file-cache'
import {
  clearMonstersCache,
  getMonstersCache,
  setMonstersCache,
  isMonstersCacheValid,
  getCacheTimestamp,
} from '@/lib/monsters-api-cache'

// Marquer la route comme dynamique
export const dynamic = 'force-dynamic'

interface SwarfarmResponse {
  count: number
  next: string | null
  previous: string | null
  results: SwarfarmMonster[]
}

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
    if (!forceRefresh && isMonstersCacheValid()) {
      const monstersCache = getMonstersCache()
      if (monstersCache) {
        // Filtrer par recherche si nécessaire
        if (query) {
          const filtered = monstersCache.filter(monster =>
            monster.name.toLowerCase().includes(query)
          )
          return NextResponse.json({ monsters: filtered })
        }
        return NextResponse.json({ monsters: monstersCache })
      }
    }

    // Charger depuis le fichier local en priorité
    let monsters: SwarfarmMonster[] | null = null
    
    if (!forceRefresh) {
      monsters = loadMonstersFromFile()
      
      // Si le fichier existe et n'est pas expiré, l'utiliser directement
      if (monsters && monsters.length > 0 && !isCacheExpired(FILE_CACHE_MAX_AGE)) {
        // Mettre à jour le cache en mémoire
        setMonstersCache(monsters)

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

    // Si le fichier n'existe pas, est vide, ou est expiré, utiliser le fichier local comme fallback (même s'il est expiré)
    // Ne plus télécharger automatiquement depuis l'API - l'utilisateur doit utiliser le bouton de mise à jour manuelle
    if (!monsters || monsters.length === 0) {
      const fallbackMonsters = loadMonstersFromFile()
      if (fallbackMonsters && fallbackMonsters.length > 0) {
        console.log('Utilisation du cache local comme fallback (fichier expiré mais disponible)')
        monsters = fallbackMonsters
      } else {
        // Si aucun fichier local n'existe, retourner un tableau vide
        // L'utilisateur devra utiliser le bouton "Mettre à jour les données depuis SwarFarm" pour télécharger les données
        console.log('Aucune donnée disponible localement. Utilisez le bouton de mise à jour manuelle dans le panneau d\'administration.')
        monsters = []
      }
    }

    // Mettre à jour le cache en mémoire
    if (monsters) {
      setMonstersCache(monsters)
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

