import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
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
 */
function findMonsterByUnitMasterId(unitMasterId: number, monsters: any[]): any | null {
  const monster = monsters.find(m => m.com2us_id === unitMasterId)
  if (monster) return monster
  const fallbackMonster = monsters.find(m => m.id === unitMasterId)
  if (fallbackMonster) return fallbackMonster
  return null
}

/**
 * Vérifie si un utilisateur possède un monstre spécifique
 */
async function userHasMonster(userId: string, monsterName: string, allMonsters: any[]): Promise<boolean> {
  const normalizedMonsterName = monsterName.toLowerCase().trim()
  
  // 1. Vérifier les monstres manuels
  const manualMonsters = await prisma.userMonster.findMany({
    where: { userId },
  })
  
  const hasManualMonster = manualMonsters.some(m => 
    m.monsterName.toLowerCase() === normalizedMonsterName
  )
  
  if (hasManualMonster) return true
  
  // 2. Vérifier le fichier JSON uploadé
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, identifier: true },
  })
  
  if (!user) return false
  
  const userName = user.name || user.identifier || userId
  const normalizedName = normalizeFileName(userName)
  const jsonFilePath = join(process.cwd(), 'public', 'uploads', 'json', `${normalizedName}.json`)
  
  if (existsSync(jsonFilePath)) {
    try {
      const fileContent = readFileSync(jsonFilePath, 'utf-8')
      const jsonData = JSON.parse(fileContent)
      const unitList = jsonData.unit_list || []
      
      if (Array.isArray(unitList) && unitList.length > 0) {
        const unitMasterIds = unitList
          .map((unit: any) => unit.unit_master_id)
          .filter((id: any) => id !== null && id !== undefined)
        
        // Vérifier si l'un des unit_master_id correspond au monstre recherché
        for (const unitMasterId of unitMasterIds) {
          const monster = findMonsterByUnitMasterId(unitMasterId, allMonsters)
          if (monster && monster.name.toLowerCase() === normalizedMonsterName) {
            return true
          }
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la lecture du fichier JSON pour ${user.name}:`, error)
    }
  }
  
  return false
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const defenseId = searchParams.get('defenseId')
    
    if (!defenseId) {
      return NextResponse.json(
        { error: 'Le paramètre defenseId est requis' },
        { status: 400 }
      )
    }
    
    // Récupérer la défense
    const defense = await prisma.defense.findUnique({
      where: { id: defenseId },
    })
    
    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }
    
    // Récupérer tous les monstres depuis le cache
    const allMonsters = await getMonstersFromCache()
    
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
    
    const eligibleUsers: Array<{
      id: string
      name: string | null
      identifier: string
    }> = []
    
    // Pour chaque utilisateur, vérifier s'il possède les 3 monstres
    for (const user of allUsers) {
      const hasLeader = await userHasMonster(user.id, defense.leaderMonster, allMonsters)
      const hasMonster2 = await userHasMonster(user.id, defense.monster2, allMonsters)
      const hasMonster3 = await userHasMonster(user.id, defense.monster3, allMonsters)
      
      if (hasLeader && hasMonster2 && hasMonster3) {
        eligibleUsers.push({
          id: user.id,
          name: user.name,
          identifier: user.identifier,
        })
      }
    }
    
    // Trier par ordre alphabétique (nom ou identifiant)
    eligibleUsers.sort((a, b) => {
      const nameA = (a.name || a.identifier).toLowerCase()
      const nameB = (b.name || b.identifier).toLowerCase()
      return nameA.localeCompare(nameB)
    })
    
    return NextResponse.json({ users: eligibleUsers })
  } catch (error) {
    console.error('Erreur lors de la vérification des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

