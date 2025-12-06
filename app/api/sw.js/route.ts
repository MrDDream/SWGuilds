import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET() {
  try {
    const swPath = join(process.cwd(), 'public', 'sw.js')
    
    if (!existsSync(swPath)) {
      return NextResponse.json(
        { error: 'Service worker non trouvé' },
        { status: 404 }
      )
    }
    
    const swContent = await readFile(swPath, 'utf-8')
    
    return new NextResponse(swContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Erreur lors du chargement du service worker:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du service worker' },
      { status: 500 }
    )
  }
}

