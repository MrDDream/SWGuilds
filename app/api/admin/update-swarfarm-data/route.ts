import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { saveMonstersToFile, loadMonstersFromFile } from '@/lib/monster-file-cache'
import { updateMonsterImageCache } from '@/lib/monster-cache'
import { join } from 'path'
import { existsSync, mkdir, writeFile, readdir } from 'fs'
import { promisify } from 'util'
import { readdir as readdirPromise } from 'fs/promises'

const mkdirAsync = promisify(mkdir)
const writeFileAsync = promisify(writeFile)

interface SwarfarmMonster {
  id: number
  name: string
  image_filename: string
  element?: string
  base_stars?: number
  natural_stars?: number
  com2us_id?: number
  is_second_awakened?: boolean
  awaken_level?: number
  bestiary_slug?: string
}

interface SwarfarmResponse {
  results: SwarfarmMonster[]
  next: string | null
}

/**
 * Normalise un nom de fichier en supprimant les caractères spéciaux
 */
function normalizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Télécharge tous les monstres depuis l'API SwarFarm
 */
async function fetchAllMonsters(): Promise<SwarfarmMonster[]> {
  const allMonsters: SwarfarmMonster[] = []
  let nextUrl: string | null = 'https://swarfarm.com/api/v2/monsters/'

  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`Erreur lors de la récupération des monstres: ${response.status}`)
        break
      }

      const data: SwarfarmResponse = await response.json()
      allMonsters.push(...data.results)
      nextUrl = data.next
    } catch (error) {
      console.error('Erreur lors de la récupération des monstres:', error)
      break
    }
  }

  return allMonsters
}

/**
 * Télécharge une image de monstre depuis SwarFarm
 */
async function downloadMonsterImage(
  imageFilename: string,
  monsterName: string,
  uploadsDir: string
): Promise<{ downloaded: boolean; alreadyExists: boolean }> {
  try {
    const normalizedName = normalizeFileName(monsterName)
    const fileExtension = imageFilename.split('.').pop() || 'png'
    const monsterFileName = `${normalizedName}.${fileExtension}`
    const localPath = join(uploadsDir, monsterFileName)

    // Vérifier si l'image existe déjà
    if (existsSync(localPath)) {
      return { downloaded: false, alreadyExists: true }
    }

    // Télécharger l'image depuis Swarfarm
    const swarfarmUrl = `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`
    const response = await fetch(swarfarmUrl)

    if (!response.ok) {
      return { downloaded: false, alreadyExists: false }
    }

    // Convertir en buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Sauvegarder localement
    await writeFileAsync(localPath, buffer)

    // Mettre à jour le cache
    const localUrl = `/uploads/monsters/${monsterFileName}`
    await updateMonsterImageCache(monsterName, localUrl)

    return { downloaded: true, alreadyExists: false }
  } catch (error) {
    console.warn(`Erreur lors du téléchargement de l'image pour ${monsterName}:`, error)
    return { downloaded: false, alreadyExists: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier les droits admin
    await requireAdmin()

    console.log('Début de la mise à jour des données SwarFarm...')

    // 1. Charger les monstres existants pour comparaison
    const existingMonsters = loadMonstersFromFile() || []
    const existingMonstersMap = new Map(existingMonsters.map(m => [m.id, m]))
    const existingImagesSet = new Set<string>()
    
    // Créer un set des noms de fichiers d'images existants
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'monsters')
    if (existsSync(uploadsDir)) {
      try {
        const files = await readdirPromise(uploadsDir)
        files.forEach(file => {
          const nameWithoutExt = file.replace(/\.[^.]+$/, '')
          existingImagesSet.add(nameWithoutExt.toLowerCase())
        })
      } catch (error) {
        console.warn('Erreur lors de la lecture du dossier uploads:', error)
      }
    }

    // 2. Télécharger tous les monstres depuis l'API
    const monsters = await fetchAllMonsters()
    const simplified = monsters.map(m => ({
      id: m.id,
      name: m.name,
      image_filename: m.image_filename,
      element: m.element,
      base_stars: m.base_stars,
      natural_stars: m.natural_stars,
      com2us_id: m.com2us_id,
      awaken_level: m.awaken_level,
      is_second_awakened: m.is_second_awakened || m.awaken_level === 2 || false,
      bestiary_slug: m.bestiary_slug || `${m.id}-${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    }))

    // 3. Comparer et identifier les nouveaux monstres ou ceux avec des changements
    let newMonstersCount = 0
    let updatedMonstersCount = 0
    const monstersToUpdate: typeof simplified = []
    
    simplified.forEach(newMonster => {
      const existing = existingMonstersMap.get(newMonster.id)
      if (!existing) {
        newMonstersCount++
        monstersToUpdate.push(newMonster)
      } else {
        // Vérifier si les données ont changé (comparaison simple des champs importants)
        const hasChanged = 
          existing.name !== newMonster.name ||
          existing.image_filename !== newMonster.image_filename ||
          existing.natural_stars !== newMonster.natural_stars ||
          existing.base_stars !== newMonster.base_stars ||
          existing.element !== newMonster.element ||
          existing.awaken_level !== newMonster.awaken_level
        
        if (hasChanged) {
          updatedMonstersCount++
          monstersToUpdate.push(newMonster)
        }
      }
    })

    // Sauvegarder les monstres (mise à jour complète)
    saveMonstersToFile(simplified)

    // 4. Télécharger uniquement les images manquantes
    if (!existsSync(uploadsDir)) {
      await mkdirAsync(uploadsDir, { recursive: true })
    }

    let downloadedCount = 0
    let alreadyExistsCount = 0
    let errorCount = 0

    // Télécharger les images en batch (par lots de 10 pour ne pas surcharger)
    // Seulement pour les monstres nouveaux ou mis à jour, ou si l'image n'existe pas
    for (let i = 0; i < simplified.length; i++) {
      const monster = simplified[i]
      const normalizedName = normalizeFileName(monster.name).toLowerCase()
      
      // Vérifier si l'image existe déjà
      if (existingImagesSet.has(normalizedName)) {
        alreadyExistsCount++
        // Mettre à jour le cache même si l'image existe déjà
        const fileExtension = monster.image_filename.split('.').pop() || 'png'
        const monsterFileName = `${normalizeFileName(monster.name)}.${fileExtension}`
        const localUrl = `/uploads/monsters/${monsterFileName}`
        await updateMonsterImageCache(monster.name, localUrl)
      } else {
        // Télécharger l'image seulement si elle n'existe pas
        const result = await downloadMonsterImage(monster.image_filename, monster.name, uploadsDir)
        
        if (result.downloaded) {
          downloadedCount++
        } else if (result.alreadyExists) {
          alreadyExistsCount++
        } else {
          errorCount++
        }
      }

      // Petite pause toutes les 10 images
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Données mises à jour avec succès',
      stats: {
        monsters: simplified.length,
        newMonsters: newMonstersCount,
        updatedMonsters: updatedMonstersCount,
        imagesDownloaded: downloadedCount,
        imagesAlreadyExists: alreadyExistsCount,
        imagesErrors: errorCount,
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des données SwarFarm:', error)
    
    if (error.message?.includes('admin')) {
      return NextResponse.json(
        { error: 'Accès refusé. Droits administrateur requis.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des données' },
      { status: 500 }
    )
  }
}

