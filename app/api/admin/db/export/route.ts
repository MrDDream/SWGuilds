import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const dbPath = join(process.cwd(), 'prisma', 'dev.db')
    
    if (!existsSync(dbPath)) {
      return NextResponse.json(
        { error: 'Base de données non trouvée' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(dbPath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': 'attachment; filename="dev.db"',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Erreur lors de l\'export de la base de données:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

