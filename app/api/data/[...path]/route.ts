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
    
    // Sécuriser le chemin pour éviter les accès en dehors du dossier data
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
    }
    
    // Construire le chemin complet vers le fichier
    const fullPath = join(process.cwd(), 'public', 'data', filePath)
    
    // Vérifier que le fichier existe
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }
    
    // Lire le fichier
    const fileContent = await readFile(fullPath, 'utf-8')
    
    // Déterminer le type MIME basé sur l'extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'json': 'application/json',
      'txt': 'text/plain',
      'csv': 'text/csv',
    }
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'
    
    // Retourner le fichier avec les en-têtes appropriés
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Erreur lors du chargement du fichier data:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du fichier' },
      { status: 500 }
    )
  }
}

