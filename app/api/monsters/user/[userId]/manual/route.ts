import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAuth()
    const { userId } = await params

    // Vérifier que l'utilisateur peut ajouter des monstres (soi-même ou admin)
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { monsterName } = body

    if (!monsterName || typeof monsterName !== 'string' || monsterName.trim() === '') {
      return NextResponse.json(
        { error: 'Le nom du monstre est requis' },
        { status: 400 }
      )
    }

    // Vérifier si le monstre existe déjà pour cet utilisateur
    const existingMonster = await prisma.userMonster.findUnique({
      where: {
        userId_monsterName: {
          userId,
          monsterName: monsterName.trim(),
        },
      },
    })

    if (existingMonster) {
      return NextResponse.json(
        { error: 'Ce monstre est déjà dans votre liste' },
        { status: 400 }
      )
    }

    // Créer le monstre manuel
    const userMonster = await prisma.userMonster.create({
      data: {
        userId,
        monsterName: monsterName.trim(),
      },
    })

    return NextResponse.json(userMonster, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de l\'ajout du monstre manuel:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAuth()
    const { userId } = await params

    // Vérifier que l'utilisateur peut supprimer des monstres (soi-même ou admin)
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const monsterName = searchParams.get('monsterName')

    if (!monsterName) {
      return NextResponse.json(
        { error: 'Le nom du monstre est requis' },
        { status: 400 }
      )
    }

    // Supprimer le monstre manuel
    await prisma.userMonster.delete({
      where: {
        userId_monsterName: {
          userId,
          monsterName: monsterName.trim(),
        },
      },
    })

    return NextResponse.json({ message: 'Monstre supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du monstre manuel:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

