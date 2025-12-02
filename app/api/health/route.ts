import { NextResponse } from 'next/server'

/**
 * Route de santé pour vérifier que le serveur est prêt
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}

