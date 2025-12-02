import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { writeFile, mkdir, unlink } from 'fs/promises'
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Formats acceptés: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux. Taille maximale: 5MB' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur pour obtenir son pseudo
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, avatarUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur a un pseudo
    if (!user.name || user.name.trim() === '') {
      return NextResponse.json(
        { error: 'Vous devez avoir un pseudo pour uploader une photo de profil' },
        { status: 400 }
      )
    }

    // Normaliser le pseudo pour le nom de fichier
    const normalizedName = normalizeFileName(user.name)
    if (!normalizedName || normalizedName.trim() === '') {
      return NextResponse.json(
        { error: 'Le pseudo ne peut pas être utilisé comme nom de fichier' },
        { status: 400 }
      )
    }

    // Créer le dossier profiles s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Générer le nom de fichier avec le pseudo
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${normalizedName}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Supprimer l'ancien fichier de profil si il existe (toutes extensions)
    try {
      const files = await readdir(uploadsDir)
      const oldFiles = files.filter(f => {
        const fileWithoutExt = f.replace(/\.[^.]+$/, '')
        return fileWithoutExt === normalizedName && f !== fileName
      })
      
      for (const oldFile of oldFiles) {
        const oldPath = join(uploadsDir, oldFile)
        if (existsSync(oldPath)) {
          await unlink(oldPath)
        }
      }
    } catch (error) {
      // Ignorer les erreurs de suppression des anciens fichiers
      console.warn('Erreur lors de la suppression des anciens fichiers:', error)
    }

    // Supprimer également l'ancien fichier si l'avatarUrl pointait vers un fichier avec l'ID
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/profiles/')) {
      const oldFileName = user.avatarUrl.split('/').pop()
      if (oldFileName && oldFileName !== fileName) {
        const oldFilePath = join(uploadsDir, oldFileName)
        if (existsSync(oldFilePath)) {
          try {
            await unlink(oldFilePath)
          } catch (error) {
            // Ignorer les erreurs
          }
        }
      }
    }

    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Mettre à jour l'utilisateur avec l'URL de l'avatar
    const avatarUrl = `/uploads/profiles/${fileName}`
    
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
      select: {
        id: true,
        identifier: true,
        name: true,
        avatarUrl: true,
      },
    })

    // Créer un log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'update_profile',
        entityType: 'user',
        entityId: session.user.id,
        details: JSON.stringify({
          updatedFields: ['avatar'],
        }),
      },
    })

    return NextResponse.json({
      message: 'Photo de profil mise à jour avec succès',
      avatarUrl: updatedUser.avatarUrl,
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload de la photo de profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
