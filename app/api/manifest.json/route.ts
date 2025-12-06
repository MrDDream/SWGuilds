import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET() {
  try {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json')
    
    if (!existsSync(manifestPath)) {
      return NextResponse.json(
        { error: 'Manifest non trouvé' },
        { status: 404 }
      )
    }
    
    const manifestContent = await readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erreur lors du chargement du manifest:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du manifest' },
      { status: 500 }
    )
  }
}

