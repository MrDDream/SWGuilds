import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getMonstersFromCache } from '@/lib/monster-cache'

export const dynamic = 'force-dynamic'

/**
 * Normalise un nom de fichier en supprimant les caractères spéciaux
 */
function normalizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Mappe unit_master_id vers un monstre Swarfarm
 */
function findMonsterByUnitMasterId(unitMasterId: number, monsters: any[]): any | null {
  const monster = monsters.find(m => m.com2us_id === unitMasterId)
  if (monster) return monster
  const fallbackMonster = monsters.find(m => m.id === unitMasterId)
  if (fallbackMonster) return fallbackMonster
  return null
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const monsterName = searchParams.get('monsterName')
    const element = searchParams.get('element')
    const starsParam = searchParams.get('stars')
    const stars = starsParam ? parseInt(starsParam, 10) : null
    const exactMatch = searchParams.get('exactMatch') === 'true'
    
    // Permettre la recherche uniquement par élément et/ou étoiles sans nom de monstre
    if (!monsterName && !element && stars === null) {
      return NextResponse.json(
        { error: 'Au moins un paramètre de recherche est requis (monsterName, element ou stars)' },
        { status: 400 }
      )
    }

    // Récupérer tous les monstres depuis le cache
    const allMonsters = await getMonstersFromCache()
    
    // Trouver les monstres correspondant aux critères
    let matchingMonsters = allMonsters
    
    // Si un nom de monstre est fourni, filtrer par nom
    if (monsterName && monsterName.trim()) {
      const normalizedSearchName = monsterName.toLowerCase().trim()
      if (exactMatch) {
        // Recherche exacte
        matchingMonsters = matchingMonsters.filter(m => 
          m.name.toLowerCase() === normalizedSearchName
        )
      } else {
        // Recherche partielle
        matchingMonsters = matchingMonsters.filter(m => 
          m.name.toLowerCase().includes(normalizedSearchName)
        )
      }
    }

    // Appliquer les filtres élément et étoiles
    if (element) {
      matchingMonsters = matchingMonsters.filter(m => 
        m.element?.toLowerCase() === element.toLowerCase()
      )
    }
    
    if (stars !== null && !isNaN(stars)) {
      matchingMonsters = matchingMonsters.filter(m => {
        const monsterStars = m.natural_stars ?? m.base_stars
        return monsterStars === stars
      })
    }

    if (matchingMonsters.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Utiliser le premier monstre correspondant pour la recherche (ou tous si plusieurs)
    // Si plusieurs monstres correspondent, on les utilisera tous pour la recherche
    const primaryMonster = matchingMonsters[0]

    // Récupérer tous les utilisateurs approuvés
    const allUsers = await prisma.user.findMany({
      where: {
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        identifier: true,
      },
      orderBy: { name: 'asc' },
    })

    const usersWithMonster: Array<{ 
      id: string
      name: string | null
      identifier: string
      count: number
      monsters: any[]
    }> = []

    // Pour chaque utilisateur, compter combien de fois il possède les monstres correspondant aux critères
    for (const user of allUsers) {
      let count = 0
      const monsterCounts: Map<number, number> = new Map() // Map pour compter chaque monstre individuellement
      const userMonstersMap: Map<number, any> = new Map() // Map pour stocker les monstres uniques

      // 1. Compter les monstres manuels
      const manualMonsters = await prisma.userMonster.findMany({
        where: { 
          userId: user.id,
        },
      })
      
      manualMonsters.forEach(m => {
        const matchingMonster = matchingMonsters.find(mm => m.monsterName.toLowerCase() === mm.name.toLowerCase())
        if (matchingMonster) {
          count++
          const currentCount = monsterCounts.get(matchingMonster.id) || 0
          monsterCounts.set(matchingMonster.id, currentCount + 1)
          if (!userMonstersMap.has(matchingMonster.id)) {
            userMonstersMap.set(matchingMonster.id, matchingMonster)
          }
        }
      })

      // 2. Compter dans le fichier JSON uploadé
      const userName = user.name || user.identifier || user.id
      const normalizedName = normalizeFileName(userName)
      const jsonFilePath = join(process.cwd(), 'public', 'uploads', 'json', `${normalizedName}.json`)

      if (existsSync(jsonFilePath)) {
        try {
          const fileContent = readFileSync(jsonFilePath, 'utf-8')
          const jsonData = JSON.parse(fileContent)
          const unitList = jsonData.unit_list || []

          if (Array.isArray(unitList) && unitList.length > 0) {
            // Compter combien de fois les monstres apparaissent dans la liste
            const unitMasterIds = unitList
              .map((unit: any) => unit.unit_master_id)
              .filter((id: any) => id !== null && id !== undefined)

            // Pour chaque unit_master_id, vérifier s'il correspond à un des monstres recherchés
            for (const unitMasterId of unitMasterIds) {
              const monster = findMonsterByUnitMasterId(unitMasterId, allMonsters)
              if (monster && matchingMonsters.some(mm => mm.id === monster.id)) {
                count++
                const currentCount = monsterCounts.get(monster.id) || 0
                monsterCounts.set(monster.id, currentCount + 1)
                if (!userMonstersMap.has(monster.id)) {
                  userMonstersMap.set(monster.id, monster)
                }
              }
            }
          }
        } catch (error) {
          // Ignorer les erreurs de lecture de fichier
          console.error(`Erreur lors de la lecture du fichier JSON pour ${user.name}:`, error)
        }
      }

      if (count > 0) {
        // Créer un tableau avec les monstres répétés selon leur quantité
        const monstersArray: any[] = []
        userMonstersMap.forEach((monster, monsterId) => {
          const quantity = monsterCounts.get(monsterId) || 0
          // Répéter le monstre selon sa quantité
          for (let i = 0; i < quantity; i++) {
            monstersArray.push(monster)
          }
        })

        usersWithMonster.push({
          id: user.id,
          name: user.name,
          identifier: user.identifier,
          count,
          monsters: monstersArray.length > 0 ? monstersArray : (primaryMonster ? [primaryMonster] : []),
        })
      }
    }

    // Trier par ordre alphabétique (nom ou identifiant)
    usersWithMonster.sort((a, b) => {
      const nameA = (a.name || a.identifier).toLowerCase()
      const nameB = (b.name || b.identifier).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json({ users: usersWithMonster })
  } catch (error) {
    console.error('Erreur lors de la recherche des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

