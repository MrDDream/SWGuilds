import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  try {
    await requireAuth()
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Erreur lors de la récupération des étiquettes:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom de l\'étiquette est requis' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#3B82F6',
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cette étiquette existe déjà' },
        { status: 400 }
      )
    }
    console.error('Erreur lors de la création de l\'étiquette:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

