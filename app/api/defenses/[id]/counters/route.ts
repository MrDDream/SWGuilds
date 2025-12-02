import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    
    // Vérifier que la défense existe et est accessible
    const defense = await prisma.defense.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: session.user.id },
          { isPublic: true, userId: { not: session.user.id } }
        ]
      },
    })

    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    const counters = await prisma.counter.findMany({
      where: {
        defenseId: params.id,
      },
      include: {
        votes: true,
      },
    })

    // Calculer le nombre de likes et dislikes pour chaque contre
    const countersWithVotes = counters.map(counter => {
      const likes = counter.votes.filter(v => v.voteType === 'like').length
      const dislikes = counter.votes.filter(v => v.voteType === 'dislike').length
      return {
        ...counter,
        likes,
        dislikes,
        votes: undefined, // Ne pas retourner les votes détaillés
      }
    })

    // Trier par nombre de likes décroissant, puis par dislikes croissant (plus de dislikes = plus bas)
    countersWithVotes.sort((a, b) => {
      if (b.likes !== a.likes) {
        return b.likes - a.likes
      }
      if (a.dislikes !== b.dislikes) {
        return a.dislikes - b.dislikes // Plus de dislikes = plus bas
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(countersWithVotes)
  } catch (error) {
    console.error('Erreur lors de la récupération des contres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { counterMonsters, description } = body

    // Vérifier que la défense existe et est publique (ou appartient à l'utilisateur)
    const defense = await prisma.defense.findUnique({
      where: { id: params.id },
    })

    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    // Permettre l'ajout de contres si la défense est publique OU si l'utilisateur est propriétaire
    if (!defense.isPublic && defense.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez ajouter des contres qu\'aux défenses publiques' },
        { status: 403 }
      )
    }

    const counter = await prisma.counter.create({
      data: {
        defenseId: params.id,
        counterMonsters: JSON.stringify(counterMonsters || []),
        description: description || null,
        createdBy: session.user.name || session.user.identifier,
        updatedBy: session.user.name || session.user.identifier,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'counter',
        entityId: counter.id,
        details: JSON.stringify({ 
          defenseId: params.id,
          leaderMonster: defense.leaderMonster,
          monster2: defense.monster2,
          monster3: defense.monster3,
          counterMonsters,
        }),
      }
    })

    return NextResponse.json(counter, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du contre:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

