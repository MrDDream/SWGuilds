import { prisma } from './prisma'

/**
 * Vérifie et envoie les rappels programmés
 * Cette fonction doit être appelée périodiquement (toutes les minutes)
 */
export async function checkAndSendReminders(): Promise<number> {
  // Récupérer la timezone depuis les variables d'environnement
  const timezone = process.env.TIMEZONE || 'Europe/Paris'
  
  // Obtenir la date/heure actuelle dans la timezone configurée
  const now = new Date()
  
  // Extraire le jour de la semaine (0=dimanche, 1=lundi, etc.) dans la timezone configurée
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  })
  const dayName = dayFormatter.format(now)
  const dayMap: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  }
  const currentDay = dayMap[dayName] ?? now.getDay()
  
  // Extraire l'heure et les minutes dans la timezone configurée
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = timeFormatter.formatToParts(now)
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)

  // Récupérer tous les rappels actifs
  const activeReminders = await prisma.reminder.findMany({
    where: {
      isActive: true,
    },
  })

  let sentCount = 0

  for (const reminder of activeReminders) {
    try {
      // Parser les jours de la semaine
      const daysOfWeek: number[] = JSON.parse(reminder.daysOfWeek)

      // Vérifier si aujourd'hui est un jour configuré
      if (!daysOfWeek.includes(currentDay)) {
        continue
      }

      // Vérifier si l'heure correspond
      if (reminder.hour !== currentHour || reminder.minute !== currentMinute) {
        continue
      }

      // Vérifier si le rappel n'a pas déjà été envoyé aujourd'hui
      if (reminder.lastSent) {
        const lastSentDate = new Date(reminder.lastSent)
        const lastSentFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        })
        const todayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        })
        
        const lastSentStr = lastSentFormatter.format(lastSentDate)
        const todayStr = todayFormatter.format(now)
        
        // Si déjà envoyé aujourd'hui, ignorer
        if (lastSentStr === todayStr) {
          continue
        }
      }

      // Construire le message avec le ping du rôle si configuré
      let message = reminder.message
      if (reminder.discordRoleId) {
        message = `<@&${reminder.discordRoleId}> ${message}`
      }

      // Envoyer le message Discord via webhook
      const response = await fetch(reminder.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      })

      if (response.ok) {
        // Mettre à jour lastSent
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { lastSent: now },
        })

        sentCount++
        console.log(`[Reminder] ✅ "${reminder.title}" envoyé`)
      } else {
        const responseText = await response.text()
        console.error(`[Reminder] ❌ Erreur "${reminder.title}": ${response.status} ${responseText}`)
      }
    } catch (error) {
      console.error(`[Reminder] ❌ Erreur "${reminder.title}":`, error)
    }
  }

  return sentCount
}

