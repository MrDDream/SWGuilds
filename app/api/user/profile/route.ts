import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const session = await requireAuth()
    
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        identifier: true,
        name: true,
        avatarUrl: true,
        preferredLocale: true,
        lastJsonUpload: true,
        apiKey: true,
        role: true,
        canEditAllDefenses: true,
        canEditMap: true,
        canEditAssignments: true,
        canEditNews: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Générer une clé API si elle n'existe pas
    if (!user.apiKey) {
      const newApiKey = randomUUID()
      user = await prisma.user.update({
        where: { id: session.user.id },
        data: { apiKey: newApiKey },
        select: {
          id: true,
          identifier: true,
          name: true,
          avatarUrl: true,
          preferredLocale: true,
          lastJsonUpload: true,
          apiKey: true,
          role: true,
          canEditAllDefenses: true,
          canEditMap: true,
          canEditAssignments: true,
          canEditNews: true,
        },
      })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    // Ne pas logger les erreurs NEXT_REDIRECT (redirections normales de Next.js)
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-lancer la redirection pour qu'elle soit gérée par Next.js
    }
    console.error('Erreur lors de la récupération du profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { identifier, name, password, avatarUrl, preferredLocale } = body

    const updateData: { identifier?: string; name?: string | null; password?: string; avatarUrl?: string | null; preferredLocale?: string | null } = {}

    if (identifier) {
      // Vérifier que l'identifiant n'est pas déjà utilisé par un autre utilisateur
      const existingUser = await prisma.user.findUnique({
        where: { identifier },
      })

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: 'Cet identifiant est déjà utilisé' },
          { status: 400 }
        )
      }

      updateData.identifier = identifier
    }

    if (name !== undefined) {
      updateData.name = name?.trim() || null
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 6 caractères' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl
    }

    if (preferredLocale !== undefined) {
      // Valider que la locale est soit 'fr', 'en' ou null
      if (preferredLocale === null || preferredLocale === 'fr' || preferredLocale === 'en') {
        updateData.preferredLocale = preferredLocale
      } else {
        return NextResponse.json(
          { error: 'Locale invalide. Utilisez "fr" ou "en"' },
          { status: 400 }
        )
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    // Récupérer les valeurs actuelles avant la mise à jour pour les logs spécifiques
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferredLocale: true,
      },
    })

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        identifier: true,
        name: true,
        avatarUrl: true,
        preferredLocale: true,
      },
    })

    // Créer des logs spécifiques pour les changements de langue
    if (preferredLocale !== undefined && preferredLocale !== currentUser?.preferredLocale) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'change_language',
          entityType: 'user',
          entityId: session.user.id,
          details: JSON.stringify({
            previousLocale: currentUser?.preferredLocale || null,
            newLocale: preferredLocale,
          }),
        },
      })
    }

    // Créer un log pour les autres modifications du profil (sans langue)
    const otherFields = Object.keys(updateData).filter(
      key => key !== 'preferredLocale'
    )
    if (otherFields.length > 0) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'update_profile',
          entityType: 'user',
          entityId: session.user.id,
          details: JSON.stringify({
            updatedFields: otherFields,
          }),
        },
      })
    }

    return NextResponse.json({
      message: 'Profil mis à jour avec succès',
      user: updatedUser,
    })
  } catch (error: any) {
    // Ne pas logger les erreurs NEXT_REDIRECT (redirections normales de Next.js)
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-lancer la redirection pour qu'elle soit gérée par Next.js
    }
    console.error('Erreur lors de la mise à jour du profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { action } = body

    if (action === 'regenerateApiKey') {
      // Générer une nouvelle clé API
      const newApiKey = randomUUID()
      
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { apiKey: newApiKey },
        select: {
          apiKey: true,
        },
      })

      // Créer un log d'activité
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'regenerate_api_key',
          entityType: 'user',
          entityId: session.user.id,
          details: JSON.stringify({
            message: 'Clé API régénérée',
          }),
        },
      })

      return NextResponse.json({
        message: 'Clé API régénérée avec succès',
        apiKey: updatedUser.apiKey,
      })
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error: any) {
    // Ne pas logger les erreurs NEXT_REDIRECT (redirections normales de Next.js)
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-lancer la redirection pour qu'elle soit gérée par Next.js
    }
    console.error('Erreur lors de la régénération de la clé API:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

