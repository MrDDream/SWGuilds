import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier que c'est bien un fichier SQLite
    if (!file.name.endsWith('.db') && file.type !== 'application/x-sqlite3' && file.type !== 'application/octet-stream') {
      return NextResponse.json(
        { error: 'Le fichier doit être une base de données SQLite (.db)' },
        { status: 400 }
      )
    }

    // Créer le dossier prisma s'il n'existe pas
    const prismaDir = join(process.cwd(), 'prisma')
    if (!existsSync(prismaDir)) {
      await mkdir(prismaDir, { recursive: true })
    }

    const dbPath = join(prismaDir, 'dev.db')
    
    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(dbPath, buffer)

    return NextResponse.json({
      message: 'Base de données importée avec succès',
    })
  } catch (error) {
    console.error('Erreur lors de l\'import de la base de données:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

