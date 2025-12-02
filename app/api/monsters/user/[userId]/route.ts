import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getMonstersFromCache } from '@/lib/monster-cache'

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
 * Utilise com2us_id qui correspond directement à unit_master_id dans l'API Swarfarm
 */
function findMonsterByUnitMasterId(unitMasterId: number, monsters: any[]): any | null {
  // Rechercher directement par com2us_id qui correspond à unit_master_id
  const monster = monsters.find(m => m.com2us_id === unitMasterId)
  if (monster) return monster

  // Fallback: si com2us_id n'est pas disponible, essayer par ID direct
  // (au cas où certains monstres n'auraient pas com2us_id)
  const fallbackMonster = monsters.find(m => m.id === unitMasterId)
  if (fallbackMonster) return fallbackMonster

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAuth()
    const { userId } = await params

    // Vérifier que l'utilisateur peut accéder à ces données (soi-même ou admin)
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, identifier: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Normaliser le nom pour trouver le fichier JSON
    const userName = user.name || user.identifier || userId
    const normalizedName = normalizeFileName(userName)
    const jsonFilePath = join(process.cwd(), 'public', 'uploads', 'json', `${normalizedName}.json`)

    // Vérifier si le fichier existe
    if (!existsSync(jsonFilePath)) {
      return NextResponse.json(
        { error: 'Fichier JSON non trouvé pour cet utilisateur', monsters: [] },
        { status: 404 }
      )
    }

    // Lire et parser le fichier JSON
    let jsonData: any
    try {
      const fileContent = readFileSync(jsonFilePath, 'utf-8')
      jsonData = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la lecture du fichier JSON', monsters: [] },
        { status: 500 }
      )
    }

    // Extraire unit_list
    const unitList = jsonData.unit_list || []
    if (!Array.isArray(unitList) || unitList.length === 0) {
      return NextResponse.json({ monsters: [] })
    }

    // Récupérer les unit_master_id uniques avec leurs classes pour le debug
    // Filtrer uniquement les monstres 6* (class === 6)
    const unitData = unitList
      .map((unit: any) => ({
        unit_master_id: unit.unit_master_id,
        class: unit.class,
      }))
      .filter((u: any) => 
        u.unit_master_id != null && 
        u.class === 6
      )

    // Ne pas dédupliquer pour permettre l'affichage de tous les doublons
    const unitMasterIds = unitData.map((u: any) => u.unit_master_id) as number[]

    console.log(`[Monsters API] Found ${unitMasterIds.length} unique unit_master_ids for user ${userId}`)
    console.log(`[Monsters API] Sample unit_master_ids with class:`, unitData.slice(0, 10))

    // Charger tous les monstres depuis le cache
    const allMonsters = await getMonstersFromCache()
    console.log(`[Monsters API] Loaded ${allMonsters.length} monsters from cache`)
    console.log(`[Monsters API] Sample monster IDs:`, allMonsters.slice(0, 10).map(m => m.id))

    // Mapper les unit_master_id aux monstres (permettre les doublons)
    const userMonsters = unitMasterIds
      .map((unitMasterId, index) => {
        const monster = findMonsterByUnitMasterId(unitMasterId, allMonsters)
        if (!monster) {
          console.log(`[Monsters API] No match found for unit_master_id: ${unitMasterId}`)
        }
        return monster ? { 
          ...monster, 
          unitMasterId,
          // Ajouter un index unique pour permettre les doublons dans la clé
          duplicateIndex: index,
          // S'assurer que les champs de double éveil sont inclus
          is_second_awakened: monster.is_second_awakened || monster.awaken_level === 2 || false,
          awaken_level: monster.awaken_level,
        } : null
      })
      .filter((m): m is any => m !== null)

    console.log(`[Monsters API] Mapped ${userMonsters.length} monsters out of ${unitMasterIds.length} unit_master_ids`)

    // Récupérer les monstres manuels de l'utilisateur
    const manualMonsters = await prisma.userMonster.findMany({
      where: { userId },
      select: { monsterName: true },
    })

    // Charger les informations complètes des monstres manuels
    const manualMonsterNames = manualMonsters.map(m => m.monsterName)
    const manualMonsterData = allMonsters
      .filter(m => manualMonsterNames.includes(m.name))
      .map(m => ({ 
        ...m, 
        isManual: true,
        // S'assurer que les champs de double éveil sont inclus
        is_second_awakened: m.is_second_awakened || m.awaken_level === 2 || false,
        awaken_level: m.awaken_level,
      }))

    // Combiner les monstres du JSON et les monstres manuels
    // Permettre les doublons - si un monstre apparaît plusieurs fois, l'afficher plusieurs fois
    const allUserMonsters = [...userMonsters, ...manualMonsterData]

    // Trier par élément puis par ID (ordre: Water -> Fire -> Wind -> Light -> Dark)
    const elementOrder: Record<string, number> = {
      'water': 1,
      'fire': 2,
      'wind': 3,
      'light': 4,
      'dark': 5,
    }

    allUserMonsters.sort((a, b) => {
      const elementA = elementOrder[a.element || ''] || 99
      const elementB = elementOrder[b.element || ''] || 99
      if (elementA !== elementB) {
        return elementA - elementB
      }
      // Trier par com2us_id si disponible, sinon par id
      const idA = a.com2us_id || a.id || 0
      const idB = b.com2us_id || b.id || 0
      return idA - idB
    })

    return NextResponse.json({ monsters: allUserMonsters })
  } catch (error) {
    console.error('Erreur lors de la récupération des monstres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', monsters: [] },
      { status: 500 }
    )
  }
}

