import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { getMonstersFromCache } from '@/lib/monster-cache'

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
    const file = formData.get('json') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Format accepté: JSON' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux. Taille maximale: 10MB' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur pour obtenir son pseudo ou identifiant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, identifier: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Utiliser le nom ou l'identifiant comme nom de fichier
    const userName = user.name || user.identifier || session.user.identifier || 'user'
    const normalizedName = normalizeFileName(userName)
    if (!normalizedName || normalizedName.trim() === '') {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur ne peut pas être utilisé comme nom de fichier' },
        { status: 400 }
      )
    }

    // Créer le dossier json s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'json')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Générer le nom de fichier avec le nom de l'utilisateur
    const fileName = `${normalizedName}.json`
    const filePath = join(uploadsDir, fileName)

    // Supprimer l'ancien fichier JSON si il existe
    try {
      const files = await readdir(uploadsDir)
      const oldFiles = files.filter(f => {
        const fileWithoutExt = f.replace(/\.[^.]+$/, '')
        return fileWithoutExt === normalizedName && f.endsWith('.json')
      })

      for (const oldFile of oldFiles) {
        const oldFilePath = join(uploadsDir, oldFile)
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath)
        }
      }
    } catch (error) {
      // Ignorer les erreurs de suppression
      console.warn('Erreur lors de la suppression de l\'ancien fichier:', error)
    }

    // Convertir le fichier en buffer et l'écrire
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Vérifier que c'est un JSON valide
    try {
      JSON.parse(buffer.toString('utf-8'))
    } catch (error) {
      return NextResponse.json(
        { error: 'Le fichier n\'est pas un JSON valide' },
        { status: 400 }
      )
    }

    await writeFile(filePath, buffer)

    // Synchroniser les monstres manuels avec le JSON uploadé
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'))
      const unitList = jsonData.unit_list || []
      
      if (Array.isArray(unitList) && unitList.length > 0) {
        // Récupérer tous les monstres depuis le cache
        const allMonsters = await getMonstersFromCache()
        
        // Extraire les unit_master_id uniques du JSON (monstres 6* uniquement)
        const unitMasterIds = new Set<number>()
        unitList.forEach((unit: any) => {
          if (unit.unit_master_id != null && unit.class === 6) {
            unitMasterIds.add(unit.unit_master_id)
          }
        })
        
        // Mapper les unit_master_id aux noms de monstres
        const monstersInJson = new Set<string>()
        unitMasterIds.forEach(unitMasterId => {
          const monster = allMonsters.find(m => m.com2us_id === unitMasterId)
          if (monster) {
            monstersInJson.add(monster.name.toLowerCase())
          }
        })
        
        // Récupérer les monstres manuels de l'utilisateur
        const manualMonsters = await prisma.userMonster.findMany({
          where: { userId: session.user.id },
        })
        
        // Supprimer les monstres manuels qui sont maintenant présents dans le JSON
        const monstersToRemove = manualMonsters.filter(manualMonster => 
          monstersInJson.has(manualMonster.monsterName.toLowerCase())
        )
        
        if (monstersToRemove.length > 0) {
          await prisma.userMonster.deleteMany({
            where: {
              userId: session.user.id,
              monsterName: {
                in: monstersToRemove.map(m => m.monsterName),
              },
            },
          })
        }
      }
    } catch (error) {
      // Ne pas faire échouer l'upload si la synchronisation échoue
      console.error('Erreur lors de la synchronisation des monstres manuels:', error)
    }

    // Mettre à jour la date du dernier upload JSON
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastJsonUpload: new Date() },
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'upload_json',
        entityType: 'user',
        entityId: session.user.id,
        details: JSON.stringify({
          identifier: user.identifier,
          name: user.name,
          fileName: fileName,
        }),
      },
    })

    return NextResponse.json({
      message: 'Fichier JSON uploadé avec succès',
      fileName: fileName,
      url: `/uploads/json/${fileName}`,
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier JSON:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

