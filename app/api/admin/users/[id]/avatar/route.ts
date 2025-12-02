import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'

/**
 * Normalise un nom de fichier en supprimant les caractères spéciaux
 */
function normalizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplacer les caractères spéciaux par _
    .replace(/_+/g, '_') // Remplacer les _ multiples par un seul
    .replace(/^_|_$/g, '') // Supprimer les _ en début et fin
}

// DELETE : Supprimer la photo de profil d'un utilisateur (admin seulement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, identifier: true, name: true, avatarUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le fichier de profil s'il existe
    if (user.name) {
      const normalizedName = normalizeFileName(user.name)
      if (normalizedName) {
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles')
        if (existsSync(uploadsDir)) {
          try {
            const files = await readdir(uploadsDir)
            const userFiles = files.filter(f => {
              const fileWithoutExt = f.replace(/\.[^.]+$/, '')
              return fileWithoutExt === normalizedName
            })
            
            for (const file of userFiles) {
              const filePath = join(uploadsDir, file)
              if (existsSync(filePath)) {
                await unlink(filePath)
              }
            }
          } catch (error) {
            console.error('Erreur lors de la suppression du fichier:', error)
            // Continuer même si la suppression du fichier échoue
          }
        }
      }
    }

    // Mettre à jour la base de données
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: {
        id: true,
        identifier: true,
        name: true,
        avatarUrl: true,
      },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'delete_avatar',
        entityType: 'user',
        entityId: id,
        details: JSON.stringify({
          identifier: user.identifier,
          name: user.name,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Photo de profil supprimée avec succès',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo de profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

