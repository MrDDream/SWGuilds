import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Récupérer le post News
    const post = await prisma.newsPost.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les settings pour le webhook News
    const settings = await prisma.settings.findFirst()

    if (!settings?.newsWebhookUrl) {
      return NextResponse.json(
        { error: 'Webhook News non configuré dans les paramètres' },
        { status: 400 }
      )
    }

    // Construire le message avec le titre (si présent) et le ping du rôle en bas si configuré
    let message = ''
    if (post.title) {
      message = `**${post.title}**\n\n${post.content}`
    } else {
      message = post.content
    }
    if (settings.newsWebhookRoleId) {
      message = `${message}\n\n<@&${settings.newsWebhookRoleId}>`
    }

    // Envoyer le message Discord via webhook
    const response = await fetch(settings.newsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    })

    if (response.ok) {
      // Créer un log d'activité
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'send_discord',
          entityType: 'news',
          entityId: post.id,
          details: JSON.stringify({
            content: post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content,
          }),
        },
      })

      return NextResponse.json({ success: true, message: 'Message envoyé sur Discord avec succès' })
    } else {
      const responseText = await response.text()
      console.error(`[News] ❌ Erreur lors de l'envoi sur Discord: ${response.status} ${responseText}`)
      return NextResponse.json(
        { error: `Erreur lors de l'envoi sur Discord: ${response.status} ${responseText}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi sur Discord:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

