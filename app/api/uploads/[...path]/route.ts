import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params
    const filePath = pathArray.join('/')
    
    // Sécuriser le chemin pour éviter les accès en dehors du dossier uploads
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
    }
    
    // Construire le chemin complet vers le fichier
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath)
    
    // Vérifier que le fichier existe
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME basé sur l'extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'json': 'application/json',
    }
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'
    
    // Retourner le fichier avec les en-têtes appropriés
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Erreur lors du chargement du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du fichier' },
      { status: 500 }
    )
  }
}

