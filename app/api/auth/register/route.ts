import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, password, name } = body

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifiant et mot de passe requis' },
        { status: 400 }
      )
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le pseudo est requis' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { identifier }
    })

    const hashedPassword = await bcrypt.hash(password, 10)

    let user
    if (existingUser) {
      // Générer une clé API si l'utilisateur n'en a pas
      const updateData: any = {
        password: hashedPassword,
        name: name.trim(),
        // Conserver le rôle et l'approbation existants
        role: existingUser.role,
        isApproved: existingUser.isApproved,
      }
      
      // Générer une clé API si l'utilisateur n'en a pas
      if (!existingUser.apiKey) {
        updateData.apiKey = randomUUID()
      }
      
      // La langue est toujours 'fr', pas besoin de preferredLocale
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData
      })

      // Créer un log pour la mise à jour du compte
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'update_account',
          entityType: 'user',
          entityId: user.id,
          details: JSON.stringify({ 
            identifier, 
            name, 
            reason: 'Compte écrasé lors de l\'inscription',
            previousRole: existingUser.role,
            newRole: user.role,
          }),
        }
      })
    } else {
      // Générer une clé API unique
      const apiKey = randomUUID()
      
      // Créer un nouveau compte (toujours en français)
      user = await prisma.user.create({
        data: {
          identifier,
          password: hashedPassword,
          name: name.trim(),
          role: 'user', // Tous les nouveaux utilisateurs sont des utilisateurs normaux
          isApproved: false, // Nécessite l'approbation d'un administrateur
          preferredLocale: 'fr', // Toujours français
          apiKey, // Générer la clé API lors de la création
        }
      })

      // Créer un log pour la création du compte
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'register',
          entityType: 'user',
          entityId: user.id,
          details: JSON.stringify({ identifier, name, role: user.role, isApproved: user.isApproved }),
        }
      })

      // Envoyer une notification webhook si l'utilisateur est en attente d'approbation
      if (!user.isApproved) {
        try {
          const settings = await prisma.settings.findFirst()
          if (settings?.approvalWebhookUrl) {
            let message = `🔔 **Nouvelle inscription en attente d'approbation**\n\n**Pseudo:** ${name || 'Non renseigné'}\n\nVeuillez approuver ou rejeter cette demande dans la section Administration.`
            
            // Ajouter le ping du rôle si configuré
            if (settings.approvalWebhookRoleId) {
              message = `<@&${settings.approvalWebhookRoleId}> ${message}`
            }
            
            // Envoyer le message Discord de manière asynchrone (ne pas bloquer)
            fetch(settings.approvalWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: message,
              }),
            }).catch((error) => {
              console.error('Erreur lors de l\'envoi de la notification Discord:', error)
              // Ne pas faire échouer l'inscription si Discord échoue
            })
          }
        } catch (error) {
          console.error('Erreur lors de l\'envoi de la notification webhook:', error)
          // Ne pas faire échouer l'inscription si le webhook échoue
        }
      }
    }

    return NextResponse.json(
      { 
        message: existingUser 
          ? 'Compte mis à jour avec succès' 
          : 'Utilisateur créé avec succès', 
        userId: user.id 
      },
      { status: existingUser ? 200 : 201 }
    )
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    
    // Log plus de détails pour le débogage
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message)
      console.error('Stack trace:', error.stack)
    }
    
    // Retourner un message d'erreur plus informatif en développement
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      : 'Erreur serveur'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

