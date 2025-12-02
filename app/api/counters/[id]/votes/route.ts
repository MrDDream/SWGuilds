import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { voteType } = body

    if (!voteType || (voteType !== 'like' && voteType !== 'dislike')) {
      return NextResponse.json(
        { error: 'voteType doit être "like" ou "dislike"' },
        { status: 400 }
      )
    }

    // Vérifier que le contre existe
    const counter = await prisma.counter.findUnique({
      where: { id },
    })

    if (!counter) {
      return NextResponse.json(
        { error: 'Contre non trouvé' },
        { status: 404 }
      )
    }

    // Créer ou mettre à jour le vote
    const vote = await prisma.counterVote.upsert({
      where: {
        userId_counterId: {
          userId: session.user.id,
          counterId: id,
        },
      },
      update: {
        voteType,
      },
      create: {
        userId: session.user.id,
        counterId: id,
        voteType,
      },
    })

    // Récupérer les compteurs
    const likes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'like' },
    })

    const dislikes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'dislike' },
    })

    return NextResponse.json({
      vote,
      likes,
      dislikes,
    })
  } catch (error) {
    console.error('Erreur lors du vote:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Récupérer les compteurs
    const likes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'like' },
    })

    const dislikes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'dislike' },
    })

    // Récupérer le vote de l'utilisateur actuel
    const userVote = await prisma.counterVote.findUnique({
      where: {
        userId_counterId: {
          userId: session.user.id,
          counterId: id,
        },
      },
    })

    return NextResponse.json({
      likes,
      dislikes,
      userVote: userVote?.voteType || null,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des votes:', error)
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
    const { id } = await params

    // Supprimer le vote de l'utilisateur
    await prisma.counterVote.deleteMany({
      where: {
        userId: session.user.id,
        counterId: id,
      },
    })

    // Récupérer les compteurs mis à jour
    const likes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'like' },
    })

    const dislikes = await prisma.counterVote.count({
      where: { counterId: id, voteType: 'dislike' },
    })

    return NextResponse.json({
      likes,
      dislikes,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du vote:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

