import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET() {
  try {
    // D'abord, essayer de charger favicon.png spécifiquement depuis public/uploads/
    const faviconPngPath = join(process.cwd(), 'public', 'uploads', 'favicon.png')
    if (existsSync(faviconPngPath)) {
      const fileBuffer = await readFile(faviconPngPath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
    
    // Sinon, essayer les autres extensions de favicon
    const faviconExtensions = ['svg', 'ico', 'jpg', 'jpeg']
    for (const ext of faviconExtensions) {
      const faviconPath = join(process.cwd(), 'public', 'uploads', `favicon.${ext}`)
      if (existsSync(faviconPath)) {
        const fileBuffer = await readFile(faviconPath)
        
        // Déterminer le type MIME
        let contentType = 'image/png'
        if (ext === 'jpg' || ext === 'jpeg') {
          contentType = 'image/jpeg'
        } else if (ext === 'svg') {
          contentType = 'image/svg+xml'
        } else if (ext === 'ico') {
          contentType = 'image/x-icon'
        }
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
    
    // Si pas de favicon, essayer le logo depuis les settings
    const settings = await prisma.settings.findFirst()
    
    if (settings?.logoUrl) {
      // Extraire le nom du fichier
      const fileName = settings.logoUrl.replace('/uploads/', '')
      const filePath = join(process.cwd(), 'public', 'uploads', fileName)
      
      // Si le fichier existe, le servir
      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath)
        
        // Déterminer le type MIME
        const ext = fileName.split('.').pop()?.toLowerCase()
        let contentType = 'image/png'
        
        if (ext === 'jpg' || ext === 'jpeg') {
          contentType = 'image/jpeg'
        } else if (ext === 'png') {
          contentType = 'image/png'
        } else if (ext === 'svg') {
          contentType = 'image/svg+xml'
        } else if (ext === 'gif') {
          contentType = 'image/gif'
        } else if (ext === 'webp') {
          contentType = 'image/webp'
        }
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
    
    // Si pas de logo dans les settings, essayer de charger logo.* depuis public/uploads/
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    for (const ext of extensions) {
      const defaultLogoPath = join(process.cwd(), 'public', 'uploads', `logo.${ext}`)
      if (existsSync(defaultLogoPath)) {
        const fileBuffer = await readFile(defaultLogoPath)
        
        // Déterminer le type MIME
        let contentType = 'image/png'
        if (ext === 'jpg' || ext === 'jpeg') {
          contentType = 'image/jpeg'
        } else if (ext === 'png') {
          contentType = 'image/png'
        } else if (ext === 'svg') {
          contentType = 'image/svg+xml'
        } else if (ext === 'gif') {
          contentType = 'image/gif'
        } else if (ext === 'webp') {
          contentType = 'image/webp'
        }
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
    
    // Si pas de logo, retourner une réponse 404
    return new NextResponse(null, { status: 404 })
  } catch (error) {
    console.error('Erreur lors de la récupération du favicon:', error)
    return new NextResponse(null, { status: 404 })
  }
}

