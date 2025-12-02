import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { canEditMap, getUserWithPermissions } from '@/lib/permissions'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
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

    const existingTower = await prisma.mapTower.findUnique({
      where: { id },
    })

    if (!existingTower) {
      return NextResponse.json(
        { error: 'Tour non trouvée' },
        { status: 404 }
      )
    }

    // Valider que defenseIds ne dépasse pas 5 et a le bon format
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

    const updatedTower = await prisma.mapTower.update({
      where: { id },
      data: {
        mapName: mapName !== undefined ? mapName : existingTower.mapName,
        towerNumber: towerNumber !== undefined ? towerNumber : existingTower.towerNumber,
        name: name !== undefined ? name : existingTower.name,
        stars: stars !== undefined ? stars : existingTower.stars,
        color: color !== undefined ? color : existingTower.color,
        x: x !== undefined ? x : existingTower.x,
        y: y !== undefined ? y : existingTower.y,
        width: width !== undefined ? width : existingTower.width,
        height: height !== undefined ? height : existingTower.height,
        defenseIds: defenseIds !== undefined
          ? (Array.isArray(defenseIds) ? JSON.stringify(defenseIds) : defenseIds)
          : existingTower.defenseIds,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entityType: 'map_tower',
        entityId: updatedTower.id,
        details: JSON.stringify({
          mapName: updatedTower.mapName,
          towerNumber: updatedTower.towerNumber,
          name: updatedTower.name,
          stars: updatedTower.stars,
        }),
      },
    })

    return NextResponse.json(updatedTower)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tour:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params

    const existingTower = await prisma.mapTower.findUnique({
      where: { id },
    })

    if (!existingTower) {
      return NextResponse.json(
        { error: 'Tour non trouvée' },
        { status: 404 }
      )
    }

    await prisma.mapTower.delete({
      where: { id },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'map_tower',
        entityId: id,
        details: JSON.stringify({
          mapName: existingTower.mapName,
          towerNumber: existingTower.towerNumber,
          name: existingTower.name,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de la tour:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

