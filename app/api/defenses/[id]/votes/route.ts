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

    // Vérifier que la défense existe
    const defense = await prisma.defense.findUnique({
      where: { id },
    })

    if (!defense) {
      return NextResponse.json(
        { error: 'Défense non trouvée' },
        { status: 404 }
      )
    }

    // Créer ou mettre à jour le vote
    const vote = await prisma.defenseVote.upsert({
      where: {
        userId_defenseId: {
          userId: session.user.id,
          defenseId: id,
        },
      },
      update: {
        voteType,
      },
      create: {
        userId: session.user.id,
        defenseId: id,
        voteType,
      },
    })

    // Récupérer les compteurs
    const likes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'like' },
    })

    const dislikes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'dislike' },
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
    const likes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'like' },
    })

    const dislikes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'dislike' },
    })

    // Récupérer le vote de l'utilisateur actuel
    const userVote = await prisma.defenseVote.findUnique({
      where: {
        userId_defenseId: {
          userId: session.user.id,
          defenseId: id,
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
    await prisma.defenseVote.deleteMany({
      where: {
        userId: session.user.id,
        defenseId: id,
      },
    })

    // Récupérer les compteurs mis à jour
    const likes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'like' },
    })

    const dislikes = await prisma.defenseVote.count({
      where: { defenseId: id, voteType: 'dislike' },
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

