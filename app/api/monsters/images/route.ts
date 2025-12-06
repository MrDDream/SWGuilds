import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdir, writeFile, unlink } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { readdir } from 'fs/promises'
import { getMonstersFromCache, updateMonsterImageCache } from '@/lib/monster-cache'

const mkdirAsync = promisify(mkdir)
const writeFileAsync = promisify(writeFile)
const unlinkAsync = promisify(unlink)

/**
 * Normalise un nom de fichier en supprimant les caractères spéciaux
 */
function normalizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplacer les caractères spéciaux par _
    .replace(/_+/g, '_') // Remplacer les _ multiples par un seul
    .replace(/^_|_$/g, '') // Supprimer les _ en début et fin
}

/**
 * GET: Vérifie quelles images existent localement pour une liste de monstres
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monsterNamesParam = searchParams.get('monsters')
    
    if (!monsterNamesParam) {
      return NextResponse.json(
        { error: 'Paramètre "monsters" requis (liste séparée par des virgules)' },
        { status: 400 }
      )
    }
    
    const monsterNames = monsterNamesParam.split(',').map(name => name.trim()).filter(Boolean)
    const monsters = await getMonstersFromCache()
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'monsters')
    const availableImages: Record<string, string> = {}
    
    monsterNames.forEach((monsterName) => {
      const monster = monsters.find(m => m.name === monsterName)
      if (!monster) return
      
      const normalizedName = normalizeFileName(monsterName).toLowerCase()
      const fileExtension = monster.image_filename.split('.').pop() || 'png'
      const monsterFileName = `${normalizedName}.${fileExtension}`
      const localPath = join(uploadsDir, monsterFileName)
      
      if (existsSync(localPath)) {
        availableImages[monsterName] = `/uploads/monsters/${monsterFileName}`
      }
    })
    
    return NextResponse.json({ availableImages })
  } catch (error) {
    console.error('Erreur lors de la vérification des images locales:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * Télécharge et sauvegarde une image de monstre localement avec le nom du monstre
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageFilename } = body

    if (!imageFilename) {
      return NextResponse.json(
        { error: 'imageFilename est requis' },
        { status: 400 }
      )
    }

    // Charger le cache des monstres pour trouver le nom du monstre
    const monsters = await getMonstersFromCache()
    const monster = monsters.find(m => m.image_filename === imageFilename)

    if (!monster) {
      return NextResponse.json(
        { error: 'Monstre non trouvé pour ce imageFilename' },
        { status: 404 }
      )
    }

    // Normaliser le nom du monstre pour le nom de fichier (toujours en minuscules pour éviter les problèmes de casse)
    const normalizedMonsterName = normalizeFileName(monster.name).toLowerCase()
    const fileExtension = imageFilename.split('.').pop() || 'png'
    const monsterFileName = `${normalizedMonsterName}.${fileExtension}`

    // Chemin local pour sauvegarder l'image
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'monsters')
    const localPath = join(uploadsDir, monsterFileName)

    // Construire l'URL locale
    const localUrl = `/uploads/monsters/${monsterFileName}`

    // Vérifier si l'image existe déjà localement avec le nom du monstre
    if (existsSync(localPath)) {
      // Mettre à jour le cache même si l'image existe déjà
      await updateMonsterImageCache(monster.name, localUrl)
      
      return NextResponse.json({
        message: 'Image déjà disponible localement',
        url: localUrl,
        local: true,
      })
    }

    // Créer le dossier s'il n'existe pas
    if (!existsSync(uploadsDir)) {
      await mkdirAsync(uploadsDir, { recursive: true })
    }

    // Vérifier s'il existe un ancien fichier avec un nom différent pour ce monstre
    // (par exemple, si le fichier était sauvegardé avec l'imageFilename)
    try {
      const files = await readdir(uploadsDir)
      const oldFile = files.find(f => {
        // Chercher les fichiers qui pourraient correspondre à ce monstre
        // mais avec un nom différent (ancien système)
        const fileWithoutExt = f.replace(/\.[^.]+$/, '')
        return fileWithoutExt !== normalizedMonsterName && 
               (f.includes(imageFilename.split('.')[0]) || f === imageFilename)
      })
      
      if (oldFile) {
        const oldPath = join(uploadsDir, oldFile)
        // Supprimer l'ancien fichier
        if (existsSync(oldPath)) {
          await unlinkAsync(oldPath)
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture du dossier
      console.warn('Erreur lors de la recherche des anciens fichiers:', error)
    }

    // Télécharger l'image depuis Swarfarm
    const swarfarmUrl = `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`
    
    const response = await fetch(swarfarmUrl)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Impossible de télécharger l'image depuis Swarfarm: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Convertir en buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Sauvegarder localement avec le nom du monstre
    await writeFileAsync(localPath, buffer)

    // Mettre à jour le cache en mémoire avec l'URL locale
    await updateMonsterImageCache(monster.name, localUrl)

    return NextResponse.json({
      message: 'Image téléchargée et sauvegardée avec succès',
      url: localUrl,
      local: true,
      monsterName: monster.name,
    })
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image de monstre:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
