import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendReminders } from '@/lib/reminder-scheduler'

/**
 * Route API pour déclencher la vérification et l'envoi des rappels
 * Peut être appelée par un cron externe ou un système interne
 * 
 * Pour la sécurité, vous pouvez ajouter une vérification d'un token secret
 * dans les headers ou les query params
 */
export async function GET(request: NextRequest) {
  try {
    // Optionnel : vérifier un token secret pour sécuriser l'endpoint
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    // }

    const sentCount = await checkAndSendReminders()

    return NextResponse.json({
      success: true,
      sentCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur lors de la vérification des rappels:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Même logique que GET
  return GET(request)
}

