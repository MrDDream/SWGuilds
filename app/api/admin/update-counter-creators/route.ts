import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function POST() {
  try {
    await requireAdmin()
    
    console.log('Mise à jour des contres existants avec les informations de création...')
    
    // Récupérer tous les contres sans createdBy ou updatedBy
    const counters = await prisma.counter.findMany({
      where: {
        OR: [
          { createdBy: '' },
          { updatedBy: '' },
        ]
      }
    })

    console.log(`Trouvé ${counters.length} contres à mettre à jour`)

    let updated = 0

    for (const counter of counters) {
      // Chercher le log de création du contre
      const createLog = await prisma.activityLog.findFirst({
        where: {
          entityType: 'counter',
          entityId: counter.id,
          action: 'create',
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          user: true,
        }
      })

      if (createLog) {
        const creatorName = createLog.user.name || createLog.user.identifier
        
        // Chercher le log de mise à jour le plus récent
        const updateLog = await prisma.activityLog.findFirst({
          where: {
            entityType: 'counter',
            entityId: counter.id,
            action: 'update',
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: true,
          }
        })

        const updaterName = updateLog ? (updateLog.user.name || updateLog.user.identifier) : creatorName

        await prisma.counter.update({
          where: { id: counter.id },
          data: {
            createdBy: creatorName,
            updatedBy: updaterName,
          }
        })

        updated++
        console.log(`Mis à jour le contre ${counter.id}: créé par ${creatorName}, mis à jour par ${updaterName}`)
      } else {
        // Si pas de log, utiliser l'identifiant du propriétaire de la défense
        const defense = await prisma.defense.findUnique({
          where: { id: counter.defenseId },
          include: { user: true }
        })

        if (defense) {
          const defaultName = defense.user.name || defense.user.identifier || 'Inconnu'
          await prisma.counter.update({
            where: { id: counter.id },
            data: {
              createdBy: defaultName,
              updatedBy: defaultName,
            }
          })
          updated++
          console.log(`Mis à jour le contre ${counter.id} avec les informations de la défense: ${defaultName}`)
        }
      }
    }

    return NextResponse.json({ 
      message: `Mise à jour terminée! ${updated} contres mis à jour.`,
      updated 
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

