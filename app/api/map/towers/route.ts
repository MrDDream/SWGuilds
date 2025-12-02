import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditMap, getUserWithPermissions } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const mapName = searchParams.get('mapName') || 'map.png'

    const towers = await prisma.mapTower.findMany({
      where: {
        mapName,
      },
      orderBy: {
        towerNumber: 'asc',
      },
    })

    return NextResponse.json(towers)
  } catch (error) {
    console.error('Erreur lors de la récupération des tours:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const user = await getUserWithPermissions(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (!canEditMap(user)) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous n\'avez pas la permission de modifier la carte.' },
        { status: 403 }
      )
    }
    const body = await request.json()
    const {
      mapName,
      towerNumber,
      name,
      stars,
      color,
      x,
      y,
      width,
      height,
      defenseIds,
    } = body

    if (!mapName || towerNumber === undefined || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: 'mapName, towerNumber, x et y sont requis' },
        { status: 400 }
      )
    }

    // Valider defenseIds si fourni
    if (defenseIds !== undefined) {
      const idsArray = Array.isArray(defenseIds) ? defenseIds : JSON.parse(defenseIds || '[]')
      if (idsArray.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 défenses par tour' },
          { status: 400 }
        )
      }
      // Valider le format : doit être un array d'objets { defenseId: string, userId: string }
      for (const item of idsArray) {
        if (typeof item !== 'object' || item === null) {
          return NextResponse.json(
            { error: 'Format invalide: defenseIds doit être un array d\'objets { defenseId, userId }' },
            { status: 400 }
          )
        }
        if (!item.defenseId || typeof item.defenseId !== 'string') {
          return NextResponse.json(
            { error: 'Format invalide: chaque élément doit avoir un defenseId (string)' },
            { status: 400 }
          )
        }
        if (item.userId !== undefined && typeof item.userId !== 'string') {
          return NextResponse.json(
            { error: 'Format invalide: userId doit être une string ou undefined' },
            { status: 400 }
          )
        }
      }
    }

    const tower = await prisma.mapTower.create({
      data: {
        mapName,
        towerNumber,
        name: name || null,
        stars: stars || 5,
        color: color || 'blue',
        x,
        y,
        width: width || 150,
        height: height || 100,
        defenseIds: defenseIds ? JSON.stringify(defenseIds) : '[]',
        createdBy: session.user.id,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'map_tower',
        entityId: tower.id,
        details: JSON.stringify({
          mapName,
          towerNumber,
          name: tower.name,
          stars: tower.stars,
        }),
      },
    })

    return NextResponse.json(tower)
  } catch (error) {
    console.error('Erreur lors de la création de la tour:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

