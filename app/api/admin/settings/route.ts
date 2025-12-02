import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { writeFile, mkdir, unlink, chmod } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// GET : Récupérer les paramètres (public - pas besoin d'authentification pour lire)
export async function GET() {
  try {
    // Pas besoin d'authentification pour lire les settings (logo et nom de l'instance)

    let settings = await prisma.settings.findFirst()

    // Si les settings n'existent pas, créer un enregistrement par défaut
    if (!settings) {
      const firstAdmin = await prisma.user.findFirst({
        where: { role: 'admin' },
        orderBy: { createdAt: 'asc' }
      })

      if (firstAdmin) {
        settings = await prisma.settings.create({
          data: {
            instanceName: 'SWGuilds',
            updatedBy: firstAdmin.id,
          }
        })
      } else {
        // Si pas d'admin, retourner des valeurs par défaut
        return NextResponse.json({
          id: '',
          instanceName: 'SWGuilds',
          logoUrl: null,
          approvalWebhookUrl: null,
          approvalWebhookRoleId: null,
          discordWebhookUrl: null,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // Vérifier si le logo existe réellement sur le système de fichiers
    let logoUrl = settings.logoUrl
    if (logoUrl) {
      // Si logoUrl commence par /uploads/, extraire le nom de fichier
      const fileName = logoUrl.replace('/uploads/', '')
      const filePath = join(process.cwd(), 'public', 'uploads', fileName)
      // Si le fichier n'existe pas, mettre logoUrl à null
      if (!existsSync(filePath)) {
        logoUrl = null
      } else {
        // S'assurer que le chemin est correct
        logoUrl = `/uploads/${fileName}`
      }
    }

    return NextResponse.json({
      id: settings.id,
      instanceName: settings.instanceName,
      logoUrl: logoUrl,
      approvalWebhookUrl: settings.approvalWebhookUrl || null,
      approvalWebhookRoleId: settings.approvalWebhookRoleId || null,
      newsWebhookUrl: settings.newsWebhookUrl || null,
      newsWebhookRoleId: settings.newsWebhookRoleId || null,
      discordWebhookUrl: settings.discordWebhookUrl || null,
      updatedAt: settings.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT : Mettre à jour les paramètres (admin seulement)
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { instanceName, logoUrl, approvalWebhookUrl, approvalWebhookRoleId, newsWebhookUrl, newsWebhookRoleId, discordWebhookUrl } = body

    // Récupérer ou créer les settings
    let settings = await prisma.settings.findFirst()

    const updateData: { instanceName?: string; logoUrl?: string | null; approvalWebhookUrl?: string | null; approvalWebhookRoleId?: string | null; newsWebhookUrl?: string | null; newsWebhookRoleId?: string | null; discordWebhookUrl?: string | null } = {}

    if (instanceName !== undefined && typeof instanceName === 'string') {
      updateData.instanceName = instanceName.trim() || 'SWGuilds'
    }

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null
    }

    if (approvalWebhookUrl !== undefined) {
      updateData.approvalWebhookUrl = approvalWebhookUrl || null
    }

    if (approvalWebhookRoleId !== undefined) {
      updateData.approvalWebhookRoleId = approvalWebhookRoleId || null
    }

    if (newsWebhookUrl !== undefined) {
      updateData.newsWebhookUrl = newsWebhookUrl || null
    }

    if (newsWebhookRoleId !== undefined) {
      updateData.newsWebhookRoleId = newsWebhookRoleId || null
    }

    if (discordWebhookUrl !== undefined) {
      updateData.discordWebhookUrl = discordWebhookUrl || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    if (!settings) {
      // Créer les settings si elles n'existent pas
      settings = await prisma.settings.create({
        data: {
          instanceName: updateData.instanceName || 'SWGuilds',
          logoUrl: updateData.logoUrl || null,
          approvalWebhookUrl: updateData.approvalWebhookUrl || null,
          approvalWebhookRoleId: updateData.approvalWebhookRoleId || null,
          newsWebhookUrl: updateData.newsWebhookUrl || null,
          newsWebhookRoleId: updateData.newsWebhookRoleId || null,
          discordWebhookUrl: updateData.discordWebhookUrl || null,
          updatedBy: session.user.id,
        }
      })
    } else {
      // Mettre à jour les settings existantes
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...updateData,
          updatedBy: session.user.id,
        }
      })
    }

    return NextResponse.json({
      id: settings.id,
      instanceName: settings.instanceName,
      logoUrl: settings.logoUrl,
      approvalWebhookUrl: settings.approvalWebhookUrl || null,
      approvalWebhookRoleId: settings.approvalWebhookRoleId || null,
      newsWebhookUrl: settings.newsWebhookUrl || null,
      newsWebhookRoleId: settings.newsWebhookRoleId || null,
      discordWebhookUrl: settings.discordWebhookUrl || null,
      updatedAt: settings.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST : Upload du logo (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Formats acceptés: JPEG, PNG, GIF, WebP, SVG' },
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

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Générer un nom de fichier avec l'extension
    const fileExtension = file.name.split('.').pop() || 'png'
    const fileName = `logo.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Supprimer les anciens fichiers logo (toutes extensions)
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    for (const ext of extensions) {
      const oldFilePath = join(uploadsDir, `logo.${ext}`)
      if (existsSync(oldFilePath) && oldFilePath !== filePath) {
        try {
          await unlink(oldFilePath)
        } catch (error) {
          // Ignorer les erreurs de suppression
          console.warn(`Erreur lors de la suppression de logo.${ext}:`, error)
        }
      }
    }

    // Supprimer aussi les anciens fichiers dans uploads/logo/ si le dossier existe
    const oldLogoDir = join(uploadsDir, 'logo')
    if (existsSync(oldLogoDir)) {
      try {
        const { readdir } = await import('fs/promises')
        const files = await readdir(oldLogoDir)
        for (const oldFile of files) {
          if (oldFile.startsWith('logo.')) {
            const oldFilePath = join(oldLogoDir, oldFile)
            try {
              await unlink(oldFilePath)
            } catch (error) {
              // Ignorer les erreurs
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Mettre à jour les settings avec l'URL du logo
    const logoUrl = `/uploads/${fileName}`
    
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          instanceName: 'SWGuilds',
          logoUrl,
          updatedBy: session.user.id,
        }
      })
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          logoUrl,
          updatedBy: session.user.id,
        }
      })
    }

    return NextResponse.json({
      message: 'Logo mis à jour avec succès',
      logoUrl: settings.logoUrl,
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

