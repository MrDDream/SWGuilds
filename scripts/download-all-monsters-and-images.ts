import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { mkdir, writeFile } from 'fs/promises'

const mkdirAsync = promisify(mkdir)
const writeFileAsync = promisify(writeFile)

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
 * Télécharge tous les monstres depuis l'API SwarFarm
 */
async function fetchAllMonsters() {
  const allMonsters: any[] = []
  let nextUrl: string | null = 'https://swarfarm.com/api/v2/monsters/'

  while (nextUrl) {
    console.log(`Téléchargement des monstres: ${allMonsters.length} récupérés...`)
    try {
      const response: Response = await fetch(nextUrl)
      if (!response.ok) {
        console.error(`Erreur lors de la récupération des monstres: ${response.status}`)
        break
      }
      const data: any = await response.json()
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
async function downloadMonsterImage(imageFilename: string, monsterName: string, uploadsDir: string): Promise<boolean> {
  try {
    const normalizedName = normalizeFileName(monsterName)
    const fileExtension = imageFilename.split('.').pop() || 'png'
    const monsterFileName = `${normalizedName}.${fileExtension}`
    const localPath = path.join(uploadsDir, monsterFileName)

    // Vérifier si l'image existe déjà
    if (fs.existsSync(localPath)) {
      return false // Image déjà téléchargée
    }

    // Télécharger l'image depuis Swarfarm
    const swarfarmUrl = `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`
    const response = await fetch(swarfarmUrl)

    if (!response.ok) {
      console.warn(`Impossible de télécharger l'image pour ${monsterName}: ${response.statusText}`)
      return false
    }

    // Convertir en buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Sauvegarder localement
    await writeFileAsync(localPath, buffer)
    return true
  } catch (error) {
    console.warn(`Erreur lors du téléchargement de l'image pour ${monsterName}:`, error)
    return false
  }
}

async function main() {
  try {
    console.log('Début du téléchargement des données depuis SwarFarm...')

    // 1. Télécharger tous les monstres
    console.log('Étape 1/2: Téléchargement des monstres...')
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

    // Structure avec métadonnées pour le nouveau format
    const cacheData = {
      lastUpdated: new Date().toISOString(),
      monsters: simplified
    }

    // Créer les dossiers nécessaires
    const publicDataDir = path.join(process.cwd(), 'public', 'data')
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'monsters')

    if (!fs.existsSync(publicDataDir)) {
      await mkdirAsync(publicDataDir, { recursive: true })
    }
    if (!fs.existsSync(uploadsDir)) {
      await mkdirAsync(uploadsDir, { recursive: true })
    }

    // Sauvegarder les monstres uniquement dans public/data pour être accessible via Next.js
    const publicPath = path.join(publicDataDir, 'monsters.json')
    fs.writeFileSync(publicPath, JSON.stringify(cacheData, null, 2))
    console.log(`✓ ${simplified.length} monstres sauvegardés dans ${publicPath}`)

    // 2. Télécharger toutes les images
    console.log('Étape 2/2: Téléchargement des images des monstres...')
    let downloadedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (let i = 0; i < simplified.length; i++) {
      const monster = simplified[i]
      if ((i + 1) % 50 === 0) {
        console.log(`Progression: ${i + 1}/${simplified.length} monstres traités (${downloadedCount} téléchargés, ${skippedCount} déjà présents, ${errorCount} erreurs)`)
      }

      const downloaded = await downloadMonsterImage(monster.image_filename, monster.name, uploadsDir)
      if (downloaded) {
        downloadedCount++
      } else if (fs.existsSync(path.join(uploadsDir, `${normalizeFileName(monster.name)}.${monster.image_filename.split('.').pop() || 'png'}`))) {
        skippedCount++
      } else {
        errorCount++
      }

      // Petite pause pour ne pas surcharger l'API
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`\n✓ Téléchargement terminé!`)
    console.log(`  - ${simplified.length} monstres sauvegardés`)
    console.log(`  - ${downloadedCount} images téléchargées`)
    console.log(`  - ${skippedCount} images déjà présentes`)
    if (errorCount > 0) {
      console.log(`  - ${errorCount} images en erreur`)
    }
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error)
    process.exit(1)
  }
}

main()

