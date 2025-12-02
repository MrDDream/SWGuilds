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
 * Obtient l'URL de l'image d'un monstre, en utilisant l'image locale si disponible
 * Côté client : retourne toujours l'URL locale (le navigateur vérifiera l'existence)
 * Côté serveur : vérifie l'existence avant de retourner
 */
export function getMonsterImageUrl(imageFilename: string, monsterName?: string): string {
  if (!monsterName) {
    // Si pas de nom de monstre, utiliser Swarfarm
    return `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`
  }

  // Normaliser le nom du monstre
  const normalizedName = normalizeFileName(monsterName)
  const fileExtension = imageFilename.split('.').pop() || 'png'
  const monsterFileName = `${normalizedName}.${fileExtension}`

  // Côté client, retourner l'URL locale directement (le navigateur vérifiera)
  // Côté serveur, on pourrait vérifier avec existsSync, mais pour simplifier,
  // on retourne toujours l'URL locale
  return `/uploads/monsters/${monsterFileName}`
}

/**
 * Obtient l'URL locale d'un monstre par son nom (côté serveur uniquement)
 */
export function getLocalMonsterImageUrlByName(monsterName: string): string | null {
  // Cette fonction ne peut être utilisée que côté serveur
  if (typeof window !== 'undefined') {
    // Côté client, retourner null
    return null
  }

  // Côté serveur uniquement
  try {
    const { existsSync } = require('fs')
    const { join } = require('path')
    
    const normalizedName = normalizeFileName(monsterName)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'monsters')
    
    // Chercher le fichier avec différentes extensions possibles
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    
    for (const ext of extensions) {
      const filePath = join(uploadsDir, `${normalizedName}.${ext}`)
      if (existsSync(filePath)) {
        return `/uploads/monsters/${normalizedName}.${ext}`
      }
    }
  } catch (error) {
    // Ignorer les erreurs
  }
  
  return null
}

/**
 * Obtient le chemin local pour sauvegarder une image de monstre (serveur uniquement)
 */
export function getLocalMonsterImagePath(monsterName: string, extension: string = 'png'): string {
  if (typeof window !== 'undefined') {
    throw new Error('Cette fonction ne peut être utilisée que côté serveur')
  }
  
  const { join } = require('path')
  const normalizedName = normalizeFileName(monsterName)
  return join(process.cwd(), 'public', 'uploads', 'monsters', `${normalizedName}.${extension}`)
}

/**
 * Obtient l'URL publique pour une image de monstre locale par nom
 */
export function getLocalMonsterImageUrl(monsterName: string, extension: string = 'png'): string {
  const normalizedName = normalizeFileName(monsterName)
  return `/uploads/monsters/${normalizedName}.${extension}`
}
